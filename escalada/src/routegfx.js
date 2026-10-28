// Dibujo de la ruta: bloques de roca, presas, escaleras, lianas, ganchos, cuerda, garfios,
// tirolesas, gemas, lava y peligros. Extiende Gfx. Lee el estado del mundo; no lo cambia.
'use strict';

// Roca lisa (no se escala) por bioma, y el color "con magnesio" de las zonas escalables
const RT_SMOOTH = [0x46423f, 0x3d4639, 0x464c56, 0x2a2627];
const RT_PANEL = { rock: [0xd9c6a2, 0xcdbf98, 0xd2d0c8, 0xa98a74], ice: [0xbfeafa, 0xbfeafa, 0xbfeafa, 0xbfeafa], vine: [0x4f7f36, 0x4f7f36, 0x5a7f46, 0x4f6a36] };
const RT_KIND = { wood: 0x8a6a45, crumble: 0x9c6b4d, basalt: 0x2e292a };

// Caja con caras subdivididas; el interior se abomba un poco para que parezca roca.
// El relieve nunca toca las aristas, así que las caras vecinas siguen cerradas.
function rtBox(b, pos, col, colOf, rng, bump) {
  const faces = [
    { o: [b.x0, b.y0, b.z0], u: [b.x1 - b.x0, 0, 0], v: [0, b.y1 - b.y0, 0], n: [0, 0, -1], key: 'nz' },
    { o: [b.x1, b.y0, b.z1], u: [b.x0 - b.x1, 0, 0], v: [0, b.y1 - b.y0, 0], n: [0, 0, 1], key: 'pz' },
    { o: [b.x0, b.y0, b.z1], u: [0, 0, b.z0 - b.z1], v: [0, b.y1 - b.y0, 0], n: [-1, 0, 0], key: 'nx' },
    { o: [b.x1, b.y0, b.z0], u: [0, 0, b.z1 - b.z0], v: [0, b.y1 - b.y0, 0], n: [1, 0, 0], key: 'px' },
    { o: [b.x0, b.y1, b.z0], u: [b.x1 - b.x0, 0, 0], v: [0, 0, b.z1 - b.z0], n: [0, 1, 0], key: 'top' },
    { o: [b.x0, b.y0, b.z1], u: [b.x1 - b.x0, 0, 0], v: [0, 0, b.z0 - b.z1], n: [0, -1, 0], key: 'bot' }
  ];
  const c = new THREE.Color();
  for (const f of faces) {
    const lu = Math.hypot(...f.u), lv = Math.hypot(...f.v);
    const su = Math.max(1, Math.round(lu / 1.7)), sv = Math.max(1, Math.round(lv / 1.7));
    const grid = [];
    for (let j = 0; j <= sv; j++) for (let i = 0; i <= su; i++) {
      const edge = i === 0 || j === 0 || i === su || j === sv;
      // las caras con zonas escalables no se abomban: si no, taparían la placa de presas
      const k = edge || !bump || (b.faces && b.faces[f.key]) ? 0 : rng() * bump;
      const x = f.o[0] + f.u[0] * i / su + f.v[0] * j / sv + f.n[0] * k;
      const y = f.o[1] + f.u[1] * i / su + f.v[1] * j / sv + f.n[1] * k;
      const z = f.o[2] + f.u[2] * i / su + f.v[2] * j / sv + f.n[2] * k;
      colOf(f.key, x, y, z, c);
      grid.push([x, y, z, c.r, c.g, c.b]);
    }
    const at = (i, j) => grid[j * (su + 1) + i];
    for (let j = 0; j < sv; j++) for (let i = 0; i < su; i++) {
      const a = at(i, j), bb = at(i + 1, j), cc = at(i + 1, j + 1), d = at(i, j + 1);
      for (const v of [a, cc, bb, a, d, cc]) { pos.push(v[0], v[1], v[2]); col.push(v[3], v[4], v[5]); }
    }
  }
}

function rtGeom(pos, col) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

