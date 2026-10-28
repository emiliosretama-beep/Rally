// Escalador: movimiento, escalada en las paredes de roca, resistencia y cuerda de seguridad.
// Sin Three.js.
'use strict';

function Player(world) {
  this.w = world;
  this.pos = { x: 0, y: 0, z: 0 };
  this.prev = { x: 0, y: 0, z: 0 };
  this.vel = { x: 0, y: 0, z: 0 };
  this.yaw = 0;
  this.wallN = { x: 0, y: 0, z: 1 };
  this.events = [];
  this._n = { x: 0, y: 1, z: 0 };
  this._n2 = { x: 0, y: 1, z: 0 };
  this._sp = { x: 0, z: 0, nx: 0, nz: 0, y0: 0, y1: 0, amp: 0 };
  this._sp2 = { x: 0, z: 0, nx: 0, nz: 0, y0: 0, y1: 0, amp: 0 };
  this._loc = { x: 0, z: 0 };
  this._cols = []; this._blk = [];
  this.reset(world.start.x, world.start.y, world.start.z, world.start.yaw);
}

Player.prototype.reset = function (x, y, z, yaw) {
  this.pos.x = x; this.pos.y = y + 0.05; this.pos.z = z;
  this.prev.x = x; this.prev.y = this.pos.y; this.prev.z = z;
  this.vel.x = this.vel.y = this.vel.z = 0;
  this.yaw = yaw || 0;
  this.state = 'air';
  this.stamina = 1;
  this.spendT = 9; this.exhausted = false;
  this.coyoteT = 0; this.bufferT = 0; this.regrabLock = 0;
  this.grounded = false; this.steep = false;
  this.fallTop = y; this.stepDist = 0; this.animDist = 0; this.climbAnim = 0;
  this.mantle = null; this.swim = false; this.wade = false; this.sprinting = false;
  this.cs = null; this.cu = 0; this.cz = null; this.dirU = 1; this.surf = null;
  this.groundBlock = null; this.wallStrip = null;
  this.zip = null; this.ride = null; this.autoHold = 0; this.ascend = null;
  this.anchor = null; this.ropeLen = 2; this.takeoffY = y; this.taut = false; this.tautT = 0;
  this.resting = false; this.onCable = false; this.slip = 0; this.airT = 0;
};

Player.prototype.maxStamina = function () { return 1; };

Player.prototype.spend = function (v) {
  this.spendT = 0;
  this.stamina = Math.max(0, this.stamina - v);
  if (this.stamina <= 0) this.exhausted = true;
};

Player.prototype.emit = function (type, data) {
  const e = data || {};
  e.type = type;
  this.events.push(e);
};

Player.prototype.chest = function () { return { x: this.pos.x, y: this.pos.y + 1, z: this.pos.z }; };

// Paso fijo de simulación. inp: {mx,my,jump,grab,sprint}; yawCam: hacia dónde mira la cámara.
Player.prototype.step = function (dt, inp, yawCam, env) {
  const p = this.pos;
  this.prev.x = p.x; this.prev.y = p.y; this.prev.z = p.z;
  if (inp.jump) this.bufferT = CFG.jumpBuffer; else this.bufferT -= dt;
  this.regrabLock -= dt;
  this.spendT += dt;

  // las rocas que se hunden en la lava te llevan con ellas
  if (this.state === 'air' && this.grounded && this.groundBlock && this.groundBlock.move) p.y += this.groundBlock.dy;

  switch (this.state) {
    case 'zip': this._zipStep(dt); break;
    case 'ride': this._rideStep(dt); break;
    case 'ascend': this._ascendStep(dt); break;
    case 'mantle': this._mantleStep(dt); break;
    case 'climb': this._climbStep(dt, inp, env); break;
    default: this._moveStep(dt, inp, yawCam, env);
  }

  // Recuperar resistencia en suelo firme o descansando en un gancho
  if (this.grounded && !this.sprinting && this.spendT > CFG.staRegenDelay) this.stamina = Math.min(1, this.stamina + CFG.staRegen * dt);
  if (this.resting) this.stamina = Math.min(1, this.stamina + CFG.anchorRegen * dt);
  if (this.exhausted && this.stamina > 0.3) this.exhausted = false;
  this._clip(env);
};

