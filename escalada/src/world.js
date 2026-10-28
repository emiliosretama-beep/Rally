// Generación de la isla-volcán: mapa de alturas, biomas y objetos colocados.
// Solo datos y consultas; nada de Three.js aquí.
'use strict';

function World(seed) {
  this.seed = seed;
  const N = CFG.N, C = CFG.CELL;
  this.N = N; this.C = C;
  this.half = N * C / 2;
  this.h = new Float32Array((N + 1) * (N + 1));
  this.rng = U.rng(seed ^ 0x9e3779b9);
  this.noise = U.makeNoise(seed);
  this.noise2 = U.makeNoise(seed + 77);
  this.startAng = -Math.PI / 2;
  this._generate();
}

World.prototype._rawHeight = function (x, z) {
  const nz = this.noise, n2 = this.noise2;
  const r = Math.hypot(x, z), ang = Math.atan2(z, x);
  const wob = nz.fbm(Math.cos(ang) * 1.3 + 5, Math.sin(ang) * 1.3 + 5, 3) * 0.16 + nz.fbm(x * 0.006 + 9, z * 0.006, 3) * 0.10;
  const rr = r * (1 + wob);
  const SH = CFG.SHORE_R, BR = CFG.BASE_R, CR = CFG.CRATER_R, PH = CFG.PEAK_H;
  if (rr > SH) return Math.max(-14, -1.5 - (rr - SH) * 0.35);
  if (rr > BR) {
    const t = (SH - rr) / (SH - BR);
    return t * 4.5 + nz.fbm(x * 0.05, z * 0.05, 2) * 0.6 * t;
  }
  // Interior del cráter: pared interna empinada hacia el lago de lava.
  const rimNoise = n2.fbm(Math.cos(ang) * 2 + 3, Math.sin(ang) * 2 + 3, 3) * 14;
  if (rr < CR) {
    const k = U.smooth(0, CR * 0.75, CR - rr);
    return PH + rimNoise - (PH + rimNoise - (CFG.LAVA_H - 8)) * k;
  }
  const u = (BR - rr) / (BR - CR);
  let h = 4.5 + (PH - 4.5) * Math.pow(u, 1.35);
  h += rimNoise * U.smooth(0.82, 1, u);
  h += nz.fbm(x * 0.02, z * 0.02, 4) * (4 + 9 * u);
  // Terrazas: repisas casi planas separadas por paredes.
  const step = 14;
  const ph = n2.fbm(x * 0.01 + 40, z * 0.01, 3) * 9;
  const t = (h + ph) / step;
  const i = Math.floor(t), f = t - i;
  const sharp = U.clamp(0.62 + n2.fbm(x * 0.013, z * 0.013 + 20, 3) * 0.9, 0.25, 1);
  const w = U.lerp(0.45, 0.14, sharp);
  const g = 0.16 * f + 0.84 * U.smooth(1 - w, 1, f);
  const hTer = (i + g) * step - ph;
  // Cerca de la costa las terrazas se suavizan para que la playa sea caminable.
  const fade = U.smooth(0.0, 0.12, u);
  return U.lerp(h, hTer, sharp * fade);
};

World.prototype._generate = function () {
  const N = this.N, C = this.C, half = this.half, H = this.h;
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    H[j * (N + 1) + i] = this._rawHeight(i * C - half, j * C - half);
  }
  this.colliders = [];        // troncos: {x,z,r}
  this.grid = new Map();      // rejilla espacial de colisionadores
  this.campfires = [];
  this.pickups = [];          // objetos sueltos y maletas
  this.bushes = [];
  this.vents = [];
  this.trees = { palm: [], jungle: [], pine: [] };
  this.rocks = [];
  this._placeCampfires();
  this._findSummit();
  this._placeStuff();
};

