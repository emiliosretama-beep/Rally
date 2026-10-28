// Escalador: movimiento, escalada en las paredes de la ruta, resistencia y cuerda de seguridad.
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
  this.mantle = null; this.swim = false; this.sprinting = false;
  this.cb = null; this.cf = null; this.surf = null; this.groundBlock = null; this.wallBlock = null;
  this.zip = null; this.ride = null; this.autoHold = 0;
  this.anchor = null; this.ropeLen = 2; this.takeoffY = y; this.taut = false; this.tautT = 0;
  this.resting = false;
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

  // las plataformas que se mueven te llevan con ellas
  const carry = this.state === 'climb' ? this.cb : this.grounded ? this.groundBlock : null;
  if (carry && carry.move) { p.x += carry.dx; p.y += carry.dy; p.z += carry.dz; }

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
    if (!this.taut && vr > 4) this.emit('catch', { speed: vr });
    v.x -= ux * vr; v.y -= uy * vr; v.z -= uz * vr;
  }
  v.x *= Math.exp(-0.8 * dt); v.y *= Math.exp(-0.8 * dt); v.z *= Math.exp(-0.8 * dt);
  this.taut = true;
};

// Después de una caída la cuerda te sube de vuelta al gancho
Player.prototype.startAscend = function () {
  const a = this.anchor;
  if (!a) return false;
  let tx = a.x, ty = a.y - 1, tz = a.z, climb = null;
  if (a.wall) {
    const b = this.w.blocks[a.b], n = FACE_N[a.key];
    tx = a.x + n.x * 0.3; tz = a.z + n.z * 0.3; ty = a.y - 1.0;
    climb = { b, key: a.key };
  } else {
    ty = a.ground + 0.02; tx = a.x - 0.6; tz = a.z;
  }
  this.state = 'ascend';
  this.ascend = { tx, ty, tz, climb };
  this.vel.x = this.vel.y = this.vel.z = 0;
  this.grounded = false; this.taut = false; this.tautT = 0;
  this.emit('ascend');
  return true;
};

Player.prototype._ascendStep = function (dt) {
  const s = this.ascend, p = this.pos;
  const dx = s.tx - p.x, dy = s.ty - p.y, dz = s.tz - p.z, d = Math.hypot(dx, dy, dz);
  const sp = 5 * dt;
  this.climbAnim += dt * 4;
  if (d > sp) { p.x += dx / d * sp; p.y += dy / d * sp; p.z += dz / d * sp; return; }
  p.x = s.tx; p.y = s.ty; p.z = s.tz;
  this.fallTop = p.y; this.takeoffY = p.y;
  if (s.climb) {
    this.state = 'climb'; this.cb = s.climb.b; this.cf = s.climb.key;
    const n = FACE_N[s.climb.key];
    this.wallN.x = n.x; this.wallN.y = 0; this.wallN.z = n.z;
    this.yaw = Math.atan2(-n.x, -n.z);
    this.autoHold = 2.5;
    this._placeOnFace();
    // si el gancho quedó en roca lisa, moverse a lo largo hasta donde se pueda agarrar
    const along = this.cf === 'nz' || this.cf === 'pz';
    const a0 = along ? p.x : p.z;
    let ok = !!this._surf(a0, p.y + 1);
    for (let d = 0.25; !ok && d <= 3; d += 0.25) for (const sg of [1, -1]) {
      if (ok) break;
      if (this._surf(a0 + d * sg, p.y + 1)) { if (along) p.x = a0 + d * sg; else p.z = a0 + d * sg; ok = true; }
    }
    if (!ok) { this.state = 'air'; this.regrabLock = 0.5; }
  } else { this.state = 'air'; this.grounded = true; }
  this.stamina = Math.max(this.stamina, 0.5);
};