// ---------- cuerda de seguridad ----------
Player.prototype._clip = function (env) {
  if (env.noRope || this.state === 'ascend') return;
  const c = this.chest(), A = this.w.anchors;
  let best = null;
  for (let i = 0; i < A.length; i++) {
    const a = A[i];
    if (this.anchor && a.idx <= this.anchor.idx) continue;
    if (Math.abs(a.x - c.x) > 2.8 || Math.abs(a.z - c.z) > 2.8 || Math.abs(a.y - c.y) > 2.8) continue;
    if (Math.hypot(a.x - c.x, a.y - c.y, a.z - c.z) < CFG.clipDist) best = a;
  }
  if (best) {
    this.anchor = best;
    this.ropeLen = Math.max(2, Math.hypot(best.x - c.x, best.y - c.y, best.z - c.z) + 1.2);
    this.emit('clip', { a: best });
  }
};

// La cuerda solo frena si caes por debajo de donde despegaste
Player.prototype._rope = function (dt) {
  const a = this.anchor, p = this.pos, v = this.vel;
  if (!a) return;
  const cx = p.x, cy = p.y + 1, cz = p.z;
  const dx = cx - a.x, dy = cy - a.y, dz = cz - a.z, d = Math.hypot(dx, dy, dz) || 0.001;
  if (this.grounded || this.state !== 'air') {
    this.ropeLen = Math.max(2, d + 1.2); this.takeoffY = p.y; this.taut = false; this.tautT = 0;
    return;
  }
  if (p.y >= this.takeoffY - 0.6) { this.ropeLen = Math.max(this.ropeLen, d + 0.8); return; }
  if (d <= this.ropeLen) return;
  const ux = dx / d, uy = dy / d, uz = dz / d;
  p.x = a.x + ux * this.ropeLen; p.y = a.y + uy * this.ropeLen - 1; p.z = a.z + uz * this.ropeLen;
  const vr = v.x * ux + v.y * uy + v.z * uz;
  if (vr > 0) {
    if (!this.taut && vr > 4) this.emit('catch', { speed: vr, drop: this.fallTop - p.y });
    v.x -= ux * vr; v.y -= uy * vr; v.z -= uz * vr;
  }
  v.x *= Math.exp(-0.8 * dt); v.y *= Math.exp(-0.8 * dt); v.z *= Math.exp(-0.8 * dt);
  this.taut = true;
};

// Después de una caída la cuerda te sube de vuelta al gancho: primero lejos de la roca,
// luego hacia arriba y al final al gancho (así no se atraviesan cornisas ni paredes)
Player.prototype.startAscend = function () {
  const a = this.anchor, w = this.w, p = this.pos;
  if (!a) return false;
  let tx, ty, tz, ox, oz, climb = null;
  if (a.wall) {
    const st = w.strips[a.strip], sp = w.stripPoint(st, a.u, this._sp);
    const r = w.relief(st, a.u, a.y, sp.amp) + 0.42;
    tx = sp.x + sp.nx * r; tz = sp.z + sp.nz * r; ty = a.y - 1.0;
    ox = sp.nx; oz = sp.nz;
    climb = { st, u: a.u };
  } else {
    tx = a.x; ty = a.ground + 0.02; tz = a.z;
    // hacia el centro del barranco
    const vi = w._vi(a.x, a.z), gi = w.gIdx[vi];
    ox = p.x - a.x; oz = p.z - a.z;
    if (gi >= 0) {
      const g = w.gorges[gi], S = g.samples, q = S[U.clamp(Math.round(w.gS[vi]), 0, S.length - 1)];
      const sg = w.gLat[vi] > 0 ? -1 : 1;
      ox = Math.cos(q.ang) * sg; oz = -Math.sin(q.ang) * sg;
    }
    const l = Math.hypot(ox, oz) || 1; ox /= l; oz /= l;
  }
  const mx = tx + ox * 1.3, mz = tz + oz * 1.3;
  this.state = 'ascend';
  this.ascend = { pts: [{ x: mx, y: Math.min(p.y, ty), z: mz }, { x: mx, y: ty + 0.4, z: mz }, { x: tx, y: ty, z: tz }], k: 0, climb };
  this.vel.x = this.vel.y = this.vel.z = 0;
  this.grounded = false; this.taut = false; this.tautT = 0; this.cs = null;
  this.emit('ascend');
  return true;
};

