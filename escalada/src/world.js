// La isla-volcán y sus barrancos: mapa de alturas, paredes de roca (franjas), bloques y peligros.
// Solo datos y consultas; nada de Three.js aquí.
'use strict';

const SGRID = 6;             // celda de la rejilla de paredes (m)

function World(mid) {
  const mtn = MOUNTAINS[mid] || MOUNTAINS.volcano;
  this.mtn = mtn; this.snow = mtn.kind === 'snow';
  CFG.BIOMES = mtn.biomes.map(b => Object.assign({}, b));
  Object.assign(CFG, mtn.cfg);
  const seed = mtn.seed;
  this.seed = seed;
  const N = mtn.N, C = mtn.CELL;
  this.N = N; this.C = C;
  this.half = N * C / 2;
  this.rimOut = C * 1.45;     // el suelo sigue bajo la repisa: la rampa del terreno queda tapada
  this.h = new Float32Array((N + 1) * (N + 1));
  this.rng = U.rng(seed ^ 0x9e3779b9);
  this.noise = U.makeNoise(seed);
  this.noise2 = U.makeNoise(seed + 77);
  this.t = 0;
  this._sp = { x: 0, z: 0, nx: 0, nz: 0, y0: 0, y1: 0, amp: 0 };
  this._useRoute(mtn.route());
  this._generate();
}

// Toma la ruta: biomas por altura según las fogatas, cráter tras la cumbre
World.prototype._useRoute = function (R) {
  this.route = R;
  this.gorges = R.gorges; this.strips = R.strips; this.blocks = R.blocks;
  this.rings = R.rings; this.zips = R.zips; this.winds = R.winds; this.falls = R.falls;
  this.rails = R.rails; this.posts = R.posts; this.cables = R.cables; this.camps = R.camps;
  this.challenges = R.challenges; this.checkpoints = R.checkpoints;
  this.summit = R.summit; this.crater = R.crater;
  const cp = R.checkpoints;
  for (let i = 0; i < CFG.BIOMES.length - 1; i++) CFG.BIOMES[i].top = cp[i + 1].y + 2;
  CFG.PEAK_H = R.summit.y + 4;
  CFG.CRATER_R = R.crater ? R.crater.r : 0;
  CFG.LAVA_H = R.summit.y - 26;
  this.lines = R.lines; this.ladders = R.ladders; this.icefallDefs = R.icefalls; this.npcPath = R.npc; this.peak = R.crater ? null : { x: R.summit.x, z: R.summit.z };
  this.campfires = cp.filter(c => !c.summit).map((c, i) => ({ x: c.x, y: c.y, z: c.z, lit: i === 0, biome: i, start: i === 0 }));
  // se empieza junto a la fogata de la playa, mirando hacia el primer barranco
  const g0 = this.gorges[0], s0 = cp[0];
  const yaw = Math.atan2(g0.samples[0].x - s0.x, g0.samples[0].z - s0.z);
  this.start = { x: s0.x + Math.sin(yaw) * 4.5, y: s0.y, z: s0.z + Math.cos(yaw) * 4.5, yaw };
  // fosos de todos los barrancos en una sola lista
  this.pits = [];
  for (const g of this.gorges) for (const p of g.pits) { p.gi = g.gi; p.idx = this.pits.length; this.pits.push(p); }
  this._prepStrips();
  this._prepBlocks();
  // ganchos, gemas, rocas que caen y vapor: de coordenadas de pared (u, y) al mundo
  const sp = this._sp;
  this.anchors = R.anchors;
  for (const a of this.anchors) {
    if (!a.wall) continue;
    const st = this.strips[a.strip];
    this.stripPoint(st, a.u, sp);
    const r = this.relief(st, a.u, a.y, sp.amp) + 0.12;
    a.x = sp.x + sp.nx * r; a.z = sp.z + sp.nz * r; a.nx = sp.nx; a.nz = sp.nz;
  }
  const gems = R.gems.map(g => Object.assign({}, g));
  for (const g of R.gemsLocal) {
    const st = this.strips[g.strip];
    this.stripPoint(st, g.u, sp);
    const r = this.relief(st, g.u, g.y, sp.amp) + 0.65;
    gems.push({ x: sp.x + sp.nx * r, y: g.y, z: sp.z + sp.nz * r, tramo: g.tramo });
  }
  this.gems = gems.map((g, i) => Object.assign(g, { idx: i, taken: false }));
  this.rockfalls = R.rockfalls.map(rf => {
    const st = this.strips[rf.strip];
    const lanes = rf.lanes.map(u => {
      this.stripPoint(st, u, sp);
      return { x: sp.x + sp.nx * 0.9, z: sp.z + sp.nz * 0.9, nx: sp.nx, nz: sp.nz, u };
    });
    return Object.assign({}, rf, { lanes });
  });
  this.steams = R.steamsLocal.map(s => {
    const st = this.strips[s.strip];
    this.stripPoint(st, s.u, sp);
    const r = this.relief(st, s.u, s.y, sp.amp);
    return { x: sp.x + sp.nx * r, y: s.y, z: sp.z + sp.nz * r, nx: sp.nx, nz: sp.nz, period: s.period, phase: s.phase, dur: s.dur };
  });
};

