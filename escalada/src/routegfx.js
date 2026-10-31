// Dibujo de los barrancos: paredes de roca con relieve, presas, cascadas, río y pozas, repisas,
// rocas, puentes, cornisas, cables, ganchos, cuerda, garfios, tirolesas, gemas y peligros.
// Extiende Gfx. Lee el estado del mundo; no lo cambia.
'use strict';

// Colores de la roca de cada barranco: base, vetas, mojada, musgo y la tapa de arriba
const GORGE_PAL = [
  { rock: 0x9a7f62, rock2: 0xb7976f, wet: 0x4a4036, moss: 0x55753a, cap: 0x7aa04c, floor: 0x8a7a66 },   // del Río
  { rock: 0x6f6b5a, rock2: 0x8a8068, wet: 0x34352c, moss: 0x3f6e30, cap: 0x3f7d33, floor: 0x625c4c },   // de la Selva
  { rock: 0x878d99, rock2: 0xa3a9b4, wet: 0x59606e, moss: 0xbfdff0, cap: 0xeef2f8, floor: 0xd8dee8 },   // Helado
  { rock: 0x3d3537, rock2: 0x5e3a2e, wet: 0x231e20, moss: 0x8a3a1e, cap: 0x4a4244, floor: 0x3a3234 }    // de Fuego
];
const ZONE_TINT = { rock: 0xf1e6cf, ice: 0xd8f4ff, vine: 0x3f6a2c, ladder: 0x9a8f80, crumble: 0xa86a48 };
// Paleta de cada tramo según la montaña (K2_PAL está en k2gfx.js)
Gfx.prototype.pal = function (tramo) { return (this.world.snow ? K2_PAL : GORGE_PAL)[tramo] || GORGE_PAL[0]; };

function rtGeom(pos, col, idx) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  if (idx) g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

Gfx.prototype._buildRoute = function () {
  this.holds = new Map(); // presas por franja (para que las manos las busquen)
  this._buildWalls();
  this._buildBlocks();
  this._buildWater();
  this._buildFalls();
  this._buildHolds();
  this._buildGorgeDeco();
  this._buildRouteProps();
};

// ---------- paredes de roca ----------
// Color de la roca en un punto de la pared. zone/zk: la zona con presas y cuánto se nota ahí
// (0..1, con el borde irregular). x, z: posición en el mundo, para que las vetas sigan de una
// pared a otra con la misma inclinación, como capas de roca de verdad.
Gfx.prototype._wallColor = function (st, u, y, floorY, zone, nearFall, out, x, z, zk) {
  const w = this.world, P = this.pal(st.tramo), nz = w.noise, tmp = this._c2;
  if (zk === undefined) zk = zone ? 1 : 0;
  x = x || 0; z = z || 0;
  const v = nz.fbm(u * 0.18 + st.seed, y * 0.22, 3);
  out.set(P.rock).lerp(tmp.set(P.rock2), U.clamp(0.5 + v * 1.4, 0, 1));
  // abajo y junto a las cascadas la roca está mojada y con musgo (las zonas con presas, secas)
  const wet = Math.max(U.smooth(floorY + 2.2, floorY - 0.2, y), nearFall) * (1 - zk * 0.8);
  if (wet > 0) {
    out.lerp(tmp.set(P.wet), wet * 0.75);
    if (st.tramo !== 3 && nz.n2(u * 0.6 + 40, y * 0.7) > 0.05) out.lerp(tmp.set(P.moss), wet * 0.6);
  }
  if (zone && zk > 0.01) {
    // roca clara y seca donde hay presas; la cantidad cambia un poco para que no sea un parche liso
    const amt = (zone.type === 'vine' ? 0.55 : w.snow && zone.type === 'rock' ? 0.34 : 0.42) * (0.8 + nz.n2(u * 0.35 + 9, y * 0.3) * 0.4);
    if (!zone.wallIce) out.lerp(tmp.set(ZONE_TINT[zone.crumble ? 'crumble' : zone.type] || ZONE_TINT.rock), amt * zk);
    // marcas de magnesio
    if (zone.type === 'rock' && zk > 0.6 && nz.n2(u * 2.6, y * 2.6) > 0.25) out.lerp(tmp.set(0xffffff), 0.32 * zk);
  }
  // capas de roca inclinadas (la misma inclinación en todo el barranco), de grosor desigual
  const g = st.tramo || 0, dip = 0.07 + 0.05 * Math.sin(g * 2.3 + 1);
  const yy = y + (x * Math.cos(g * 1.7) + z * Math.sin(g * 1.7)) * dip + nz.n2(x * 0.05 + z * 0.03, y * 0.04) * 1.6;
  const layer = nz.fbm(g * 3.1 + 0.5, yy * 0.32, 3);
  let k = 0.9 + layer * 0.26 + nz.n2(u * 1.7, y * 1.9) * 0.05;
  // juntas finas entre capas
  const seam = Math.abs(Math.sin(yy * 1.9 + nz.n2(u * 0.2, yy * 0.1) * 2));
  k *= 1 - 0.16 * U.smooth(0.93, 0.995, seam);
  // escurrimientos oscuros que bajan desde el borde (la lluvia tiñe la roca)
  const streak = nz.n2(u * 0.75 + st.seed * 0.3, y * 0.035);
  k *= 1 - 0.13 * U.smooth(0.18, 0.5, streak) * (1 - zk * 0.7);
  out.multiplyScalar(k);
  if (!w.snow && st.tramo === 3 && y < floorY + 1.6 && nz.n2(u * 2.3, y * 3.1) > 0.35) out.set(0xff7a2a); // grietas de lava
  return out;
};

// Zona con presas en (u, y) con borde suave e irregular: { zone, k } (k = 1 dentro, 0 fuera).
// Los bordes de arriba y de abajo que coinciden con el final de la pared no se difuminan.
Gfx.prototype._zoneSoft = function (st, u, y, sp, out) {
  const nz = this.world.noise, n = nz.n2(u * 1.15 + st.seed, y * 1.05) * 0.32 + nz.n2(u * 3.1, y * 2.7 + st.seed) * 0.1;
  out.zone = null; out.k = 0;
  for (const z of st.zones) {
    let d = Math.min(u - z.u0, z.u1 - u);
    if (z.y1 < sp.y1 - 0.3) d = Math.min(d, z.y1 - y);
    if (z.y0 > sp.y0 + 2) d = Math.min(d, y - z.y0);
    // fuera de la zona en vertical (donde el borde no se difumina) no cuenta
    if ((z.y1 >= sp.y1 - 0.3 && y > z.y1 + 0.05) || (z.y0 <= sp.y0 + 2 && y < z.y0 - 0.05)) continue;
    const k = U.smooth(-0.18, 0.42, d + n);
    if (k > out.k) { out.k = k; out.zone = z; }
  }
  return out;
};

// Un dato de los puntos de la franja interpolado en u (off: cuánto se adelanta un escalón en
// las esquinas; s: posición a lo largo del cauce de una pared lateral)
function stripAttr(st, u, key) {
  const P = st.pts;
  if (P[0][key] === undefined) return 0;
  let i = U.clamp(Math.floor(u / st.du), 0, P.length - 2);
  while (i > 0 && P[i].u > u) i--;
  while (i < P.length - 2 && P[i + 1].u < u) i++;
  const a = P[i], b = P[i + 1], t = U.clamp((u - a.u) / ((b.u - a.u) || 1), 0, 1);
  return a[key] + (b[key] - a[key]) * t;
}