Player.prototype._ascendStep = function (dt) {
  const s = this.ascend, p = this.pos, T = s.pts[s.k];
  const dx = T.x - p.x, dy = T.y - p.y, dz = T.z - p.z, d = Math.hypot(dx, dy, dz);
  const sp = (s.k === 2 ? 3.5 : 6) * dt;
  this.climbAnim += dt * 4;
  if (d > sp) { p.x += dx / d * sp; p.y += dy / d * sp; p.z += dz / d * sp; return; }
  p.x = T.x; p.y = T.y; p.z = T.z;
  if (s.k < 2) { s.k++; return; }
  this.fallTop = p.y; this.takeoffY = p.y;
  this.stamina = Math.max(this.stamina, 0.5);
  if (s.climb) {
    this._startClimb(s.climb.st, s.climb.u, true);
    this.autoHold = 2.5;
    // si el gancho quedó en roca lisa, moverse a lo largo hasta donde se pueda agarrar
    const cy = p.y + 1;
    let ok = !!this._grip(this.cs, this.cu, cy);
    for (let d2 = 0.25; !ok && d2 <= 3; d2 += 0.25) for (const sg of [1, -1]) {
      if (ok) break;
      if (this._grip(this.cs, this.cu + d2 * sg, cy)) { this.cu += d2 * sg; ok = true; }
    }
    if (ok) this._placeOnWall();
    else { this.state = 'air'; this.regrabLock = 0.5; this.cs = null; }
  } else { this.state = 'air'; this.grounded = true; }
};

// ---------- caminar, correr, saltar ----------
Player.prototype._moveStep = function (dt, inp, yawCam, env) {
  const p = this.pos, v = this.vel, w = this.w;
  const sy = Math.sin(yawCam), cy = Math.cos(yawCam);
  let ix = inp.mx, iy = inp.my;
  let mag = Math.hypot(ix, iy);
  if (mag > 1) { ix /= mag; iy /= mag; mag = 1; }
  const dx = sy * iy - cy * ix, dz = cy * iy + sy * ix;

  // en una cornisa, mantener Agarrar te sujeta del cable: el viento casi no te mueve
  this.onCable = this.grounded && !!this.groundBlock && this.groundBlock.kind === 'ledge' && !!inp.grab;
  this.sprinting = inp.sprint && mag > 0.2 && this.grounded && !this.exhausted && this.stamina > 0 && !this.swim && !this.onCable;
  let speed = this.sprinting ? CFG.sprintSpeed : CFG.walkSpeed;
  if (this.swim) speed *= 0.5;
  if (this.wade) speed *= 0.8;
  if (this.onCable) speed *= 0.6;
  if (this.sprinting) this.spend(CFG.staSprint * dt);

  const accel = this.grounded ? CFG.groundAccel : (this.swim ? 10 : CFG.airAccel);
  const tx = dx * speed, tz = dz * speed;
  let ex = tx - v.x, ez = tz - v.z;
  const el = Math.hypot(ex, ez), maxD = accel * dt;
  if (!this.grounded && !this.swim && mag < 0.1) { ex = 0; ez = 0; }
  else if (el > maxD) { ex *= maxD / el; ez *= maxD / el; }
  v.x += ex; v.z += ez;

  if (mag > 0.15) {
    const target = Math.atan2(dx, dz);
    this.yaw += U.angDiff(this.yaw, target) * Math.min(1, dt * (this.grounded ? 14 : 6));
  }

  if (this.grounded) this.coyoteT = CFG.coyote; else this.coyoteT -= dt;
  if (this.bufferT > 0 && (this.coyoteT > 0 || this.swim) && this.stamina > CFG.staJump * 0.5) {
    v.y = this.swim ? CFG.jumpVel * 0.7 : CFG.jumpVel;
    this.spend(CFG.staJump);
    this.bufferT = 0; this.coyoteT = 0; this.grounded = false;
    this.takeoffY = p.y;
    this.emit('jump');
  }

  v.y -= CFG.gravity * dt;
  if (env.wind) {
    const k = this.onCable ? 0.12 : this.grounded ? 0.55 : 1;
    v.x += env.wind.x * dt * k; v.z += env.wind.z * dt * k;
  }

  this.swim = false;
  if (p.y < -0.7 && w.heightAt(p.x, p.z) < -0.9) {
    this.swim = true;
    v.y += (CFG.gravity + (-0.7 - p.y) * 30) * dt;
    v.y *= Math.exp(-4 * dt);
    v.x *= Math.exp(-1.5 * dt); v.z *= Math.exp(-1.5 * dt);
    this.fallTop = p.y;
  }

  const wasGrounded = this.grounded;
  const sp = Math.hypot(v.x, v.y, v.z);
  const sub = Math.max(1, Math.ceil(sp * dt / 0.25));
  const h = dt / sub;
  let impact = 0;
  this.grounded = false; this.steep = false; this.groundBlock = null; this.wallStrip = null;
  for (let s = 0; s < sub; s++) {
    p.x += v.x * h; p.y += v.y * h; p.z += v.z * h;
    impact = Math.max(impact, this._collide());
  }
  this._collideTrees();

  // Pegarse al suelo al bajar pendientes caminables (no al saltar)
  if (!this.grounded && wasGrounded && v.y <= 0.5 && !this.swim) {
    const gh = w.groundBelow(p.x, p.y + 0.3, p.z);
    w.normalAt(p.x, p.z, this._n);
    if (p.y - gh < 0.35 && p.y - gh > -0.3 && (this._n.y >= CFG.walkableNY || gh > w.heightAt(p.x, p.z) + 0.01)) { p.y = gh; this.grounded = true; v.y = 0; this.groundBlock = w.blockTopAt(p.x, gh, p.z); }
  }
  if (this.steep && !this.grounded) { v.x *= Math.exp(-1.2 * dt); v.z *= Math.exp(-1.2 * dt); }
  this.wade = this.grounded && !this.groundBlock && !!w.waterAt(p.x, p.y, p.z);

  this._rope(dt);

  if (this.grounded) {
    if (!wasGrounded && impact > 6) this.emit('land', { speed: impact, height: this.fallTop - p.y });
    this.fallTop = p.y; this.airT = 0;
    const hs = Math.hypot(v.x, v.z);
    this.stepDist += hs * dt; this.animDist += hs * dt;
    if (this.stepDist > (this.sprinting ? 1.05 : 0.8)) { this.stepDist = 0; this.emit('step', { speed: hs }); }
  } else {
    this.airT += dt;
    if (p.y > this.fallTop) this.fallTop = p.y;
  }

  if (this.taut) {
    this.tautT += dt;
    if (this.tautT > 0.9 && Math.hypot(v.x, v.y, v.z) < 3) this.startAscend();
  }

  // Si te quedas corto en un salto, te agarras del borde y subes
  if (!this.grounded && !this.swim && !this.taut && v.y < 2.5 && this.airT > 0.08 && this.regrabLock <= 0 && this._ledgeGrab(dx, dz, mag)) return;

  // ¿Agarrarse a una pared?
  const canGrab = this.exhausted ? this.stamina > 0.15 : this.stamina > 0.02;
  if (inp.grab && this.regrabLock <= 0 && !this.swim && canGrab && -v.y < CFG.maxGrabSpeed) {
    const wall = this._findWall(dx, dz, mag);
    if (wall) {
      const fall = -v.y;
      if (fall > 4) { this.spend(CFG.staGrabFall * fall); if (fall > 6) this.emit('catchWall', { speed: fall }); }
      this._startClimb(wall.st, wall.u);
    }
  }
};

