// El Gigante Blanco: forma de la montaña (pirámide con aristas), glaciar, cuerdas fijas,
// bloques de hielo que caen y el camino de la expedición. Extiende World (world.js).
'use strict';

// Profundidad de las caras entre aristas: nada en las aristas, todo en el centro de cada cara
World.prototype._faceA = function (r) { return Math.min(0.55 * r, 30) * U.smooth(3, 26, r); };
World.prototype._faceD = function (a) {
  let m = 9;
  for (const ra of this.ridgeAngs) m = Math.min(m, Math.abs(U.angDiff(a, ra)));
  return Math.pow(U.clamp(m / 0.95, 0, 1), 0.75);
};

// Perfil de la montaña desde la cumbre, sacado de la ruta: así el camino siempre va sobre la nieve
World.prototype._k2Shape = function () {
  const pk = this.peak, R = this.route;
  const angOf = (x, z) => Math.atan2(z - pk.z, x - pk.x);
  // aristas: las que recorre la ruta, y las que falten para completar la pirámide
  this.ridgeAngs = R.ridges.map(r => angOf(r.x, r.z));
  while (this.ridgeAngs.length < 4) {
    const a = this.ridgeAngs.slice().sort((p, q) => p - q);
    let best = 0, gap = -1;
    for (let i = 0; i < a.length; i++) {
      const g = i === a.length - 1 ? a[0] + Math.PI * 2 - a[i] : a[i + 1] - a[i];
      if (g > gap) { gap = g; best = a[i] + g / 2; }
    }
    this.ridgeAngs.push(a.length ? best : 0);
  }
  const M = 560, sum = new Float32Array(M), cnt = new Float32Array(M);
  const put = (x, z, y, wgt) => {
    const r = Math.hypot(x - pk.x, z - pk.z), k = Math.round(r);
    if (k >= M) return;
    sum[k] += (y + this._faceA(r) * this._faceD(angOf(x, z))) * wgt; cnt[k] += wgt;
  };
  for (const g of this.gorges) for (const q of g.samples) put(q.x, q.z, q.F, 1);
  for (const c of this.camps) put(c.x, c.z, c.y, 3);
  const raw = new Float32Array(M).fill(NaN);
  let rMax = 0;
  for (let k = 0; k < M; k++) if (cnt[k] > 0) { raw[k] = sum[k] / cnt[k]; rMax = k; }
  for (let k = 0; k <= 4; k++) raw[k] = Math.max(isNaN(raw[k]) ? -1e9 : raw[k], this.summit.y + 1.5);
  for (let k = rMax + 1; k < M; k++) raw[k] = U.lerp(raw[rMax], -3, U.smooth(rMax, rMax + 40, k));
  let last = 0;
  for (let k = 1; k < M; k++) {
    if (isNaN(raw[k])) continue;
    for (let q = last + 1; q < k; q++) raw[q] = U.lerp(raw[last], raw[k], (q - last) / (k - last));
    last = k;
  }
  const out = new Float32Array(M);
  for (let k = 0; k < M; k++) { let s = 0, n = 0; for (let d = -6; d <= 6; d++) { const q = k + d; if (q >= 0 && q < M) { s += raw[q]; n++; } } out[k] = s / n; }
  for (let k = 1; k < M; k++) out[k] = Math.min(out[k], out[k - 1]);
  this.prof = out;
};

World.prototype._profK2 = function (r) {
  const k = U.clamp(r, 0, this.prof.length - 2), i = Math.floor(k), f = k - i;
  return this.prof[i] * (1 - f) + this.prof[i + 1] * f;
};

World.prototype._rawHeightSnow = function (x, z) {
  const pk = this.peak, nz = this.noise, n2 = this.noise2;
  const dx = x - pk.x, dz = z - pk.z, r = Math.hypot(dx, dz), a = Math.atan2(dz, dx);
  let h = this._profK2(r) - this._faceA(r) * this._faceD(a);
  // irregularidades grandes y pequeñas
  h += nz.fbm(x * 0.012, z * 0.012, 4) * 6 * U.smooth(40, 170, r) + nz.fbm(x * 0.05, z * 0.05, 2) * 1.2;
  // bandas de roca: escalones en las caras de la montaña
  // (de alto distinto según la zona y con bordes que ondulan, como capas de roca de verdad)
  const ph = n2.fbm(x * 0.005 + 7, z * 0.005, 3) * 15 + n2.n2(x * 0.025, z * 0.025 + 4) * 2.5;
  const step = 13 + 8 * U.clamp(0.5 + nz.fbm(x * 0.0035 - 8, z * 0.0035 + 30, 2) * 1.2, 0, 1);
  const t = (h + ph) / step, i = Math.floor(t), f = t - i;
  const g = 0.25 * f + 0.75 * U.smooth(0.8, 1, f);
  h = U.lerp(h, (i + g) * step - ph, 0.55 * U.smooth(20, 60, h) * U.smooth(330, 200, r));
  // el glaciar del valle y las paredes del valle al borde del mapa
  h = Math.max(h, -3 + nz.fbm(x * 0.02, z * 0.02, 3) * 2);
  const edge = Math.min(this.half - Math.abs(x), this.half - Math.abs(z));
  h += 75 * U.smooth(90, 0, edge) * (0.7 + 0.3 * n2.fbm(x * 0.01, z * 0.01, 2));
  return h;
};