Gfx.prototype._buildWalls = function () {
  const w = this.world, S = this.scene, step = { low: 1.15, med: 0.85, high: 0.65 }[this.q] || 0.85;
  const nz = w.noise, sp = { x: 0, z: 0, nx: 0, nz: 0, y0: 0, y1: 0, amp: 0 }, sp2 = Object.assign({}, sp);
  const c = new THREE.Color(), capC = new THREE.Color(), zs = { zone: null, k: 0 }, leanT = {};
  const byG = new Map();
  for (const st of w.strips) {
    if (!byG.has(st.tramo)) byG.set(st.tramo, { pos: [], col: [], idx: [] });
    const G = byG.get(st.tramo), P = this.pal(st.tramo);
    const nu = Math.max(2, Math.ceil(st.len / step));
    let hMax = 0;
    for (const p of st.pts) hMax = Math.max(hMax, p.y1 - p.y0);
    const nv = Math.max(2, Math.ceil(hMax / step));
    // tapa: la roca sigue hacia atrás arriba de la pared y se mete bajo el terreno
    // (cubre la rampa del terreno aunque la cuadrícula la deje más lejos; escala con la celda)
    const sc = Math.max(1, w.C / 2);
    const side = st.kind === 'side';
    // escalones: la tapa baja hasta meterse bajo la repisa; en las esquinas forma hombros de roca
    const cap = side ? [[0.5, 0.08], [2.0, 0.14], [4.5 * sc, 0.1], [6.3 * sc, 0.02], [8.6 * sc, -1.7]] : [[0.6, 0.02, 0.85], [1.8, -0.12, 0.45], [3.2, -0.4, 0]];
    const extra = side ? 0 : 2;
    const rows = nv + 1 + extra + cap.length, base = G.pos.length / 3;
    const Wst = side ? 0 : st.half - 2.2;
    // ¿el orden de los vértices deja la cara mirando hacia fuera?
    w.stripPoint(st, Math.min(st.len, 0.6), sp); const ax = sp.x, az = sp.z;
    w.stripPoint(st, 0, sp2);
    const tx = ax - sp2.x, tz = az - sp2.z, flip = (-tz * sp2.nx + tx * sp2.nz) < 0;
    for (let i = 0; i <= nu; i++) {
      const u = st.len * i / nu;
      w.stripPoint(st, u, sp);
      const floorY = sp.y0 + 1.5;
      let fallK = 0;
      for (const f of st.falls) fallK = Math.max(fallK, U.smooth(1.4, 0, Math.max(f.u0 - u, u - f.u1)));
      const ampK = sp.amp / 0.55;
      // paredes laterales: arriba se tumban hacia atrás (ver World.leanAt)
      const L = side ? w.leanAt(w.gorges[st.gorge], stripAttr(st, u, 's'), st.side === 'L' ? 1 : -1, leanT) : null;
      for (let j = 0; j <= nv; j++) {
        const y = U.lerp(sp.y0, sp.y1, j / nv);
        const back = L ? w.leanBack(L, y) : 0;
        let r = w.relief(st, u, y, sp.amp);
        // detalle que no cambia la física: grietas, cornisitas y bultos
        r += (nz.n2(u * 1.3 + st.seed, y * 1.4) * 0.07 + nz.n2(u * 3.1, y * 2.9 + st.seed) * 0.03) * ampK;
        r += 0.1 * U.smooth(0.78, 0.98, (y * 0.42 + nz.n2(u * 0.2, y * 0.1) * 0.6) % 1) * ampK;
        if (j === nv) r *= 0.6;
        r -= back;
        const px = sp.x + sp.nx * r, pz = sp.z + sp.nz * r;
        G.pos.push(px, y, pz);
        this._zoneSoft(st, u, y, sp, zs);
        this._wallColor(st, u, y, floorY, zs.zone, fallK * U.smooth(sp.y1 + 0.5, sp.y1 - 3, y) + fallK * 0.5, c, px, pz, zs.k);
        // en las bandas menos empinadas de arriba crece algo (pasto, musgo o nieve, según el lugar)
        if (L && y > L.yb + 0.5) {
          const slope = L.k * (1 + 0.912 * Math.cos(2.4 * (y - L.yb) + L.ph));
          const veg = U.smooth(0.55, 1.05, slope) * U.smooth(-0.2, 0.25, nz.n2(u * 0.4 + 3, y * 0.5)) * 0.75;
          if (veg > 0.02) { this._terrainColor(px, y, pz, 0.97, capC); c.lerp(capC, veg); }
        }
        G.col.push(c.r, c.g, c.b);
      }
      // hombros: junto a las paredes laterales el borde de arriba sube (solo se ve; ahí no se sale)
      let raise = 0;
      if (!side) {
        raise = 1.8 * U.smooth(Wst - 0.4, Wst + 1.3, Math.abs(st.half - u)) * (0.6 + 0.4 * (nz.n2(u * 0.55 + st.seed, 3.3) * 0.5 + 0.5));
        for (const t of [0.55, 1]) {
          const y = sp.y1 + raise * t, r = w.relief(st, u, sp.y1, sp.amp) * 0.6 * (1 - t) - 0.18 * raise * t;
          G.pos.push(sp.x + sp.nx * r, y, sp.z + sp.nz * r);
          this._wallColor(st, u, y, floorY, null, 0, c, sp.x, sp.z, 0);
          G.col.push(c.r, c.g, c.b);
        }
      }
      // la tapa de un escalón llega hasta la repisa aunque la pared se adelante en las esquinas;
      // la de una pared lateral empieza donde termina la parte tumbada
      const capOff = side ? w.leanBack(L, sp.y1) : stripAttr(st, u, 'off');
      for (const [back0, dy0, rk] of cap) {
        const back = back0 + capOff, dy = side ? dy0 : dy0 + raise * rk;
        const jit = side ? nz.n2(u * 0.7, back) * 0.25 : 0;
        const px = sp.x - sp.nx * back, py = sp.y1 + dy + jit, pz = sp.z - sp.nz * back;
        G.pos.push(px, py, pz);
        // del mismo color que el terreno de alrededor (sin costura); roca solo en la orilla
        if (side) { this._terrainColor(px, sp.y1, pz, 0.97, capC); capC.lerp(c.set(P.rock), back < 1 ? 0.55 : back < 2.5 ? 0.18 : 0); }
        // los hombros son de roca (con nieve encima en la montaña nevada)
        else capC.set(P.cap).lerp(c.set(P.rock), U.clamp((w.snow ? 0.1 : 0.3) + raise * (w.snow ? 0.12 : 0.4), 0, 0.85));
        G.col.push(capC.r, capC.g, capC.b);
      }
    }
    for (let i = 0; i < nu; i++) for (let j = 0; j < rows - 1; j++) {
      const a = base + i * rows + j, b = a + rows;
      if (flip) G.idx.push(a, b + 1, b, a, a + 1, b + 1);
      else G.idx.push(a, b, b + 1, a, b + 1, a + 1);
    }
  }
  this.wallMeshes = [];
  byG.forEach(G => {
    const m = new THREE.Mesh(rtGeom(G.pos, G.col, G.idx), this.terrainMat);
    m.castShadow = this.Q.shadow; m.receiveShadow = this.Q.shadow;
    S.add(m);
    this.wallMeshes.push(m);
  });
};

// ---------- bloques: repisas, bordes, rocas, cornisas y tablas ----------
// Caras de una caja orientada (en coordenadas locales), subdivididas; las verticales con bordes irregulares hacia dentro
function obbFaces(b, out, colOf, opt) {
  opt = opt || {};
  const hx = b.hx, hy = (b.y1 - b.y0) / 2, hz = b.hz, cy = (b.y0 + b.y1) / 2;
  const W = (lx, ly, lz) => [b.cx + lx * b.c - lz * b.s, cy + ly, b.cz + lx * b.s + lz * b.c];
  const faces = [
    { o: [-hx, hy, -hz], u: [2 * hx, 0, 0], v: [0, 0, 2 * hz], n: [0, 1, 0], key: 'top' },
    { o: [hx, -hy, hz], u: [-2 * hx, 0, 0], v: [0, 2 * hy, 0], n: [0, 0, 1], key: 'pz' },
    { o: [-hx, -hy, -hz], u: [2 * hx, 0, 0], v: [0, 2 * hy, 0], n: [0, 0, -1], key: 'nz' },
    { o: [hx, -hy, -hz], u: [0, 0, 2 * hz], v: [0, 2 * hy, 0], n: [1, 0, 0], key: 'px' },
    { o: [-hx, -hy, hz], u: [0, 0, -2 * hz], v: [0, 2 * hy, 0], n: [-1, 0, 0], key: 'nx' }
  ];
  const c = new THREE.Color();
  for (const f of faces) {
    if (opt.only && opt.only.indexOf(f.key) < 0) continue;
    const lu = Math.hypot(...f.u), lv = Math.hypot(...f.v);
    const su = Math.max(1, Math.round(lu / (opt.cell || 1.4))), sv = Math.max(1, Math.round(lv / (opt.cell || 1.4)));
    const grid = [];
    for (let j = 0; j <= sv; j++) for (let i = 0; i <= su; i++) {
      const edge = i === 0 || j === 0 || i === su || j === sv;
      const k = f.key === 'top' || edge || !opt.jag ? 0 : -opt.jag * (0.3 + 0.7 * Math.abs(Math.sin(i * 12.9898 + j * 78.233 + b.id) * 43758.5453 % 1));
      const lx = f.o[0] + f.u[0] * i / su + f.v[0] * j / sv + f.n[0] * k;
      const ly = f.o[1] + f.u[1] * i / su + f.v[1] * j / sv + f.n[1] * k + (f.key === 'top' ? (opt.lift || 0) : 0);
      const lz = f.o[2] + f.u[2] * i / su + f.v[2] * j / sv + f.n[2] * k;
      const p = W(lx, ly, lz);
      colOf(f.key, p[0], p[1], p[2], c);
      grid.push([p[0], p[1], p[2], c.r, c.g, c.b]);
    }
    const at = (i, j) => grid[j * (su + 1) + i];
    for (let j = 0; j < sv; j++) for (let i = 0; i < su; i++) {
      const a = at(i, j), bb = at(i + 1, j), cc = at(i + 1, j + 1), d = at(i, j + 1);
      for (const vv of [a, cc, bb, a, d, cc]) { out.pos.push(vv[0], vv[1], vv[2]); out.col.push(vv[3], vv[4], vv[5]); }
    }
  }
}