// Agarre de bordes: arriba, al frente, hay dónde pararse a la altura de las manos
Player.prototype._ledgeGrab = function (dx, dz, mag) {
  const p = this.pos, v = this.vel, w = this.w;
  let fx = v.x, fz = v.z, l = Math.hypot(fx, fz);
  if (mag > 0.2) { fx = dx; fz = dz; l = Math.hypot(dx, dz); }
  if (l < 0.3) return false;
  fx /= l; fz /= l;
  for (const d of [0.45, 0.75]) {
    const x = p.x + fx * d, z = p.z + fz * d;
    const top = w.groundBelow(x, p.y + 1.45, z), dh = top - p.y;
    if (dh < 0.22 || dh > 1.45) continue;
    if (!w.blockTopAt(x, top, z)) { w.normalAt(x, z, this._n2, 0.5); if (this._n2.y < CFG.walkableNY) continue; }
    if (w.blockAt(x, top + 1.0, z, 0.05) || w.blockAt(x, top + 1.7, z, 0.05)) continue;
    const lx = p.x + fx * (d + 0.4), lz = p.z + fz * (d + 0.4);
    const lt = w.groundBelow(lx, top + 0.3, lz), far = Math.abs(lt - top) < 0.3;
    this.state = 'mantle';
    this.mantle = { t: 0, dur: 0.4, sx: p.x, sy: p.y, sz: p.z, ex: far ? lx : x, ey: top + 0.02, ez: far ? lz : z, ledge: true };
    this.vel.x = this.vel.y = this.vel.z = 0;
    this.yaw = Math.atan2(fx, fz);
    this.taut = false;
    this.emit('ledgeGrab', { dh });
    return true;
  }
  return false;
};