Gfx.prototype._buildRoute = function () {
  const w = this.world, rng = U.rng(w.seed ^ 0x2077), S = this.scene;
  const biomeOf = y => w.biomeIndex(y);
  const smoothCol = (key, x, y, z, c, kind) => {
    if (kind && RT_KIND[kind]) c.set(RT_KIND[kind]); else c.set(RT_SMOOTH[biomeOf(y)]);
    const v = w.noise.n2(x * 0.4 + y * 0.3, z * 0.4) * 0.07;
    c.r *= 1 + v; c.g *= 1 + v; c.b *= 1 + v;
    return c;
  };
  // --- bloques fijos en una sola malla por tramo ---
  const byTramo = new Map();
  for (const b of w.blocks) {
    if (b.move || b.crumble) continue;
    if (!byTramo.has(b.tramo)) byTramo.set(b.tramo, { pos: [], col: [] });
    const T = byTramo.get(b.tramo);
    const big = (b.x1 - b.x0) * (b.z1 - b.z0) > 3 && b.kind !== 'wood';
    const allPanel = b.climbAll ? RT_PANEL[b.climbAll] : null;
    rtBox(b, T.pos, T.col, (key, x, y, z, c) => {
      if (allPanel && key !== 'top' && key !== 'bot') { c.set(allPanel[biomeOf(y)]); const v = w.noise.n2(x * 0.5, y * 0.5 + z) * 0.08; c.r *= 1 + v; c.g *= 1 + v; c.b *= 1 + v; return c; }
      return smoothCol(key, x, y, z, c, b.kind);
    }, rng, big ? 0.14 : 0);
  }
  this.routeMeshes = [];
  byTramo.forEach(T => {
    const m = new THREE.Mesh(rtGeom(T.pos, T.col), this.terrainMat);
    m.castShadow = this.Q.shadow; m.receiveShadow = this.Q.shadow;
    S.add(m);
    this.routeMeshes.push(m);
  });
  // --- zonas escalables: placa clara un poco delante de la cara, presas, escaleras y lianas ---
  const pp = [], pc = [], holds = [], rungs = [], leaves = [];
  const c = new THREE.Color();
  for (const b of w.blocks) for (const key in b.faces) for (const r of b.faces[key]) {
    const n = FACE_N[key], plane = facePlane(b, key) + (key === 'px' || key === 'pz' ? 0.02 : -0.02);
    const zf = key === 'nz' || key === 'pz';
    const P = (a, y) => zf ? [a, y, plane] : [plane, y, a];
    const y0 = Math.max(r.y0, b.y0), y1 = Math.min(r.y1, b.y1);
    if (r.type === 'ladder') {
      for (let y = y0 + 0.3; y < y1; y += 0.42) rungs.push({ a0: r.a0 + 0.1, a1: r.a1 - 0.1, y, key, plane, b });
      continue;
    }
    const pal = RT_PANEL[r.type] || RT_PANEL.rock;
    const sa = Math.max(1, Math.round((r.a1 - r.a0) / 1.2)), sy = Math.max(1, Math.round((y1 - y0) / 1.2));
    for (let j = 0; j < sy; j++) for (let i = 0; i < sa; i++) {
      const a0 = r.a0 + (r.a1 - r.a0) * i / sa, a1 = r.a0 + (r.a1 - r.a0) * (i + 1) / sa;
      const ya = y0 + (y1 - y0) * j / sy, yb = y0 + (y1 - y0) * (j + 1) / sy;
      const q = [P(a0, ya), P(a1, ya), P(a1, yb), P(a0, yb)];
      const order = (key === 'nz' || key === 'px') ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
      for (const k of order) {
        const v = q[k];
        c.set(pal[biomeOf(v[1])]);
        const nv = w.noise.n2(v[0] * 0.7 + v[1] * 0.2, v[2] * 0.7 + v[1] * 0.5) * 0.1;
        pp.push(v[0], v[1], v[2]); pc.push(c.r * (1 + nv), c.g * (1 + nv), c.b * (1 + nv));
      }
    }
    // presas (o hojas en las lianas)
    const area = (r.a1 - r.a0) * (y1 - y0), count = Math.round(area * (r.type === 'vine' ? 1.4 : 1.7));
    for (let k = 0; k < count; k++) {
      const a = r.a0 + 0.15 + rng() * (r.a1 - r.a0 - 0.3), y = y0 + 0.1 + rng() * (y1 - y0 - 0.2);
      const p = P(a, y);
      const it = { x: p[0] + n.x * 0.03, y: p[1], z: p[2] + n.z * 0.03, s: 0.07 + rng() * 0.1, rot: rng() * 6.28, r: rng(), t: r.type, nx: n.x, nz: n.z };
      (r.type === 'vine' ? leaves : holds).push(it);
    }
  }
  if (pp.length) {
    const m = new THREE.Mesh(rtGeom(pp, pc), this.terrainMat);
    m.receiveShadow = this.Q.shadow;
    S.add(m);
  }
  const holdG = new THREE.OctahedronGeometry(1, 0); // 8 triángulos: hay miles de presas
  const holdMat = new THREE.MeshLambertMaterial({ flatShading: true });
  const holdCols = [0xf2ede4, 0xe8e0d2, 0xd9d2c4, 0xf0c86a];
  this._scatter(holdG, holdMat, holds, (it, m, cc) => {
    m.compose(this._v.set(it.x, it.y, it.z), this._q.setFromEuler(this._e.set(it.rot, it.rot * 2, it.rot * 0.5)), new THREE.Vector3(it.s * 1.3, it.s, it.s));
    cc.set(it.t === 'ice' ? 0xeaf8ff : holdCols[it.r < 0.08 ? 3 : (it.r * 3) | 0]);
  }, { far: 70 });
  const leafG = new THREE.ConeGeometry(0.16, 0.42, 3); leafG.scale(1, 1, 0.25);
  this._scatter(leafG, this._sway(new THREE.MeshLambertMaterial({ flatShading: true, side: THREE.DoubleSide }), 'leaf', 0.05, 0), leaves, (it, m, cc) => {
    m.compose(this._v.set(it.x, it.y, it.z), this._q.setFromEuler(this._e.set(0.4 + it.r, it.rot, it.rot * 0.3)), new THREE.Vector3(1 + it.r, 1 + it.r, 1));
    cc.setHSL(0.28 + it.r * 0.06, 0.55, 0.3 + it.r * 0.15);
  }, { far: 70 });
  // lianas: cuerdas verdes colgando sobre las zonas de lianas
  const vp = [], vc = [];
  for (const b of w.blocks) for (const key in b.faces) for (const r of b.faces[key]) {
    if (r.type !== 'vine') continue;
    const n = FACE_N[key], plane = facePlane(b, key), zf = key === 'nz' || key === 'pz';
    for (let a = r.a0 + 0.3; a < r.a1; a += 0.7) {
      const x = zf ? a : plane + n.x * 0.06, z = zf ? plane + n.z * 0.06 : a;
      const y0 = Math.max(r.y0, b.y0), y1 = Math.min(r.y1, b.y1) + 0.4, wdt = 0.035;
      const ax = zf ? wdt : 0, az = zf ? 0 : wdt;
      const q = [[x - ax, y0, z - az], [x + ax, y0, z + az], [x + ax, y1, z + az], [x - ax, y1, z - az]];
      for (const k of [0, 1, 2, 0, 2, 3]) { vp.push(...q[k]); vc.push(0.18, 0.36 + (a % 1) * 0.1, 0.14); }
    }
  }
  if (vp.length) S.add(new THREE.Mesh(rtGeom(vp, vc), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide })));
  // peldaños de la vía ferrata (barras de hierro)
  if (rungs.length) {
    const parts = [];
    for (const r of rungs) {
      const n = FACE_N[r.key], zf = r.key === 'nz' || r.key === 'pz', len = r.a1 - r.a0, mid = (r.a0 + r.a1) / 2;
      const x = zf ? mid : r.plane + n.x * 0.14, z = zf ? r.plane + n.z * 0.14 : mid;
      parts.push({ g: new THREE.CylinderGeometry(0.03, 0.03, len, 5), m: mtx(x, r.y, z, zf ? 0 : Math.PI / 2, 0, zf ? Math.PI / 2 : 0), c: 0x9aa3ad });
      for (const s of [-1, 1]) {
        const ex = zf ? mid + s * len / 2 : r.plane + n.x * 0.07, ez = zf ? r.plane + n.z * 0.07 : mid + s * len / 2;
        parts.push({ g: new THREE.CylinderGeometry(0.025, 0.025, 0.16, 4), m: mtx(ex, r.y, ez, zf ? Math.PI / 2 : 0, 0, zf ? 0 : Math.PI / 2), c: 0x7a838c });
      }
    }
    const m = new THREE.Mesh(mergeColored(parts), new THREE.MeshLambertMaterial({ vertexColors: true }));
    m.castShadow = this.Q.shadow;
    S.add(m);
  }
  this._buildRouteDynamic();
  this._buildRouteProps();
};