// --- Consultas de altura (misma triangulación que la malla) ---
World.prototype.heightAt = function (x, z) {
  const N = this.N, C = this.C;
  let gx = (x + this.half) / C, gz = (z + this.half) / C;
  if (gx < 0) gx = 0; else if (gx > N - 0.0001) gx = N - 0.0001;
  if (gz < 0) gz = 0; else if (gz > N - 0.0001) gz = N - 0.0001;
  const i = gx | 0, j = gz | 0, fx = gx - i, fz = gz - j;
  const H = this.h, W = N + 1, k = j * W + i;
  const h00 = H[k], h10 = H[k + 1], h01 = H[k + W], h11 = H[k + W + 1];
  if (fx > fz) return h00 + (h10 - h00) * fx + (h11 - h10) * fz;
  return h00 + (h11 - h01) * fx + (h01 - h00) * fz;
};

// Normal suavizada (diferencias centrales). Escribe en out {x,y,z}.
World.prototype.normalAt = function (x, z, out, e) {
  e = e || 0.75;
  const dx = (this.heightAt(x + e, z) - this.heightAt(x - e, z)) / (2 * e);
  const dz = (this.heightAt(x, z + e) - this.heightAt(x, z - e)) / (2 * e);
  const l = Math.sqrt(dx * dx + 1 + dz * dz);
  out.x = -dx / l; out.y = 1 / l; out.z = -dz / l;
  return out;
};

World.prototype.biomeIndex = function (y) {
  const B = CFG.BIOMES;
  for (let i = 0; i < B.length; i++) if (y < B[i].top) return i;
  return B.length - 1;
};

World.prototype.surfaceAt = function (x, y, z, ny) {
  if (y < 7 && Math.hypot(x, z) > CFG.BASE_R - 25) return 'sand';
  if (ny < 0.8) return 'rock';
  const b = this.biomeIndex(y);
  if (b === 2) return 'snow';
  if (b === 3) return 'ash';
  if (b === 0 && y < 10) return 'sand';
  return 'grass';
};

World.prototype._slopeCell = function (i, j) {
  const N = this.N, H = this.h, W = N + 1;
  if (i < 1 || j < 1 || i >= N - 1 || j >= N - 1) return 9;
  const k = j * W + i;
  const dx = (H[k + 1] - H[k - 1]) / (2 * this.C), dz = (H[k + W] - H[k - W]) / (2 * this.C);
  return Math.sqrt(dx * dx + dz * dz);
};

// Aplana un disco (para fogatas y el campamento) mezclando con el borde.
World.prototype._flatten = function (x, z, rad, hy) {
  const N = this.N, C = this.C, W = N + 1, H = this.h;
  const r2 = rad + 3;
  const i0 = Math.max(0, Math.floor((x - r2 + this.half) / C)), i1 = Math.min(N, Math.ceil((x + r2 + this.half) / C));
  const j0 = Math.max(0, Math.floor((z - r2 + this.half) / C)), j1 = Math.min(N, Math.ceil((z + r2 + this.half) / C));
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const px = i * C - this.half, pz = j * C - this.half;
    const d = Math.hypot(px - x, pz - z);
    const k = 1 - U.smooth(rad, r2, d);
    if (k > 0) H[j * W + i] = U.lerp(H[j * W + i], hy, k);
  }
};