// ---------- paredes de roca (franjas) ----------
World.prototype._prepStrips = function () {
  this.sgrid = new Map();
  const key = (gx, gz) => (gx + 5000) * 10007 + (gz + 5000);
  for (const st of this.strips) {
    const P = st.pts;
    st.du = st.len / Math.max(1, P.length - 1);
    st.falls = this.falls.filter(f => f.strip === st.id);
    for (const p of P) { const l = Math.hypot(p.nx, p.nz) || 1; p.nx /= l; p.nz /= l; }
    for (let i = 0; i < P.length - 1; i++) {
      const a = P[i], b = P[i + 1];
      const gx0 = Math.floor((Math.min(a.x, b.x) - 1.5) / SGRID), gx1 = Math.floor((Math.max(a.x, b.x) + 1.5) / SGRID);
      const gz0 = Math.floor((Math.min(a.z, b.z) - 1.5) / SGRID), gz1 = Math.floor((Math.max(a.z, b.z) + 1.5) / SGRID);
      for (let gx = gx0; gx <= gx1; gx++) for (let gz = gz0; gz <= gz1; gz++) {
        const k = key(gx, gz);
        let arr = this.sgrid.get(k);
        if (!arr) { arr = []; this.sgrid.set(k, arr); }
        arr.push(st.id, i);
      }
    }
    // la roca que se desmorona se rompe por celdas de ~1.2 m
    for (const z of st.zones) {
      if (!z.crumble) continue;
      z.nu = Math.max(1, Math.round((z.u1 - z.u0) / 1.2)); z.nv = Math.max(1, Math.round((z.y1 - z.y0) / 1.2));
      z.cw = (z.u1 - z.u0) / z.nu; z.ch = (z.y1 - z.y0) / z.nv;
      z.cells = [];
      for (let j = 0; j < z.nv; j++) for (let i = 0; i < z.nu; i++) {
        // la fila de arriba aguanta más: desde ella se sube al borde
        z.cells.push({ i, j, touch: 0, touched: false, broken: false, bt: 0, hold: j >= z.nv - 2 ? 2.4 : (i + j) % 2 ? 1.5 : 1.15 });
      }
    }
  }
  this._skey = key;
};

// Punto de la franja en la posición u (a lo largo): base, normal hacia fuera, alturas y relieve
World.prototype.stripPoint = function (st, u, out) {
  const P = st.pts, n = P.length;
  let i = U.clamp(Math.floor(u / st.du), 0, n - 2);
  while (i > 0 && P[i].u > u) i--;
  while (i < n - 2 && P[i + 1].u < u) i++;
  const a = P[i], b = P[i + 1], t = U.clamp((u - a.u) / ((b.u - a.u) || 1), 0, 1);
  out.x = a.x + (b.x - a.x) * t; out.z = a.z + (b.z - a.z) * t;
  let nx = a.nx + (b.nx - a.nx) * t, nz = a.nz + (b.nz - a.nz) * t;
  const l = Math.hypot(nx, nz) || 1;
  out.nx = nx / l; out.nz = nz / l;
  out.y0 = a.y0 + (b.y0 - a.y0) * t; out.y1 = a.y1 + (b.y1 - a.y1) * t;
  out.amp = a.amp + (b.amp - a.amp) * t;
  return out;
};

// Relieve de la roca (siempre hacia fuera, 0..amp). Las cascadas pulen la roca.
World.prototype.relief = function (st, u, y, amp) {
  if (amp <= 0.001) return 0;
  let k = 0.5 + this.noise.fbm(u * 0.3 + st.seed * 1.7, y * 0.28 + st.seed * 0.9, 3) * 1.15;
  k = k < 0 ? 0 : k > 1 ? 1 : k;
  const F = st.falls;
  for (let i = 0; i < F.length; i++) {
    const e = Math.min(u - F[i].u0, F[i].u1 - u);
    if (e > -0.7) k *= U.lerp(1, 0.12, U.smooth(-0.7, 0.3, e));
  }
  return k * amp;
};

// Zona escalable en (u, y), o null si ahí la roca es lisa (o la celda se cayó)
World.prototype.zoneAt = function (st, u, y) {
  const Z = st.zones;
  for (let i = 0; i < Z.length; i++) {
    const z = Z[i];
    if (u < z.u0 || u > z.u1 || y < z.y0 || y > z.y1) continue;
    if (z.cells) { const c = this.cellAt(z, u, y); if (c && c.broken) continue; }
    return z;
  }
  return null;
};

World.prototype.cellAt = function (z, u, y) {
  const i = U.clamp(Math.floor((u - z.u0) / z.cw), 0, z.nu - 1), j = U.clamp(Math.floor((y - z.y0) / z.ch), 0, z.nv - 1);
  return z.cells[j * z.nu + i];
};