// Plataformas móviles y bloques que se desmoronan: una malla cada uno para poder moverlos
Gfx.prototype._buildRouteDynamic = function () {
  const w = this.world, rng = U.rng(w.seed ^ 0x99);
  this.dynMeshes = [];
  for (const b of w.dyn) {
    const pos = [], col = [];
    const base = b.base, bb = { x0: base.x0, x1: base.x1, y0: base.y0, y1: base.y1, z0: base.z0, z1: base.z1 };
    rtBox(bb, pos, col, (key, x, y, z, c) => {
      c.set(b.climbAll && key !== 'top' && key !== 'bot' ? RT_PANEL.rock[w.biomeIndex(y)] : RT_KIND[b.kind] || RT_SMOOTH[w.biomeIndex(y)]);
      if (b.kind === 'crumble') { const crack = Math.abs(w.noise.n2(x * 2.2 + y, z * 2.2 + y * 1.7)) < 0.08; if (crack) c.multiplyScalar(0.45); c.lerp(this._c2.set(0x9c6b4d), 0.35); }
      if (b.kind === 'wood' && Math.abs(((x + z) * 3) % 1) < 0.12) c.multiplyScalar(0.75);
      return c;
    }, rng, 0);
    const m = new THREE.Mesh(rtGeom(pos, col), this.terrainMat);
    m.castShadow = this.Q.shadow;
    this.scene.add(m);
    this.dynMeshes.push({ m, b, fall: 0 });
  }
};

