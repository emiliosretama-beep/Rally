// La isla-volcán y la ruta: mapa de alturas, bloques escalables y peligros.
// Solo datos y consultas; nada de Three.js aquí.
'use strict';

const ROUTE_SEED = 20261028; // la ruta y la isla son siempre las mismas

function World() {
  const seed = ROUTE_SEED;
  this.seed = seed;
  const N = CFG.N, C = CFG.CELL;
  this.N = N; this.C = C;
  this.half = N * C / 2;
  this.h = new Float32Array((N + 1) * (N + 1));
  this.rng = U.rng(seed ^ 0x9e3779b9);
  this.noise = U.makeNoise(seed);
  this.noise2 = U.makeNoise(seed + 77);
  this.t = 0;
  this._useRoute(buildRoute());
  this._generate();
}

// Toma la ruta: biomas por altura según las fogatas, y el tamaño del cráter según la cumbre
World.prototype._useRoute = function (R) {
  this.route = R;
  this.rects = R.rects;
  this.blocks = R.blocks;
  this.anchors = R.anchors;
  this.gems = R.gems.map(g => Object.assign({ taken: false }, g));
  this.rings = R.rings; this.zips = R.zips; this.winds = R.winds; this.lavas = R.lavas;
  this.rockfalls = R.rockfalls; this.steams = R.steams; this.rails = R.rails; this.posts = R.posts;
  this.challenges = R.challenges;
  this.checkpoints = R.checkpoints;
  const cp = R.checkpoints;
  for (let i = 0; i < 3; i++) CFG.BIOMES[i].top = cp[i + 1].y + 2;
  this.summit = R.summit;
  CFG.PEAK_H = R.summit.y + 4;
  CFG.CRATER_R = Math.max(14, Math.hypot(R.summit.x, R.summit.z) - 14);
  CFG.LAVA_H = R.summit.y - 26;
  this.campfires = cp.filter(c => !c.summit).map((c, i) => ({ x: c.x, y: c.y, z: c.z, lit: i === 0, biome: i, start: i === 0 }));
  const s0 = cp[0];
  this.start = { x: s0.x - 2.5, y: s0.y, z: s0.z + 3, yaw: 0 };
  // bloques móviles y que se desmoronan van aparte; los fijos, en una rejilla
  this.dyn = [];
  this.bgrid = new Map();
  for (const b of this.blocks) {
    b.ox = 0; b.oy = 0; b.oz = 0; b.dx = 0; b.dy = 0; b.dz = 0;
    b.base = { x0: b.x0, x1: b.x1, y0: b.y0, y1: b.y1, z0: b.z0, z1: b.z1 };
    b.touch = 0; b.broken = false; b.brokenT = 0;
    if (b.move || b.crumble) { this.dyn.push(b); continue; }
    for (let gx = Math.floor(b.x0 / 8); gx <= Math.floor(b.x1 / 8); gx++)
      for (let gz = Math.floor(b.z0 / 8); gz <= Math.floor(b.z1 / 8); gz++) {
        const k = gx + ',' + gz;
        if (!this.bgrid.has(k)) this.bgrid.set(k, []);
        this.bgrid.get(k).push(b);
      }
  }
  // perfil de la montaña: la altura media de la ruta a cada distancia del centro
  const prof = new Float32Array(300), cnt = new Float32Array(300);
  for (const r of this.rects) {
    if (r.pit) continue;
    const cs = [[r.x0, r.z0], [r.x1, r.z0], [r.x0, r.z1], [r.x1, r.z1]].map(([x, z]) => Math.hypot(x, z));
    const a = Math.floor(Math.min(...cs)), b = Math.ceil(Math.max(...cs));
    for (let k = Math.max(0, a); k <= Math.min(299, b); k++) { prof[k] += r.h; cnt[k]++; }
  }
  const rEnd = Math.hypot(R.summit.x, R.summit.z);
  let last = R.summit.y;
  for (let k = 0; k < 300; k++) {
    if (k < rEnd) { prof[k] = R.summit.y; cnt[k] = 1; }
    if (cnt[k]) { prof[k] /= cnt[k]; last = prof[k]; } else prof[k] = last;
  }
  // suavizar y forzar que baje hacia la costa
  const sm = new Float32Array(300);
  for (let k = 0; k < 300; k++) { let s = 0, n = 0; for (let d = -10; d <= 10; d++) { const q = k + d; if (q >= 0 && q < 300) { s += prof[q]; n++; } } sm[k] = s / n; }
  for (let k = 1; k < 300; k++) sm[k] = Math.min(sm[k], sm[k - 1]);
  this.prof = sm;
};