// Esferas (pies y pecho) contra el terreno, los bloques y las paredes. Devuelve la velocidad de impacto.
Player.prototype._collide = function () {
  const p = this.pos, v = this.vel, w = this.w, n = this._n, R = CFG.radius, loc = this._loc;
  let impact = 0;
  const blocks = w.blocksNear(p.x, p.z, this._blk);
  for (let it = 0; it < 3; it++) {
    let moved = false;
    for (let s = 0; s < 2; s++) {
      const oy = s === 0 ? R : 1.25;
      // terreno: contacto con los triángulos reales (las rampas ocultas bajo bloques no cuentan)
      let cx = p.x, cy = p.y + oy, cz = p.z;
      const push = w.sphereTerrain(cx, cy, cz, R, n);
      if (push > 0) {
        const vn = v.x * n.x + v.y * n.y + v.z * n.z;
        if (n.y >= CFG.walkableNY) {
          if (s === 0) { p.y += push / n.y; if (v.y < 0) { impact = Math.max(impact, -v.y); v.y = 0; } this.grounded = true; moved = true; }
        } else {
          p.x += n.x * push; p.y += n.y * push; p.z += n.z * push;
          if (vn < 0) { impact = Math.max(impact, -vn); v.x -= n.x * vn; v.y -= n.y * vn; v.z -= n.z * vn; }
          this.steep = true; moved = true;
        }
      }
      // bloques orientados
      for (let k = 0; k < blocks.length; k++) {
        const b = blocks[k];
        cx = p.x; cy = p.y + oy; cz = p.z;
        if (cx < b.ax0 - R || cx > b.ax1 + R || cz < b.az0 - R || cz > b.az1 + R || cy < b.y0 - R || cy > b.y1 + R) continue;
        obbLocal(b, cx, cz, loc);
        const hy = (b.y1 - b.y0) / 2, ly = cy - (b.y0 + hy);
        const qx = U.clamp(loc.x, -b.hx, b.hx), qy = U.clamp(ly, -hy, hy), qz = U.clamp(loc.z, -b.hz, b.hz);
        let lx = loc.x - qx, lyy = ly - qy, lz = loc.z - qz, pen;
        const dd = Math.hypot(lx, lyy, lz);
        if (dd > 1e-5) { if (dd >= R) continue; lx /= dd; lyy /= dd; lz /= dd; pen = R - dd; }
        else {
          // el centro quedó dentro: salir por el lado más cercano
          const o = [[loc.x + b.hx, -1, 0, 0], [b.hx - loc.x, 1, 0, 0], [ly + hy, 0, -1, 0], [hy - ly, 0, 1, 0], [loc.z + b.hz, 0, 0, -1], [b.hz - loc.z, 0, 0, 1]];
          o.sort((a, c) => a[0] - c[0]);
          lx = o[0][1]; lyy = o[0][2]; lz = o[0][3]; pen = o[0][0] + R;
        }
        const nx = lx * b.c - lz * b.s, ny = lyy, nz = lx * b.s + lz * b.c;
        if (ny >= CFG.walkableNY) {
          if (s !== 0) continue; // solo los pies se apoyan en el techo de un bloque
          p.y += pen * ny; p.x += nx * pen; p.z += nz * pen;
          if (v.y < 0) { impact = Math.max(impact, -v.y); v.y = 0; }
          this.grounded = true; this.groundBlock = b;
        } else {
          p.x += nx * pen; p.y += ny * pen; p.z += nz * pen;
          const vn = v.x * nx + v.y * ny + v.z * nz;
          if (vn < 0) { if (ny > -0.5) impact = Math.max(impact, -vn); v.x -= nx * vn; v.y -= ny * vn; v.z -= nz * vn; }
          if (Math.abs(ny) < 0.3) { this.steep = true; this.wallN.x = nx; this.wallN.y = 0; this.wallN.z = nz; }
        }
        moved = true;
      }
      // paredes de roca: la esfera no entra en el relieve
      const hs = w.stripHits(p.x, p.z, R + 1.0);
      for (let k = 0; k < hs.length; k++) {
        const hh = hs[k];
        cy = p.y + oy;
        if (!hh.inSpan || cy < hh.y0 - R || cy > hh.y1 + 0.05) continue;
        const r = w.relief(hh.st, hh.u, cy, hh.amp), pen = r + R - hh.d;
        if (pen <= 0 || hh.d < r - 1.2) continue;
        p.x += hh.nx * pen; p.z += hh.nz * pen;
        const vn = v.x * hh.nx + v.z * hh.nz;
        if (vn < 0) { impact = Math.max(impact, -vn); v.x -= hh.nx * vn; v.z -= hh.nz * vn; }
        this.steep = true; this.wallStrip = hh.st;
        this.wallN.x = hh.nx; this.wallN.y = 0; this.wallN.z = hh.nz;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return impact;
};

Player.prototype._collideTrees = function () {
  const p = this.pos, cols = this.w.nearColliders(p.x, p.z, this._cols), R = CFG.radius;
  for (let i = 0; i < cols.length; i++) {
    const c = cols[i];
    const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = c.r + R;
    if (d < m && d > 1e-4) {
      const gh = this.w.heightAt(c.x, c.z);
      if (p.y > gh + 7) continue;
      p.x += dx / d * (m - d); p.z += dz / d * (m - d);
      const vn = (this.vel.x * dx + this.vel.z * dz) / d;
      if (vn < 0) { this.vel.x -= dx / d * vn; this.vel.z -= dz / d * vn; }
    }
  }
};

// ---------- escalar las paredes de roca ----------
// Basta con que el pecho o las manos agarren una zona con presas
Player.prototype._grip = function (st, u, cy) {
  if (u < 0.2 || u > st.len - 0.2) return null;
  return this.w.zoneAt(st, u, cy + 0.7) || this.w.zoneAt(st, u, cy);
};

// ¿El cuerpo quedaría dentro de un bloque (una repisa) en esa posición de la pared?
Player.prototype._blocked = function (st, u, cy) {
  const w = this.w, sp = w.stripPoint(st, u, this._sp2), r = w.relief(st, u, cy, sp.amp) + 0.42;
  const x = sp.x + sp.nx * r, z = sp.z + sp.nz * r;
  return !!(w.blockAt(x, cy, z, -0.05) || w.blockAt(x, cy - 0.85, z, -0.05));
};

// Busca una pared escalable frente al jugador (o la que está tocando).
Player.prototype._findWall = function (dx, dz, mag) {
  const p = this.pos, w = this.w, cy = p.y + 1;
  let fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
  if (mag > 0.2) { const l = Math.hypot(dx, dz); fx = dx / l; fz = dz / l; }
  const hs = w.stripHits(p.x, p.z, 1.9);
  let best = null, bestGap = 1e9;
  for (let i = 0; i < hs.length; i++) {
    const h = hs[i];
    if (!h.inSpan || cy < h.y0 || cy > h.y1 + 0.6) continue;
    const gap = h.d - w.relief(h.st, h.u, cy, h.amp);
    if (gap < -0.25 || gap > 1.05) continue;
    const facing = -(fx * h.nx + fz * h.nz);
    if (facing < 0.25 && !(mag < 0.2 && this.steep && this.wallStrip === h.st)) continue;
    if (!this._grip(h.st, h.u, cy)) continue;
    if (gap < bestGap) { bestGap = gap; best = { st: h.st, u: h.u }; }
  }
  return best;
};

Player.prototype._placeOnWall = function () {
  const w = this.w, p = this.pos, st = this.cs, sp = w.stripPoint(st, this.cu, this._sp);
  const r = w.relief(st, this.cu, p.y + 1, sp.amp) + 0.42;
  p.x = sp.x + sp.nx * r; p.z = sp.z + sp.nz * r;
  this.wallN.x = sp.nx; this.wallN.y = 0; this.wallN.z = sp.nz;
  this.yaw = Math.atan2(-sp.nx, -sp.nz);
};

Player.prototype._startClimb = function (st, u, quiet) {
  const w = this.w;
  this.state = 'climb';
  this.cs = st; this.cu = u;
  this.vel.x = this.vel.y = this.vel.z = 0;
  this.grounded = false; this.steep = false; this.taut = false; this.slip = 0;
  // ¿hacia dónde crece u, visto desde el escalador? (su derecha = (nz, -nx))
  const a = w.stripPoint(st, Math.max(0, u - 0.3), this._sp2), ax = a.x, az = a.z;
  const b = w.stripPoint(st, Math.min(st.len, u + 0.3), this._sp2);
  this._placeOnWall();
  const n = this.wallN;
  this.dirU = ((b.x - ax) * n.z - (b.z - az) * n.x) >= 0 ? 1 : -1;
  if (!quiet) this.emit('grab');
};

Player.prototype._climbStep = function (dt, inp, env) {
  const p = this.pos, w = this.w, st = this.cs;
  let ix = inp.mx, iy = inp.my;
  let mag = Math.hypot(ix, iy);
  if (mag > 1) { ix /= mag; iy /= mag; mag = 1; }
  let u = this.cu, cy = p.y + 1;
  const zone = this._grip(st, u, cy);
  if (!zone) { this._release(false); return; }
  this.surf = zone.type; this.cz = zone;
  // la roca podrida se desmorona bajo las manos
  if (zone.cells) {
    const c = w.touchCell(zone, u, Math.min(cy + 0.7, zone.y1 - 0.01), dt);
    if (c && c.touch > c.hold * 0.6 && !c.warned) { c.warned = true; this.emit('crack'); }
    if (c && c.touch < 0.05) c.warned = false;
  }

  // descansar colgado de un gancho
  const an = this.anchor;
  this.resting = !!an && an.wall && mag < 0.1 && Math.hypot(an.x - p.x, an.y - cy, an.z - p.z) < 1.8;
  const T = CFG.surf[zone.type] || CFG.surf.rock;
  let drain = (CFG.staClimbIdle + CFG.staClimbMove * mag) * T.drain * (env.climbMul || 1);
  if (this.resting) drain = 0;
  if (drain > 0) this.spend(drain * dt);
  // con poca fuerza, las manos resbalan y vas bajando
  this.slip = !this.resting && this.stamina < 0.28 ? 1 - this.stamina / 0.28 : 0;

  // alcanzar y jalar: el cuerpo avanza a tirones, una mano cada vez
  const pulse = 0.5 + 0.8 * Math.abs(Math.sin(this.climbAnim));
  const sp = CFG.climbSpeed * T.speed * (this.stamina > 0 ? 1 : 0) * pulse * (1 - this.slip * 0.45);
  if (Math.abs(ix) > 0.05) {
    const nu = u + this.dirU * ix * sp * dt * 0.85;
    if (this._grip(st, nu, cy) && !this._blocked(st, nu, cy)) u = nu;
  }
  if (iy > 0.05) {
    const ny = cy + iy * sp * dt;
    if (this._grip(st, u, ny) && !this._blocked(st, u, ny)) cy = ny;
    else if (this._topOut(st, u, cy)) return;
  } else if (iy < -0.05) {
    const ny = cy + iy * sp * dt;
    const g = w.groundBelow(p.x, p.y + 0.2, p.z);
    if (ny - 1 - g < 0.05) { p.y = g; this.state = 'air'; this.grounded = true; this.fallTop = p.y; this.cs = null; this.regrabLock = 0.4; return; }
    if (this._grip(st, u, ny)) cy = ny;
  }
  if (this.slip > 0) {
    const ny = cy - this.slip * 0.4 * dt;
    if (this._grip(st, u, ny)) cy = ny;
  }
  if (env.wind) u += (env.wind.x * this.wallN.z - env.wind.z * this.wallN.x) * this.dirU * dt * 0.05;
  this.cu = u; p.y = cy - 1;
  this._placeOnWall();
  this.climbAnim += mag * dt * 3.2 * T.speed;
  this.takeoffY = p.y; this.fallTop = p.y;

  // Saltar en la pared: impulso hacia arriba (y de lado si se empuja el stick)
  if (this.bufferT > 0) {
    this.bufferT = 0;
    if (this.stamina > 0.04) {
      const n = this.wallN, rx = n.z, rz = -n.x;
      this.spend(CFG.staLunge);
      this.vel.x = n.x * CFG.lungeOut + rx * ix * 2.5;
      this.vel.y = CFG.lungeUp * (iy < -0.3 ? 0.2 : 1);
      this.vel.z = n.z * CFG.lungeOut + rz * ix * 2.5;
      this.state = 'air'; this.regrabLock = 0.18; this.airT = 0; this.cs = null;
      this.emit('lunge');
      return;
    }
  }
  if (inp.grab) this.autoHold = 0; else this.autoHold -= dt;
  if ((!inp.grab && this.autoHold <= 0) || this.stamina <= 0) this._release(this.stamina <= 0);
};

Player.prototype._release = function (tired) {
  const n = this.wallN;
  this.state = 'air'; this.resting = false; this.slip = 0; this.airT = 0;
  this.vel.x = n.x * 1.6; this.vel.y = 0; this.vel.z = n.z * 1.6;
  this.regrabLock = tired ? 0.6 : 0.25;
  this.fallTop = this.pos.y; this.takeoffY = this.pos.y;
  this.cs = null;
  this.emit('release', { tired });
};

// Subir al borde: arriba de la pared tiene que haber dónde pararse
Player.prototype._topOut = function (st, u, cy) {
  const w = this.w, sp = w.stripPoint(st, u, this._sp2), top = sp.y1;
  if (cy + 0.7 < top - 0.05) return false;
  const ex = sp.x - sp.nx * 0.8, ez = sp.z - sp.nz * 0.8;
  const ey = w.groundBelow(ex, top + 0.4, ez);
  if (ey < top - 0.6 || ey > top + 0.5) return false;
  const p = this.pos;
  this.state = 'mantle';
  this.mantle = { t: 0, dur: 0.5, sx: p.x, sy: p.y, sz: p.z, ex, ey: ey + 0.02, ez };
  this.cs = null;
  this.emit('mantle');
  return true;
};

Player.prototype._mantleStep = function (dt) {
  const m = this.mantle, p = this.pos;
  m.t += dt / (m.dur || 0.42);
  const t = Math.min(1, m.t), e = t * t * (3 - 2 * t);
  // primero sube, luego pasa el cuerpo por encima del borde
  p.x = U.lerp(m.sx, m.ex, U.smooth(0.25, 1, t));
  p.z = U.lerp(m.sz, m.ez, U.smooth(0.25, 1, t));
  p.y = U.lerp(m.sy, m.ey, Math.min(1, e * 1.6)) + Math.sin(t * Math.PI) * 0.12;
  this.climbAnim += dt * 5;
  if (t >= 1) {
    this.state = 'air'; this.grounded = true; this.fallTop = p.y; this.takeoffY = p.y; this.airT = 0;
    this.vel.x = this.vel.y = this.vel.z = 0;
    this.groundBlock = this.w.blockTopAt(p.x, p.y, p.z);
  }
};

// ---------- garfio y tirolesa ----------
// Garfio: vuela en línea recta hasta el anillo y cae de pie en la repisa
Player.prototype.startZip = function (ring) {
  const p = this.pos, L = ring.land;
  const d = Math.hypot(L.x - p.x, L.y - p.y, L.z - p.z);
  this.zip = { t: 0, dur: Math.max(0.35, d / CFG.hookSpeed), sx: p.x, sy: p.y, sz: p.z, ring };
  this.state = 'zip'; this.cs = null;
  this.vel.x = this.vel.y = this.vel.z = 0;
  this.grounded = false;
  this.emit('hook');
};

Player.prototype._zipStep = function (dt) {
  const z = this.zip, p = this.pos, L = z.ring.land;
  z.t += dt / z.dur;
  const t = Math.min(1, z.t), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  p.x = U.lerp(z.sx, L.x, e); p.z = U.lerp(z.sz, L.z, e);
  p.y = U.lerp(z.sy, L.y, e) + Math.sin(t * Math.PI) * 1.5;
  this.climbAnim += dt * 6;
  this.yaw = Math.atan2(L.x - z.sx, L.z - z.sz);
  if (t >= 1) { this.state = 'air'; this.grounded = true; this.fallTop = p.y; this.takeoffY = p.y; this.airT = 0; }
};

// Tirolesa: colgado del cable, la gravedad te acelera
Player.prototype.startRide = function (zl) {
  const A = zl.a, B = zl.b;
  this.ride = { zl, t: 0, v: 3, len: Math.hypot(B.x - A.x, B.y - A.y, B.z - A.z) };
  this.state = 'ride'; this.cs = null;
  this.vel.x = this.vel.y = this.vel.z = 0;
  this.grounded = false;
  this.emit('ride');
};

Player.prototype._rideStep = function (dt) {
  const r = this.ride, A = r.zl.a, B = r.zl.b, p = this.pos;
  const slope = (A.y - B.y) / r.len;
  r.v = Math.min(14, r.v + (2.5 + slope * CFG.gravity) * dt);
  r.t += r.v * dt / r.len;
  const t = Math.min(1, r.t);
  p.x = U.lerp(A.x, B.x, t); p.z = U.lerp(A.z, B.z, t); p.y = U.lerp(A.y, B.y, t) - 2.3 + Math.sin(t * Math.PI) * -0.6;
  this.yaw = Math.atan2(B.x - A.x, B.z - A.z);
  if (t >= 1) {
    this.state = 'air'; this.airT = 0;
    const d = Math.hypot(B.x - A.x, B.z - A.z);
    this.vel.x = (B.x - A.x) / d * 3; this.vel.z = (B.z - A.z) / d * 3; this.vel.y = 1;
    this.takeoffY = p.y; this.fallTop = p.y;
    this.emit('rideEnd');
  }
};

// Un golpe (roca, vapor) te suelta de la pared y te empuja
Player.prototype.knock = function (vx, vy, vz) {
  if (this.state === 'ascend' || this.state === 'zip' || this.state === 'ride') return;
  this.state = 'air'; this.resting = false; this.grounded = false; this.cs = null; this.airT = 0;
  this.vel.x = vx; this.vel.y = vy; this.vel.z = vz;
  this.regrabLock = 0.5; this.fallTop = this.pos.y; this.takeoffY = this.pos.y;
  this.emit('knock');
};
