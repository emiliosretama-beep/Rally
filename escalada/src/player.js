// Escalador: movimiento, escalada, resistencia y afecciones. Sin Three.js.
'use strict';

function Player(world) {
  this.w = world;
  this.pos = { x: 0, y: 0, z: 0 };
  this.prev = { x: 0, y: 0, z: 0 };
  this.vel = { x: 0, y: 0, z: 0 };
  this.yaw = 0;
  this.wallN = { x: 0, y: 0, z: 1 };
  this.events = [];
  this.pitons = [];
  this._n = { x: 0, y: 1, z: 0 };
  this._n2 = { x: 0, y: 1, z: 0 };
  this._cols = [];
  this.reset(world.start.x, world.start.y, world.start.z, world.start.yaw);
  this.aff = { hunger: 0, injury: 0, cold: 0, poison: 0 };
}

Player.prototype.reset = function (x, y, z, yaw) {
  this.pos.x = x; this.pos.y = y + 0.05; this.pos.z = z;
  this.prev.x = x; this.prev.y = this.pos.y; this.prev.z = z;
  this.vel.x = this.vel.y = this.vel.z = 0;
  this.yaw = yaw || 0;
  this.state = 'air';
  this.stamina = 1; this.bonus = 0;
  this.spendT = 9; this.exhausted = false;
  this.coyoteT = 0; this.bufferT = 0; this.regrabLock = 0;
  this.grounded = false; this.steep = false;
  this.fallTop = y; this.stepDist = 0; this.animDist = 0; this.climbAnim = 0;
  this.mantle = null; this.swim = false; this.warmth = 0;
  this.lastImpact = 0; this.sprinting = false; this.onPiton = false;
};

Player.prototype.affSum = function () {
  const a = this.aff;
  return a.hunger + a.injury + a.cold + a.poison;
};
Player.prototype.maxStamina = function () { return U.clamp(1 - this.affSum(), 0, 1); };

Player.prototype.addAff = function (k, v) {
  this.aff[k] = U.clamp(this.aff[k] + v, 0, 1.2);
};

Player.prototype.spend = function (v) {
  this.spendT = 0;
  if (this.bonus > 0) { const b = Math.min(this.bonus, v); this.bonus -= b; v -= b; }
  this.stamina = Math.max(0, this.stamina - v);
  if (this.stamina <= 0) this.exhausted = true;
};

Player.prototype.emit = function (type, data) {
  const e = data || {};
  e.type = type;
  this.events.push(e);
};

// Paso fijo de simulación. inp: {mx,my,jump,grab,sprint}; yawCam: hacia dónde mira la cámara.
Player.prototype.step = function (dt, inp, yawCam, env) {
  const p = this.pos;
  this.prev.x = p.x; this.prev.y = p.y; this.prev.z = p.z;
  if (this.state === 'down') return;

  if (inp.jump) this.bufferT = CFG.jumpBuffer; else this.bufferT -= dt;
  this.regrabLock -= dt;
  this.spendT += dt;

  const maxS = this.maxStamina();
  if (this.stamina > maxS) this.stamina = maxS;

  if (this.state === 'mantle') this._mantleStep(dt);
  else if (this.state === 'climb') this._climbStep(dt, inp, env);
  else this._moveStep(dt, inp, yawCam, env);

  // Recuperar resistencia en suelo firme
  if (this.grounded && !this.sprinting && this.spendT > CFG.staRegenDelay) {
    this.stamina = Math.min(maxS, this.stamina + CFG.staRegen * dt);
  }
  if (this.onPiton) this.stamina = Math.min(maxS, this.stamina + CFG.pitonRegen * dt);
  if (this.exhausted && this.stamina > maxS * 0.3) this.exhausted = false;
  if (this.affSum() >= 1) { this.state = 'down'; this.emit('faint'); }
};