// ---------- caminar, correr, saltar ----------
Player.prototype._moveStep = function (dt, inp, yawCam, env) {
  const p = this.pos, v = this.vel, w = this.w;
  const sy = Math.sin(yawCam), cy = Math.cos(yawCam);
  let ix = inp.mx, iy = inp.my;
  let mag = Math.hypot(ix, iy);
  if (mag > 1) { ix /= mag; iy /= mag; mag = 1; }
  const dx = sy * iy - cy * ix, dz = cy * iy + sy * ix;

  this.sprinting = inp.sprint && mag > 0.2 && this.grounded && !this.exhausted && this.stamina > 0 && !this.swim;
  let speed = this.sprinting ? CFG.sprintSpeed : CFG.walkSpeed;
  if (this.swim) speed *= 0.5;
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
  if (env.wind) { const k = this.grounded ? 0.55 : 1; v.x += env.wind.x * dt * k; v.z += env.wind.z * dt * k; }

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
  this.grounded = false; this.steep = false; this.groundBlock = null; this.wallBlock = null;
  for (let s = 0; s < sub; s++) {
    p.x += v.x * h; p.y += v.y * h; p.z += v.z * h;
    impact = Math.max(impact, this._collide());
  }
  this._collideTrees();

  // Pegarse al suelo al bajar pendientes caminables (no al saltar)
  if (!this.grounded && wasGrounded && v.y <= 0.5 && !this.swim) {
    const gh = w.groundBelow(p.x, p.y + 0.3, p.z);
    w.normalAt(p.x, p.z, this._n);
    if (p.y - gh < 0.35 && p.y - gh > -0.3 && (this._n.y >= CFG.walkableNY || gh > w.heightAt(p.x, p.z) + 0.01)) { p.y = gh; this.grounded = true; v.y = 0; }
  }
  if (this.steep && !this.grounded) { v.x *= Math.exp(-1.2 * dt); v.z *= Math.exp(-1.2 * dt); }

  this._rope(dt);

  if (this.grounded) {
    if (!wasGrounded && impact > 6) this.emit('land', { speed: impact, height: this.fallTop - p.y });
    this.fallTop = p.y;
    if (this.groundBlock) w.touchBlock(this.groundBlock, dt);
    const hs = Math.hypot(v.x, v.z);
    this.stepDist += hs * dt; this.animDist += hs * dt;
    if (this.stepDist > (this.sprinting ? 1.05 : 0.8)) { this.stepDist = 0; this.emit('step', { speed: hs }); }
  } else if (p.y > this.fallTop) this.fallTop = p.y;

  if (this.taut) {
    this.tautT += dt;
    if (this.tautT > 0.9 && Math.hypot(v.x, v.y, v.z) < 3) this.startAscend();
  }

  // ¿Agarrarse a una pared?
  const canGrab = this.exhausted ? this.stamina > 0.15 : this.stamina > 0.02;
  if (inp.grab && this.regrabLock <= 0 && !this.swim && canGrab && -v.y < CFG.maxGrabSpeed) {
    const wall = this._findWall(dx, dz, mag);
    if (wall) {
      const fall = -v.y;
      if (fall > 4) { this.spend(CFG.staGrabFall * fall); if (fall > 6) this.emit('catchWall', { speed: fall }); }
      this._startClimb(wall.b, wall.key);
    }
  }
};