// Color del suelo de un barranco (lo usan las repisas para empalmar con el terreno)
Gfx.prototype._floorColor = function (tramo, x, y, z, out) {
  const P = this.pal(tramo), nz = this.world.noise;
  out.set(P.floor).lerp(this._c2.set(P.rock2), U.clamp(0.4 + nz.fbm(x * 0.3, z * 0.3, 2), 0, 1) * 0.5);
  if (tramo <= 1 && nz.n2(x * 0.15 + 7, z * 0.15) > 0.15) out.lerp(this._c2.set(P.moss), 0.35);
  out.multiplyScalar(0.9 + nz.n2(x * 1.3, z * 1.3) * 0.08);
  return out;
};

Gfx.prototype._buildBlocks = function () {
  const w = this.world, S = this.scene;
  const stat = { pos: [], col: [] };
  const boulders = [];
  for (const b of w.blocks) {
    const P = this.pal(b.tramo);
    if (b.kind === 'lip') {
      obbFaces(b, stat, (k, x, y, z, c) => this._floorColor(b.tramo, x, y, z, c), { only: ['top'], cell: 1.6, lift: 0.015 });
    } else if (b.kind === 'edge') {
      obbFaces(b, stat, (k, x, y, z, c) => k === 'top' ? this._floorColor(b.tramo, x, y, z, c) : c.set(P.wet).lerp(this._c2.set(P.rock), 0.45 + w.noise.n2(x * 0.9, y * 1.3) * 0.25), { cell: 0.8, jag: 0.38, lift: 0.015 });
    } else if (b.kind === 'ledge') {
      obbFaces(b, stat, (k, x, y, z, c) => {
        if (k === 'top') { c.set(P.rock2).lerp(this._c2.set(P.cap), 0.25); return c.multiplyScalar(0.92 + w.noise.n2(x * 2, z * 2) * 0.08); }
        return c.set(P.rock).multiplyScalar(0.8 + w.noise.n2(x * 1.5, y * 1.5) * 0.1);
      }, { cell: 0.7, jag: 0.32 });
    } else if (b.kind === 'wood') {
      obbFaces(b, stat, (k, x, y, z, c) => { c.set(0x8a6a45); if (Math.abs(((x + z) * 3.3) % 1) < 0.12) c.multiplyScalar(0.75); return c; }, { cell: 2 });
    } else if (b.kind === 'boulder' || b.kind === 'basalt') boulders.push(b);
  }
  const m = new THREE.Mesh(rtGeom(stat.pos, stat.col), this.terrainMat);
  m.castShadow = this.Q.shadow; m.receiveShadow = this.Q.shadow;
  S.add(m);
  // rocas del rápido (y de la lava): redondas pero con la cara de arriba plana para pararse
  const rng = U.rng(w.seed ^ 0x51);
  const rockG = k => {
    const g = new THREE.DodecahedronGeometry(1, 1);
    const p = g.attributes.position, seen = new Map();
    for (let i = 0; i < p.count; i++) {
      const key = p.getX(i).toFixed(3) + p.getY(i).toFixed(3) + p.getZ(i).toFixed(3);
      if (!seen.has(key)) seen.set(key, 0.88 + rng() * 0.24);
      const s = seen.get(key);
      p.setXYZ(i, p.getX(i) * s, Math.min(p.getY(i) * s, 0.82), p.getZ(i) * s);
    }
    g.computeVertexNormals();
    return g;
  };
  this.dynMeshes = [];
  const boulderG = [rockG(0), rockG(1)];
  const bMat = { boulder: new THREE.MeshLambertMaterial({ color: 0x8a7e6e, flatShading: true }), basalt: new THREE.MeshLambertMaterial({ color: 0x2e292a, flatShading: true, emissive: 0x2a0800 }) };
  for (const b of boulders) {
    const mesh = new THREE.Mesh(boulderG[b.id % 2], bMat[b.kind]);
    const hy = (b.y1 - b.y0) / 2;
    // la cara plana (y = 0.82 en la forma) coincide con el techo del bloque
    mesh.scale.set(b.hx * 1.12, (hy * 2) / 1.82, b.hz * 1.12);
    mesh.rotation.y = Math.atan2(b.s, b.c) * -1;
    mesh.position.set(b.cx, b.y1 - 0.82 * mesh.scale.y, b.cz);
    mesh.castShadow = this.Q.shadow; mesh.receiveShadow = this.Q.shadow;
    S.add(mesh);
    if (b.move) this.dynMeshes.push({ m: mesh, b, y: mesh.position.y });
  }
};

// ---------- agua: río, pozas, gargantas y lava ----------
Gfx.prototype._waterMat = function (flow, deep) {
  const uni = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uTime: { value: 0 }, uDetail: { value: null }, uFlow: { value: flow },
    uDeep: { value: new THREE.Color(deep ? 0x0f4a5c : 0x1d6a70) }, uShallow: { value: new THREE.Color(deep ? 0x226f78 : 0x58b8b0) },
    uSky: { value: new THREE.Color(0xbfe0f5) }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color(1, 1, 1) }
  }]);
  uni.uDetail.value = this.detailTex;
  const mat = new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, depthWrite: false, fog: true,
    vertexShader: [
      'attribute vec2 wuv; varying vec2 vUv; varying vec3 vW;',
      '#include <fog_pars_vertex>',
      'void main(){ vUv = wuv; vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz;',
      ' vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;',
      ' #include <fog_vertex>',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform float uTime; uniform sampler2D uDetail; uniform float uFlow; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uSky; uniform vec3 uSunDir; uniform vec3 uSunCol;',
      'varying vec2 vUv; varying vec3 vW;',
      '#include <fog_pars_fragment>',
      'void main(){ float t = uTime; vec2 uv = vUv;',
      ' float f1 = texture2D(uDetail, vec2(uv.x * 0.35, uv.y * 0.11 + t * 0.32 * uFlow)).r;',
      ' float f2 = texture2D(uDetail, vec2(uv.x * 0.8 + 0.3, uv.y * 0.31 + t * 0.6 * uFlow)).r;',
      ' float edge = clamp(abs(uv.x), 0.0, 1.0);',
      ' vec3 col = mix(uDeep, uShallow, edge * 0.55 + f1 * 0.3);',
      ' float foam = smoothstep(0.66, 0.84, f1 * 0.55 + f2 * 0.55) * (0.35 + 0.5 * uFlow) + smoothstep(0.8, 1.0, edge) * 0.45;',
      ' col = mix(col, vec3(0.93, 0.97, 1.0), clamp(foam, 0.0, 1.0));',
      ' vec3 n = normalize(vec3((f2 - 0.5) * 0.35, 1.0, (f1 - 0.5) * 0.35));',
      ' vec3 V = normalize(cameraPosition - vW);',
      ' float fres = pow(1.0 - max(dot(n, V), 0.0), 3.0);',
      ' col = mix(col, uSky, fres * 0.45);',
      ' col += uSunCol * pow(max(dot(reflect(-uSunDir, n), V), 0.0), 50.0) * 0.55;',
      ' float a = mix(0.86, 0.6, edge); a = max(a, foam * 0.95);',
      ' gl_FragColor = vec4(col, a);',
      ' #include <fog_fragment>',
      '}'
    ].join('\n')
  });
  return mat;
};