Player.prototype._moveStep = function (dt, inp, yawCam, env) {
  const p = this.pos, v = this.vel, w = this.w;
  const sy = Math.sin(yawCam), cy = Math.cos(yawCam);
  let ix = inp.mx, iy = inp.my;
  let mag = Math.hypot(ix, iy);
  if (mag > 1) { ix /= mag; iy /= mag; mag = 1; }
  // adelante = (sin, cos); derecha = (-cos, sin)
  const dx = sy * iy - cy * ix, dz = cy * iy + sy * ix;

  this.sprinting = inp.sprint && mag > 0.2 && this.grounded && !this.exhausted && this.stamina > 0 && !this.swim;
  let speed = this.sprinting ? CFG.sprintSpeed : CFG.walkSpeed;
  if (this.swim) speed *= 0.5;
  if (env.surface === 'snow') speed *= 0.9;
  if (this.sprinting) this.spend(CFG.staSprint * dt);

  const accel = this.grounded ? CFG.groundAccel : (this.swim ? 10 : CFG.airAccel);
  const tx = dx * speed, tz = dz * speed;
  let ex = tx - v.x, ez = tz - v.z;
  const el = Math.hypot(ex, ez), maxD = accel * dt;
  // En el aire no se frena del todo la inercia (solo se controla)
  if (!this.grounded && !this.swim && mag < 0.1) { ex = 0; ez = 0; }
  else if (el > maxD) { ex *= maxD / el; ez *= maxD / el; }
  v.x += ex; v.z += ez;

  if (mag > 0.15) {
    const target = Math.atan2(dx, dz);
    this.yaw += U.angDiff(this.yaw, target) * Math.min(1, dt * (this.grounded ? 14 : 6));
  }

  // Salto con coyote time y buffer
  if (this.grounded) this.coyoteT = CFG.coyote; else this.coyoteT -= dt;
  if (this.bufferT > 0 && (this.coyoteT > 0 || this.swim) && this.stamina > CFG.staJump * 0.5) {
    v.y = this.swim ? CFG.jumpVel * 0.7 : CFG.jumpVel;
    this.spend(CFG.staJump);
    this.bufferT = 0; this.coyoteT = 0; this.grounded = false;
    this.emit('jump');
  }

  v.y -= CFG.gravity * dt;
  if (env.wind) { v.x += env.wind.x * dt * (this.grounded ? 0.4 : 1); v.z += env.wind.z * dt * (this.grounded ? 0.4 : 1); }

  // Agua: flotar en la superficie
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
  const sub = Math.max(1, Math.ceil(sp * dt / 0.3));
  const h = dt / sub;
  let impact = 0;
  this.grounded = false; this.steep = false;
  for (let s = 0; s < sub; s++) {
    p.x += v.x * h; p.y += v.y * h; p.z += v.z * h;
    impact = Math.max(impact, this._collide());
  }
  this._collideTrees();

  // Pegarse al suelo al bajar pendientes caminables
  if (!this.grounded && wasGrounded && v.y <= 0.5 && !this.swim) {
    const gh = w.heightAt(p.x, p.z);
    w.normalAt(p.x, p.z, this._n);
    if (p.y - gh < 0.45 && this._n.y >= CFG.walkableNY) { p.y = gh; this.grounded = true; v.y = 0; }
  }
  // En pendiente empinada se resbala con un poco de fricción
  if (this.steep && !this.grounded) { v.x *= Math.exp(-1.2 * dt); v.z *= Math.exp(-1.2 * dt); }

  if (this.grounded) {
    if (!wasGrounded) this._land(impact);
    this.fallTop = p.y;
    const hs = Math.hypot(v.x, v.z);
    this.stepDist += hs * dt; this.animDist += hs * dt;
    const stride = this.sprinting ? 1.05 : 0.8;
    if (this.stepDist > stride) { this.stepDist = 0; this.emit('step', { speed: hs }); }
  } else {
    if (p.y > this.fallTop) this.fallTop = p.y;
    if (this.steep && impact > CFG.safeFallSpeed + 3) this._land(impact);
  }

  // ¿Agarrarse a una pared?
  // agotado: hay que recuperar un poco antes de volver a agarrarse
  const canGrab = this.exhausted ? this.stamina > 0.15 : this.stamina > 0.02;
  if (inp.grab && this.regrabLock <= 0 && !this.swim && canGrab) {
    const fall = -v.y;
    if (fall < CFG.maxGrabSpeed) {
      const wall = this._findWall(dx, dz, mag);
      if (wall) {
        if (fall > 4) this.spend(CFG.staGrabFall * fall);
        if (fall > 6) this.emit('catch', { speed: fall });
        this._startClimb(wall);
      }
    }
  }
};

Player.prototype._land = function (impact) {
  const dmg = Math.max(0, impact - CFG.safeFallSpeed) * CFG.fallDamage;
  const height = this.fallTop - this.pos.y;
  this.lastImpact = impact;
  if (impact > 6 || dmg > 0) this.emit('land', { speed: impact, dmg, height });
  if (dmg > 0) { this.addAff('injury', dmg); this.spend(dmg * 0.5); }
};

