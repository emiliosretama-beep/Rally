// La ruta: desafíos diseñados a mano y el constructor que los coloca en la cara sur del volcán.
// Todo es determinista: la ruta es siempre la misma.
//
// Cada pieza se construye en un marco local que avanza: v = hacia adelante, u = a la derecha.
// Los suelos ("rects") son rectángulos del terreno alineados a la rejilla de 2 m; las paredes,
// pilares, puentes y plataformas son bloques (cajas) con caras escalables.
'use strict';

const HW = 4; // medio ancho del pasillo

const ROUTE = [
  // ---- Tramo 1 · Playa: aprender a escalar, saltar e impulsarse ----
  { t: 'walk', len: 6 },
  { t: 'wall', h: 4, nm: 'c_first', par: 10 },
  { t: 'wall', h: 7, nm: 'c_wall', par: 14, gem: [-3.2, 5.5] },
  { t: 'turn', d: 'L' },
  { t: 'pillars', n: 4, gap: 1.8, dh: 0.6, pit: 8, nm: 'c_pillars', par: 14 },
  { t: 'wall', h: 9, bands: [[3.6, 1.6]], nm: 'c_lunge', par: 18 },
  { t: 'bridge', len: 12, miss: [3, 7, 8], nm: 'c_bridge', par: 14, gem: 'under' },
  { t: 'turn', d: 'R' },
  { t: 'wall', h: 12, surf: 'ladder', nm: 'c_ladder', par: 12, gem: [3.2, 9] },
  { t: 'camp' },
  // ---- Tramo 2 · Selva ----
  { t: 'wall', h: 14, surf: 'vine', nm: 'c_vines', par: 18 },
  { t: 'turn', d: 'R' },
  { t: 'traverse', dx: -12, h: 10, nm: 'c_traverse', par: 28, gem: true },
  { t: 'movers', n: 3, len: 14, nm: 'c_movers', par: 16 },
  { t: 'crumble', h: 10, nm: 'c_crumble', par: 14 },
  { t: 'turn', d: 'L' },
  { t: 'wall', h: 16, nm: 'c_bigwall', par: 26, gem: [-3.3, 12] },
  { t: 'chimney', h: 12, nm: 'c_chimney', par: 20 },
  { t: 'pillars', n: 5, gap: 1.6, dh: 1.0, pit: 10, nm: 'c_steps', par: 16, gem: 'side' },
  { t: 'camp' },
  // ---- Tramo 3 · Alpes ----
  { t: 'wall', h: 14, surf: 'ice', nm: 'c_ice', par: 24 },
  { t: 'turn', d: 'R' },
  { t: 'windBeam', len: 16, nm: 'c_wind', par: 18 },
  { t: 'hookGap', len: 8, rise: 3, nm: 'c_hook', par: 10 },
  { t: 'wall', h: 14, hazard: 'rockfall', nm: 'c_rockfall', par: 24, gem: [3.3, 10] },
  { t: 'zipline', len: 20, drop: 3, nm: 'c_zip', par: 10 },
  { t: 'turn', d: 'L' },
  { t: 'wall', h: 14, bands: [[3.4, 1.6], [8.6, 1.7]], nm: 'c_lunge2', par: 24 },
  { t: 'camp' },
  // ---- Tramo 4 · Caldera ----
  { t: 'wall', h: 14, hazard: 'steam', nm: 'c_steam', par: 24 },
  { t: 'turn', d: 'L' },
  { t: 'lavaPillars', n: 5, gap: 1.8, dh: 0.8, nm: 'c_lava', par: 18, gem: 'side' },
  { t: 'crumble', h: 12, nm: 'c_crumble2', par: 16 },
  { t: 'turn', d: 'R' },
  { t: 'wall', h: 18, nm: 'c_final', par: 30, gem: [-3.3, 14] },
  { t: 'summit' }
];

function RouteBuilder() {
  this.rects = []; this.blocks = []; this.anchors = []; this.gems = []; this.rings = [];
  this.zips = []; this.winds = []; this.rockfalls = []; this.steams = []; this.lavas = [];
  this.checkpoints = []; this.challenges = []; this.rails = []; this.posts = [];
  this.x = 0; this.z = -210; this.y = 2;
  this.fx = 0; this.fz = 1;      // hacia adelante
  this.tramo = 0;
}