// Esferas (pies y pecho) contra el terreno y los bloques. Devuelve la velocidad de impacto.
Player.prototype._collide = function () {
  const p = this.pos, v = this.vel, w = this.w, n = this._n, R = CFG.radius;
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
      // bloques
      for (let k = 0; k < blocks.length; k++) {
        const b = blocks[k];
        cx = p.x; cy = p.y + oy; cz = p.z;
        if (cx < b.x0 - R || cx > b.x1 + R || cz < b.z0 - R || cz > b.z1 + R || cy < b.y0 - R || cy > b.y1 + R) continue;
        const qx = U.clamp(cx, b.x0, b.x1), qy = U.clamp(cy, b.y0, b.y1), qz = U.clamp(cz, b.z0, b.z1);
        let nx = cx - qx, ny = cy - qy, nz = cz - qz, dd = Math.hypot(nx, ny, nz), pen;
        if (dd > 1e-5) { if (dd >= R) continue; nx /= dd; ny /= dd; nz /= dd; pen = R - dd; }
        else {
          // el centro quedó dentro: salir por el lado más cercano
          const o = [[cx - b.x0, -1, 0, 0], [b.x1 - cx, 1, 0, 0], [cy - b.y0, 0, -1, 0], [b.y1 - cy, 0, 1, 0], [cz - b.z0, 0, 0, -1], [b.z1 - cz, 0, 0, 1]];
          o.sort((a, c) => a[0] - c[0]);
          nx = o[0][1]; ny = o[0][2]; nz = o[0][3]; pen = o[0][0] + R;
        }
        if (ny >= CFG.walkableNY) {
          if (s !== 0) continue; // solo los pies se apoyan en el techo de un bloque
          p.y += pen * ny; p.x += nx * pen; p.z += nz * pen;
          if (v.y < 0) { impact = Math.max(impact, -v.y); v.y = 0; }
          this.grounded = true; this.groundBlock = b;
        } else {
          p.x += nx * pen; p.y += ny * pen; p.z += nz * pen;
          const vn = v.x * nx + v.y * ny + v.z * nz;
          if (vn < 0) { if (ny > -0.5) impact = Math.max(impact, -vn); v.x -= nx * vn; v.y -= ny * vn; v.z -= nz * vn; }
          if (Math.abs(ny) < 0.3) { this.steep = true; this.wallBlock = b; this.wallN.x = nx; this.wallN.y = 0; this.wallN.z = nz; }
        }
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

// ---------- escalar las paredes de la ruta ----------
function faceKeyOf(nx, nz) { return Math.abs(nx) > Math.abs(nz) ? (nx > 0 ? 'px' : 'nx') : (nz > 0 ? 'pz' : 'nz'); }
function alongOf(key, x, z) { return key === 'nz' || key === 'pz' ? x : z; }

// ¿Se puede estar en esta cara con el pecho en (a, y)? Basta con que el pecho o las manos agarren.
Player.prototype._surf = function (a, y) {
  const w = this.w, key = this.cf, plane = w.facePlane(this.cb, key);
  const s1 = w.faceSurf(key, plane, a, y + 0.7);
  if (s1 && s1.type) return s1;
  const s0 = w.faceSurf(key, plane, a, y);
  if (s0 && s0.type) return s0;
  return null;
};

// Busca una pared escalable frente al jugador (o la que está tocando).
Player.prototype._findWall = function (dx, dz, mag) {
  const p = this.pos, w = this.w;
  let fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
  if (mag > 0.2) { const l = Math.hypot(dx, dz); fx = dx / l; fz = dz / l; }
  const tryFace = (b, key) => {
    const plane = w.facePlane(b, key), a = alongOf(key, p.x, p.z), y = p.y + 1;
    for (const yy of [y + 0.7, y]) { const s = w.faceSurf(key, plane, a, yy); if (s && s.type) return { b: s.b, key }; }
    return null;
  };
  for (const dist of [0.5, 0.9]) for (const hy of [1.0, 1.6, 0.4]) {
    const x = p.x + fx * dist, y = p.y + hy, z = p.z + fz * dist;
    const b = w.blockAt(x, y, z, 0.02);
    if (!b) continue;
    // la cara de ese bloque que mira hacia el jugador
    const ox = p.x < b.x0 ? b.x0 - p.x : p.x > b.x1 ? p.x - b.x1 : -1;
    const oz = p.z < b.z0 ? b.z0 - p.z : p.z > b.z1 ? p.z - b.z1 : -1;
    let key = null;
    if (ox > 0 && ox >= oz) key = p.x < b.x0 ? 'nx' : 'px';
    else if (oz > 0) key = p.z < b.z0 ? 'nz' : 'pz';
    if (!key) continue;
    const r = tryFace(b, key);
    if (r) return r;
  }
  if (this.steep && this.wallBlock) {
    const key = faceKeyOf(this.wallN.x, this.wallN.z);
    return tryFace(this.wallBlock, key);
  }
  return null;
};

Player.prototype._placeOnFace = function () {
  const p = this.pos, n = FACE_N[this.cf], plane = this.w.facePlane(this.cb, this.cf), D = 0.42;
  if (this.cf === 'nx' || this.cf === 'px') p.x = plane + n.x * D; else p.z = plane + n.z * D;
};

Player.prototype._startClimb = function (b, key) {
  this.state = 'climb';
  this.cb = b; this.cf = key;
  const n = FACE_N[key];
  this.wallN.x = n.x; this.wallN.y = 0; this.wallN.z = n.z;
  this.vel.x = this.vel.y = this.vel.z = 0;
  this.grounded = false; this.steep = false; this.taut = false;
  this.yaw = Math.atan2(-n.x, -n.z);
  this._placeOnFace();
  this.emit('grab');
};

Player.prototype._climbStep = function (dt, inp, env) {
  const p = this.pos, w = this.w, key = this.cf, n = FACE_N[key];
  if (!this.cb || this.cb.broken) { this._release(n, true); return; }
  let ix = inp.mx, iy = inp.my;
  let mag = Math.hypot(ix, iy);
  if (mag > 1) { ix /= mag; iy /= mag; mag = 1; }
  // derecha del jugador mirando a la pared: (nz, 0, -nx)
  const rx = n.z, rz = -n.x;
  const dirA = (key === 'nz' || key === 'pz') ? rx : rz;
  let a = alongOf(key, p.x, p.z), y = p.y + 1;
  const here = this._surf(a, y);
  if (!here) { this._release(n, false); return; }
  this.cb = here.b;
  this.surf = here.type;
  w.touchBlock(here.b, dt);

  // descansar colgado de un gancho
  const an = this.anchor;
  this.resting = !!an && an.wall && mag < 0.1 && Math.hypot(an.x - p.x, an.y - y, an.z - p.z) < 1.8;
  const T = CFG.surf[here.type] || CFG.surf.rock;
  let drain = (CFG.staClimbIdle + CFG.staClimbMove * mag) * T.drain * (env.climbMul || 1);
  if (this.resting) drain = 0;
  if (drain > 0) this.spend(drain * dt);

  const sp = CFG.climbSpeed * T.speed * (this.stamina > 0 ? 1 : 0);
  // a lo largo de la pared
  if (Math.abs(ix) > 0.05) {
    const na = a + dirA * ix * sp * dt * 0.85;
    if (this._surf(na, y)) a = na;
  }
  // arriba y abajo
  if (iy > 0.05) {
    const ny = y + iy * sp * dt;
    if (this._surf(a, ny)) y = ny;
    else if (this._topOut(a, y)) return;
  } else if (iy < -0.05) {
    const ny = y + iy * sp * dt;
    const g = w.groundBelow(p.x, p.y + 0.2, p.z);
    if (ny - 1 - g < 0.05) { p.y = g; this.state = 'air'; this.grounded = true; this.fallTop = p.y; return; }
    if (this._surf(a, ny)) y = ny;
  }
  if (env.wind) a += (env.wind.x * rx + env.wind.z * rz) * dirA * dt * 0.05;
  if (key === 'nz' || key === 'pz') p.x = a; else p.z = a;
  p.y = y - 1;
  this._placeOnFace();
  this.climbAnim += mag * dt * 3.2 * T.speed;
  this.yaw = Math.atan2(-n.x, -n.z);
  this.takeoffY = p.y;

  // Saltar en la pared: impulso hacia arriba
  if (this.bufferT > 0) {
    this.bufferT = 0;
    if (this.stamina > 0.04) {
      this.spend(CFG.staLunge);
      this.vel.x = n.x * CFG.lungeOut + rx * ix * 2.5;
      this.vel.y = CFG.lungeUp;
      this.vel.z = n.z * CFG.lungeOut + rz * ix * 2.5;
      this.state = 'air'; this.regrabLock = 0.18; this.fallTop = p.y; this.takeoffY = p.y;
      this.emit('lunge');
      return;
    }
  }
  if (inp.grab) this.autoHold = 0; else this.autoHold -= dt;
  if ((!inp.grab && this.autoHold <= 0) || this.stamina <= 0) this._release(n, this.stamina <= 0);
};

Player.prototype._release = function (n, tired) {
  this.state = 'air'; this.resting = false;
  this.vel.x = n.x * 1.6; this.vel.y = 0; this.vel.z = n.z * 1.6;
  this.regrabLock = tired ? 0.6 : 0.25;
  this.fallTop = this.pos.y; this.takeoffY = this.pos.y;
  this.emit('release', { tired });
};

// Subir al borde: arriba de la pared tiene que haber dónde pararse
Player.prototype._topOut = function (a, y) {
  const w = this.w, key = this.cf, n = FACE_N[key], b = this.cb, plane = w.facePlane(b, key);
  if (y + 0.7 < b.y1 - 0.05) return false;
  if (w.faceSurf(key, plane, a, b.y1 + 0.4)) return false; // hay más pared encima
  const ex = (key === 'nz' || key === 'pz') ? a : plane - n.x * 0.75;
  const ez = (key === 'nz' || key === 'pz') ? plane - n.z * 0.75 : a;
  const ey = w.groundBelow(ex, b.y1 + 0.3, ez);
  if (ey < b.y1 - 0.6) return false;
  const p = this.pos;
  this.state = 'mantle';
  this.mantle = { t: 0, sx: p.x, sy: p.y, sz: p.z, ex, ey: ey + 0.02, ez };
  this.emit('mantle');
  return true;
};

Player.prototype._mantleStep = function (dt) {
  const m = this.mantle, p = this.pos;
  m.t += dt / 0.38;
  const t = Math.min(1, m.t), e = t * t * (3 - 2 * t);
  p.x = U.lerp(m.sx, m.ex, e);
  p.z = U.lerp(m.sz, m.ez, e);
  p.y = U.lerp(m.sy, m.ey, Math.min(1, e * 1.6)) + Math.sin(t * Math.PI) * 0.15;
  if (t >= 1) {
    this.state = 'air'; this.grounded = true; this.fallTop = p.y; this.takeoffY = p.y;
    this.vel.x = this.vel.y = this.vel.z = 0;
  }
};

// ---------- garfio y tirolesa ----------
// Garfio: vuela en línea recta hasta el anillo y cae de pie en la repisa
Player.prototype.startZip = function (ring) {
  const p = this.pos, L = ring.land;
  const d = Math.hypot(L.x - p.x, L.y - p.y, L.z - p.z);
  this.zip = { t: 0, dur: Math.max(0.35, d / CFG.hookSpeed), sx: p.x, sy: p.y, sz: p.z, ring };
  this.state = 'zip';
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
  if (t >= 1) { this.state = 'air'; this.grounded = true; this.fallTop = p.y; this.takeoffY = p.y; }
};

// Tirolesa: colgado del cable, la gravedad te acelera
Player.prototype.startRide = function (zl) {
  const A = zl.a, B = zl.b;
  this.ride = { zl, t: 0, v: 3, len: Math.hypot(B.x - A.x, B.y - A.y, B.z - A.z) };
  this.state = 'ride';
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
    this.state = 'air';
    const d = Math.hypot(B.x - A.x, B.z - A.z);
    this.vel.x = (B.x - A.x) / d * 3; this.vel.z = (B.z - A.z) / d * 3; this.vel.y = 1;
    this.takeoffY = p.y; this.fallTop = p.y;
    this.emit('rideEnd');
  }
};

// Un golpe (roca, vapor) te suelta de la pared y te empuja
Player.prototype.knock = function (vx, vy, vz) {
  if (this.state === 'ascend' || this.state === 'zip' || this.state === 'ride') return;
  this.state = 'air'; this.resting = false; this.grounded = false;
  this.vel.x = vx; this.vel.y = vy; this.vel.z = vz;
  this.regrabLock = 0.5; this.fallTop = this.pos.y; this.takeoffY = this.pos.y;
  this.emit('knock');
};