Gfx.prototype._buildWater = function () {
  const w = this.world, S = this.scene;
  this.waterMats = [this._waterMat(1, false), this._waterMat(0.08, true)];
  this.mistSpots = [];
  const river = { pos: [], uv: [], idx: [] }, pools = { pos: [], uv: [], idx: [] }, ice = { pos: [], col: [], idx: [] }, lava = { pos: [], idx: [] };
  // cinta a lo largo del cauce entre s0 y s1, de ancho ±wl
  const ribbon = (g, s0, s1, y, wl, out, step, center) => {
    const base = out.pos.length / 3, S = g.samples;
    const n = Math.max(1, Math.ceil((s1 - s0) / (step || 1)));
    for (let k = 0; k <= n; k++) {
      const s = U.lerp(s0, s1, k / n), i = U.clamp(Math.floor(s), 0, S.length - 2), f = U.clamp(s - i, 0, 1);
      const a = S[i], b = S[i + 1] || S[i];
      const x = U.lerp(a.x, b.x, f), z = U.lerp(a.z, b.z, f), ang = U.lerp(a.ang, b.ang, f);
      const Lx = Math.cos(ang), Lz = -Math.sin(ang);
      const wk = wl(s), cl = center ? center(s) : 0;
      const lim = W => Math.max(-(S[i].Wb - 0.1), Math.min(S[i].Wb - 0.1, W));
      for (const sg of [-1, 1]) {
        const lat = lim(cl + wk * sg);
        out.pos.push(x + Lx * lat, y, z + Lz * lat);
        if (out.uv) out.uv.push(sg, s);
        if (out.col) { const c = 0.85 + w.noise.n2(s * 0.4, sg) * 0.1; out.col.push(0.78 * c, 0.9 * c, 0.98 * c); }
      }
      if (k < n) { const q = base + k * 2; out.idx.push(q, q + 1, q + 3, q, q + 3, q + 2); }
    }
  };
  for (const g of w.gorges) {
    const W = g.samples[0].Wb;
    // el cauce va de una cascada a la siguiente: sale de la que tiene abajo y llega al pie de la de arriba
    const falls = w.falls.filter(f => f.tramo === g.gi).sort((a, b) => a.s - b.s);
    const center = s => {
      let a = null, b = null;
      for (const f of falls) { if (f.s <= s + 0.1) a = f; else if (!b) b = f; }
      if (!a && !b) return 0;
      if (!a) return b.latC * U.smooth(b.s - 10, b.s - 2, s);
      if (!b) return a.latC;
      return U.lerp(a.latC, b.latC, U.smooth(a.s + 2, b.s - 2, s)) * 0.85;
    };
    if (!g.lava) for (const seg of g.water) {
      const F = w.gorgeF(g, seg.s0 + 0.1);
      // el río serpentea un poco y se ensancha en las pozas al pie de las cascadas
      const wl = s => W * (0.34 + 0.08 * Math.sin(s * 0.45 + g.gi)) + 1.3 * U.smooth(seg.s1 - 3, seg.s1, s);
      ribbon(g, seg.s0, Math.min(seg.s1, g.end.s - 0.1), F + 0.06, wl, g.frozen ? ice : river, 1, center);
    }
    for (const p of g.pits) {
      if (p.lava) ribbon(g, p.s0 - 0.3, p.s1 + 0.3, p.water, () => W + 0.6, lava);
      else ribbon(g, p.s0 - 0.3, p.s1 + 0.3, p.water, () => W + 0.6, g.frozen ? ice : pools);
      // bruma en el fondo de las gargantas hondas
      const F = w.gorgeF(g, p.s0 - 1);
      if (F - p.y > 8) for (let s = p.s0 + 1; s < p.s1; s += 4) {
        const q = g.samples[Math.min(g.samples.length - 1, Math.round(s))];
        this.mistSpots.push({ x: q.x, y: p.water + 0.4, z: q.z, w: W * 1.6, lava: p.lava });
      }
    }
  }
  const mk = (D, mat) => {
    if (!D.idx.length) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(D.pos, 3));
    if (D.uv) geo.setAttribute('wuv', new THREE.Float32BufferAttribute(D.uv, 2));
    if (D.col) geo.setAttribute('color', new THREE.Float32BufferAttribute(D.col, 3));
    geo.setIndex(D.idx);
    geo.computeVertexNormals(); geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = 2;
    S.add(m);
    return m;
  };
  mk(river, this.waterMats[0]);
  mk(pools, this.waterMats[1]);
  const im = mk(ice, new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.9 }));
  if (im) im.receiveShadow = this.Q.shadow;
  mk(lava, this.lava.material);
};

// ---------- cascadas ----------
Gfx.prototype._fallMat = function (kind) {
  const lava = kind === 'lava', ice = kind === 'ice';
  return new THREE.ShaderMaterial({
    uniforms: Object.assign(THREE.UniformsUtils.merge([THREE.UniformsLib.fog]), { uTime: this.uTime, uDetail: { value: this.detailTex } }),
    transparent: !ice, depthWrite: ice, fog: true, side: THREE.DoubleSide,
    vertexShader: [
      'attribute vec3 fuv; varying vec3 vF;',
      '#include <fog_pars_vertex>',
      'void main(){ vF = fuv; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;',
      ' #include <fog_vertex>',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform float uTime; uniform sampler2D uDetail; varying vec3 vF;',
      '#include <fog_pars_fragment>',
      'void main(){ float t = uTime;',
      // bordes que no son rectos: cada lado se mueve con su propio ruido a lo largo de la caída
      ' float wl = (texture2D(uDetail, vec2(0.31, vF.y * 0.045 - t * ' + (ice ? '0.0' : '0.22') + ')).r - 0.5) * 0.34;',
      ' float wr = (texture2D(uDetail, vec2(0.77, vF.y * 0.052 - t * ' + (ice ? '0.0' : '0.19') + ')).r - 0.5) * 0.34;',
      ' float edge = smoothstep(0.02 + wl, 0.2 + wl, vF.x) * smoothstep(0.98 + wr, 0.8 + wr, vF.x);',
      ice ? ' float s = texture2D(uDetail, vec2(vF.x * 2.3, vF.y * 0.04)).r; vec3 col = mix(vec3(0.62, 0.8, 0.9), vec3(0.93, 0.98, 1.0), smoothstep(0.35, 0.75, s)); float a = 1.0;' +
              ' float drip = texture2D(uDetail, vec2(vF.x * 3.3, 0.5)).r; if (edge < 0.5 || vF.z > 0.86 + drip * 0.2) discard;'
        : lava ? ' float s = texture2D(uDetail, vec2(vF.x * 1.4, vF.y * 0.06 - t * 0.25)).r; float s2 = texture2D(uDetail, vec2(vF.x * 3.1 + 0.4, vF.y * 0.14 - t * 0.4)).r;' +
                 ' vec3 col = mix(vec3(0.75, 0.12, 0.02), vec3(1.0, 0.72, 0.2), smoothstep(0.3, 0.8, s * 0.6 + s2 * 0.5)); float a = 0.97 * smoothstep(0.15, 0.6, edge);'
          : ' float s = texture2D(uDetail, vec2(vF.x * 1.6, vF.y * 0.08 - t * 0.95)).r; float s2 = texture2D(uDetail, vec2(vF.x * 3.7 + 0.2, vF.y * 0.2 - t * 1.6)).r;' +
            ' float k = smoothstep(0.35, 0.8, s * 0.6 + s2 * 0.55); vec3 col = mix(vec3(0.55, 0.75, 0.82), vec3(0.97, 0.99, 1.0), k);' +
            // chorros: franjas verticales más y menos llenas, con huecos que dejan ver la roca
            ' float jet = texture2D(uDetail, vec2(vF.x * 2.6 + 0.13, vF.y * 0.012 - t * 0.05)).r; float fill = smoothstep(0.18, 0.55, jet + k * 0.35);' +
            ' float a = (0.3 + 0.62 * k) * fill * edge * smoothstep(-3.4, -1.2, vF.y); col = mix(col, vec3(1.0), smoothstep(0.75, 1.0, vF.z)); a = max(a, smoothstep(0.82, 1.0, vF.z) * 0.85 * edge);',
      ' gl_FragColor = vec4(col, a);',
      ' #include <fog_fragment>',
      '}'
    ].join('\n')
  });
};

Gfx.prototype._buildFalls = function () {
  const w = this.world, S = this.scene, sp = { x: 0, z: 0, nx: 0, nz: 0, y0: 0, y1: 0, amp: 0 };
  const D = { water: { pos: [], uv: [], idx: [] }, ice: { pos: [], uv: [], idx: [] }, lava: { pos: [], uv: [], idx: [] } };
  this.fallSpots = [];
  for (const f of w.falls) {
    const st = w.strips[f.strip], O = D[f.kind], h = f.top - f.bot;
    const nu = Math.max(2, Math.ceil((f.u1 - f.u0) / 0.5)), nv = Math.max(3, Math.ceil(h / 0.7));
    const base = O.pos.length / 3, rows = nv + 3;
    const cu = (f.u0 + f.u1) / 2;
    for (let i = 0; i <= nu; i++) {
      const u0 = U.lerp(f.u0 + 0.15, f.u1 - 0.15, i / nu);
      w.stripPoint(st, u0, sp);
      const ux = i / nu;
      // arriba: el agua llega por la repisa y cae por el borde
      for (const back of [3.4, 0.5]) { O.pos.push(sp.x - sp.nx * back, f.top + 0.07, sp.z - sp.nz * back); O.uv.push(ux, -back, 0); }
      for (let j = 0; j <= nv; j++) {
        const down = h * j / nv + (j === nv ? 0.25 : 0), y = f.top - down;
        // al caer el agua se abre un poco (sin llegar a la zona con presas)
        const u = u0 + (u0 - cu) / ((f.u1 - f.u0) / 2) * (f.kind === 'ice' ? 0 : 0.14 * U.smooth(0, h, down));
        w.stripPoint(st, u, sp);
        const off = w.relief(st, u, y, sp.amp) + (f.kind === 'ice' ? 0.12 + 0.25 * Math.abs(Math.sin(u * 2.1 + y * 0.3)) : 0.18 + 0.5 * U.smooth(0, 3.5, down));
        O.pos.push(sp.x + sp.nx * off, y, sp.z + sp.nz * off);
        O.uv.push(ux, down, j / nv);
      }
    }
    for (let i = 0; i < nu; i++) for (let j = 0; j < rows - 1; j++) {
      const a = base + i * rows + j, b = a + rows;
      O.idx.push(a, b, b + 1, a, b + 1, a + 1);
    }
    w.stripPoint(st, (f.u0 + f.u1) / 2, sp);
    this.fallSpots.push({ x: sp.x + sp.nx * 0.9, y: f.bot, z: sp.z + sp.nz * 0.9, top: f.top, w: f.u1 - f.u0, kind: f.kind, nx: sp.nx, nz: sp.nz });
  }
  for (const k in D) {
    const O = D[k];
    if (!O.idx.length) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(O.pos, 3));
    geo.setAttribute('fuv', new THREE.Float32BufferAttribute(O.uv, 3));
    geo.setIndex(O.idx);
    geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, this._fallMat(k));
    m.renderOrder = 3;
    S.add(m);
  }
};