const RB = RouteBuilder.prototype;

// local (u, v) -> mundo. Derecha l = (-fz, fx).
RB.W = function (u, v) { return { x: this.x - this.fz * u + this.fx * v, z: this.z + this.fx * u + this.fz * v }; };
RB.adv = function (v) { const p = this.W(0, v); this.x = p.x; this.z = p.z; };
RB.shift = function (u) { const p = this.W(u, 0); this.x = p.x; this.z = p.z; };
// eje del mundo y signo de un vector local (para caras y movimiento)
RB.axisOf = function (vx, vz) { return Math.abs(vx) > 0.5 ? (vx > 0 ? 'px' : 'nx') : (vz > 0 ? 'pz' : 'nz'); };

RB.rect = function (u0, u1, v0, v1, h, flags) {
  const a = this.W(u0, v0), b = this.W(u1, v1);
  const s = n => Math.round(n / 2) * 2;
  const r = { x0: s(Math.min(a.x, b.x)), x1: s(Math.max(a.x, b.x)), z0: s(Math.min(a.z, b.z)), z1: s(Math.max(a.z, b.z)), h, tramo: this.tramo };
  if (flags) Object.assign(r, flags);
  this.rects.push(r);
  return r;
};

// Caja en coordenadas locales. faces: { front|back|left|right: [[u0,u1,y0,y1,tipo], ...] }
// En front/back el eje a lo largo de la cara es u; en left/right es v.
RB.box = function (u0, u1, v0, v1, y0, y1, opt) {
  opt = opt || {};
  const a = this.W(u0, v0), b = this.W(u1, v1);
  const blk = {
    x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), z0: Math.min(a.z, b.z), z1: Math.max(a.z, b.z), y0, y1,
    kind: opt.kind || 'rock', climbAll: opt.climbAll || null, faces: {}, tramo: this.tramo,
    crumble: opt.crumble || 0, move: opt.move || null, id: this.blocks.length
  };
  const lx = -this.fz, lz = this.fx;
  const map = { front: [-this.fx, -this.fz, 'u'], back: [this.fx, this.fz, 'u'], right: [lx, lz, 'v'], left: [-lx, -lz, 'v'] };
  for (const k in (opt.faces || {})) {
    const [nx, nz, ax] = map[k], key = this.axisOf(nx, nz), list = [];
    for (const [c0, c1, ya, yb, type] of opt.faces[k]) {
      const p0 = ax === 'u' ? this.W(c0, 0) : this.W(0, c0), p1 = ax === 'u' ? this.W(c1, 0) : this.W(0, c1);
      // a lo largo de una cara nz/pz se mide en x; en nx/px se mide en z
      const along = (key === 'nz' || key === 'pz') ? [p0.x, p1.x] : [p0.z, p1.z];
      list.push({ a0: Math.min(along[0], along[1]), a1: Math.max(along[0], along[1]), y0: ya, y1: yb, type });
    }
    blk.faces[key] = list;
  }
  this.blocks.push(blk);
  return blk;
};

RB.faceKey = function (local) {
  const lx = -this.fz, lz = this.fx;
  const n = { front: [-this.fx, -this.fz], back: [this.fx, this.fz], right: [lx, lz], left: [-lx, -lz] }[local];
  return this.axisOf(n[0], n[1]);
};

// Gancho en la cara de un bloque (sirve también para descansar)
RB.anchorWall = function (blk, local, u, y) {
  const key = this.faceKey(local), n = FACE_N[key];
  const plane = facePlane(blk, key);
  const along = this.W(u, 0);
  const x = (key === 'nx' || key === 'px') ? plane + n.x * 0.15 : along.x;
  const z = (key === 'nz' || key === 'pz') ? plane + n.z * 0.15 : along.z;
  this.anchors.push({ x, y, z, wall: true, b: blk.id, key, idx: this.anchors.length, tramo: this.tramo });
};
// Gancho en un poste sobre el suelo
RB.anchorPost = function (u, v, y) {
  const p = this.W(u, v);
  this.anchors.push({ x: p.x, y: y + 1.15, z: p.z, ground: y, wall: false, idx: this.anchors.length, tramo: this.tramo });
};