World.prototype._placeCampfires = function () {
  const N = this.N, C = this.C, W = N + 1, H = this.h, rng = this.rng;
  // Campamento inicial en la playa, junto al avión.
  const sa = this.startAng;
  const sx = Math.cos(sa) * (CFG.BASE_R + 4), sz = Math.sin(sa) * (CFG.BASE_R + 4);
  const sh = Math.max(1.2, this.heightAt(sx, sz));
  this._flatten(sx, sz, 7, sh);
  this.start = { x: sx, y: sh, z: sz, yaw: Math.atan2(-sx, -sz) };
  this.campfires.push({ x: sx + 3, y: sh, z: sz - 1, lit: true, biome: 0, start: true });
  let prefAng = sa;
  for (let b = 1; b < CFG.BIOMES.length; b++) {
    const hf = CFG.BIOMES[b].fire;
    prefAng += (rng() - 0.5) * 1.1;
    let best = null, bestScore = 1e9;
    for (let j = 2; j < N - 2; j++) for (let i = 2; i < N - 2; i++) {
      const hy = H[j * W + i];
      if (hy < hf - 2 || hy > hf + 6) continue;
      const sl = this._slopeCell(i, j);
      if (sl > 0.35) continue;
      const px = i * C - this.half, pz = j * C - this.half;
      const ad = Math.abs(U.angDiff(Math.atan2(pz, px), prefAng));
      const score = ad * 30 + sl * 40 + Math.abs(hy - (hf + 1)) * 0.8;
      if (score < bestScore) { bestScore = score; best = { x: px, z: pz, y: hy }; }
    }
    if (!best) { // si no hay repisa, se fuerza una en el ángulo preferido
      const rr = this._radiusForHeight(hf + 1, prefAng);
      best = { x: Math.cos(prefAng) * rr, z: Math.sin(prefAng) * rr, y: hf + 1 };
    }
    this._flatten(best.x, best.z, 4.5, best.y);
    this.campfires.push({ x: best.x, y: best.y, z: best.z, lit: false, biome: b });
    prefAng = Math.atan2(best.z, best.x);
  }
};

World.prototype._radiusForHeight = function (hy, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  for (let r = CFG.BASE_R; r > CFG.CRATER_R; r -= 1) if (this.heightAt(c * r, s * r) >= hy) return r;
  return CFG.CRATER_R + 2;
};

World.prototype._findSummit = function () {
  let best = null;
  for (let a = 0; a < Math.PI * 2; a += 0.02) {
    for (let r = CFG.CRATER_R - 6; r < CFG.CRATER_R + 14; r += 1) {
      const x = Math.cos(a) * r, z = Math.sin(a) * r, y = this.heightAt(x, z);
      if (!best || y > best.y) best = { x, y, z };
    }
  }
  this._flatten(best.x, best.z, 2.5, best.y);
  best.y = this.heightAt(best.x, best.z);
  this.summit = best;
};

World.prototype._addCollider = function (x, z, r) {
  const c = { x, z, r };
  this.colliders.push(c);
  const key = ((x / 8) | 0) + ',' + ((z / 8) | 0);
  let arr = this.grid.get(key);
  if (!arr) { arr = []; this.grid.set(key, arr); }
  arr.push(c);
};

World.prototype.nearColliders = function (x, z, out) {
  out.length = 0;
  const gx = (x / 8) | 0, gz = (z / 8) | 0;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const arr = this.grid.get((gx + dx) + ',' + (gz + dz));
    if (arr) for (let k = 0; k < arr.length; k++) out.push(arr[k]);
  }
  return out;
};

World.prototype._randomSpot = function (minH, maxH, maxSlope, tries) {
  const rng = this.rng, nv = { x: 0, y: 0, z: 0 };
  for (let t = 0; t < (tries || 60); t++) {
    const a = rng() * Math.PI * 2, r = CFG.CRATER_R + rng() * (CFG.SHORE_R - CFG.CRATER_R);
    const x = Math.cos(a) * r, z = Math.sin(a) * r, y = this.heightAt(x, z);
    if (y < minH || y > maxH) continue;
    this.normalAt(x, z, nv, 1);
    if (nv.y < maxSlope) continue;
    if (this._nearFire(x, z, 7)) continue;
    return { x, y, z };
  }
  return null;
};

World.prototype._nearFire = function (x, z, d) {
  for (const f of this.campfires) if (Math.hypot(f.x - x, f.z - z) < d) return true;
  return Math.hypot(this.start.x - x, this.start.z - z) < d + 4;
};

World.prototype._pickLoot = function (biomeId) {
  const table = LOOT[biomeId];
  let total = 0;
  for (const k in table) total += table[k];
  let r = this.rng() * total;
  for (const k in table) { r -= table[k]; if (r <= 0) return k; }
  return 'granola';
};