// ---------- presas, escaleras, lianas y roca podrida ----------
Gfx.prototype._buildHolds = function () {
  const w = this.world, S = this.scene, rng = U.rng(w.seed ^ 0x2077), sp = { x: 0, z: 0, nx: 0, nz: 0, y0: 0, y1: 0, amp: 0 };
  const holds = [], leaves = [], rungs = [], strands = [], hc = new THREE.Color();
  this.crumbleCells = [];
  for (const st of w.strips) for (const z of st.zones) {
    const list = this.holds.get(st.id) || [];
    this.holds.set(st.id, list);
    const area = (z.u1 - z.u0) * (z.y1 - z.y0);
    if (z.type === 'ladder') {
      for (let y = z.y0 + 1.2; y < z.y1; y += 0.42) {
        const pa = w.stripPoint(st, z.u0 + 0.12, sp), ra = w.relief(st, z.u0 + 0.12, y, sp.amp) + 0.14;
        const a = { x: pa.x + pa.nx * ra, z: pa.z + pa.nz * ra };
        const pb = w.stripPoint(st, z.u1 - 0.12, sp), rb = w.relief(st, z.u1 - 0.12, y, sp.amp) + 0.14;
        const b = { x: pb.x + pb.nx * rb, z: pb.z + pb.nz * rb };
        rungs.push({ a, b, y, nx: pb.nx, nz: pb.nz });
        for (const t of [0.3, 0.7]) list.push({ u: U.lerp(z.u0, z.u1, t), y, x: U.lerp(a.x, b.x, t), z: U.lerp(a.z, b.z, t) });
      }
      continue;
    }
    if (z.cells) {
      for (const c of z.cells) {
        const u = z.u0 + (c.i + 0.5) * z.cw, y = z.y0 + (c.j + 0.5) * z.ch;
        w.stripPoint(st, u, sp);
        const r = w.relief(st, u, y, sp.amp) + 0.07;
        const k = 0.5 + rng() * 0.35, ou = (rng() - 0.5) * z.cw * 0.3;
        w.stripPoint(st, u + ou, sp);
        this.crumbleCells.push({ c, x: sp.x + sp.nx * r, y: y + (rng() - 0.5) * z.ch * 0.3, z: sp.z + sp.nz * r, nx: sp.nx, nz: sp.nz, sw: z.cw * k, sh: z.ch * (0.45 + rng() * 0.35), seed: rng(), tilt: (rng() - 0.5) * 0.4, roll: rng() * Math.PI });
        list.push({ u, y: y + z.ch * 0.3, x: sp.x + sp.nx * (r + 0.1), z: sp.z + sp.nz * (r + 0.1) });
      }
      continue;
    }
    if (z.type === 'vine') {
      for (let u = z.u0 + 0.3; u < z.u1; u += 0.55 + rng() * 0.25) {
        const pts = [];
        for (let y = z.y1 + 0.6; y >= z.y0 + 0.6; y -= 0.7) {
          w.stripPoint(st, u, sp);
          const r = w.relief(st, u, y, sp.amp) + 0.07;
          pts.push([sp.x + sp.nx * r, y, sp.z + sp.nz * r]);
          if (rng() < 0.75) leaves.push({ x: sp.x + sp.nx * (r + 0.05), y: y - rng() * 0.5, z: sp.z + sp.nz * (r + 0.05), s: 0.8 + rng() * 0.7, rot: rng() * 6.28, r: rng() });
          if (rng() < 0.5) list.push({ u, y, x: sp.x + sp.nx * (r + 0.05), z: sp.z + sp.nz * (r + 0.05) });
        }
        strands.push({ pts, nx: sp.nx, nz: sp.nz });
      }
      continue;
    }
    const count = Math.round(area * 1.6);
    for (let k = 0; k < count; k++) {
      const u = z.u0 + 0.12 + rng() * (z.u1 - z.u0 - 0.24), y = z.y0 + 0.1 + rng() * (z.y1 - z.y0 - 0.15);
      w.stripPoint(st, u, sp);
      const r = w.relief(st, u, y, sp.amp) + 0.03;
      const it = { x: sp.x + sp.nx * r, y, z: sp.z + sp.nz * r, s: 0.07 + rng() * 0.1, rot: rng() * 6.28, r: rng(), t: z.type, nx: sp.nx, nz: sp.nz };
      // presas de la misma roca: un poco más claras, con magnesio de las manos
      if (z.type !== 'ice') {
        this._wallColor(st, u, y, sp.y0 + 1.5, z, 0, hc, it.x, it.z, 1);
        hc.multiplyScalar(1.08).lerp(this._c.set(0xf4f1ea), 0.22 + it.r * 0.3);
        it.c = hc.getHex();
      }
      holds.push(it);
      list.push({ u, y, x: it.x + sp.nx * 0.06, z: it.z + sp.nz * 0.06 });
    }
  }
  // lajas y salientes: más anchos que altos, pegados a la pared (no son presas de rocódromo)
  const holdG = new THREE.OctahedronGeometry(1, 0); // 8 triángulos: hay miles de presas
  holdG.scale(1.5, 0.48, 0.7);
  holdG.computeVertexNormals();
  const holdMat = new THREE.MeshLambertMaterial({ flatShading: true });
  this._scatter(holdG, holdMat, holds, (it, m, cc) => {
    const yaw = Math.atan2(it.nx, it.nz);
    m.compose(this._v.set(it.x, it.y, it.z), this._q.setFromEuler(this._e.set((it.r - 0.5) * 0.5, yaw + (it.rot - 3.14) * 0.15, (it.r - 0.5) * 0.9, 'YXZ')), new THREE.Vector3(it.s * 1.15, it.s, it.s));
    if (it.t === 'ice') cc.set(0xeaf8ff); else cc.setHex(it.c);
  }, { far: 80 });
  const leafG = new THREE.ConeGeometry(0.16, 0.42, 3); leafG.scale(1, 1, 0.25);
  this._scatter(leafG, this._sway(new THREE.MeshLambertMaterial({ flatShading: true, side: THREE.DoubleSide }), 'leaf', 0.05, 0), leaves, (it, m, cc) => {
    m.compose(this._v.set(it.x, it.y, it.z), this._q.setFromEuler(this._e.set(0.4 + it.r, it.rot, it.rot * 0.3)), new THREE.Vector3(it.s, it.s, it.s));
    cc.setHSL(0.28 + it.r * 0.06, 0.55, 0.28 + it.r * 0.15);
  }, { far: 80 });
  // lianas: tiras verdes que siguen la roca
  const vp = [], vc = [];
  for (const sd of strands) {
    const px = -sd.nz * 0.035, pz = sd.nx * 0.035;
    for (let i = 0; i < sd.pts.length - 1; i++) {
      const a = sd.pts[i], b = sd.pts[i + 1];
      const q = [[a[0] - px, a[1], a[2] - pz], [a[0] + px, a[1], a[2] + pz], [b[0] + px, b[1], b[2] + pz], [b[0] - px, b[1], b[2] - pz]];
      for (const k of [0, 1, 2, 0, 2, 3]) { vp.push(...q[k]); vc.push(0.17, 0.34, 0.13); }
    }
  }
  if (vp.length) S.add(new THREE.Mesh(rtGeom(vp, vc), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
  // peldaños de la vía ferrata
  if (rungs.length) {
    const parts = [];
    for (const r of rungs) {
      const dx = r.b.x - r.a.x, dz = r.b.z - r.a.z, len = Math.hypot(dx, dz);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, 0, dz / len));
      parts.push({ g: new THREE.CylinderGeometry(0.03, 0.03, len, 5), m: new THREE.Matrix4().compose(new THREE.Vector3((r.a.x + r.b.x) / 2, r.y, (r.a.z + r.b.z) / 2), q, new THREE.Vector3(1, 1, 1)), c: 0x9aa3ad });
      for (const e of [r.a, r.b]) {
        const q2 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(r.nx, 0, r.nz));
        parts.push({ g: new THREE.CylinderGeometry(0.025, 0.025, 0.2, 4), m: new THREE.Matrix4().compose(new THREE.Vector3(e.x - r.nx * 0.08, r.y, e.z - r.nz * 0.08), q2, new THREE.Vector3(1, 1, 1)), c: 0x7a838c });
      }
    }
    const m = new THREE.Mesh(mergeColored(parts), new THREE.MeshLambertMaterial({ vertexColors: true }));
    m.castShadow = this.Q.shadow;
    S.add(m);
  }
  // roca podrida: placas que tiemblan y se caen
  if (this.crumbleCells.length) {
    // lajas sueltas: placas irregulares, más gruesas en el centro
    const g = new THREE.DodecahedronGeometry(0.62, 0);
    g.scale(1, 1, 0.24);
    g.computeVertexNormals();
    this.crumbleMesh = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ flatShading: true }), this.crumbleCells.length);
    this.crumbleMesh.frustumCulled = false;
    this.crumbleCells.forEach((cc, i) => {
      this.crumbleMesh.setColorAt(i, this._c.setHSL(0.05 + cc.seed * 0.03, 0.22 + cc.seed * 0.15, 0.3 + cc.seed * 0.16));
      cc.state = -1;
    });
    this.crumbleMesh.castShadow = this.Q.shadow;
    S.add(this.crumbleMesh);
    this._updateCrumble(0, true);
  }
};