RB.challenge = function (s) {
  if (!s.nm) return;
  const p = this.W(0, 0);
  this.challenges.push({ nm: s.nm, t: s.t, par: s.par || 15, x: p.x, y: this.y, z: p.z, fx: this.fx, fz: this.fz, dx: s.dx || 0, bands: !!s.bands, tramo: this.tramo, idx: this.challenges.length });
};

RB.gemAt = function (x, y, z) { this.gems.push({ x, y, z, tramo: this.tramo, idx: this.gems.length }); };
// gema frente a una cara (u a lo largo, y absoluta)
RB.gemFace = function (blk, local, u, y) {
  const key = this.faceKey(local), n = FACE_N[key], plane = facePlane(blk, key), p = this.W(u, 0);
  this.gemAt(key === 'nx' || key === 'px' ? plane + n.x * 0.6 : p.x, y, key === 'nz' || key === 'pz' ? plane + n.z * 0.6 : p.z);
};

const FACE_N = { px: { x: 1, z: 0 }, nx: { x: -1, z: 0 }, pz: { x: 0, z: 1 }, nz: { x: 0, z: -1 } };
function facePlane(b, key) { return key === 'px' ? b.x1 : key === 'nx' ? b.x0 : key === 'pz' ? b.z1 : b.z0; }

// Regiones escalables de una pared: ancho completo menos las bandas lisas
function wallRects(s, y, h) {
  const surf = s.surf || 'rock', out = [];
  if (surf === 'ladder') return [[-0.8, 0.8, y - 1, y + h, 'ladder']];
  if (surf === 'vine') out.push([-2.4, 2.4, y - 1, y + h, 'vine']);
  const cuts = (s.bands || []).map(([b0, bh]) => [y + b0, y + b0 + bh]).sort((a, b) => a[0] - b[0]);
  let y0 = y - 1;
  for (const [c0, c1] of cuts) { out.push([-3.6, 3.6, y0, c0, surf === 'vine' ? 'rock' : surf]); y0 = c1; }
  out.push([-3.6, 3.6, y0, y + h, surf === 'vine' ? 'rock' : surf]);
  return out;
}