// Paredes cercanas a (x, z): por cada franja, el punto más cercano y la distancia con signo
// (positiva = delante de la roca). El arreglo se reutiliza: no guardarlo entre llamadas.
World.prototype.stripHits = function (x, z, maxD) {
  const out = this._hits || (this._hits = []), pool = this._hitPool || (this._hitPool = []);
  out.length = 0;
  const gx = Math.floor(x / SGRID), gz = Math.floor(z / SGRID), m2 = maxD * maxD;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const arr = this.sgrid.get(this._skey(gx + dx, gz + dz));
    if (!arr) continue;
    for (let k = 0; k < arr.length; k += 2) {
      const st = this.strips[arr[k]], i = arr[k + 1], P = st.pts, a = P[i], b = P[i + 1];
      const ex = b.x - a.x, ez = b.z - a.z, L2 = ex * ex + ez * ez || 1;
      const t = ((x - a.x) * ex + (z - a.z) * ez) / L2, tc = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = a.x + ex * tc, pz = a.z + ez * tc, d2 = (x - px) * (x - px) + (z - pz) * (z - pz);
      if (d2 > m2) continue;
      let h = null;
      for (let j = 0; j < out.length; j++) if (out[j].st === st) { h = out[j]; break; }
      if (h && h.d2 <= d2) continue;
      if (!h) { h = pool[out.length] || (pool[out.length] = {}); out.push(h); }
      h.st = st; h.i = i; h.t = t; h.tc = tc; h.d2 = d2; h.px = px; h.pz = pz;
    }
  }
  for (let j = 0; j < out.length; j++) {
    const h = out[j], P = h.st.pts, a = P[h.i], b = P[h.i + 1], tc = h.tc;
    h.u = a.u + (b.u - a.u) * tc;
    let nx = a.nx + (b.nx - a.nx) * tc, nz = a.nz + (b.nz - a.nz) * tc;
    const l = Math.hypot(nx, nz) || 1;
    h.nx = nx / l; h.nz = nz / l;
    h.d = (x - h.px) * h.nx + (z - h.pz) * h.nz;
    h.inSpan = !((h.i === 0 && h.t < -0.01) || (h.i === P.length - 2 && h.t > 1.01));
    h.y0 = a.y0 + (b.y0 - a.y0) * tc; h.y1 = a.y1 + (b.y1 - a.y1) * tc;
    h.amp = a.amp + (b.amp - a.amp) * tc;
  }
  return out;
};

// ¿Hay roca, terreno o un bloque en este punto? (para la cámara)
World.prototype.solidAt = function (x, y, z, m) {
  if (y < this.heightAt(x, z) + m) return true;
  if (this.blockAt(x, y, z, m)) return true;
  const hs = this.stripHits(x, z, 4.5);
  for (let i = 0; i < hs.length; i++) {
    const h = hs[i];
    if (!h.inSpan || y < h.y0 || y > h.y1 + m) continue;
    const r = this.relief(h.st, h.u, y, h.amp);
    if (h.d < r + m && h.d > r - 4.5) return true;
  }
  return false;
};

// ---------- bloques orientados (repisas, rocas, tablas, cornisas) ----------
World.prototype._prepBlocks = function () {
  this.dyn = [];
  this.bgrid = new Map();
  for (const b of this.blocks) {
    b.oy = 0; b.dy = 0; b.baseY = b.cy;
    b.y0 = b.cy - b.hy; b.y1 = b.cy + b.hy;
    const ex = Math.abs(b.c) * b.hx + Math.abs(b.s) * b.hz, ez = Math.abs(b.s) * b.hx + Math.abs(b.c) * b.hz;
    b.ax0 = b.cx - ex; b.ax1 = b.cx + ex; b.az0 = b.cz - ez; b.az1 = b.cz + ez;
    if (b.move) { this.dyn.push(b); continue; }
    for (let gx = Math.floor(b.ax0 / 8); gx <= Math.floor(b.ax1 / 8); gx++)
      for (let gz = Math.floor(b.az0 / 8); gz <= Math.floor(b.az1 / 8); gz++) {
        const k = gx + ',' + gz;
        if (!this.bgrid.has(k)) this.bgrid.set(k, []);
        this.bgrid.get(k).push(b);
      }
  }
};

// Coordenadas locales de un bloque: lx = a lo ancho, lz = a lo largo
function obbLocal(b, x, z, out) {
  const dx = x - b.cx, dz = z - b.cz;
  out.x = dx * b.c + dz * b.s; out.z = dz * b.c - dx * b.s;
  return out;
}
function obbIn(b, x, y, z, m) {
  if (y < b.y0 - m || y > b.y1 + m) return false;
  const dx = x - b.cx, dz = z - b.cz, lx = dx * b.c + dz * b.s, lz = dz * b.c - dx * b.s;
  return lx >= -b.hx - m && lx <= b.hx + m && lz >= -b.hz - m && lz <= b.hz + m;
}

World.prototype.blocksNear = function (x, z, out) {
  out.length = 0;
  const gx = Math.floor(x / 8), gz = Math.floor(z / 8);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const arr = this.bgrid.get((gx + dx) + ',' + (gz + dz));
    if (arr) for (let k = 0; k < arr.length; k++) if (out.indexOf(arr[k]) < 0) out.push(arr[k]);
  }
  for (const b of this.dyn) if (x > b.ax0 - 10 && x < b.ax1 + 10 && z > b.az0 - 10 && z < b.az1 + 10) out.push(b);
  return out;
};

World.prototype.blockAt = function (x, y, z, m) {
  m = m || 0;
  const L = this.blocksNear(x, z, this._tmp || (this._tmp = []));
  for (const b of L) if (obbIn(b, x, y, z, m)) return b;
  return null;
};