Gfx.prototype._updateCrumble = function (dt, force) {
  if (!this.crumbleMesh) return;
  const m = this.crumbleMesh, cp = this.camera.position;
  let dirty = !!force;
  for (let i = 0; i < this.crumbleCells.length; i++) {
    const cc = this.crumbleCells[i], c = cc.c;
    if (!force && Math.abs(cc.x - cp.x) + Math.abs(cc.z - cp.z) > 60) continue;
    const shake = c.broken ? 0 : U.clamp(c.touch / c.hold, 0, 1);
    if (c.broken) cc.fall = (cc.fall || 0) + dt; else cc.fall = 0;
    const key = c.broken ? (cc.fall < 1.3 ? 2 : 3) : shake > 0.02 ? 1 : 0;
    if (!force && key === 0 && cc.state === 0) continue;
    cc.state = key;
    const j = shake * 0.05;
    const y = cc.y - (key === 2 ? cc.fall * cc.fall * 7 : 0);
    const s = key === 3 ? 0.0001 : 1;
    this._m.compose(this._v.set(cc.x + (Math.random() - 0.5) * j, y + (Math.random() - 0.5) * j, cc.z + (Math.random() - 0.5) * j),
      this._q.setFromEuler(this._e.set(cc.tilt + (key === 2 ? cc.fall * 3 : 0), Math.atan2(cc.nx, cc.nz), cc.roll + (key === 2 ? cc.fall * 2 : 0))),
      new THREE.Vector3(cc.sw * s, cc.sh * s, s));
    m.setMatrixAt(i, this._m);
    dirty = true;
  }
  if (dirty) m.instanceMatrix.needsUpdate = true;
};