Gfx.prototype._buildRouteProps = function () {
  const w = this.world, S = this.scene;
  // Ganchos en la pared (placa + argolla) y en postes
  const anchorG = mergeColored([
    { g: new THREE.BoxGeometry(0.16, 0.22, 0.04), m: mtx(0, 0, -0.1), c: 0xb7bfc8 },
    { g: new THREE.TorusGeometry(0.09, 0.025, 5, 10), m: mtx(0, -0.06, -0.04, 0, 0, 0), c: 0xffffff }
  ]);
  const postG = mergeColored([
    { g: new THREE.CylinderGeometry(0.06, 0.08, 1.2, 6), m: mtx(0, 0.6, 0), c: 0x7a5a3a },
    { g: new THREE.TorusGeometry(0.1, 0.03, 5, 10), m: mtx(0, 1.15, 0.06), c: 0xffffff }
  ]);
  const lam = new THREE.MeshLambertMaterial({ vertexColors: true });
  const wallA = w.anchors.filter(a => a.wall), postA = w.anchors.filter(a => !a.wall);
  this.anchorWallMesh = new THREE.InstancedMesh(anchorG, lam, Math.max(1, wallA.length));
  this.anchorPostMesh = new THREE.InstancedMesh(postG, lam, Math.max(1, postA.length));
  this.anchorSlot = new Map();
  wallA.forEach((a, i) => {
    const n = FACE_N[a.key];
    this._m.compose(this._v.set(a.x, a.y, a.z), this._q.setFromEuler(this._e.set(0, Math.atan2(n.x, n.z), 0)), new THREE.Vector3(1, 1, 1));
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
  // Postes de decoración (puentes, garfios, tirolesas)
  const deco = [];
  for (const p of w.posts) deco.push({ g: new THREE.CylinderGeometry(0.09, 0.12, p.h, 6), m: mtx(p.x, p.y + p.h / 2, p.z), c: 0x6e5236 });
  // barandas del puente y cables de tirolesa (con un poco de comba)
  const cable = (a, b, sag, r, col) => {
    const n = 8;
    for (let i = 0; i < n; i++) {
      const t0 = i / n, t1 = (i + 1) / n;
      const p0 = [U.lerp(a.x, b.x, t0), U.lerp(a.y, b.y, t0) - Math.sin(t0 * Math.PI) * sag, U.lerp(a.z, b.z, t0)];
      const p1 = [U.lerp(a.x, b.x, t1), U.lerp(a.y, b.y, t1) - Math.sin(t1 * Math.PI) * sag, U.lerp(a.z, b.z, t1)];
      const dx = p1[0] - p0[0], dy = p1[1] - p0[1], dz = p1[2] - p0[2], len = Math.hypot(dx, dy, dz);
      const g = new THREE.CylinderGeometry(r, r, len, 4);
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len));
      m.compose(new THREE.Vector3((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2), q, new THREE.Vector3(1, 1, 1));
      deco.push({ g, m, c: col });
    }
  };
  for (const r of w.rails) cable(r.a, r.b, 0.25, 0.03, 0xc9a86a);
  for (const z of w.zips) cable({ x: z.a.x, y: z.a.y + 0.1, z: z.a.z }, { x: z.b.x, y: z.b.y + 0.1, z: z.b.z }, 0.4, 0.025, 0x3a3f46);
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
  this.gemGlow = w.gems.map(gm => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture('rgba(150,240,255,0.8)', 'rgba(80,200,255,0)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    s.scale.set(1.4, 1.4, 1); s.position.set(gm.x, gm.y, gm.z);
    S.add(s);
    return s;
  });
  // Lava en los fosos de la caldera
  for (const l of w.lavas) {
    const g = new THREE.PlaneGeometry(l.x1 - l.x0 + 6, l.z1 - l.z0 + 6).rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, this.lava.material);
    m.position.set((l.x0 + l.x1) / 2, l.y, (l.z0 + l.z1) / 2);
    S.add(m);
  }
  // Boquillas de vapor en la pared
  if (w.steams.length) {
    const parts = w.steams.map(s => ({ g: new THREE.CylinderGeometry(0.22, 0.3, 0.25, 8), m: mtx(s.x + s.nx * 0.1, s.y, s.z + s.nz * 0.1, s.nz ? Math.PI / 2 : 0, 0, s.nx ? Math.PI / 2 : 0), c: 0x2a2526 }));
    S.add(new THREE.Mesh(mergeColored(parts), lam));
  }
  // Rocas que caen (se reutilizan)
  this.fallRocks = [];
  const rg = new THREE.DodecahedronGeometry(0.5, 0), rm = new THREE.MeshLambertMaterial({ color: 0x6d6862, flatShading: true });
  for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(rg, rm); m.visible = false; m.castShadow = this.Q.shadow; S.add(m); this.fallRocks.push(m); }
  // Carteles con el número de cada desafío
  this.signs = w.challenges.map((ch, i) => {
    const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64;
    const x = cv.getContext('2d');
    x.fillStyle = '#7a5a3a'; x.fillRect(0, 0, 128, 64);
    x.fillStyle = '#f6e6c8'; x.font = 'bold 40px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText((i + 1) + '', 64, 34);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv) }));
    sp.scale.set(0.9, 0.45, 1);
    const lx = -ch.fz, lz = ch.fx;
    sp.position.set(ch.x - lx * 3.2 + ch.fx * 0.6, ch.y + 1.6, ch.z - lz * 3.2 + ch.fz * 0.6);
    S.add(sp);
    return sp;
  });
  for (const sp of this.signs) {
    const p = sp.position;
    const pm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.4, 5), new THREE.MeshLambertMaterial({ color: 0x5e4630 }));
    pm.position.set(p.x, p.y - 0.85, p.z);
    S.add(pm);
    sp.userData.post = pm;
  }
};