// Punto del camino a s metros (y lat a la izquierda), también un poco antes o después del tramo
World.prototype.pathPoint = function (g, s, lat, out) {
  const S = g.samples, n = S.length;
  let a, b, f;
  if (s <= 0) { a = S[0]; b = S[Math.min(1, n - 1)]; f = s; }
  else if (s >= n - 1) { a = S[n - 1]; b = null; f = s - (n - 1); }
  else { const i = Math.floor(s); a = S[i]; b = S[i + 1]; f = s - i; }
  const ang = b ? U.lerp(a.ang, b.ang, U.clamp(f, 0, 1)) : (s >= g.end.s ? g.end.ang : a.ang);
  const Hx = Math.sin(ang), Hz = Math.cos(ang), Lx = Math.cos(ang), Lz = -Math.sin(ang);
  out = out || {};
  out.x = a.x + Hx * f + Lx * lat; out.z = a.z + Hz * f + Lz * lat; out.ang = ang;
  return out;
};

// Ejes de un campamento: lat a los lados del camino, fwd hacia el tramo siguiente.
// Apareces en fwd 4 y la cámara queda cerca de fwd 0: ahí no se pone nada.
const CAMP_REST = { lat: 2.0, fwd: 7.2 };
World.prototype.campFrame = function (ci) {
  const c = this.camps[ci], nextG = this.gorges[ci], prevG = this.gorges[ci - 1];
  const dir = nextG ? Math.atan2(nextG.samples[0].x - c.x, nextG.samples[0].z - c.z) : prevG ? prevG.end.ang : 0;
  const Lx = Math.cos(dir), Lz = -Math.sin(dir), Hx = Math.sin(dir), Hz = Math.cos(dir);
  const at = (lat, fwd) => { const x = c.x + Lx * lat + Hx * fwd, z = c.z + Lz * lat + Hz * fwd; return { x, z, y: this.groundBelow(x, c.y + 2, z) }; };
  return { c, dir, at, Lx, Lz, Hx, Hz };
};

// Después de tallar: cuerdas fijas, bloques de hielo y el camino de la IA sobre el terreno real
World.prototype._k2After = function () {
  const tmp = {};
  this.pickets = [];
  for (const L of this.lines) {
    const g = this.gorges[L.gi], pts = [];
    for (let s = L.sA; s <= L.sB + 0.01; s += 1) {
      this.pathPoint(g, s, L.lat, tmp);
      pts.push({ x: tmp.x, y: this.gorgeF(g, s) + L.h, z: tmp.z, s });
    }
    // largo acumulado para moverse a lo largo de la cuerda
    let d = 0;
    pts.forEach((p, i) => { if (i) d += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y, p.z - pts[i - 1].z); p.d = d; });
    L.pts = pts; L.len = d;
    // dónde empieza y termina lo empinado (en metros a lo largo de la cuerda)
    const dAt = s => { const k = U.clamp(Math.round(s - L.sA), 0, pts.length - 1); return pts[k].d; };
    L.dBot = L.steep ? dAt(L.steepA - 0.5) : 0; L.dTop = L.steep ? dAt(L.steepB + 0.8) : d;
    L.proxy = { x: pts[0].x, y: pts[0].y + 0.3, z: pts[0].z, idx: L.idx, line: L, lineOnly: true, wall: false };
    const an = this.anchors[L.idx];
    an.x = pts[0].x; an.y = pts[0].y; an.z = pts[0].z;
    // estacas de aluminio en la nieve cada 7 m
    for (let k = 0; k < pts.length; k += 7) this.pickets.push({ x: pts[k].x, y: pts[k].y - L.h, z: pts[k].z, line: L.id });
    if ((pts.length - 1) % 7) this.pickets.push({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y - L.h, z: pts[pts.length - 1].z, line: L.id });
  }
  // carriles de los bloques de hielo: de arriba hacia abajo por la ladera
  this.icefalls = this.icefallDefs.map(def => {
    const g = this.gorges[def.gi];
    const lanes = def.lanes.map(lat => {
      const pts = [];
      for (let s = def.s1; s >= def.s0 - 0.01; s -= 1) { this.pathPoint(g, s, lat, tmp); pts.push({ x: tmp.x, y: this.gorgeF(g, s) + 0.55, z: tmp.z }); }
      let d = 0;
      pts.forEach((p, i) => { if (i) d += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y, p.z - pts[i - 1].z); p.d = d; });
      return { pts, len: d, lat };
    });
    return Object.assign({}, def, { lanes });
  });
  this._snapNpcPath();
};