// ---------- detalles del barranco: piedras, musgo, carámbanos y grietas de lava ----------
Gfx.prototype._buildGorgeDeco = function () {
  const w = this.world, rng = U.rng(w.seed ^ 0xdec0), pebbles = [], icicles = [], cracks = [], gravel = [];
  for (const g of w.gorges) {
    const S = g.samples;
    for (let i = 0; i < S.length; i += 1) {
      const q = S[i];
      if (w.gorgePit(g, q.s, 1.5)) continue;
      const Lx = Math.cos(q.ang), Lz = -Math.sin(q.ang);
      for (let k = 0; k < 3; k++) {
        // piedritas junto a las paredes (no estorban: son pequeñas y no chocan)
        const sg = rng() < 0.5 ? -1 : 1, lat = sg * (q.Wb - 0.2 - rng() * 1.4), f = rng() - 0.5;
        const x = q.x + Lx * lat + Math.sin(q.ang) * f, z = q.z + Lz * lat + Math.cos(q.ang) * f;
        const y = w.groundBelow(x, q.F + 0.5, z);
        if (Math.abs(y - q.F) > 0.1) continue;
        pebbles.push({ x, y, z, s: 0.08 + rng() * rng() * 0.32, rot: rng() * 6.28, b: g.gi, r: rng() });
      }
      if (g.lava && i % 2 === 0) cracks.push({ x: q.x + Lx * (rng() - 0.5) * q.Wb, y: q.F + 0.03, z: q.z + Lz * (rng() - 0.5) * q.Wb, rot: rng() * 3.14, s: 0.6 + rng() * 1.2 });
      // grava suelta por todo el lecho
      for (let k = 0; k < 4; k++) {
        const lat = (rng() * 2 - 1) * (q.Wb - 0.6), f = rng() - 0.5;
        const x = q.x + Lx * lat + Math.sin(q.ang) * f, z = q.z + Lz * lat + Math.cos(q.ang) * f;
        const y = w.groundBelow(x, q.F + 0.5, z);
        if (Math.abs(y - q.F) > 0.1) continue;
        gravel.push({ x, y: y - 0.01, z, s: 0.035 + rng() * 0.08, rot: rng() * 6.28, b: g.gi, r: rng() });
      }
      // talud: piedras grandes medio enterradas al pie de las paredes (no al pie de un escalón,
      // donde se empieza a trepar, ni junto a los postes de los ganchos)
      let nearStep = false;
      for (const st of g.steps) if (q.s > st.s - 3.2 && q.s < st.s + 0.8) nearStep = true;
      if (!nearStep) for (const sg of [1, -1]) {
        if (!(sg > 0 ? q.wL : q.wR) || rng() > 0.5) continue;
        const lat = sg * (q.Wb - 0.5 - rng() * 0.35), f = rng() - 0.5;
        const x = q.x + Lx * lat + Math.sin(q.ang) * f, z = q.z + Lz * lat + Math.cos(q.ang) * f;
        if (w.anchors.some(a => !a.wall && Math.abs(a.x - x) + Math.abs(a.z - z) < 1.6)) continue;
        const y = w.groundBelow(x, q.F + 0.5, z);
        if (Math.abs(y - q.F) > 0.1) continue;
        const sz = 0.3 + rng() * rng() * 0.5;
        pebbles.push({ x, y: y - sz * 0.3, z, s: sz, rot: rng() * 6.28, b: g.gi, r: rng() });
      }
    }
  }
  for (const st of w.strips) {
    if (st.kind !== 'side' || !w.gorges[st.gorge].frozen) continue;
    const lt = {};
    for (let i = 1; i < st.pts.length - 1; i++) {
      const p = st.pts[i], b = w.leanBack(w.leanAt(w.gorges[st.gorge], p.s, st.side === 'L' ? 1 : -1, lt), p.y1);
      if (rng() < 0.55) icicles.push({ x: p.x + p.nx * (0.15 - b), y: p.y1 + 0.05, z: p.z + p.nz * (0.15 - b), s: 0.5 + rng() * 1.6, rot: rng() * 6.28 });
    }
  }
  // borde de arriba de los escalones: pasto y helechos que cuelgan (barrancos verdes) o
  // carámbanos (el helado); así la orilla no es una línea recta. No van donde cae el agua.
  const tufts = [], sp2 = { x: 0, z: 0, nx: 0, nz: 0, y0: 0, y1: 0, amp: 0 };
  if (!w.snow) for (const st of w.strips) {
    if (st.kind !== 'step') continue;
    const g = w.gorges[st.tramo];
    if (!g || g.lava) continue;
    for (let u = 0.6; u < st.len - 0.6; u += 0.22) {
      if (st.falls.some(f => u > f.u0 - 0.25 && u < f.u1 + 0.25)) continue;
      w.stripPoint(st, u, sp2);
      const r = w.relief(st, u, sp2.y1, sp2.amp) * 0.6;
      if (g.frozen) {
        if (rng() < 0.5 && !st.zones.some(z => u > z.u0 - 0.3 && u < z.u1 + 0.3)) icicles.push({ x: sp2.x + sp2.nx * (r + 0.06), y: sp2.y1 + 0.02, z: sp2.z + sp2.nz * (r + 0.06), s: 0.4 + rng() * 1.3, rot: rng() * 6.28 });
        continue;
      }
      if (rng() > 0.72) continue;
      const back = rng() * 0.5;
      tufts.push({ x: sp2.x + sp2.nx * (r - back), y: sp2.y1 + 0.01, z: sp2.z + sp2.nz * (r - back), nx: sp2.nx, nz: sp2.nz, s: 1.0 + rng() * 0.9, r: rng(), lean: 0.5 + rng() * 0.7 + (back < 0.15 ? 0.5 : 0), b: g.gi });
    }
  }
  if (tufts.length) {
    const tg = new THREE.ConeGeometry(0.07, 0.55, 3); tg.translate(0, 0.27, 0); tg.scale(1, 1, 0.35);
    this._scatter(tg, this._sway(new THREE.MeshLambertMaterial({ flatShading: true, side: THREE.DoubleSide }), 'tuft', 0.09, 0), tufts, (it, m, cc) => {
      // se inclina hacia el barranco, como si colgara por la orilla
      const yaw = Math.atan2(it.nx, it.nz);
      m.compose(this._v.set(it.x, it.y, it.z), this._q.setFromEuler(this._e.set(it.lean, yaw + (it.r - 0.5) * 1.2, (it.r - 0.5) * 0.6, 'YXZ')), new THREE.Vector3(it.s, it.s * (0.8 + it.r * 0.6), it.s));
      cc.setHSL(it.b === 1 ? 0.28 + it.r * 0.05 : 0.22 + it.r * 0.07, 0.5, 0.26 + it.r * 0.14);
    }, { far: 80 });
  }
  const pg = new THREE.DodecahedronGeometry(1, 0);
  const cols = w.snow ? K2_PAL.map(p => p.rock) : [0x9c8a74, 0x77735f, 0x9aa0aa, 0x3a3335];
  this._scatter(pg, new THREE.MeshLambertMaterial({ flatShading: true }), pebbles, (r, m, c) => {
    m.compose(this._v.set(r.x, r.y, r.z), this._q.setFromEuler(this._e.set(r.rot * 0.4, r.rot, r.rot * 0.7)), new THREE.Vector3(r.s * 1.3, r.s * 0.7, r.s));
    c.set(cols[r.b]).multiplyScalar(0.8 + r.r * 0.35);
  }, { receive: true, far: 70 });
  // la grava es diminuta: forma simple y solo de cerca
  this._scatter(new THREE.OctahedronGeometry(1, 0), new THREE.MeshLambertMaterial({ flatShading: true }), gravel, (r, m, c) => {
    m.compose(this._v.set(r.x, r.y, r.z), this._q.setFromEuler(this._e.set(r.rot * 0.4, r.rot, r.rot * 0.7)), new THREE.Vector3(r.s * 1.3, r.s * 0.6, r.s));
    c.set(cols[r.b]).multiplyScalar(0.85 + r.r * 0.4);
  }, { far: 40 });
  if (icicles.length) {
    const ig = new THREE.ConeGeometry(0.12, 1, 5); ig.rotateX(Math.PI); ig.translate(0, -0.5, 0);
    this._scatter(ig, new THREE.MeshLambertMaterial({ color: 0xdff4ff, transparent: true, opacity: 0.85 }), icicles, (r, m) => {
      m.compose(this._v.set(r.x, r.y, r.z), this._q.setFromEuler(this._e.set(0, r.rot, 0)), new THREE.Vector3(1, r.s, 1));
    }, { far: 90 });
  }
  if (cracks.length) {
    // fisura en zigzag que se adelgaza en las puntas, con una rama
    const pos = [], cr = U.rng(w.seed ^ 0xc4ac);
    const ribbon = (x0, z0, ang, len, wid, n) => {
      let x = x0, z = z0, a = ang, prev = null;
      for (let k = 0; k <= n; k++) {
        const t = k / n, hw = wid * (Math.sin(t * Math.PI) * 0.85 + 0.15), px = -Math.sin(a) * hw, pz = Math.cos(a) * hw;
        const cur = [x + px, z + pz, x - px, z - pz];
        if (prev) pos.push(prev[0], 0, prev[1], prev[2], 0, prev[3], cur[0], 0, cur[1], cur[0], 0, cur[1], prev[2], 0, prev[3], cur[2], 0, cur[3]);
        prev = cur;
        a += (cr() - 0.5) * 1.1; x += Math.cos(a) * len / n; z += Math.sin(a) * len / n;
      }
    };
    ribbon(-0.5, 0, 0, 1, 0.07, 7);
    ribbon(0.05, 0.02, 0.9, 0.38, 0.035, 4);
    const cg = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this._scatter(cg, new THREE.MeshBasicMaterial({ color: 0xff6a1a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), cracks, (r, m) => {
      m.compose(this._v.set(r.x, r.y, r.z), this._q.setFromEuler(this._e.set(0, r.rot, 0)), new THREE.Vector3(r.s * 1.4, 1, r.s * 1.4));
    }, { far: 90 });
  }
};

// ---------- ganchos, cuerda, postes, cables, garfio, gemas y peligros ----------
Gfx.prototype._buildRouteProps = function () {
  const w = this.world, S = this.scene;
  const anchorG = mergeColored([
    { g: new THREE.BoxGeometry(0.16, 0.22, 0.04), m: mtx(0, 0, -0.1), c: 0xb7bfc8 },
    { g: new THREE.TorusGeometry(0.09, 0.025, 5, 10), m: mtx(0, -0.06, -0.04, 0, 0, 0), c: 0xffffff }
  ]);
  const postG = mergeColored([
    { g: new THREE.CylinderGeometry(0.06, 0.08, 1.2, 6), m: mtx(0, 0.6, 0), c: 0x7a5a3a },
    { g: new THREE.TorusGeometry(0.1, 0.03, 5, 10), m: mtx(0, 1.15, 0.06), c: 0xffffff }
  ]);
  const lam = new THREE.MeshLambertMaterial({ vertexColors: true });
  const wallA = w.anchors.filter(a => a.wall), postA = w.anchors.filter(a => !a.wall && !a.lineOnly);
  this.anchorWallMesh = new THREE.InstancedMesh(anchorG, lam, Math.max(1, wallA.length));
  this.anchorPostMesh = new THREE.InstancedMesh(postG, lam, Math.max(1, postA.length));
  this.anchorSlot = new Map();
  wallA.forEach((a, i) => {
    this._m.compose(this._v.set(a.x, a.y, a.z), this._q.setFromEuler(this._e.set(0, Math.atan2(a.nx, a.nz), 0)), new THREE.Vector3(1, 1, 1));
    this.anchorWallMesh.setMatrixAt(i, this._m);
    this.anchorSlot.set(a.idx, [this.anchorWallMesh, i]);
  });
  postA.forEach((a, i) => {
    this._m.compose(this._v.set(a.x, a.ground, a.z), this._q.identity(), new THREE.Vector3(1, 1, 1));
    this.anchorPostMesh.setMatrixAt(i, this._m);
    this.anchorSlot.set(a.idx, [this.anchorPostMesh, i]);
  });
  for (const m of [this.anchorWallMesh, this.anchorPostMesh]) { m.frustumCulled = false; S.add(m); }
  this.anchorGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(120,255,160,0.9)', 'rgba(60,255,120,0)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  this.anchorGlow.scale.set(0.9, 0.9, 1);
  this.anchorGlow.visible = false;
  S.add(this.anchorGlow);
  this.setAnchorState(null);
  // Cuerda: segmentos cilíndricos desde el arnés hasta el gancho
  this.ropeSegs = 14;
  this.ropeMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 4).translate(0, 0.5, 0), new THREE.MeshLambertMaterial({ color: 0xf2a13a }), this.ropeSegs);
  this.ropeMesh.frustumCulled = false;
  this.ropeMesh.visible = false;
  S.add(this.ropeMesh);
  // Postes, barandas del puente, cables de tirolesa y de la vía ferrata en las cornisas
  const deco = [];
  for (const p of w.posts) deco.push({ g: new THREE.CylinderGeometry(0.09, 0.12, p.h, 6), m: mtx(p.x, p.y + p.h / 2, p.z), c: 0x6e5236 });
  const seg = (p0, p1, r, col) => {
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2], len = Math.hypot(dx, dy, dz);
    if (len < 1e-3) return;
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len));
    deco.push({ g: new THREE.CylinderGeometry(r, r, len, 4), m: new THREE.Matrix4().compose(new THREE.Vector3((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2), q, new THREE.Vector3(1, 1, 1)), c: col });
  };
  const cable = (a, b, sag, r, col) => {
    const n = 8;
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      seg([U.lerp(a.x, b.x, t0), U.lerp(a.y, b.y, t0) - Math.sin(t0 * Math.PI) * sag, U.lerp(a.z, b.z, t0)],
        [U.lerp(a.x, b.x, t1), U.lerp(a.y, b.y, t1) - Math.sin(t1 * Math.PI) * sag, U.lerp(a.z, b.z, t1)], r, col);
    }
  };
  for (const r of w.rails) cable(r.a, r.b, 0.25, 0.03, 0xc9a86a);
  for (const z of w.zips) cable({ x: z.a.x, y: z.a.y + 0.1, z: z.a.z }, { x: z.b.x, y: z.b.y + 0.1, z: z.b.z }, 0.4, 0.025, 0x3a3f46);
  const sp = { x: 0, z: 0, nx: 0, nz: 0, y0: 0, y1: 0, amp: 0 };
  this.cableLines = [];
  for (const c of w.cables) {
    if (c.strip === undefined) continue;
    const st = w.strips[c.strip], pts = [];
    for (let u = c.u0; u <= c.u1 + 0.01; u += 1) {
      w.stripPoint(st, u, sp);
      const r = w.relief(st, u, c.y, sp.amp) + 0.16;
      pts.push([sp.x + sp.nx * r, c.y, sp.z + sp.nz * r]);
      if (Math.round(u - c.u0) % 2 === 0) seg([sp.x + sp.nx * (r - 0.18), c.y, sp.z + sp.nz * (r - 0.18)], [sp.x + sp.nx * r, c.y, sp.z + sp.nz * r], 0.02, 0x7a838c);
    }
    for (let i = 0; i < pts.length - 1; i++) seg(pts[i], pts[i + 1], 0.016, 0x3a3f46);
    this.cableLines.push(pts);
  }
  if (deco.length) { const m = new THREE.Mesh(mergeColored(deco), lam); m.castShadow = this.Q.shadow; S.add(m); }
  // Anillos del garfio
  this.ringObjs = w.rings.map(r => {
    const g = new THREE.Group(); g.position.set(r.x, r.y, r.z);
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.06, 6, 16), new THREE.MeshLambertMaterial({ color: 0xffc23a, emissive: 0x553300 }));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(255,220,120,0.9)', 'rgba(255,180,60,0)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.scale.set(1.8, 1.8, 1);
    g.add(t); g.add(glow);
    S.add(g);
    return { g, t, glow };
  });
  // Gemas
  this.gemMesh = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshLambertMaterial({ color: 0x66e0ff, emissive: 0x1a7fb8 }), Math.max(1, w.gems.length));
  this.gemMesh.frustumCulled = false;
  S.add(this.gemMesh);
  const gemTex = glowTexture('rgba(150,240,255,0.8)', 'rgba(80,200,255,0)');
  this.gemGlow = w.gems.map(gm => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: gemTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    s.scale.set(1.4, 1.4, 1); s.position.set(gm.x, gm.y, gm.z);
    S.add(s);
    return s;
  });
  // Boquillas de vapor en la pared
  if (w.steams.length) {
    const parts = w.steams.map(s => {
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(s.nx, 0, s.nz));
      return { g: new THREE.CylinderGeometry(0.22, 0.3, 0.25, 8), m: new THREE.Matrix4().compose(new THREE.Vector3(s.x + s.nx * 0.08, s.y, s.z + s.nz * 0.08), q, new THREE.Vector3(1, 1, 1)), c: 0x2a2526 };
    });
    S.add(new THREE.Mesh(mergeColored(parts), lam));
  }
  // Rocas que caen (se reutilizan)
  this.fallRocks = [];
  const rg = new THREE.DodecahedronGeometry(0.5, 0), rm = new THREE.MeshLambertMaterial({ color: 0x6d6862, flatShading: true });
  // bloques de hielo del cuello de botella
  this.iceChunks = [];
  const im = new THREE.MeshLambertMaterial({ color: 0xdff1fb, flatShading: true, emissive: 0x1a2a38 });
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), im); m.visible = false; m.castShadow = this.Q.shadow; S.add(m); this.iceChunks.push(m); }
  for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(rg, rm); m.visible = false; m.castShadow = this.Q.shadow; S.add(m); this.fallRocks.push(m); }
  this.sprayT = 0;
};