// Suelo más alto bajo un punto (terreno o techo de un bloque)
World.prototype.groundBelow = function (x, y, z) {
  let g = this.heightAt(x, z);
  const L = this.blocksNear(x, z, this._tmp3 || (this._tmp3 = []));
  for (const b of L) if (b.y1 <= y + 0.25 && b.y1 > g && obbIn(b, x, b.y1, z, 0)) g = b.y1;
  return g;
};

// Bloque cuyo techo está justo bajo (x, z) a esa altura
World.prototype.blockTopAt = function (x, y, z) {
  const L = this.blocksNear(x, z, this._tmp4 || (this._tmp4 = []));
  for (const b of L) if (Math.abs(b.y1 - y) < 0.3 && obbIn(b, x, b.y1, z, 0)) return b;
  return null;
};

// ---------- terreno ----------
World.prototype._generate = function () {
  const N = this.N, C = this.C, half = this.half, H = this.h, W = N + 1;
  if (this.snow) this._k2Shape(); else this._buildProfile();
  const raw = this.snow ? (x, z) => this._rawHeightSnow(x, z) : (x, z) => this._rawHeight(x, z);
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) H[j * W + i] = raw(i * C - half, j * C - half);
  this._carve();
  if (this.snow) this._k2After();
  this.colliders = [];        // troncos: {x,z,r}
  this.grid = new Map();      // rejilla espacial de troncos
  this.trees = { palm: [], jungle: [], pine: [] };
  this.rocks = [];
  this.vines = [];
  if (this.snow) this._placeStuffSnow(); else this._placeStuff();
};

// Distancia "de montaña" al cráter: se estira para que en todas direcciones la costa quede a BASE_R
World.prototype._rEff = function (x, z) {
  const cx = this.crater.x, cz = this.crater.z, dx = x - cx, dz = z - cz, r = Math.hypot(dx, dz) || 1e-6;
  const ux = dx / r, uz = dz / r, BR = CFG.BASE_R;
  const cd = cx * ux + cz * uz, t = -cd + Math.sqrt(Math.max(0, cd * cd - (cx * cx + cz * cz) + BR * BR));
  return r * BR / Math.max(40, t);
};

// Perfil de la montaña: la altura de los bordes de los barrancos a cada distancia del cráter
World.prototype._buildProfile = function () {
  const M = 300, raw = new Float32Array(M).fill(-1);
  const put = (x, z, y) => { const k = Math.round(this._rEff(x, z)); if (k >= 0 && k < M) raw[k] = Math.max(raw[k], y); };
  for (const g of this.gorges) g.samples.forEach((q, i) => put(q.x, q.z, g.rims[i] + 2));
  for (const c of this.camps) put(c.x, c.z, c.y + 4);
  const sm = this.summit, rS = Math.round(this._rEff(sm.x, sm.z));
  let rMax = 0;
  for (let k = 0; k < M; k++) if (raw[k] >= 0) rMax = k;
  for (let k = 0; k <= rS; k++) raw[k] = Math.max(raw[k], sm.y + 3);
  raw[Math.min(M - 1, rMax + 24)] = 1.5;
  for (let k = rMax + 25; k < M; k++) raw[k] = 1.5;
  // rellenar huecos interpolando
  let last = 0;
  for (let k = 1; k < M; k++) {
    if (raw[k] < 0) continue;
    for (let q = last + 1; q < k; q++) raw[q] = U.lerp(raw[last], raw[k], (q - last) / (k - last));
    last = k;
  }
  // envolvente superior suavizada y que siempre baja hacia la costa
  const mx = new Float32Array(M), out = new Float32Array(M);
  for (let k = 0; k < M; k++) { let m = -1e9; for (let d = -7; d <= 7; d++) { const q = k + d; if (q >= 0 && q < M) m = Math.max(m, raw[q]); } mx[k] = m; }
  for (let k = 0; k < M; k++) { let s = 0, n = 0; for (let d = -9; d <= 9; d++) { const q = k + d; if (q >= 0 && q < M) { s += mx[q]; n++; } } out[k] = s / n; }
  for (let k = 1; k < M; k++) out[k] = Math.min(out[k], out[k - 1]);
  this.prof = out;
};

World.prototype._profile = function (r) {
  const k = U.clamp(r, 0, 298), i = Math.floor(k), f = k - i;
  return this.prof[i] * (1 - f) + this.prof[i + 1] * f;
};