World.prototype._profile = function (r) {
  const k = U.clamp(r, 0, 298), i = Math.floor(k), f = k - i;
  return this.prof[i] * (1 - f) + this.prof[i + 1] * f;
};

World.prototype._rawHeight = function (x, z) {
  const nz = this.noise, n2 = this.noise2;
  const r = Math.hypot(x, z), ang = Math.atan2(z, x);
  const wob = nz.fbm(Math.cos(ang) * 1.3 + 5, Math.sin(ang) * 1.3 + 5, 3) * 0.16 + nz.fbm(x * 0.006 + 9, z * 0.006, 3) * 0.10;
  // la cara sur (donde va la ruta) no se deforma, para que el perfil coincida
  const south = U.smooth(0.9, 0.3, Math.abs(U.angDiff(ang, -Math.PI / 2)));
  const rr = r * (1 + wob * (1 - south));
  const SH = CFG.SHORE_R, BR = CFG.BASE_R, CR = CFG.CRATER_R, PH = CFG.PEAK_H;
  if (rr > SH) return Math.max(-14, -1.5 - (rr - SH) * 0.35);
  if (rr > BR) {
    const t = (SH - rr) / (SH - BR);
    return t * 2.5 + nz.fbm(x * 0.05, z * 0.05, 2) * 0.6 * t;
  }
  // Interior del cráter: pared interna empinada hacia el lago de lava.
  const rimNoise = n2.fbm(Math.cos(ang) * 2 + 3, Math.sin(ang) * 2 + 3, 3) * 10;
  if (rr < CR) {
    const k = U.smooth(0, CR * 0.75, CR - rr);
    return PH + rimNoise - (PH + rimNoise - (CFG.LAVA_H - 8)) * k;
  }
  const u = (BR - rr) / (BR - CR);
  let h = Math.max(2.5, this._profile(rr));
  h += rimNoise * U.smooth(0.85, 1, u);
  h += nz.fbm(x * 0.02, z * 0.02, 4) * (3 + 7 * u);
  // Terrazas de roca lisa: repisas separadas por paredes que no se pueden escalar
  const step = 14;
  const ph = n2.fbm(x * 0.01 + 40, z * 0.01, 3) * 9;
  const t = (h + ph) / step;
  const i = Math.floor(t), f = t - i;
  const g = 0.16 * f + 0.84 * U.smooth(0.84, 1, f);
  const hTer = (i + g) * step - ph;
  return U.lerp(h, hTer, U.smooth(0.0, 0.1, u));
};

World.prototype._generate = function () {
  const N = this.N, C = this.C, half = this.half, H = this.h, W = N + 1;
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) H[j * W + i] = this._rawHeight(i * C - half, j * C - half);
  this._carveRoute();
  this.colliders = [];        // troncos: {x,z,r}
  this.grid = new Map();      // rejilla espacial de troncos
  this.trees = { palm: [], jungle: [], pine: [] };
  this.rocks = [];
  this.vines = [];            // (en la v0.3 las lianas son parte de las paredes de la ruta)
  this._placeStuff();
};