// Al empezar otra partida con la misma montaña
Gfx.prototype.resetState = function () {
  this.setAnchorState(null);
  if (this.crumbleCells) { for (const cc of this.crumbleCells) { cc.state = -1; cc.fall = 0; } this._updateCrumble(0, true); }
  this.pLife.fill(0);
  if (this._ik) this._ik.active = false;
  this.setGhost(null);
};

// Colores de los ganchos: disponible, enganchado o ya pasado
Gfx.prototype.setAnchorState = function (cur) {
  const ci = cur ? cur.idx : -1;
  this.anchorSlot.forEach(([mesh, i], idx) => {
    mesh.setColorAt(i, this._c.set(idx === ci ? 0x3ce07a : idx < ci ? 0x8a8f96 : 0xffb020));
  });
  for (const m of [this.anchorWallMesh, this.anchorPostMesh]) if (m.instanceColor) m.instanceColor.needsUpdate = true;
  this.anchorGlow.visible = !!cur && !cur.lineOnly;
  if (cur) this.anchorGlow.position.set(cur.x, cur.y, cur.z);
};

// Cuerda con comba: floja cuando sobra, recta (y vibrando) cuando te sostiene
Gfx.prototype.updateRope = function (pl, pos) {
  const a = pl.anchor;
  this.ropeMesh.visible = !!a && pl.state !== 'zip' && pl.state !== 'ride';
  if (!this.ropeMesh.visible) return;
  const hx = pos.x, hy = pos.y + 0.98, hz = pos.z;
  const d = Math.hypot(a.x - hx, a.y - hy, a.z - hz);
  const slack = pl.taut || pl.state === 'ascend' ? 0 : Math.max(0, Math.min(1.5, (pl.ropeLen - d) * 0.5 + 0.25));
  const buzz = pl.taut ? Math.sin(this.time * 55) * 0.03 : 0;
  const R = this._ropeTmp || (this._ropeTmp = { v1: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), dir: new THREE.Vector3(), sc: new THREE.Vector3() });
  const n = this.ropeSegs, v0 = this._v, v1 = R.v1, up = R.up, dir = R.dir;
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    v0.set(U.lerp(hx, a.x, t0), U.lerp(hy, a.y, t0) - Math.sin(t0 * Math.PI) * (slack + buzz), U.lerp(hz, a.z, t0));
    v1.set(U.lerp(hx, a.x, t1), U.lerp(hy, a.y, t1) - Math.sin(t1 * Math.PI) * (slack + buzz), U.lerp(hz, a.z, t1));
    dir.subVectors(v1, v0);
    const len = dir.length() || 0.001;
    this._q.setFromUnitVectors(up, dir.multiplyScalar(1 / len));
    this._m.compose(v0, this._q, R.sc.set(1, len, 1));
    this.ropeMesh.setMatrixAt(i, this._m);
  }
  this.ropeMesh.instanceMatrix.needsUpdate = true;
};

// Cada cuadro: gemas, anillos, rocas que se hunden, roca podrida, rocas que caen y espuma de las cascadas
Gfx.prototype.updateRoute = function (dt, game) {
  const w = this.world, t = this.time, cp = this.camera.position;
  for (let i = 0; i < w.gems.length; i++) {
    const gm = w.gems[i], s = gm.taken ? 0.0001 : 1;
    this._m.compose(this._v.set(gm.x, gm.y + Math.sin(t * 2 + i) * 0.12, gm.z), this._q.setFromEuler(this._e.set(0, t * 1.6 + i, 0)), new THREE.Vector3(s, s * 1.3, s));
    this.gemMesh.setMatrixAt(i, this._m);
    this.gemGlow[i].visible = !gm.taken;
    this.gemGlow[i].material.opacity = 0.5 + Math.sin(t * 3 + i) * 0.25;
  }
  this.gemMesh.instanceMatrix.needsUpdate = true;
  for (let i = 0; i < this.ringObjs.length; i++) {
    const o = this.ringObjs[i], hot = game.ringTarget === w.rings[i];
    o.t.rotation.y = t * 1.2;
    o.glow.material.opacity = hot ? 0.95 : 0.4 + Math.sin(t * 3) * 0.15;
    o.glow.scale.setScalar(hot ? 2.6 : 1.8);
  }
  for (const d of this.dynMeshes) d.m.position.y = d.y + d.b.oy;
  this._updateCrumble(dt, false);
  const rocks = game.fallingRocks || [];
  let ri = 0, ii = 0;
  for (const r of rocks) {
    const m = r.ice ? this.iceChunks[ii++] : this.fallRocks[ri++];
    if (!m) continue;
    m.visible = true; m.position.set(r.x, r.y, r.z); m.rotation.set(t * 5 + ri + ii, t * 3, 0);
  }
  for (; ri < this.fallRocks.length; ri++) this.fallRocks[ri].visible = false;
  for (; ii < this.iceChunks.length; ii++) this.iceChunks[ii].visible = false;
  for (const m of this.waterMats) {
    const u = m.uniforms;
    u.uTime.value = t;
    if (this.sunDir) u.uSunDir.value.copy(this.sunDir);
    u.uSky.value.copy(this.scene.fog.color);
  }
  // espuma y bruma al pie de las cascadas cercanas
  this.sprayT -= dt;
  if (this.sprayT <= 0) {
    this.sprayT = 0.08;
    for (const f of this.fallSpots) {
      const d = Math.abs(f.x - cp.x) + Math.abs(f.z - cp.z);
      if (d > 45) continue;
      if (f.kind === 'water') {
        this.burst(f.x, f.y + 0.2, f.z, 2, { color: 0xf4fbff, speed: 1.4, up: 1.2, life: 1.1, size: 0.55, grav: 0.4, alpha: 0.32, spread: f.w * 0.8 });
        if (Math.random() < 0.3) this.burst(f.x - f.nx * 0.5, f.top - Math.random() * (f.top - f.y), f.z - f.nz * 0.5, 1, { color: 0xffffff, speed: 0.4, up: -2, life: 0.7, size: 0.25, grav: 3, alpha: 0.4, spread: f.w * 0.7 });
      } else if (f.kind === 'lava' && Math.random() < 0.5) {
        this.burst(f.x, f.y + 0.2, f.z, 1, { color: 0xff8a2a, speed: 1.2, up: 2, life: 0.8, size: 0.2, grav: 2, alpha: 0.8, spread: f.w * 0.6 });
      }
    }
    for (const m of this.mistSpots) {
      if (Math.abs(m.x - cp.x) + Math.abs(m.z - cp.z) > 40 || Math.random() < 0.5) continue;
      this.burst(m.x, m.y, m.z, 1, { color: m.lava ? 0xffa060 : 0xe8f2f8, speed: 0.5, up: 0.9, life: 2.2, size: 1.6, grav: -0.15, alpha: 0.22, spread: m.w });
    }
  }
};