World.prototype._rawHeight = function (x, z) {
  const nz = this.noise, n2 = this.noise2;
  const angO = Math.atan2(z, x);
  const ro = Math.hypot(x, z) * (1 + nz.fbm(Math.cos(angO) * 1.3 + 5, Math.sin(angO) * 1.3 + 5, 3) * 0.06);
  const SH = CFG.SHORE_R, BR = CFG.BASE_R, CR = CFG.CRATER_R, PH = CFG.PEAK_H;
  if (ro > SH) return Math.max(-14, -1.5 - (ro - SH) * 0.35);
  const tb = U.clamp((SH - ro) / (SH - BR), 0, 1);
  const beach = tb * 2.5 + nz.fbm(x * 0.05, z * 0.05, 2) * 0.6 * tb;
  const cx = this.crater.x, cz = this.crater.z, rc = Math.hypot(x - cx, z - cz), ang = Math.atan2(z - cz, x - cx);
  const rimNoise = n2.fbm(Math.cos(ang) * 2 + 3, Math.sin(ang) * 2 + 3, 3) * 7;
  let h;
  if (rc < CR) {
    // interior del cráter: pared empinada hacia el lago de lava
    const k = U.smooth(0, CR * 0.75, CR - rc);
    h = PH + rimNoise - (PH + rimNoise - (CFG.LAVA_H - 8)) * k;
  } else {
    const re = this._rEff(x, z);
    h = Math.max(2.5, this._profile(re));
    h += Math.max(0, rimNoise) * U.smooth(CR + 14, CR, rc);
    h = Math.max(h, U.lerp(PH + rimNoise, h, U.smooth(CR, CR + 16, rc)));
    const u = U.clamp(1 - re / BR, 0, 1);
    h += nz.fbm(x * 0.02, z * 0.02, 4) * (3 + 6 * u);
    // terrazas de roca lisa: repisas separadas por paredes que no se pueden escalar
    const step = 14, ph = n2.fbm(x * 0.01 + 40, z * 0.01, 3) * 9;
    const t = (h + ph) / step, i = Math.floor(t), f = t - i;
    const g = 0.16 * f + 0.84 * U.smooth(0.84, 1, f);
    h = U.lerp(h, (i + g) * step - ph, U.smooth(5, 16, h));
  }
  // donde la montaña llega al mar quedan acantilados
  return U.lerp(beach, h, U.smooth(BR + 6, BR - 22, ro));
};

// Talla los barrancos: suelo, fosos y bordes; las rampas del terreno quedan detrás de las paredes
World.prototype._carve = function () {
  const N = this.N, C = this.C, half = this.half, H = this.h, W1 = N + 1, n = W1 * W1;
  const bestD = new Float32Array(n).fill(1e9), bestS = new Float32Array(n), bestLat = new Float32Array(n);
  const bestG = new Int8Array(n).fill(-1);
  this.gorges.forEach((g, gi) => {
    const P = g.samples.map(q => ({ x: q.x, z: q.z, s: q.s, ang: q.ang }));
    const e = g.end, Hx = Math.sin(e.ang), Hz = Math.cos(e.ang);
    P.push({ x: e.x, z: e.z, s: e.s, ang: e.ang }, { x: e.x + Hx * 14, z: e.z + Hz * 14, s: e.s + 14, ang: e.ang });
    for (let k = 0; k < P.length - 1; k++) {
      const a = P[k], b = P[k + 1], ex = b.x - a.x, ez = b.z - a.z, L2 = ex * ex + ez * ez || 1;
      const Lx = Math.cos(a.ang), Lz = -Math.sin(a.ang), R = 36;
      const i0 = Math.max(0, Math.floor((Math.min(a.x, b.x) - R + half) / C)), i1 = Math.min(N, Math.ceil((Math.max(a.x, b.x) + R + half) / C));
      const j0 = Math.max(0, Math.floor((Math.min(a.z, b.z) - R + half) / C)), j1 = Math.min(N, Math.ceil((Math.max(a.z, b.z) + R + half) / C));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const x = i * C - half, z = j * C - half, vi = j * W1 + i;
        let t = ((x - a.x) * ex + (z - a.z) * ez) / L2;
        const first = k === 0, lastSeg = k === P.length - 2;
        const tc = t < 0 ? 0 : t > 1 ? 1 : t;
        const px = a.x + ex * tc, pz = a.z + ez * tc, d2 = (x - px) * (x - px) + (z - pz) * (z - pz);
        if (d2 >= bestD[vi]) continue;
        // antes del inicio y después del final se mide "fuera" del barranco
        const tt = (first && t < 0) || (lastSeg && t > 1) ? t : tc;
        bestD[vi] = d2; bestG[vi] = gi;
        bestS[vi] = a.s + (b.s - a.s) * tt;
        bestLat[vi] = (x - (a.x + ex * tt)) * Lx + (z - (a.z + ez * tt)) * Lz;
      }
    }
  });
  const gmap = new Int8Array(n), pmap = new Int16Array(n);
  for (let vi = 0; vi < n; vi++) {
    const gi = bestG[vi];
    if (gi < 0) continue;
    const g = this.gorges[gi], s = bestS[vi], lat = bestLat[vi], al = Math.abs(lat), sEnd = g.end.s;
    const Wl = this.gorgeW(g, s), q = g.samples[U.clamp(Math.round(s), 0, g.samples.length - 1)];
    // ¿de este lado hay pared? (en la montaña nevada el camino casi siempre va al aire libre)
    const walled = lat >= 0 ? q.wL !== false : q.wR !== false;
    const ext = walled ? Wl + this.rimOut : Wl + (q.ridge ? 1.2 : 0.5);
    const inS = s >= -0.6 && s <= sEnd + this.rimOut + 0.15;
    const x = (vi % W1) * C - half, z = Math.floor(vi / W1) * C - half;
    const pit = inS ? this.gorgePit(g, s, 0.5) : null;
    // las grietas del glaciar siguen de lado: no se pueden rodear
    const pext = pit && pit.wide && !walled ? Wl + 12 : ext;
    if (inS && (al <= ext || (pit && al <= pext))) {
      H[vi] = pit ? pit.y : this.gorgeFloor(g, s);
      gmap[vi] = gi + 1;
      if (pit) pmap[vi] = pit.idx + 1;
      continue;
    }
    const over = Math.max(0, -s, s - sEnd);
    let band, w;
    if (walled) {
      w = Math.max(U.smooth(Wl + 6, Wl + 26, al), U.smooth(3, 18, over));
      band = this.gorgeRim(g, s) + Math.abs(this.noise2.n2(x * 0.21, z * 0.21)) * 0.7;
    } else if (q.ridge) {
      // arista: el terreno cae a los dos lados
      w = Math.max(U.smooth(Wl + 9, Wl + 26, al), U.smooth(3, 14, over));
      band = this.gorgeF(g, s) - Math.max(0, al - Wl - 2.4) * 1.35;
    } else {
      // camino abierto: un banco en la ladera que se funde con la montaña
      w = Math.max(U.smooth(Wl + 0.5, Wl + 13, al), U.smooth(3, 16, over));
      band = this.gorgeF(g, s) + Math.abs(this.noise2.n2(x * 0.17, z * 0.17)) * 0.35;
    }
    let h = U.lerp(band, H[vi], w);
    if (pit && pit.wide && !walled) h = U.lerp(pit.y, h, U.smooth(pext, pext + 4.5, al));
    H[vi] = h;
  }
  // campamentos: suelo plano alrededor de la fogata (sin tocar el interior de los barrancos)
  for (const c of this.camps) {
    const R = c.r + 10;
    const i0 = Math.max(0, Math.floor((c.x - R + half) / C)), i1 = Math.min(N, Math.ceil((c.x + R + half) / C));
    const j0 = Math.max(0, Math.floor((c.z - R + half) / C)), j1 = Math.min(N, Math.ceil((c.z + R + half) / C));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const vi = j * W1 + i;
      if (gmap[vi]) continue;
      const d = Math.hypot(i * C - half - c.x, j * C - half - c.z);
      if (d > R) continue;
      H[vi] = U.lerp(c.y, H[vi], U.smooth(c.r, R, d));
    }
  }
  this.gmap = gmap; this.pmap = pmap;
  this.gS = bestS; this.gLat = bestLat; this.gIdx = bestG; this.gD = bestD;
};