// Dos esferas (pies y pecho) contra el terreno. Devuelve la velocidad de impacto.
Player.prototype._collide = function () {
  const p = this.pos, v = this.vel, w = this.w, n = this._n, R = CFG.radius;
  let impact = 0;
  for (let it = 0; it < 3; it++) {
    let moved = false;
    for (let s = 0; s < 2; s++) {
      const oy = s === 0 ? R : 1.25;
      const cx = p.x, cy = p.y + oy, cz = p.z;
      w.normalAt(cx, cz, n);
      const d = (cy - w.heightAt(cx, cz)) * n.y;
      if (d >= R) continue;
      const push = R - d;
      const vn = v.x * n.x + v.y * n.y + v.z * n.z;
      if (n.y >= CFG.walkableNY) {
        if (s !== 0) continue;
        p.y += push / n.y;
        if (v.y < 0) { impact = Math.max(impact, -v.y); v.y = 0; }
        this.grounded = true;
      } else {
        p.x += n.x * push; p.y += n.y * push; p.z += n.z * push;
        if (vn < 0) { impact = Math.max(impact, -vn); v.x -= n.x * vn; v.y -= n.y * vn; v.z -= n.z * vn; }
        this.steep = true;
        this.wallN.x = n.x; this.wallN.y = n.y; this.wallN.z = n.z;
      }
      moved = true;
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

// Busca una pared empinada frente al jugador (o tocándolo).
Player.prototype._findWall = function (dx, dz, mag) {
  const p = this.pos, w = this.w, n = this._n2;
  let fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
  if (mag > 0.2) { fx = dx; fz = dz; const l = Math.hypot(fx, fz); fx /= l; fz /= l; }
  const tests = [0.55, 0.95];
  for (const dist of tests) for (const hy of [1.0, 0.4, 1.6]) {
    const x = p.x + fx * dist, z = p.z + fz * dist, y = p.y + hy;
    const gh = w.heightAt(x, z);
    if (gh < y - 0.1) continue;
    w.normalAt(x, z, n);
    if (n.y >= CFG.walkableNY) continue;
    return { x: n.x, y: n.y, z: n.z };
  }
  if (this.steep && this.wallN.y < CFG.walkableNY) return { x: this.wallN.x, y: this.wallN.y, z: this.wallN.z };
  return null;
};

Player.prototype._startClimb = function (n) {
  this.state = 'climb';
  this.vel.x = this.vel.y = this.vel.z = 0;
  this.wallN.x = n.x; this.wallN.y = n.y; this.wallN.z = n.z;
  const ox = this.pos.x, oy = this.pos.y, oz = this.pos.z;
  if (!this._stick()) { this.state = 'air'; this.pos.x = ox; this.pos.y = oy; this.pos.z = oz; return; }
  this.grounded = false; this.steep = false;
  this.emit('grab');
};

// Mantiene el pecho a distancia fija de la pared. En un mapa de alturas cada pared
// cruza la altura del pecho una sola vez en horizontal: se busca ese cruce con
// bisección a lo largo de la normal horizontal. Devuelve false si ya no hay pared.
Player.prototype._stick = function () {
  const p = this.pos, w = this.w, n = this._n;
  let hx = this.wallN.x, hz = this.wallN.z;
  const hl = Math.hypot(hx, hz);
  if (hl < 0.05) return false;
  hx /= hl; hz /= hl;
  const cy = p.y + 1.0;
  // f(t) = altura del terreno en (c - nh*t) menos la altura del pecho
  let lo = -2.5, hi = 3.0;
  const f = t => w.heightAt(p.x - hx * t, p.z - hz * t) - cy;
  if (f(lo) > 0) lo = -5;
  if (f(lo) > 0 || f(hi) < 0) return false;
  for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (f(m) > 0) hi = m; else lo = m; }
  const t = (lo + hi) / 2;
  const sx = p.x - hx * t, sz = p.z - hz * t;
  w.normalAt(sx, sz, n);
  // la nueva normal manda la dirección; un poco de suavizado evita temblores
  let nx = U.lerp(this.wallN.x, n.x, 0.5), ny = U.lerp(this.wallN.y, n.y, 0.5), nz = U.lerp(this.wallN.z, n.z, 0.5);
  const nl = Math.hypot(nx, ny, nz) || 1;
  this.wallN.x = nx / nl; this.wallN.y = ny / nl; this.wallN.z = nz / nl;
  const D = 0.42;
  p.x = sx + hx * D; p.z = sz + hz * D;
  return true;
};

Player.prototype._climbStep = function (dt, inp, env) {
  const p = this.pos, w = this.w, n = this.wallN;
  let ix = inp.mx, iy = inp.my;
  let mag = Math.hypot(ix, iy);
  if (mag > 1) { ix /= mag; iy /= mag; mag = 1; }
  // Derecha del jugador mirando a la pared: (nz, 0, -nx) en horizontal
  const hl = Math.hypot(n.x, n.z) || 1;
  const rx = n.z / hl, rz = -n.x / hl;

  // ¿Hay un clavo cerca?
  this.onPiton = false;
  for (const pt of this.pitons) {
    if (Math.hypot(pt.x - p.x, pt.y - (p.y + 1), pt.z - p.z) < 1.7) { this.onPiton = true; break; }
  }

  const steepK = U.lerp(0.65, 1.15, U.clamp((CFG.walkableNY - n.y) / CFG.walkableNY, 0, 1));
  let drain = (CFG.staClimbIdle + CFG.staClimbMove * mag) * steepK * (env.climbMul || 1);
  if (this.onPiton && mag < 0.1) drain = 0;
  if (drain > 0) this.spend(drain * dt);

  const sp = CFG.climbSpeed * (this.stamina > 0 ? 1 : 0);
  const ox = p.x, oy = p.y, oz = p.z;
  p.x += rx * ix * sp * dt * 0.85;
  p.z += rz * ix * sp * dt * 0.85;
  p.y += iy * sp * dt;
  if (env.wind) { p.x += env.wind.x * dt * 0.08; p.z += env.wind.z * dt * 0.08; }
  if (!this._stick()) {
    // Sin pared a la altura del pecho: si subíamos es que llegamos arriba
    if (iy > 0) {
      const fx = -n.x / hl, fz = -n.z / hl;
      const ax = ox + fx * 0.8, az = oz + fz * 0.8;
      this.state = 'mantle';
      this.mantle = { t: 0, sx: ox, sy: oy, sz: oz, ex: ax, ey: w.heightAt(ax, az) + 0.02, ez: az };
      this.emit('mantle');
      return;
    }
    p.x = ox; p.y = oy; p.z = oz;
  }
  this.climbAnim += mag * dt * 3.2;
  this.yaw = Math.atan2(-n.x, -n.z);

  // Llegar arriba: el borde termina justo encima de las manos
  const ax = p.x - n.x / hl * 0.75, az = p.z - n.z / hl * 0.75;
  const topH = w.heightAt(ax, az);
  w.normalAt(ax, az, this._n2);
  if (iy > 0.2 && topH < p.y + 1.45 && this._n2.y >= CFG.walkableNY) {
    this.state = 'mantle';
    this.mantle = { t: 0, sx: p.x, sy: p.y, sz: p.z, ex: ax, ey: topH + 0.02, ez: az };
    this.emit('mantle');
    return;
  }
  // Bajar hasta el suelo o la pared se vuelve caminable
  const footH = w.heightAt(p.x, p.z);
  w.normalAt(p.x, p.z, this._n2);
  if ((n.y >= CFG.walkableNY + 0.06) || (iy < -0.2 && p.y - footH < 0.25 && this._n2.y >= CFG.walkableNY)) {
    this.state = 'air'; this.grounded = true; this.fallTop = p.y;
    return;
  }

  // Saltar en la pared: impulso hacia arriba
  if (this.bufferT > 0) {
    this.bufferT = 0;
    if (this.stamina > 0.04) {
      this.spend(CFG.staLunge);
      const k = CFG.lungeUp;
      this.vel.x = n.x / hl * CFG.lungeOut + rx * ix * 2.5;
      this.vel.y = k;
      this.vel.z = n.z / hl * CFG.lungeOut + rz * ix * 2.5;
      this.state = 'air'; this.regrabLock = 0.22; this.fallTop = p.y;
      this.emit('lunge');
      return;
    }
  }
  if (!inp.grab || this.stamina <= 0) {
    this.state = 'air';
    this.vel.x = n.x * 1.6; this.vel.y = 0; this.vel.z = n.z * 1.6;
    this.regrabLock = this.stamina <= 0 ? 0.6 : 0.25;
    this.fallTop = p.y;
    this.emit('release', { tired: this.stamina <= 0 });
  }
};

Player.prototype._mantleStep = function (dt) {
  const m = this.mantle, p = this.pos;
  m.t += dt / 0.38;
  const t = Math.min(1, m.t), e = t * t * (3 - 2 * t);
  p.x = U.lerp(m.sx, m.ex, e);
  p.z = U.lerp(m.sz, m.ez, e);
  p.y = U.lerp(m.sy, m.ey, Math.min(1, e * 1.6)) + Math.sin(t * Math.PI) * 0.15;
  if (t >= 1) {
    this.state = 'air'; this.grounded = true; this.fallTop = p.y;
    this.vel.x = this.vel.y = this.vel.z = 0;
  }
};

Player.prototype.placePiton = function () {
  if (this.state !== 'climb') return false;
  const p = this.pos, n = this.wallN;
  this.pitons.push({ x: p.x - n.x * 0.5, y: p.y + 1.2 - n.y * 0.5, z: p.z - n.z * 0.5, nx: n.x, ny: n.y, nz: n.z });
  return true;
};