// Posición sobre una cuerda o un carril a una distancia d desde el inicio
World.prototype.alongPts = function (pts, d, out) {
  out = out || {};
  if (d <= 0) { const p = pts[0]; out.x = p.x; out.y = p.y; out.z = p.z; out.i = 0; return out; }
  let i = 1;
  while (i < pts.length - 1 && pts[i].d < d) i++;
  const a = pts[i - 1], b = pts[i], f = U.clamp((d - a.d) / ((b.d - a.d) || 1), 0, 1);
  out.x = U.lerp(a.x, b.x, f); out.y = U.lerp(a.y, b.y, f); out.z = U.lerp(a.z, b.z, f); out.i = i - 1;
  return out;
};

// Punto más cercano de una cuerda: distancia a lo largo (d) y separación (dist)
World.prototype.lineNearest = function (L, x, y, z, out) {
  out = out || {};
  const P = L.pts;
  let best = 1e9, bd = 0;
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i], b = P[i + 1];
    if (Math.abs(a.x - x) > 6 && Math.abs(b.x - x) > 6) continue;
    if (Math.abs(a.z - z) > 6 && Math.abs(b.z - z) > 6) continue;
    const ex = b.x - a.x, ey = b.y - a.y, ez = b.z - a.z, L2 = ex * ex + ey * ey + ez * ez || 1;
    const t = U.clamp(((x - a.x) * ex + (y - a.y) * ey + (z - a.z) * ez) / L2, 0, 1);
    const px = a.x + ex * t, py = a.y + ey * t, pz = a.z + ez * t, d2 = (x - px) ** 2 + (y - py) ** 2 + (z - pz) ** 2;
    if (d2 < best) { best = d2; bd = a.d + (b.d - a.d) * t; }
  }
  out.d = bd; out.dist = Math.sqrt(best);
  return out;
};

// El camino de la expedición sobre el terreno ya tallado
World.prototype._snapNpcPath = function () {
  const sp = { x: 0, z: 0, nx: 0, nz: 0, y0: 0, y1: 0, amp: 0 };
  const out = [];
  for (const nd of this.npcPath) {
    const n = Object.assign({}, nd);
    if (n.x === undefined && n.strip === undefined) continue;
    // en los campamentos descansan junto al farol, no en el centro (ahí queda tu cámara al aparecer)
    if (n.mode === 'rest' && this.gorges[n.camp]) {
      const f = this.campFrame(n.camp), q = f.at(CAMP_REST.lat, CAMP_REST.fwd);
      n.x = q.x; n.z = q.z; n.dir = f.dir;
    }
    if (n.strip !== undefined) {
      if (n.u === undefined) continue;
      const st = this.strips[n.strip];
      this.stripPoint(st, n.u, sp);
      const r = this.relief(st, n.u, n.y + 1, sp.amp) + 0.42;
      n.x = sp.x + sp.nx * r; n.z = sp.z + sp.nz * r; n.yaw = Math.atan2(-sp.nx, -sp.nz);
    } else if (n.mode !== 'ladder') {
      n.y = this.groundBelow(n.x, n.y + 1.2, n.z);
    }
    out.push(n);
  }
  this.npcPath = out;
};

World.prototype._placeStuffSnow = function () {
  const rng = this.rng, pk = this.peak;
  // rocas sueltas en la morrena del glaciar y en las caras de la montaña
  for (let k = 0; k < 700; k++) {
    const a = rng() * Math.PI * 2, r = 30 + Math.sqrt(rng()) * 340;
    const x = pk.x + Math.cos(a) * r, z = pk.z + Math.sin(a) * r;
    if (Math.abs(x) > this.half - 10 || Math.abs(z) > this.half - 10) continue;
    if (this.nearRoute(x, z, 2)) continue;
    const y = this.heightAt(x, z);
    this.rocks.push({ x, y, z, s: 0.4 + rng() * rng() * 2.4, rot: rng() * 6.28, b: 2 });
  }
  this.wreck = null;
};