// Datos de un barranco en la posición s del cauce
World.prototype.gorgeW = function (g, s) {
  const S = g.samples, i = U.clamp(Math.round(s), 0, S.length - 1);
  return S[i].Wb;
};
World.prototype.gorgeF = function (g, s) {
  if (s < 0) return g.start.F;
  if (s >= g.end.s) return g.end.F;
  const i = Math.min(g.samples.length - 1, Math.floor(s)), q = g.samples[i];
  return q.F + (q.rise || 0) * Math.min(1, s - i);
};
// Suelo del terreno: detrás de cada escalón sigue bajo 2.9 m (bajo la repisa)
World.prototype.gorgeFloor = function (g, s) {
  for (const st of g.steps) if (s >= st.s && s < st.s + this.rimOut && st.Fu > st.Fl) return Math.min(st.Fl, this.gorgeF(g, s));
  return this.gorgeF(g, s);
};
World.prototype.gorgeRim = function (g, s) {
  const S = g.samples;
  if (s <= 0) return g.start.F + 0.4;
  if (s >= S.length - 1) return g.end.F + 0.4;
  const i = Math.floor(s), f = s - i;
  return U.lerp(g.rims[i], g.rims[i + 1], f);
};
World.prototype.gorgePit = function (g, s, m) {
  for (const p of g.pits) if (s >= p.s0 - m && s <= p.s1 + m) return p;
  return null;
};

// ¿En qué barranco está este punto? Usa el vértice más cercano del mapa de alturas.
World.prototype._vi = function (x, z) {
  const N = this.N, C = this.C;
  const i = U.clamp(Math.round((x + this.half) / C), 0, N), j = U.clamp(Math.round((z + this.half) / C), 0, N);
  return j * (N + 1) + i;
};
World.prototype.pitAt = function (x, z) { const p = this.pmap[this._vi(x, z)]; return p ? this.pits[p - 1] : null; };
World.prototype.gorgeAt = function (x, z) { const g = this.gmap[this._vi(x, z)]; return g ? this.gorges[g - 1] : null; };

World.prototype.inLava = function (x, y, z) {
  const p = this.pitAt(x, z);
  return !!p && p.lava && y < p.water + 0.25;
};