// Talla el pasillo de la ruta en el terreno: suelos planos, y a los lados paredes
// que no se pueden escalar (o un precipicio hacia el mar).
World.prototype._carveRoute = function () {
  const N = this.N, C = this.C, half = this.half, H = this.h, W = N + 1, n2 = this.noise2;
  const R = this.rects;
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const x = i * C - half, z = j * C - half, k = j * W + i;
    let floor = null, pit = null, dmin = 1e9, near = null, maxNear = -1e9;
    for (let q = 0; q < R.length; q++) {
      const r = R[q];
      if (x < r.x0 - 16 || x > r.x1 + 16 || z < r.z0 - 16 || z > r.z1 + 16) continue;
      if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) {
        if (r.pit) pit = r; else if (!floor || r.h > floor.h) floor = r;
        continue;
      }
      const dx = Math.max(r.x0 - x, 0, x - r.x1), dz = Math.max(r.z0 - z, 0, z - r.z1), d = Math.hypot(dx, dz);
      if (d < dmin) { dmin = d; near = r; }
      if (d < 10) maxNear = Math.max(maxNear, r.h);
    }
    if (floor) { H[k] = floor.h; continue; }
    if (pit) { H[k] = pit.h; continue; }
    if (!near || dmin >= 16) continue;
    const nat = H[k];
    const qx = U.clamp(x, near.x0, near.x1), qz = U.clamp(z, near.z0, near.z1);
    const outward = Math.hypot(x, z) > Math.hypot(qx, qz) + 3;
    const top = maxNear + 7 + (n2.n2(x * 0.3, z * 0.3) + 1) * 1.2;
    const target = outward ? Math.min(nat, near.h - 5) : Math.max(nat, top);
    H[k] = dmin < 7 ? target : U.lerp(target, nat, U.smooth(7, 16, dmin));
  }
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

// ---------- bloques de la ruta ----------
World.prototype.blocksNear = function (x, z, out) {
  out.length = 0;
  const gx = Math.floor(x / 8), gz = Math.floor(z / 8);
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const arr = this.bgrid.get((gx + dx) + ',' + (gz + dz));
    if (arr) for (let k = 0; k < arr.length; k++) if (out.indexOf(arr[k]) < 0) out.push(arr[k]);
  }
  for (const b of this.dyn) if (!b.broken && x > b.x0 - 12 && x < b.x1 + 12 && z > b.z0 - 12 && z < b.z1 + 12) out.push(b);
  return out;
};

World.prototype.blockAt = function (x, y, z, m) {
  m = m || 0;
  const L = this.blocksNear(x, z, this._tmp || (this._tmp = []));
  for (const b of L) if (x >= b.x0 - m && x <= b.x1 + m && z >= b.z0 - m && z <= b.z1 + m && y >= b.y0 - m && y <= b.y1 + m) return b;
  return null;
};

World.prototype.facePlane = function (b, key) { return facePlane(b, key); };

// ¿Qué hay en la cara 'key' en el plano dado, en la posición (a a lo largo, y)?
// Devuelve { b, type } (type null = roca lisa) o null si ahí no hay pared.
World.prototype.faceSurf = function (key, plane, a, y) {
  const zf = key === 'nz' || key === 'pz';
  const px = zf ? a : plane, pz = zf ? plane : a;
  const L = this.blocksNear(px, pz, this._tmp2 || (this._tmp2 = []));
  for (const b of L) {
    if (b.broken || Math.abs(facePlane(b, key) - plane) > 0.06) continue;
    const a0 = zf ? b.x0 : b.z0, a1 = zf ? b.x1 : b.z1;
    if (a < a0 - 0.001 || a > a1 + 0.001 || y < b.y0 || y > b.y1) continue;
    if (b.climbAll) return { b, type: b.climbAll };
    const rs = b.faces[key];
    if (rs) for (const r of rs) if (a >= r.a0 && a <= r.a1 && y >= r.y0 && y <= r.y1) return { b, type: r.type };
    return { b, type: null };
  }
  return null;
};

// Suelo más alto bajo un punto (terreno o techo de un bloque)
World.prototype.groundBelow = function (x, y, z) {
  let g = this.heightAt(x, z);
  const L = this.blocksNear(x, z, this._tmp3 || (this._tmp3 = []));
  for (const b of L) if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1 && b.y1 <= y + 0.25 && b.y1 > g) g = b.y1;
  return g;
};