// Colores de los ganchos: disponible, enganchado o ya pasado
Gfx.prototype.setAnchorState = function (cur) {
  const ci = cur ? cur.idx : -1;
  this.anchorSlot.forEach(([mesh, i], idx) => {
    mesh.setColorAt(i, this._c.set(idx === ci ? 0x3ce07a : idx < ci ? 0x8a8f96 : 0xffb020));
  });
  for (const m of [this.anchorWallMesh, this.anchorPostMesh]) if (m.instanceColor) m.instanceColor.needsUpdate = true;
  this.anchorGlow.visible = !!cur;
  if (cur) this.anchorGlow.position.set(cur.x, cur.y, cur.z);
};

// Cuerda con comba: floja cuando sobra, recta cuando te sostiene
Gfx.prototype.updateRope = function (pl, pos) {
  const a = pl.anchor;
  this.ropeMesh.visible = !!a && pl.state !== 'zip' && pl.state !== 'ride';
  if (!this.ropeMesh.visible) return;
  const hx = pos.x, hy = pos.y + 0.98, hz = pos.z;
  const d = Math.hypot(a.x - hx, a.y - hy, a.z - hz);
  const slack = pl.taut || pl.state === 'ascend' ? 0 : Math.max(0, Math.min(1.5, (pl.ropeLen - d) * 0.5 + 0.25));
  const R = this._ropeTmp || (this._ropeTmp = { v1: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), dir: new THREE.Vector3(), sc: new THREE.Vector3() });
  const n = this.ropeSegs, v0 = this._v, v1 = R.v1, up = R.up, dir = R.dir;
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    v0.set(U.lerp(hx, a.x, t0), U.lerp(hy, a.y, t0) - Math.sin(t0 * Math.PI) * slack, U.lerp(hz, a.z, t0));
    v1.set(U.lerp(hx, a.x, t1), U.lerp(hy, a.y, t1) - Math.sin(t1 * Math.PI) * slack, U.lerp(hz, a.z, t1));
    dir.subVectors(v1, v0);
    const len = dir.length() || 0.001;
    this._q.setFromUnitVectors(up, dir.multiplyScalar(1 / len));
    this._m.compose(v0, this._q, R.sc.set(1, len, 1));
    this.ropeMesh.setMatrixAt(i, this._m);
  }
  this.ropeMesh.instanceMatrix.needsUpdate = true;
};