// ¿Agua del río (o de una poza) a esta altura?
World.prototype.waterAt = function (x, y, z) {
  const vi = this._vi(x, z), gi = this.gmap[vi];
  if (!gi) return null;
  const g = this.gorges[gi - 1];
  if (g.lava) return null;
  const pit = this.pmap[vi] ? this.pits[this.pmap[vi] - 1] : null;
  if (pit) return y < pit.water + 0.1 ? { y: pit.water, deep: true } : null;
  const s = this.gS[vi], lat = this.gLat[vi];
  for (const w of g.water) if (s >= w.s0 && s <= w.s1 && Math.abs(lat) < this.gorgeW(g, s) * 0.55) {
    const F = this.gorgeF(g, s);
    return y < F + 0.35 ? { y: F + 0.08, deep: false } : null;
  }
  return null;
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

// Normal exacta del triángulo bajo (x,z): la que se usa para chocar con el terreno
World.prototype.triNormal = function (x, z, out) {
  const N = this.N, C = this.C;
  let gx = (x + this.half) / C, gz = (z + this.half) / C;
  gx = U.clamp(gx, 0, N - 0.0001); gz = U.clamp(gz, 0, N - 0.0001);
  const i = gx | 0, j = gz | 0, fx = gx - i, fz = gz - j;
  const H = this.h, W = N + 1, k = j * W + i;
  const h00 = H[k], h10 = H[k + 1], h01 = H[k + W], h11 = H[k + W + 1];
  let ddx, ddz;
  if (fx > fz) { ddx = (h10 - h00) / C; ddz = (h11 - h10) / C; } else { ddx = (h11 - h01) / C; ddz = (h01 - h00) / C; }
  const l = Math.sqrt(ddx * ddx + 1 + ddz * ddz);
  out.x = -ddx / l; out.y = 1 / l; out.z = -ddz / l;
  return out;
};

// Punto más cercano de un triángulo a p (Ericson, "Real-Time Collision Detection")
function closestOnTri(px, py, pz, ax, ay, az, bx, by, bz, cx, cy, cz, out) {
  const abx = bx - ax, aby = by - ay, abz = bz - az, acx = cx - ax, acy = cy - ay, acz = cz - az;
  const apx = px - ax, apy = py - ay, apz = pz - az;
  const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
  if (d1 <= 0 && d2 <= 0) { out.x = ax; out.y = ay; out.z = az; return; }
  const bpx = px - bx, bpy = py - by, bpz = pz - bz;
  const d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) { out.x = bx; out.y = by; out.z = bz; return; }
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const v = d1 / (d1 - d3); out.x = ax + abx * v; out.y = ay + aby * v; out.z = az + abz * v; return; }
  const cpx = px - cx, cpy = py - cy, cpz = pz - cz;
  const d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) { out.x = cx; out.y = cy; out.z = cz; return; }
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const w = d2 / (d2 - d6); out.x = ax + acx * w; out.y = ay + acy * w; out.z = az + acz * w; return; }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && (d4 - d3) >= 0 && (d5 - d6) >= 0) {
    const w = (d4 - d3) / ((d4 - d3) + (d5 - d6));
    out.x = bx + (cx - bx) * w; out.y = by + (cy - by) * w; out.z = bz + (cz - bz) * w; return;
  }
  const den = 1 / (va + vb + vc), v = vb * den, w = vc * den;
  out.x = ax + abx * v + acx * w; out.y = ay + aby * v + acy * w; out.z = az + abz * v + acz * w;
}

// Contacto de una esfera con los triángulos reales del terreno (no con su plano infinito).
// Devuelve la penetración (>0 si toca) y deja en out la normal de empuje.
World.prototype.sphereTerrain = function (cx, cy, cz, R, out) {
  const N = this.N, C = this.C, H = this.h, W = N + 1, half = this.half;
  const th = this.heightAt(cx, cz);
  // centro bajo el suelo: empujar hacia arriba por la normal del triángulo
  if (cy <= th) { this.triNormal(cx, cz, out); return R + (th - cy) * out.y; }
  const i0 = Math.max(0, Math.floor((cx - R + half) / C)), i1 = Math.min(N - 1, Math.floor((cx + R + half) / C));
  const j0 = Math.max(0, Math.floor((cz - R + half) / C)), j1 = Math.min(N - 1, Math.floor((cz + R + half) / C));
  const q = this._q || (this._q = { x: 0, y: 0, z: 0 });
  let best = R * R, bx = 0, by = 0, bz = 0, hit = false;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const x0 = i * C - half, z0 = j * C - half, x1 = x0 + C, z1 = z0 + C, k = j * W + i;
    const h00 = H[k], h10 = H[k + 1], h01 = H[k + W], h11 = H[k + W + 1];
    for (let t = 0; t < 2; t++) {
      if (t === 0) closestOnTri(cx, cy, cz, x0, h00, z0, x1, h11, z1, x1, h10, z0, q);
      else closestOnTri(cx, cy, cz, x0, h00, z0, x0, h01, z1, x1, h11, z1, q);
      const dx = cx - q.x, dy = cy - q.y, dz = cz - q.z, d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < best) {
        // las rampas tapadas por un bloque no cuentan
        if (this.blockAt(q.x, q.y + 0.05, q.z)) continue;
        best = d2; bx = dx; by = dy; bz = dz; hit = true;
      }
    }
  }
  if (!hit) return 0;
  const d = Math.sqrt(best) || 1e-6;
  out.x = bx / d; out.y = by / d; out.z = bz / d;
  return R - d;
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
  if (this.waterAt(x, y, z)) return 'water';
  if (this.gorgeAt(x, z)) { const b = this.biomeIndex(y); return b === 2 ? 'snow' : b === 3 ? 'ash' : 'rock'; }
  if (y < 7 && Math.hypot(x, z) > CFG.BASE_R - 25) return 'sand';
  if (ny < 0.8) return 'rock';
  const b = this.biomeIndex(y);
  if (b === 2) return 'snow';
  if (b === 3) return 'ash';
  if (b === 0 && y < 10) return 'sand';
  return 'grass';
};