World.prototype.rectAt = function (x, z) {
  let best = null;
  for (const r of this.rects) if (x >= r.x0 - 1 && x <= r.x1 + 1 && z >= r.z0 - 1 && z <= r.z1 + 1) { if (!best || (!r.pit && best.pit)) best = r; }
  return best;
};

World.prototype.inLava = function (x, y, z) {
  for (const l of this.lavas) if (x >= l.x0 && x <= l.x1 && z >= l.z0 && z <= l.z1 && y < l.y + 0.25) return true;
  return false;
};

// ¿Está cerca de la ruta? (para no poner árboles ni rocas en el camino)
World.prototype.nearRoute = function (x, z, m) {
  for (const r of this.rects) if (x > r.x0 - m && x < r.x1 + m && z > r.z0 - m && z < r.z1 + m) return true;
  for (const b of this.blocks) if (x > b.x0 - m && x < b.x1 + m && z > b.z0 - m && z < b.z1 + m) return true;
  return false;
};

// Plataformas que se mueven y roca que se desmorona
World.prototype.update = function (dt) {
  this.t += dt;
  for (const b of this.dyn) {
    if (b.move) {
      const m = b.move, off = Math.sin(this.t * Math.PI * 2 / m.period + m.phase) * m.amp;
      const ax = m.axis, B0 = b.base;
      const old = ax === 'x' ? b.ox : ax === 'y' ? b.oy : b.oz;
      b.dx = b.dy = b.dz = 0;
      if (ax === 'x') { b.ox = off; b.dx = off - old; b.x0 = B0.x0 + off; b.x1 = B0.x1 + off; }
      else if (ax === 'y') { b.oy = off; b.dy = off - old; b.y0 = B0.y0 + off; b.y1 = B0.y1 + off; }
      else { b.oz = off; b.dz = off - old; b.z0 = B0.z0 + off; b.z1 = B0.z1 + off; }
    }
    if (b.crumble) {
      if (b.broken) {
        b.brokenT -= dt;
        if (b.brokenT <= 0) { b.broken = false; b.touch = 0; }
      } else if (b.touch >= b.crumble) {
        b.broken = true; b.brokenT = 6;
      } else if (!b.touched) b.touch = Math.max(0, b.touch - dt * 0.5);
      b.touched = false;
    }
  }
};

World.prototype.touchBlock = function (b, dt) {
  if (b && b.crumble && !b.broken) { b.touch += dt; b.touched = true; }
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
    const a = rng() * Math.PI * 2, r = CFG.CRATER_R + rng() * (CFG.SHORE_R - CFG.CRATER_R);
    const x = Math.cos(a) * r, z = Math.sin(a) * r, y = this.heightAt(x, z);
    if (y < minH || y > maxH) continue;
    this.normalAt(x, z, nv, 1);
    if (nv.y < maxSlope) continue;
    if (this.nearRoute(x, z, 3)) continue;
    if (Math.hypot(this.start.x - x, this.start.z - z) < 12) continue;
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
  tree('jungle', 650, B[0].top - 6, B[1].top, 0.45);
  tree('pine', 300, B[1].top - 8, B[2].top - 10, 0.35);
  for (let k = 0; k < 520; k++) {
    const p = this._randomSpot(0.5, CFG.PEAK_H + 20, 0.55, 10);
    if (p) this.rocks.push({ x: p.x, y: p.y, z: p.z, s: 0.4 + rng() * rng() * 2.6, rot: rng() * 6.28, b: this.biomeIndex(p.y) });
  }
  // Avión estrellado en la playa, junto al campamento
  const s = this.start;
  this.wreck = { x: s.x - 13, z: s.z - 6, y: 0, rot: 0.9 };
  this.wreck.y = this.heightAt(this.wreck.x, this.wreck.z);
  this._addCollider(this.wreck.x, this.wreck.z, 2.2);
};