// Cada cuadro: gemas, anillos, plataformas, bloques que caen, rocas y carteles
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
  for (const d of this.dynMeshes) {
    const b = d.b, m = d.m;
    if (b.broken) {
      d.fall += dt;
      m.position.set(b.ox, b.oy - d.fall * d.fall * 6, b.oz);
      m.visible = d.fall < 1.2;
      continue;
    }
    if (d.fall > 0) { d.fall = 0; m.visible = true; }
    const shake = b.crumble && b.touch > 0 ? Math.min(1, b.touch / b.crumble) * 0.06 : 0;
    m.position.set(b.ox + (Math.random() - 0.5) * shake, b.oy + (Math.random() - 0.5) * shake, b.oz + (Math.random() - 0.5) * shake);
  }
  const rocks = game.fallingRocks || [];
  for (let i = 0; i < this.fallRocks.length; i++) {
    const m = this.fallRocks[i], r = rocks[i];
    m.visible = !!r;
    if (r) { m.position.set(r.x, r.y, r.z); m.rotation.set(t * 5 + i, t * 3, 0); }
  }
  for (const s of this.signs) {
    const vis = Math.abs(s.position.x - cp.x) + Math.abs(s.position.z - cp.z) < 60;
    s.visible = vis; s.userData.post.visible = vis;
  }
};