World.prototype._placeStuff = function () {
  const rng = this.rng, B = CFG.BIOMES;
  // Árboles
  const tree = (kind, n, minH, maxH, rad) => {
    for (let k = 0; k < n; k++) {
      const p = this._randomSpot(minH, maxH, 0.8, 30);
      if (!p) continue;
      const s = 0.8 + rng() * 0.6;
      this.trees[kind].push({ x: p.x, y: p.y, z: p.z, s, rot: rng() * 6.28 });
      this._addCollider(p.x, p.z, rad * s);
    }
  };
  tree('palm', 140, 1.2, 30, 0.3);
  tree('jungle', 650, B[0].top - 6, B[1].top, 0.45);
  tree('pine', 300, B[1].top - 8, B[2].top - 30, 0.35);
  // Rocas decorativas (sin colisión, medio enterradas)
  for (let k = 0; k < 520; k++) {
    const p = this._randomSpot(0.5, CFG.PEAK_H + 20, 0.55, 10);
    if (p) this.rocks.push({ x: p.x, y: p.y, z: p.z, s: 0.4 + rng() * rng() * 2.6, rot: rng() * 6.28, b: this.biomeIndex(p.y) });
  }
  // Avión estrellado junto al campamento
  const s = this.start;
  const fa = this.startAng + Math.PI / 2;
  this.wreck = { x: s.x + Math.cos(fa) * 9, z: s.z + Math.sin(fa) * 9, y: 0, rot: fa + 0.4 };
  this.wreck.y = this.heightAt(this.wreck.x, this.wreck.z);
  this._addCollider(this.wreck.x, this.wreck.z, 2.2);
  // Maletas del avión cerca del inicio
  for (let k = 0; k < 4; k++) {
    const a = rng() * 6.28, d = 6 + rng() * 10;
    const x = s.x + Math.cos(a) * d, z = s.z + Math.sin(a) * d;
    this.pickups.push({ kind: 'case', x, z, y: this.heightAt(x, z), loot: this._pickLoot('shore'), taken: false });
  }
  // Maletas repartidas por bioma
  const cases = [5, 8, 8, 6];
  for (let b = 0; b < 4; b++) {
    const minH = b === 0 ? 2 : B[b - 1].top, maxH = b === 3 ? CFG.PEAK_H + 10 : B[b].top;
    for (let k = 0; k < cases[b]; k++) {
      const p = this._randomSpot(minH, maxH, 0.85, 80);
      if (p) this.pickups.push({ kind: 'case', x: p.x, z: p.z, y: p.y, loot: this._pickLoot(B[b].id), taken: false });
    }
  }
  // Cocos bajo algunas palmeras
  const palms = this.trees.palm;
  for (let k = 0; k < Math.min(36, palms.length); k++) {
    const t = palms[(rng() * palms.length) | 0];
    const a = rng() * 6.28, x = t.x + Math.cos(a) * 1.3, z = t.z + Math.sin(a) * 1.3;
    this.pickups.push({ kind: 'item', item: 'coconut', x, z, y: this.heightAt(x, z), taken: false });
  }
  // Arbustos de bayas en la selva
  for (let k = 0; k < 70; k++) {
    const p = this._randomSpot(B[0].top - 4, B[1].top, 0.8, 30);
    if (p) this.bushes.push({ x: p.x, y: p.y, z: p.z, mys: rng() < 0.45, berries: 1 + (rng() < 0.4 ? 1 : 0) });
  }
  // Fumarolas en la caldera
  for (let k = 0; k < 16; k++) {
    const p = this._randomSpot(B[2].top + 4, CFG.PEAK_H + 6, 0.7, 80);
    if (p) this.vents.push({ x: p.x, y: p.y, z: p.z, t: rng() * 8, period: 6 + rng() * 5 });
  }
  // Clavos garantizados en la primera fogata alta, para enseñar a usarlos
  const f1 = this.campfires[1];
  this.pickups.push({ kind: 'item', item: 'piton', x: f1.x + 2, z: f1.z + 1.5, y: this.heightAt(f1.x + 2, f1.z + 1.5), taken: false });
};