const GEN = {
  walk(B, s) { B.rect(-HW, HW, 0, s.len, B.y); B.adv(s.len); },

  wall(B, s) {
    B.challenge(s);
    const run = s.run || 4, h = s.h, y = B.y;
    B.rect(-HW, HW, 0, run, y);
    const blk = B.box(-HW - 3, HW + 3, run + 0.05, run + 3.2, y - 1, y + h, { faces: { front: wallRects(s, y, h) } });
    B.anchorPost(2.0, run - 1.4, y);
    const step = s.surf === 'ice' ? 4 : 5;
    for (let k = step, i = 0; k < h - 1.5; k += step, i++) {
      // nunca dentro de una banda lisa: se sube justo encima de ella
      let kk = k;
      for (const [b0, bh] of (s.bands || [])) if (kk > b0 - 0.8 && kk < b0 + bh + 0.6) kk = b0 + bh + 0.7;
      if (kk < h - 1.2) B.anchorWall(blk, 'front', s.surf === 'ladder' ? 0.55 : (i % 2 ? -1.4 : 1.4), y + kk);
    }
    if (Array.isArray(s.gem)) B.gemFace(blk, 'front', s.gem[0], y + s.gem[1]);
    if (s.hazard === 'rockfall') {
      const lanes = [-2.4, 0, 2.4].map(u => B.W(u, 0));
      const key = B.faceKey('front');
      B.rockfalls.push({ b: blk.id, key, lanes: lanes.map(p => (key === 'nz' || key === 'pz') ? p.x : p.z), top: y + h + 1, bot: y, periods: [4.2, 3.4, 4.8], phase: [0, 1.3, 2.6] });
    }
    if (s.hazard === 'steam') {
      const key = B.faceKey('front'), n = FACE_N[key], plane = facePlane(blk, key);
      let k = 0;
      // filas alternadas que tapan el centro: hay que esquivar de lado o esperar a que paren
      for (let yy = 2.5; yy < h - 1.5; yy += 2.8) for (const u of (k++ % 2 ? [-2.2, 0.4] : [-0.4, 2.2])) {
        const p = B.W(u, 0);
        B.steams.push({ x: key === 'nx' || key === 'px' ? plane : p.x, y: y + yy, z: key === 'nz' || key === 'pz' ? plane : p.z, nx: n.x, nz: n.z, period: 3.6, phase: (k * 1.37) % 3.6, dur: 1.2 });
      }
    }
    B.adv(run + 2); B.y += h;
  },

  crumble(B, s) {
    B.challenge(s);
    const run = s.run || 4, h = s.h, y = B.y;
    B.rect(-HW, HW, 0, run, y);
    B.box(-HW - 3, HW + 3, run + 1.4, run + 3.2, y - 1, y + h);
    const sl = B.box(-HW - 3, -2.2, run + 0.05, run + 1.4, y - 1, y + h);
    const sr = B.box(2.2, HW + 3, run + 0.05, run + 1.4, y - 1, y + h);
    const n = Math.ceil((h + 1) / 2), sz = (h + 1) / n;
    for (let k = 0; k < n; k++) {
      // el bloque de arriba aguanta más: desde él hay que subir al borde
      B.box(-2.2, 2.2, run + 0.05, run + 1.4, y - 1 + k * sz, y - 1 + (k + 1) * sz, { kind: 'crumble', climbAll: 'rock', crumble: k === n - 1 ? 2.2 : k % 2 ? 1.5 : 1.1 });
    }
    B.anchorPost(2.0, run - 1.4, y);
    for (let k = 4, i = 0; k < h - 1.5; k += 4, i++) B.anchorWall(i % 2 ? sl : sr, 'front', i % 2 ? -2.6 : 2.6, y + k);
    B.adv(run + 2); B.y += h;
  },

  chimney(B, s) {
    B.challenge(s);
    const run = s.run || 4, h = s.h, y = B.y;
    B.rect(-HW, HW, 0, run + 2, y);
    const L = B.box(-HW - 3, -0.9, run, run + 4.2, y - 1, y + h, { faces: { right: [[run + 0.1, run + 1.95, y - 1, y + h, 'rock']] } });
    B.box(0.9, HW + 3, run, run + 4.2, y - 1, y + h, { faces: { left: [[run + 0.1, run + 1.95, y - 1, y + h, 'rock']] } });
    B.box(-0.9, 0.9, run + 2, run + 4.2, y - 1, y + h);
    B.anchorPost(2.0, run - 1.4, y);
    for (let k = 5; k < h - 1.5; k += 5) B.anchorWall(L, 'right', run + 1, y + k);
    B.adv(run + 4); B.y += h;
  },

  pillars(B, s) {
    B.challenge(s);
    const y = B.y, n = s.n, lava = s.t === 'lavaPillars';
    B.rect(-HW, HW, 0, 2, y);
    const L = Math.ceil((n * 2.4 + (n + 1) * s.gap) / 2) * 2, g = (L - n * 2.4) / (n + 1);
    const pit = s.pit || 6;
    const pr = B.rect(-HW, HW, 2, 2 + L, y - pit, { pit: true, lava });
    if (lava) B.lavas.push({ x0: pr.x0, x1: pr.x1, z0: pr.z0, z1: pr.z1, y: y - pit + 0.4 });
    let last = null;
    for (let i = 0; i < n; i++) {
      const vc = 2 + g + 1.2 + i * (2.4 + g), off = (i % 2 ? -0.9 : 0.9) * (s.zig === false ? 0 : 1);
      const top = y + (i + 1) * s.dh;
      const mv = lava && i % 2 === 1 ? { axis: 'y', amp: 0.9, period: 3.4 + i * 0.3, phase: i * 1.1 } : null;
      last = B.box(off - 1.2, off + 1.2, vc - 1.2, vc + 1.2, y - pit - 1, top, { kind: lava ? 'basalt' : 'rock', climbAll: 'rock', move: mv });
      if (s.gem === 'side' && i === n - 2) { const p = B.W(off + (off > 0 ? 2.6 : -2.6), vc); B.gemAt(p.x, top + 1.6, p.z); B.box(off + (off > 0 ? 1.6 : -3.4), off + (off > 0 ? 3.4 : -1.6), vc - 0.9, vc + 0.9, y - pit - 1, top + 0.3, { climbAll: 'rock' }); }
    }
    B.anchorPost(2.0, 0.8, y);
    B.adv(2 + L); B.y += n * s.dh;
  },

  bridge(B, s) {
    B.challenge(s);
    const y = B.y, len = s.len, pit = s.pit || 12;
    B.rect(-HW, HW, 0, 2, y);
    B.rect(-HW, HW, 2, 2 + len, y - pit, { pit: true });
    for (let i = 0; i < len; i++) {
      if (s.miss && s.miss.indexOf(i) >= 0) continue;
      B.box(-0.8, 0.8, 2 + i + 0.06, 2 + i + 0.94, y - 0.22, y, { kind: 'wood' });
    }
    const a = B.W(0.85, 2), b = B.W(0.85, 2 + len), c = B.W(-0.85, 2), d = B.W(-0.85, 2 + len);
    B.rails.push({ a: { x: a.x, y: y + 0.95, z: a.z }, b: { x: b.x, y: y + 0.95, z: b.z } }, { a: { x: c.x, y: y + 0.95, z: c.z }, b: { x: d.x, y: y + 0.95, z: d.z } });
    for (const p of [a, b, c, d]) B.posts.push({ x: p.x, y, z: p.z, h: 1.2 });
    if (s.gem === 'under') { const p = B.W(0, 2 + len / 2); B.gemAt(p.x, y - 1.6, p.z); }
    B.anchorPost(2.0, 0.8, y);
    B.adv(2 + len);
  },

  // Travesía: cruzar de lado sobre un barranco colgado de una franja de presas, y subir por la salida
  traverse(B, s) {
    B.challenge(s);
    const run = s.run || 6, h = s.h, y = B.y, dx = s.dx, sg = Math.sign(dx), D = Math.abs(dx);
    const U = (a, b) => sg > 0 ? [a, b] : [-b, -a]; // reflejar si va a la izquierda
    B.rect(...U(-HW, 2), 0, run, y);
    B.rect(...U(2, D - 2), 0, run, y - 12, { pit: true });
    B.rect(...U(D - 2, D + HW), 0, run, y);
    const blk = B.box(...U(-HW - 3, D + HW + 3), run + 0.05, run + 3.2, y - 13, y + h, {
      faces: { front: [[...U(-1.5, D + 1.5), y + 0.6, y + 3.0, 'rock'], [...U(D - 1.6, D + 1.6), y + 0.6, y + h, 'rock']] }
    });
    B.anchorPost(sg * -1.5, run - 1.6, y);
    for (let u = 3; u < D; u += 4) B.anchorWall(blk, 'front', sg * u, y + 2.2);
    for (let k = 6; k < h - 1.5; k += 5) B.anchorWall(blk, 'front', sg * (D - 1.2), y + k);
    if (s.gem) B.gemFace(blk, 'front', sg * (D + 1.3), y + h - 2.5);
    B.shift(dx); B.adv(run + 2); B.y += h;
  },

  movers(B, s) {
    B.challenge(s);
    const y = B.y, len = s.len;
    B.rect(-HW, HW, 0, 2, y);
    B.rect(-HW, HW, 2, 2 + len, y - 12, { pit: true });
    const axis = Math.abs(-B.fz) > 0.5 ? 'x' : 'z';
    for (let i = 0; i < s.n; i++) {
      const vc = 2 + len * (i + 1) / (s.n + 1);
      B.box(-1.3, 1.3, vc - 1.2, vc + 1.2, y - 0.5, y, { kind: 'wood', move: { axis, amp: 2.3, period: 4.2 + i * 0.6, phase: i * 1.9 } });
    }
    B.anchorPost(2.0, 0.8, y);
    B.adv(2 + len);
  },

  windBeam(B, s) {
    B.challenge(s);
    const y = B.y, len = s.len;
    B.rect(-HW, HW, 0, 2, y);
    const pr = B.rect(-HW, HW, 2, 2 + len, y - 12, { pit: true });
    B.box(-0.32, 0.32, 2, 2 + len, y - 0.45, y, { kind: 'rock' });
    for (let c = 7; c < len - 2; c += 6) B.box(-1.3, 1.3, 2 + c - 0.9, 2 + c + 0.9, y - 0.45, y, { kind: 'rock' });
    const lx = -B.fz, lz = B.fx;
    B.winds.push({ x0: pr.x0, x1: pr.x1, z0: pr.z0, z1: pr.z1, y0: y - 3, y1: y + 5, dx: lx, dz: lz, period: 5.5, dur: 1.5, warn: 1.3, force: 9, phase: 2 });
    B.anchorPost(2.0, 0.8, y);
    B.adv(2 + len);
  },

  hookGap(B, s) {
    B.challenge(s);
    const y = B.y, len = s.len, rise = s.rise || 0;
    B.rect(-HW, HW, 0, 2, y);
    B.rect(-HW, HW, 2, 2 + len, y - 12, { pit: true });
    const r = B.W(0, 2 + len + 0.6), l = B.W(0, 2 + len + 2.6);
    B.rings.push({ x: r.x, y: y + rise + 3.4, z: r.z, land: { x: l.x, y: y + rise, z: l.z } });
    B.posts.push({ x: r.x, y: y + rise, z: r.z, h: 3.0 });
    B.anchorPost(2.0, 0.8, y);
    B.adv(2 + len); B.y += rise;
  },

  zipline(B, s) {
    B.challenge(s);
    const y = B.y, len = s.len, drop = s.drop || 0;
    B.rect(-HW, HW, 0, 4, y);
    B.rect(-HW, HW, 4, 4 + len, y - 14, { pit: true });
    const a = B.W(0, 2.4), b = B.W(0, 4 + len + 2.2);
    B.zips.push({ a: { x: a.x, y: y + 2.35, z: a.z }, b: { x: b.x, y: y - drop + 2.35, z: b.z } });
    B.posts.push({ x: a.x, y, z: a.z, h: 3.0 }, { x: b.x, y: y - drop, z: b.z, h: 3.0 });
    B.anchorPost(2.0, 0.8, y);
    B.adv(4 + len); B.y -= drop;
  },

  turn(B, s) {
    B.rect(-HW, HW, 0, 8, B.y);
    const c = B.W(0, 4), lx = -B.fz, lz = B.fx;
    if (s.d === 'R') { B.fx = lx; B.fz = lz; } else { B.fx = -lx; B.fz = -lz; }
    B.x = c.x + B.fx * 4; B.z = c.z + B.fz * 4;
  },

  camp(B) {
    B.rect(-6, 6, 0, 12, B.y);
    const p = B.W(2.5, 6);
    B.tramo++;
    B.checkpoints.push({ x: p.x, y: B.y, z: p.z, tramo: B.tramo });
    B.adv(12);
  },

  summit(B) {
    B.rect(-5, 5, 0, 10, B.y);
    const p = B.W(0, 6);
    B.summit = { x: p.x, y: B.y, z: p.z };
    B.adv(10);
  }
};
GEN.lavaPillars = GEN.pillars;

function buildRoute() {
  const B = new RouteBuilder();
  // campamento de la playa = punto de control 0, justo antes del inicio
  B.checkpoints.push({ x: 2.5, y: B.y, z: B.z - 7, tramo: 0 });
  B.rect(-6, 6, -12, 0, B.y);
  for (const s of ROUTE) GEN[s.t](B, s);
  // los tramos van de una fogata a la siguiente; el último termina en la cumbre
  B.checkpoints.push({ x: B.summit.x, y: B.summit.y, z: B.summit.z, tramo: B.tramo + 1, summit: true });
  return B;
}