// Paredes de hielo del terreno (solo color: el terreno no se escala)
World.prototype.isIce = function (x, y, z) {
  const B = CFG.BIOMES;
  return y > B[1].top + 12 && y < B[2].top + 2 && this.noise2.fbm(x * 0.025 + 70, z * 0.025, 2) > 0.26;
};

// ¿Está cerca de la ruta? (para no poner árboles ni rocas en el camino)
World.prototype.nearRoute = function (x, z, m) {
  const vi = this._vi(x, z), gi = this.gIdx[vi];
  if (gi >= 0) {
    const g = this.gorges[gi], s = this.gS[vi];
    if (s > -m - 2 && s < g.end.s + 8 + m && Math.abs(this.gLat[vi]) < this.gorgeW(g, s) + 3 + m) return true;
  }
  for (const c of this.camps) if (Math.hypot(c.x - x, c.z - z) < c.r + m) return true;
  return false;
};

// Rocas que se hunden en la lava y roca que se desmorona
World.prototype.update = function (dt) {
  this.t += dt;
  for (const b of this.dyn) {
    const m = b.move, off = Math.sin(this.t * Math.PI * 2 / m.period + m.phase) * m.amp;
    b.dy = off - b.oy; b.oy = off;
    b.y0 = b.baseY + off - b.hy; b.y1 = b.baseY + off + b.hy;
  }
  for (const st of this.strips) for (const z of st.zones) {
    if (!z.cells) continue;
    for (const c of z.cells) {
      if (c.broken) { c.bt -= dt; if (c.bt <= 0) { c.broken = false; c.touch = 0; } }
      else if (c.touch >= c.hold) { c.broken = true; c.bt = 6; this.crumbled = (this.crumbled || 0) + 1; }
      else if (!c.touched) c.touch = Math.max(0, c.touch - dt * 0.5);
      c.touched = false;
    }
  }
};

// Deja la ruta como recién hecha (para empezar otra partida sin rearmar la montaña)
World.prototype.resetState = function () {
  this.t = 0; this.crumbled = 0;
  for (const g of this.gems) g.taken = false;
  this.campfires.forEach((f, i) => { f.lit = i === 0; });
  for (const b of this.dyn) { b.oy = 0; b.dy = 0; b.y0 = b.baseY - b.hy; b.y1 = b.baseY + b.hy; }
  for (const st of this.strips) for (const z of st.zones) if (z.cells) for (const c of z.cells) { c.touch = 0; c.touched = false; c.broken = false; c.bt = 0; c.warned = false; }
};

World.prototype.touchCell = function (z, u, y, dt) {
  if (!z || !z.cells) return null;
  const c = this.cellAt(z, u, y);
  if (!c.broken) { c.touch += dt; c.touched = true; }
  return c;
};

// ---------- árboles y rocas ----------
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
    const a = rng() * Math.PI * 2, r = 20 + rng() * (CFG.SHORE_R - 20);
    const x = Math.cos(a) * r, z = Math.sin(a) * r, y = this.heightAt(x, z);
    if (y < minH || y > maxH) continue;
    if (Math.hypot(x - this.crater.x, z - this.crater.z) < CFG.CRATER_R + 4) continue;
    this.normalAt(x, z, nv, 1);
    if (nv.y < maxSlope) continue;
    if (this.nearRoute(x, z, 3)) continue;
    return { x, y, z };
  }
  return null;
};

World.prototype._placeStuff = function () {
  const rng = this.rng, B = CFG.BIOMES;
  const tree = (kind, n, minH, maxH, rad) => {
    for (let k = 0; k < n; k++) {
      const p = this._randomSpot(minH, maxH, 0.8, 30);
      if (!p) continue;
      const s = 0.8 + rng() * 0.6;
      this.trees[kind].push({ x: p.x, y: p.y, z: p.z, s, rot: rng() * 6.28 });
      this._addCollider(p.x, p.z, rad * s);
    }
  };
  tree('palm', 140, 1.2, 24, 0.3);
  tree('jungle', 700, B[0].top - 8, B[1].top, 0.45);
  tree('pine', 320, B[1].top - 8, B[2].top - 8, 0.35);
  for (let k = 0; k < 520; k++) {
    const p = this._randomSpot(0.5, CFG.PEAK_H + 20, 0.55, 10);
    if (p) this.rocks.push({ x: p.x, y: p.y, z: p.z, s: 0.4 + rng() * rng() * 2.6, rot: rng() * 6.28, b: this.biomeIndex(p.y) });
  }
  // Avión estrellado en la playa, junto al campamento
  const c0 = this.camps[0], g0 = this.gorges[0], a = g0.samples[0].ang;
  this.wreck = { x: c0.x - Math.cos(a) * 9 - Math.sin(a) * 4, z: c0.z + Math.sin(a) * 9 - Math.cos(a) * 4, y: 0, rot: 0.9 };
  this.wreck.y = this.heightAt(this.wreck.x, this.wreck.z);
  this._addCollider(this.wreck.x, this.wreck.z, 2.2);
};
