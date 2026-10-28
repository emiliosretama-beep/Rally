// Todo lo que se dibuja con Three.js. Lee el estado del juego; no lo cambia.
'use strict';

function Gfx(canvas, world, quality) {
  this.world = world;
  this.q = quality;
  const Q = { low: { dpr: 1, far: 380, trees: 0.5, shadow: false, particles: 0.5 },
              med: { dpr: 1.5, far: 520, trees: 0.8, shadow: false, particles: 0.8 },
              high: { dpr: 2, far: 700, trees: 1, shadow: true, particles: 1 } }[quality] || null;
  this.Q = Q;
  const r = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high', powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.dpr));
  if (Q.shadow) { r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; }
  this.r = r;
  this.scene = new THREE.Scene();
  this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, 2200);
  this.scene.fog = new THREE.Fog(0xbfe0f5, 60, Q.far);
  this.time = 0;
  this._v = new THREE.Vector3();
  this._m = new THREE.Matrix4();
  this._q = new THREE.Quaternion();
  this._e = new THREE.Euler();
  this._c = new THREE.Color();
  this._buildLights();
  this._buildSky();
  this._buildTerrain();
  this._buildSea();
  this._buildTrees();
  this._buildRocks();
  this._buildBushes();
  this._buildProps();
  this._buildCharacter();
  this._buildParticles();
  this.resize();
}

Gfx.prototype.resize = function () {
  const w = window.innerWidth, h = window.innerHeight;
  this.r.setSize(w, h, false);
  this.camera.aspect = w / h;
  this.camera.fov = w < h ? 72 : 62;
  this.camera.updateProjectionMatrix();
};

Gfx.prototype.dispose = function () {
  this.scene.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of ms) { if (m.map) m.map.dispose(); m.dispose(); }
    }
  });
  this.r.dispose();
};

// ---------- utilidades de geometría ----------
// Une geometrías (no indexadas) con color por vértice en una sola.
function mergeColored(parts) {
  let total = 0;
  const geoms = parts.map(pt => {
    let g = pt.g.index ? pt.g.toNonIndexed() : pt.g.clone();
    if (pt.m) g.applyMatrix4(pt.m);
    total += g.attributes.position.count;
    return { g, c: new THREE.Color(pt.c) };
  });
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3);
  let o = 0;
  for (const { g, c } of geoms) {
    g.computeVertexNormals();
    const P = g.attributes.position.array, Nn = g.attributes.normal.array;
    pos.set(P, o * 3); nor.set(Nn, o * 3);
    const n = g.attributes.position.count;
    for (let i = 0; i < n; i++) {
      // pequeña variación por vértice para que no se vea plano
      const k = 0.92 + ((i * 7919) % 17) / 17 * 0.16;
      col[(o + i) * 3] = c.r * k; col[(o + i) * 3 + 1] = c.g * k; col[(o + i) * 3 + 2] = c.b * k;
    }
    o += n;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

function mtx(x, y, z, rx, ry, rz, sx, sy, sz) {
  const m = new THREE.Matrix4();
  m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0)),
    new THREE.Vector3(sx || 1, sy === undefined ? (sx || 1) : sy, sz === undefined ? (sx || 1) : sz));
  return m;
}

function emojiTexture(ch, size) {
  size = size || 96;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d');
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = Math.floor(size * 0.72) + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  x.fillText(ch, size / 2, size / 2 + size * 0.04);
  const t = new THREE.CanvasTexture(c);
  return t;
}

function glowTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// ---------- luces y cielo ----------
Gfx.prototype._buildLights = function () {
  this.hemi = new THREE.HemisphereLight(0xcfe6ff, 0x6b5a45, 0.75);
  this.scene.add(this.hemi);
  this.sun = new THREE.DirectionalLight(0xffffff, 1.0);
  this.scene.add(this.sun); this.scene.add(this.sun.target);
  if (this.Q.shadow) {
    const s = this.sun.shadow;
    this.sun.castShadow = true;
    s.mapSize.set(1024, 1024);
    s.camera.left = -18; s.camera.right = 18; s.camera.top = 18; s.camera.bottom = -18;
    s.camera.near = 1; s.camera.far = 120;
    s.bias = -0.0008;
  }
};

const SKY_KEYS = [
  { t: 0.0,  top: 0x6fa8dc, hor: 0xf2d7b6, sun: 0xfff0d8, si: 0.95, hs: 0xcfe6ff, hg: 0x6b5a45, hi: 0.7 },
  { t: 0.45, top: 0x3a80d2, hor: 0xc4e2f5, sun: 0xffffff, si: 1.1,  hs: 0xd8ecff, hg: 0x6b6050, hi: 0.8 },
  { t: 0.8,  top: 0x4a6fb3, hor: 0xf6c890, sun: 0xffd6a0, si: 1.0,  hs: 0xe9d9c8, hg: 0x5e4a3a, hi: 0.7 },
  { t: 1.0,  top: 0x2d3f78, hor: 0xf08a5d, sun: 0xff9a62, si: 0.8,  hs: 0xd7b4a8, hg: 0x4a3a36, hi: 0.6 }
];

Gfx.prototype._buildSky = function () {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) },
                sunCol: { value: new THREE.Color() }, storm: { value: 0 } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: [
      'uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; uniform float storm; varying vec3 vDir;',
      'void main(){ float h = max(vDir.y, 0.0); vec3 c = mix(hor, top, pow(h, 0.55));',
      ' if (vDir.y < 0.0) c = hor;',
      ' float s = max(dot(normalize(vDir), sunDir), 0.0);',
      ' c += sunCol * (pow(s, 900.0) * 1.6 + pow(s, 12.0) * 0.25) * (1.0 - storm);',
      ' c = mix(c, hor, storm * 0.85);',
      ' gl_FragColor = vec4(c, 1.0); }'
    ].join('\n')
  });
  this.sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 24, 12), mat);
  this.sky.renderOrder = -1;
  this.scene.add(this.sky);
};

Gfx.prototype.setTimeOfDay = function (t, storm) {
  let a = SKY_KEYS[0], b = SKY_KEYS[SKY_KEYS.length - 1];
  for (let i = 0; i < SKY_KEYS.length - 1; i++) if (t >= SKY_KEYS[i].t && t <= SKY_KEYS[i + 1].t) { a = SKY_KEYS[i]; b = SKY_KEYS[i + 1]; break; }
  const k = (t - a.t) / Math.max(0.0001, b.t - a.t);
  const C = THREE.Color, u = this.sky.material.uniforms;
  const mix = (x, y, out) => out.set(x).lerp(new C(y), k);
  mix(a.top, b.top, u.top.value);
  mix(a.hor, b.hor, u.hor.value);
  mix(a.sun, b.sun, u.sunCol.value);
  const stormCol = new C(0xc3ccd6);
  u.top.value.lerp(stormCol, storm * 0.8);
  u.hor.value.lerp(stormCol, storm * 0.7);
  u.storm.value = storm;
  this.scene.fog.color.copy(u.hor.value);
  this.sun.color.copy(u.sunCol.value);
  this.sun.intensity = U.lerp(a.si, b.si, k) * (1 - storm * 0.45);
  this.hemi.color.set(a.hs).lerp(new C(b.hs), k);
  this.hemi.groundColor.set(a.hg).lerp(new C(b.hg), k);
  this.hemi.intensity = U.lerp(a.hi, b.hi, k) + storm * 0.15;
  // el sol cruza de este a oeste, bajo al final de la tarde
  const ang = U.lerp(0.35, Math.PI - 0.25, t);
  this.sunDir = this.sunDir || new THREE.Vector3();
  this.sunDir.set(Math.cos(ang) * 0.75, Math.sin(ang) * 0.75 + 0.12, 0.45).normalize();
  u.sunDir.value.copy(this.sunDir);
};

// ---------- terreno ----------
const COL = {
  sand: new THREE.Color(0xe6d29c), wet: new THREE.Color(0xc8ad78), shoreGrass: new THREE.Color(0x93bf5b),
  jungle: new THREE.Color(0x4e9a3a), jungleDark: new THREE.Color(0x3b7c2e), rockWarm: new THREE.Color(0x8c7c68),
  rockGrey: new THREE.Color(0x80808a), alpineGrass: new THREE.Color(0x86a866), snow: new THREE.Color(0xf1f4f9),
  ash: new THREE.Color(0x4d4446), basalt: new THREE.Color(0x3a3335), lavaRock: new THREE.Color(0x6a3a2c), seabed: new THREE.Color(0xb7a57a)
};

Gfx.prototype._terrainColor = function (x, y, z, ny, out) {
  const w = this.world, nz = w.noise;
  const v = nz.n2(x * 0.15, z * 0.15) * 0.06 + nz.fbm(x * 0.03, z * 0.03, 2) * 0.08;
  const y2 = y + nz.fbm(x * 0.02 + 3, z * 0.02, 2) * 10;
  let flat;
  if (y < -0.5) flat = COL.seabed;
  else if (y < 1.2) flat = COL.wet;
  else if (y2 < 9 && Math.hypot(x, z) > CFG.BASE_R - 30) flat = COL.sand;
  else if (y2 < CFG.BIOMES[0].top) { out.copy(COL.shoreGrass).lerp(COL.jungle, U.smooth(20, 42, y2)); flat = out.clone(); }
  else if (y2 < CFG.BIOMES[1].top) { out.copy(COL.jungle).lerp(COL.jungleDark, U.smooth(-0.2, 0.3, nz.fbm(x * 0.04, z * 0.04, 2))); flat = out.clone(); }
  else if (y2 < CFG.BIOMES[2].top) { out.copy(COL.alpineGrass).lerp(COL.snow, U.smooth(128, 150, y2)); flat = out.clone(); }
  else { out.copy(COL.ash).lerp(COL.basalt, U.smooth(-0.1, 0.4, nz.fbm(x * 0.05, z * 0.05, 2))); flat = out.clone(); }
  let rock;
  if (y2 < CFG.BIOMES[1].top) rock = COL.rockWarm;
  else if (y2 < CFG.BIOMES[2].top) rock = COL.rockGrey;
  else rock = y > CFG.PEAK_H - 6 || Math.hypot(x, z) < CFG.CRATER_R ? COL.lavaRock : COL.basalt;
  const steep = U.smooth(0.8, 0.62, ny);
  out.copy(flat).lerp(rock, y < 1.2 ? 0 : steep);
  // nieve en repisas aunque estén un poco inclinadas
  if (y2 > 150 && y2 < CFG.BIOMES[2].top + 4 && ny > 0.7) out.lerp(COL.snow, 0.6);
  out.r *= 1 + v; out.g *= 1 + v; out.b *= 1 + v;
  return out;
};

Gfx.prototype._buildTerrain = function () {
  const w = this.world, N = w.N, C = w.C, H = w.h, W = N + 1, CH = 32;
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  this.terrainMat = mat;
  const nv = { x: 0, y: 1, z: 0 }, col = new THREE.Color();
  // Colores por vértice compartidos
  const colors = new Float32Array(W * W * 3);
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const x = i * C - w.half, z = j * C - w.half, k = j * W + i;
    w.normalAt(x, z, nv, 1.0);
    this._terrainColor(x, H[k], z, nv.y, col);
    colors[k * 3] = col.r; colors[k * 3 + 1] = col.g; colors[k * 3 + 2] = col.b;
  }
  this.chunks = [];
  for (let cj = 0; cj < N / CH; cj++) for (let ci = 0; ci < N / CH; ci++) {
    const VW = CH + 1;
    const pos = new Float32Array(VW * VW * 3), cc = new Float32Array(VW * VW * 3);
    for (let j = 0; j <= CH; j++) for (let i = 0; i <= CH; i++) {
      const gi = ci * CH + i, gj = cj * CH + j, k = gj * W + gi, o = (j * VW + i) * 3;
      pos[o] = gi * C - w.half; pos[o + 1] = H[k]; pos[o + 2] = gj * C - w.half;
      cc[o] = colors[k * 3]; cc[o + 1] = colors[k * 3 + 1]; cc[o + 2] = colors[k * 3 + 2];
    }
    const idx = new Uint16Array(CH * CH * 6);
    let t = 0;
    for (let j = 0; j < CH; j++) for (let i = 0; i < CH; i++) {
      const a = j * VW + i, b = a + 1, c = a + VW + 1, d = a + VW;
      idx[t++] = a; idx[t++] = c; idx[t++] = b;
      idx[t++] = a; idx[t++] = d; idx[t++] = c;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(cc, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = this.Q.shadow;
    m.matrixAutoUpdate = false;
    this.scene.add(m);
    this.chunks.push(m);
  }
};

Gfx.prototype._buildSea = function () {
  const g = new THREE.PlaneGeometry(4000, 4000, 1, 1);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.MeshLambertMaterial({ color: 0x2f8fb8, transparent: true, opacity: 0.82 });
  this.sea = new THREE.Mesh(g, m);
  this.sea.position.y = -0.6;
  this.scene.add(this.sea);
  // Espuma en la orilla: anillo claro bajo el agua poco profunda
  const fg = new THREE.RingGeometry(CFG.SHORE_R - 30, CFG.SHORE_R + 26, 96, 1);
  fg.rotateX(-Math.PI / 2);
  this.foam = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: 0x9fe3f0, transparent: true, opacity: 0.25, depthWrite: false }));
  this.foam.position.y = -0.55;
  this.scene.add(this.foam);
};

// ---------- vegetación ----------
Gfx.prototype._instanced = function (geom, list, mat, fn) {
  const n = Math.floor(list.length * this.Q.trees);
  if (n <= 0) return null;
  const im = new THREE.InstancedMesh(geom, mat, n);
  for (let i = 0; i < n; i++) { fn(list[i], this._m, this._c); im.setMatrixAt(i, this._m); im.setColorAt(i, this._c); }
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.castShadow = this.Q.shadow;
  this.scene.add(im);
  return im;
};

Gfx.prototype._buildTrees = function () {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const T = this.world.trees;
  // Palmera
  const palmParts = [{ g: new THREE.CylinderGeometry(0.14, 0.26, 5.2, 6), m: mtx(0, 2.6, 0, 0, 0, 0.08), c: 0x8b6a45 }];
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2;
    palmParts.push({ g: new THREE.ConeGeometry(0.45, 3.2, 4), m: mtx(Math.cos(a) * 1.4 + 0.2, 5.0, Math.sin(a) * 1.4, Math.sin(a) * 1.25, 0, -Math.cos(a) * 1.25, 1, 1, 0.35), c: i % 2 ? 0x3f9a3a : 0x52b043 });
  }
  palmParts.push({ g: new THREE.IcosahedronGeometry(0.28, 0), m: mtx(0.35, 5.0, 0.1), c: 0x6b4a2a });
  const palmG = mergeColored(palmParts);
  // Árbol de selva
  const jg = mergeColored([
    { g: new THREE.CylinderGeometry(0.3, 0.48, 6.5, 6), m: mtx(0, 3.2, 0), c: 0x6e5338 },
    { g: new THREE.IcosahedronGeometry(2.7, 0), m: mtx(0, 7.2, 0, 0, 0, 0, 1, 0.8, 1), c: 0x3f8f34 },
    { g: new THREE.IcosahedronGeometry(1.9, 0), m: mtx(1.5, 6.2, 0.6), c: 0x4ea83c },
    { g: new THREE.IcosahedronGeometry(1.6, 0), m: mtx(-1.2, 6.4, -0.8), c: 0x377e2d }
  ]);
  // Pino (y versión nevada)
  const pine = (snowy) => mergeColored([
    { g: new THREE.CylinderGeometry(0.18, 0.3, 2.4, 5), m: mtx(0, 1.2, 0), c: 0x5d4632 },
    { g: new THREE.ConeGeometry(2.2, 3.2, 7), m: mtx(0, 3.1, 0), c: snowy ? 0xdfe8ef : 0x2f6b3f },
    { g: new THREE.ConeGeometry(1.7, 2.8, 7), m: mtx(0, 4.6, 0), c: snowy ? 0xeef3f7 : 0x2a613a },
    { g: new THREE.ConeGeometry(1.1, 2.2, 7), m: mtx(0, 6.0, 0), c: snowy ? 0xf7fafc : 0x2d6a3c }
  ]);
  const place = (t, m, c) => { m.compose(this._v.set(t.x, t.y - 0.2, t.z), this._q.setFromEuler(this._e.set(0, t.rot, 0)), new THREE.Vector3(t.s, t.s, t.s)); c.setHSL(0, 0, 0.9 + (t.rot % 1) * 0.2); };
  this._instanced(palmG, T.palm, mat, place);
  this._instanced(jg, T.jungle, mat, place);
  const low = T.pine.filter(t => t.y < 150), high = T.pine.filter(t => t.y >= 150);
  this._instanced(pine(false), low, mat, place);
  this._instanced(pine(true), high, mat, place);
};

Gfx.prototype._buildRocks = function () {
  const g = new THREE.DodecahedronGeometry(1, 0);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) * 0.7);
  const mat = new THREE.MeshLambertMaterial({ flatShading: true });
  const cols = [0x9a8a75, 0x8a8478, 0x8e9096, 0x403a3b];
  const list = this.world.rocks;
  const im = new THREE.InstancedMesh(g, mat, list.length);
  for (let i = 0; i < list.length; i++) {
    const r = list[i];
    this._m.compose(this._v.set(r.x, r.y - r.s * 0.25, r.z), this._q.setFromEuler(this._e.set(r.rot * 0.3, r.rot, r.rot * 0.7)),
      new THREE.Vector3(r.s * 1.3, r.s, r.s));
    im.setMatrixAt(i, this._m);
    im.setColorAt(i, this._c.set(cols[r.b]).multiplyScalar(0.85 + (r.rot % 1) * 0.3));
  }
  im.castShadow = this.Q.shadow;
  this.scene.add(im);
};

Gfx.prototype._buildBushes = function () {
  const list = this.world.bushes;
  const bg = mergeColored([
    { g: new THREE.IcosahedronGeometry(0.9, 0), m: mtx(0, 0.6, 0, 0, 0, 0, 1.2, 0.8, 1.2), c: 0x2f7d34 },
    { g: new THREE.IcosahedronGeometry(0.6, 0), m: mtx(0.6, 0.5, 0.3), c: 0x3a8f3a }
  ]);
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const im = new THREE.InstancedMesh(bg, mat, Math.max(1, list.length));
  list.forEach((b, i) => { this._m.compose(this._v.set(b.x, b.y, b.z), this._q.identity(), new THREE.Vector3(1, 1, 1)); im.setMatrixAt(i, this._m); });
  this.scene.add(im);
  // bayas: una esfera por arbusto, se esconde al recogerlas
  const berryG = mergeColored([
    { g: new THREE.IcosahedronGeometry(0.14, 0), m: mtx(0.5, 1.0, 0.7), c: 0xffffff },
    { g: new THREE.IcosahedronGeometry(0.14, 0), m: mtx(-0.4, 0.9, 0.8), c: 0xffffff },
    { g: new THREE.IcosahedronGeometry(0.14, 0), m: mtx(0.9, 0.7, -0.3), c: 0xffffff }
  ]);
  this.berries = new THREE.InstancedMesh(berryG, new THREE.MeshLambertMaterial({ vertexColors: true }), Math.max(1, list.length));
  list.forEach((b, i) => this.berries.setColorAt(i, this._c.set(b.mys ? 0x7a3fc4 : 0xe8283c)));
  this.updateBushes();
  this.scene.add(this.berries);
};

Gfx.prototype.updateBushes = function () {
  const list = this.world.bushes;
  list.forEach((b, i) => {
    const s = b.berries > 0 ? 1 : 0.0001;
    this._m.compose(this._v.set(b.x, b.y, b.z), this._q.identity(), new THREE.Vector3(s, s, s));
    this.berries.setMatrixAt(i, this._m);
  });
  this.berries.instanceMatrix.needsUpdate = true;
  if (this.berries.instanceColor) this.berries.instanceColor.needsUpdate = true;
};

// ---------- objetos del mundo ----------
Gfx.prototype._buildProps = function () {
  const w = this.world, S = this.scene;
  const lam = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  // Fogatas
  this.glowTex = glowTexture('rgba(255,190,90,0.9)', 'rgba(255,120,40,0)');
  const stonesG = mergeColored([...Array(7)].map((_, i) => ({ g: new THREE.DodecahedronGeometry(0.28, 0), m: mtx(Math.cos(i / 7 * 6.28) * 0.85, 0.1, Math.sin(i / 7 * 6.28) * 0.85), c: 0x8a8580 })));
  const logsG = mergeColored([
    { g: new THREE.CylinderGeometry(0.12, 0.12, 1.3, 5), m: mtx(0, 0.18, 0, 0, 0, Math.PI / 2), c: 0x6a4a30 },
    { g: new THREE.CylinderGeometry(0.12, 0.12, 1.3, 5), m: mtx(0, 0.3, 0, Math.PI / 2, 0, 0), c: 0x5a3e28 }
  ]);
  const vmat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffa630, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const flameMat2 = new THREE.MeshBasicMaterial({ color: 0xfff1a0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  this.fires = w.campfires.map(f => {
    const g = new THREE.Group();
    g.position.set(f.x, f.y, f.z);
    g.add(new THREE.Mesh(stonesG, vmat));
    g.add(new THREE.Mesh(logsG, vmat));
    const fl = new THREE.Group();
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.3, 6), flameMat); c1.position.y = 0.85;
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.8, 6), flameMat2); c2.position.y = 0.7;
    fl.add(c1); fl.add(c2);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.scale.set(5, 5, 1); glow.position.y = 1;
    fl.add(glow);
    g.add(fl);
    // tronco para sentarse
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.6, 6), lam(0x7a5a3a));
    seat.rotation.z = Math.PI / 2; seat.position.set(0, 0.22, 1.9);
    g.add(seat);
    S.add(g);
    return { g, fl, glow };
  });
  // Avión estrellado
  const wr = w.wreck, pg = new THREE.Group();
  const white = lam(0xe9edf1), red = lam(0xc4302b), dark = lam(0x3c4048);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.0, 9, 10), white); body.rotation.z = Math.PI / 2; body.position.y = 1.1;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2, 10), white); nose.rotation.z = -Math.PI / 2; nose.position.set(5.5, 1.1, 0);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 11), white); wing.position.set(0.5, 1.0, 0); wing.rotation.x = 0.12;
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 0.15), red); tail.position.set(-4.2, 2.4, 0);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.02, 1.2, 10), red); stripe.rotation.z = Math.PI / 2; stripe.position.set(-1.5, 1.1, 0);
  const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 2.3), dark); win.position.set(4.5, 1.7, 0);
  [body, nose, wing, tail, stripe, win].forEach(m => { m.castShadow = this.Q.shadow; pg.add(m); });
  pg.position.set(wr.x, wr.y - 0.4, wr.z); pg.rotation.set(0.05, wr.rot, 0.18);
  S.add(pg);
  // Objetos recogibles
  this.itemTex = {};
  for (const k in ITEMS) this.itemTex[k] = emojiTexture(ITEMS[k].icon);
  const caseG = mergeColored([
    { g: new THREE.BoxGeometry(0.9, 0.6, 0.32), m: mtx(0, 0.32, 0), c: 0x2c5f8a },
    { g: new THREE.BoxGeometry(0.94, 0.08, 0.36), m: mtx(0, 0.5, 0), c: 0x1c3a55 },
    { g: new THREE.TorusGeometry(0.12, 0.03, 4, 8, Math.PI), m: mtx(0, 0.64, 0), c: 0x222222 }
  ]);
  const caseG2 = mergeColored([
    { g: new THREE.BoxGeometry(0.9, 0.6, 0.32), m: mtx(0, 0.32, 0), c: 0xb0452f },
    { g: new THREE.BoxGeometry(0.94, 0.08, 0.36), m: mtx(0, 0.5, 0), c: 0x6e2a1c },
    { g: new THREE.TorusGeometry(0.12, 0.03, 4, 8, Math.PI), m: mtx(0, 0.64, 0), c: 0x222222 }
  ]);
  this.caseG = [caseG, caseG2];
  this.ringTex = glowTexture('rgba(255,255,220,0.55)', 'rgba(255,255,200,0)');
  this.vmat = vmat;
  this.coconutMat = lam(0x6b4a2a);
  this.pickupObjs = w.pickups.map((p, i) => this._makePickup(p, i));
  // Fumarolas
  const ventG = mergeColored([
    { g: new THREE.CylinderGeometry(0.5, 1.6, 0.9, 8), m: mtx(0, 0.3, 0), c: 0x3a3032 },
    { g: new THREE.CylinderGeometry(0.42, 0.42, 0.05, 8), m: mtx(0, 0.76, 0), c: 0xff6a1a }
  ]);
  this.ventTex = glowTexture('rgba(255,120,40,1)', 'rgba(255,60,0,0)');
  this.vents = w.vents.map(v => {
    const g = new THREE.Group(); g.position.set(v.x, v.y, v.z);
    g.add(new THREE.Mesh(ventG, vmat));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.ventTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.position.y = 1; glow.scale.set(3, 3, 1);
    g.add(glow);
    S.add(g);
    return { g, glow };
  });
  // Lago de lava del cráter
  const lavaMat = new THREE.ShaderMaterial({
    uniforms: { t: { value: 0 } }, fog: false,
    vertexShader: 'varying vec2 vP; void main(){ vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: [
      'uniform float t; varying vec2 vP;',
      'void main(){ vec2 p = vP * 0.18;',
      ' float n = sin(p.x * 2.1 + t * 0.7) * sin(p.y * 1.7 - t * 0.5) + sin((p.x + p.y) * 3.3 + t) * 0.5 + sin(length(p) * 4.0 - t * 1.3) * 0.35;',
      ' float k = smoothstep(-0.6, 1.2, n);',
      ' vec3 c = mix(vec3(0.55, 0.06, 0.02), vec3(1.0, 0.55, 0.08), k);',
      ' c = mix(c, vec3(1.0, 0.9, 0.5), smoothstep(0.85, 1.0, k));',
      ' gl_FragColor = vec4(c, 1.0); }'
    ].join('\n')
  });
  const lg = new THREE.CircleGeometry(CFG.CRATER_R + 4, 40);
  lg.rotateX(-Math.PI / 2);
  this.lava = new THREE.Mesh(lg, lavaMat);
  this.lava.position.y = CFG.LAVA_H;
  S.add(this.lava);
  const lavaGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.ventTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5, fog: false }));
  lavaGlow.position.set(0, CFG.LAVA_H + 14, 0); lavaGlow.scale.set(90, 40, 1);
  S.add(lavaGlow);
  // Bandera de la cumbre
  const sm = w.summit, fg = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 4, 5), lam(0xdddddd)); pole.position.y = 2;
  const flagG = new THREE.PlaneGeometry(1.6, 1, 4, 1); flagG.translate(0.8, 0, 0);
  this.flag = new THREE.Mesh(flagG, new THREE.MeshLambertMaterial({ color: 0xe8392b, side: THREE.DoubleSide }));
  this.flag.position.y = 3.4;
  const cairn = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8, 0), lam(0x5a4a44)); cairn.scale.y = 0.6;
  fg.add(pole); fg.add(this.flag); fg.add(cairn);
  fg.position.set(sm.x, sm.y, sm.z);
  S.add(fg);
  // Clavos colocados por el jugador
  this.pitonG = mergeColored([
    { g: new THREE.CylinderGeometry(0.03, 0.03, 0.35, 5), m: mtx(0, 0, 0.1, Math.PI / 2, 0, 0), c: 0xb8c0c8 },
    { g: new THREE.TorusGeometry(0.09, 0.025, 4, 8), m: mtx(0, -0.08, 0.27), c: 0xe0b030 }
  ]);
  this.pitonMeshes = [];
};

Gfx.prototype._makePickup = function (p, i) {
  let o;
  if (p.kind === 'case') {
    o = new THREE.Mesh(this.caseG[i % 2], this.vmat);
    o.rotation.set(0, i * 1.7, 0.3 * ((i % 3) - 1));
  } else if (p.item === 'coconut') {
    o = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), this.coconutMat);
    o.position.y = 0.2;
  } else {
    o = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.itemTex[p.item], depthWrite: false, transparent: true }));
    o.scale.set(0.8, 0.8, 1);
  }
  const g = new THREE.Group();
  g.position.set(p.x, p.y, p.z);
  g.add(o);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.ringTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  halo.scale.set(1.6, 1.6, 1); halo.position.y = 0.5;
  g.add(halo);
  this.scene.add(g);
  return { g, o, halo, sprite: o.isSprite };
};

// Vuelve a crear el objeto i (maleta abierta) o agrega uno nuevo (objeto soltado).
Gfx.prototype.refreshPickup = function (i) {
  const p = this.world.pickups[i], old = this.pickupObjs[i];
  if (old) {
    this.scene.remove(old.g);
    old.g.traverse(c => { if (c.isSprite) c.material.dispose(); });
  }
  this.pickupObjs[i] = this._makePickup(p, i);
};

Gfx.prototype.addPiton = function (pt) {
  const m = new THREE.Mesh(this.pitonG, new THREE.MeshLambertMaterial({ vertexColors: true }));
  m.position.set(pt.x, pt.y, pt.z);
  m.lookAt(pt.x + pt.nx, pt.y + pt.ny, pt.z + pt.nz);
  this.scene.add(m);
  this.pitonMeshes.push(m);
};

// ---------- personaje ----------
Gfx.prototype._buildCharacter = function () {
  const lam = c => new THREE.MeshLambertMaterial({ color: c, flatShading: true });
  const jacket = lam(0xf07b1f), pants = lam(0x2f3e5c), skin = lam(0xe8b48c), pack = lam(0x9c2f2f), boots = lam(0x3a2a20), hat = lam(0x2a8fd6), glove = lam(0x333333);
  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body);
  body.position.y = 0.95;
  const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = this.Q.shadow; return o; };
  const torso = box(0.52, 0.62, 0.32, jacket, 0, 0.33, 0);
  body.add(torso);
  const bp = box(0.44, 0.58, 0.26, pack, 0, 0.36, -0.28); body.add(bp);
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.5, 6), lam(0x4a7a3a)); roll.rotation.z = Math.PI / 2; roll.position.set(0, 0.72, -0.28); body.add(roll);
  const head = new THREE.Group(); head.position.y = 0.86; body.add(head);
  const hd = new THREE.Mesh(new THREE.IcosahedronGeometry(0.21, 1), skin); hd.castShadow = this.Q.shadow; head.add(hd);
  const beanie = new THREE.Mesh(new THREE.SphereGeometry(0.225, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), hat); beanie.position.y = 0.03; head.add(beanie);
  const pom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 0), lam(0xffffff)); pom.position.y = 0.27; head.add(pom);
  const goggles = box(0.3, 0.07, 0.06, lam(0x222831), 0, 0.03, 0.19); head.add(goggles);
  const limb = (x, y, len, w, m, gm) => {
    const piv = new THREE.Group(); piv.position.set(x, y, 0);
    const seg = box(w, len, w, m, 0, -len / 2, 0); piv.add(seg);
    const end = new THREE.Mesh(gm === boots ? new THREE.BoxGeometry(w + 0.04, 0.14, w + 0.16) : new THREE.IcosahedronGeometry(w * 0.62, 0), gm);
    end.position.set(0, -len, gm === boots ? 0.05 : 0); end.castShadow = this.Q.shadow; piv.add(end);
    body.add(piv);
    return piv;
  };
  this.ch = {
    root, body, head,
    armL: limb(0.34, 0.6, 0.55, 0.14, jacket, glove), armR: limb(-0.34, 0.6, 0.55, 0.14, jacket, glove),
    legL: limb(0.13, 0.02, 0.84, 0.18, pants, boots), legR: limb(-0.13, 0.02, 0.84, 0.18, pants, boots)
  };
  this.scene.add(root);
  // Sombra circular bajo el jugador (ayuda a calcular saltos)
  const sc = document.createElement('canvas'); sc.width = sc.height = 64;
  const sx = sc.getContext('2d'), gr = sx.createRadialGradient(32, 32, 4, 32, 32, 30);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  sx.fillStyle = gr; sx.fillRect(0, 0, 64, 64);
  const sg = new THREE.PlaneGeometry(1, 1); sg.rotateX(-Math.PI / 2);
  this.blob = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  this.scene.add(this.blob);
};

Gfx.prototype.updateCharacter = function (pl, pos, dt) {
  const c = this.ch, t = this.time, st = pl.state;
  c.root.position.set(pos.x, pos.y, pos.z);
  c.root.rotation.set(0, pl.yaw, 0);
  c.body.rotation.set(0, 0, 0);
  c.body.position.set(0, 0.95, 0);
  let aL = 0, aR = 0, lL = 0, lR = 0, aLz = 0.12, aRz = -0.12;
  const hs = Math.hypot(pl.vel.x, pl.vel.z);
  if (st === 'climb') {
    const s = Math.sin(pl.climbAnim);
    aL = -2.7 + s * 0.45; aR = -2.7 - s * 0.45;
    lL = -0.5 - Math.max(0, s) * 0.7; lR = -0.5 - Math.max(0, -s) * 0.7;
    aLz = 0.35; aRz = -0.35;
    c.body.rotation.x = 0.12;
    c.body.position.z = 0.08;
  } else if (st === 'mantle') {
    aL = aR = -1.9; lL = -1.2; lR = -0.4; c.body.rotation.x = 0.5;
  } else if (st === 'down') {
    c.body.rotation.x = -Math.PI / 2; c.body.position.y = 0.25; aL = aR = -0.3;
  } else if (pl.swim) {
    const s = Math.sin(t * 6);
    c.body.rotation.x = 1.1; c.body.position.y = 0.6; aL = -2.4 + s; aR = -2.4 - s; lL = s * 0.4; lR = -s * 0.4;
  } else if (!pl.grounded) {
    const flail = pl.vel.y < -8 ? Math.sin(t * 18) * 0.5 : 0;
    aL = -2.2 + flail; aR = -2.2 - flail; aLz = 0.5; aRz = -0.5; lL = -0.6; lR = 0.25;
  } else if (hs > 0.3) {
    const ph = pl.animDist * (pl.sprinting ? 2.2 : 2.6), k = Math.min(1, hs / CFG.walkSpeed) * (pl.sprinting ? 1.1 : 0.75);
    const s = Math.sin(ph);
    lL = s * k; lR = -s * k; aL = -s * k * 0.8; aR = s * k * 0.8;
    c.body.position.y = 0.95 + Math.abs(Math.cos(ph)) * 0.06 * k;
    c.body.rotation.x = pl.sprinting ? 0.22 : 0.06;
  } else {
    const b = Math.sin(t * 2) * 0.03;
    aL = b; aR = -b; c.body.position.y = 0.95 + b * 0.3;
    if (pl.stamina < 0.15) { c.body.rotation.x = 0.35; aL = aR = 0.3; } // jadeando
  }
  const k = 1 - Math.exp(-18 * dt);
  c.armL.rotation.x += (aL - c.armL.rotation.x) * k; c.armR.rotation.x += (aR - c.armR.rotation.x) * k;
  c.armL.rotation.z += (aLz - c.armL.rotation.z) * k; c.armR.rotation.z += (aRz - c.armR.rotation.z) * k;
  c.legL.rotation.x += (lL - c.legL.rotation.x) * k; c.legR.rotation.x += (lR - c.legR.rotation.x) * k;
  // sombra
  const gh = this.world.heightAt(pos.x, pos.z), dh = pos.y - gh;
  const show = st !== 'climb' && dh > -0.5 && dh < 30;
  this.blob.visible = show;
  if (show) {
    const s = U.clamp(1.1 - dh * 0.03, 0.35, 1.1);
    this.blob.position.set(pos.x, gh + 0.06, pos.z);
    this.blob.scale.set(s, 1, s);
    this.blob.material.opacity = U.clamp(1 - dh * 0.05, 0.2, 1);
  }
};

// ---------- partículas ----------
Gfx.prototype._buildParticles = function () {
  const N = Math.floor(900 * this.Q.particles);
  this.pN = N;
  const g = new THREE.BufferGeometry();
  this.pPos = new Float32Array(N * 3); this.pCol = new Float32Array(N * 4); this.pSize = new Float32Array(N);
  this.pVel = new Float32Array(N * 3); this.pLife = new Float32Array(N); this.pMax = new Float32Array(N); this.pGrav = new Float32Array(N);
  this.pBase = new Float32Array(N);
  g.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('pcolor', new THREE.BufferAttribute(this.pCol, 4).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('psize', new THREE.BufferAttribute(this.pSize, 1).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { scale: { value: 300 } },
    vertexShader: 'attribute vec4 pcolor; attribute float psize; uniform float scale; varying vec4 vC; void main(){ vC = pcolor; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = psize * scale / -mv.z; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying vec4 vC; void main(){ vec2 d = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.15, length(d)); if (a < 0.01) discard; gl_FragColor = vec4(vC.rgb, vC.a * a); }'
  });
  this.pMat = mat;
  this.points = new THREE.Points(g, mat);
  this.points.frustumCulled = false;
  this.scene.add(this.points);
  this.pNext = 0;
  // Nieve alrededor de la cámara
  const SN = Math.floor(1400 * this.Q.particles);
  this.snowN = SN;
  const sg = new THREE.BufferGeometry();
  this.snowPos = new Float32Array(SN * 3);
  for (let i = 0; i < SN; i++) { this.snowPos[i * 3] = Math.random() * 60 - 30; this.snowPos[i * 3 + 1] = Math.random() * 40 - 15; this.snowPos[i * 3 + 2] = Math.random() * 60 - 30; }
  sg.setAttribute('position', new THREE.BufferAttribute(this.snowPos, 3).setUsage(THREE.DynamicDrawUsage));
  this.snow = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.12, transparent: true, opacity: 0.85, depthWrite: false }));
  this.snow.frustumCulled = false;
  this.snow.visible = false;
  this.scene.add(this.snow);
};

// tipo: color, tamaño, vida, gravedad
Gfx.prototype.burst = function (x, y, z, n, opt) {
  n = Math.ceil(n * this.Q.particles);
  const col = this._c.set(opt.color || 0xffffff);
  for (let k = 0; k < n; k++) {
    const i = this.pNext; this.pNext = (this.pNext + 1) % this.pN;
    const sp = opt.speed || 2, up = opt.up || 0;
    this.pPos[i * 3] = x + (Math.random() - 0.5) * (opt.spread || 0.3);
    this.pPos[i * 3 + 1] = y + Math.random() * (opt.spreadY || 0.1);
    this.pPos[i * 3 + 2] = z + (Math.random() - 0.5) * (opt.spread || 0.3);
    this.pVel[i * 3] = (Math.random() - 0.5) * sp;
    this.pVel[i * 3 + 1] = up + Math.random() * sp * 0.6;
    this.pVel[i * 3 + 2] = (Math.random() - 0.5) * sp;
    this.pLife[i] = this.pMax[i] = (opt.life || 0.8) * (0.7 + Math.random() * 0.6);
    this.pGrav[i] = opt.grav === undefined ? 4 : opt.grav;
    this.pBase[i] = (opt.size || 0.25) * (0.7 + Math.random() * 0.6);
    this.pCol[i * 4] = col.r; this.pCol[i * 4 + 1] = col.g; this.pCol[i * 4 + 2] = col.b; this.pCol[i * 4 + 3] = opt.alpha || 0.8;
  }
};

Gfx.prototype._updateParticles = function (dt) {
  const N = this.pN, P = this.pPos, V = this.pVel, L = this.pLife;
  for (let i = 0; i < N; i++) {
    if (L[i] <= 0) { this.pSize[i] = 0; continue; }
    L[i] -= dt;
    V[i * 3 + 1] -= this.pGrav[i] * dt;
    P[i * 3] += V[i * 3] * dt; P[i * 3 + 1] += V[i * 3 + 1] * dt; P[i * 3 + 2] += V[i * 3 + 2] * dt;
    const f = Math.max(0, L[i] / this.pMax[i]);
    this.pSize[i] = this.pBase[i] * (0.4 + 0.6 * f);
    this.pCol[i * 4 + 3] = Math.min(this.pCol[i * 4 + 3], f * 1.2);
  }
  const g = this.points.geometry;
  g.attributes.position.needsUpdate = true; g.attributes.pcolor.needsUpdate = true; g.attributes.psize.needsUpdate = true;
  this.pMat.uniforms.scale.value = this.r.domElement.height * 0.9;
};

Gfx.prototype.updateSnow = function (dt, camPos, amount, wind) {
  this.snow.visible = amount > 0.02;
  if (!this.snow.visible) return;
  const P = this.snowPos, n = Math.floor(this.snowN * U.clamp(amount, 0, 1));
  const fall = 2.5 + amount * 2;
  for (let i = 0; i < n; i++) {
    let x = P[i * 3] + wind.x * dt * 1.5, y = P[i * 3 + 1] - fall * dt, z = P[i * 3 + 2] + wind.z * dt * 1.5;
    if (y < -15) y += 40; if (x < -30) x += 60; if (x > 30) x -= 60; if (z < -30) z += 60; if (z > 30) z -= 60;
    P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z;
  }
  this.snow.geometry.setDrawRange(0, n);
  this.snow.geometry.attributes.position.needsUpdate = true;
  this.snow.position.copy(camPos);
  this.snow.material.size = 0.1 + amount * 0.08;
};

// ---------- cuadro ----------
Gfx.prototype.render = function (dt, st) {
  this.time += dt;
  const t = this.time, w = this.world;
  // fogatas
  for (let i = 0; i < this.fires.length; i++) {
    const f = this.fires[i], lit = w.campfires[i].lit;
    f.fl.visible = lit;
    if (lit) {
      const fl = 1 + Math.sin(t * 13 + i) * 0.08 + Math.sin(t * 23 + i * 2) * 0.06;
      f.fl.scale.set(fl, fl * (1 + Math.sin(t * 9) * 0.06), fl);
      f.glow.material.opacity = 0.65 + Math.sin(t * 11 + i) * 0.1;
    }
  }
  // objetos recogibles: girar, flotar y ocultar lejanos
  const cp = this.camera.position;
  for (let i = 0; i < this.pickupObjs.length; i++) {
    const o = this.pickupObjs[i], p = w.pickups[i];
    const far = Math.abs(p.x - cp.x) + Math.abs(p.z - cp.z) > 120;
    o.g.visible = !p.taken && !far;
    if (!o.g.visible) continue;
    if (o.sprite) o.o.position.y = 0.55 + Math.sin(t * 2.4 + i) * 0.1;
    o.halo.material.opacity = 0.35 + Math.sin(t * 3 + i) * 0.2;
  }
  // fumarolas
  for (let i = 0; i < this.vents.length; i++) {
    const v = w.vents[i], o = this.vents[i];
    const ph = v.t % v.period;
    const warn = ph > v.period - 1.6 && ph < v.period - 0.01;
    const erupt = v.active;
    o.glow.material.opacity = erupt ? 1 : warn ? 0.5 + Math.sin(t * 25) * 0.4 : 0.25;
    const s = erupt ? 6 : warn ? 4 : 2.5;
    o.glow.scale.set(s, s, 1);
  }
  this.lava.material.uniforms.t.value = t;
  this.flag.rotation.y = Math.sin(t * 2.2) * 0.35;
  this.flag.scale.y = 1 + Math.sin(t * 5) * 0.05;
  this.sea.position.y = -0.6 + Math.sin(t * 0.6) * 0.08;
  this._updateParticles(dt);
  // sombras siguiendo al jugador
  if (this.sunDir) {
    const p = this.ch.root.position;
    this.sun.position.set(p.x + this.sunDir.x * 60, p.y + this.sunDir.y * 60, p.z + this.sunDir.z * 60);
    this.sun.target.position.copy(p);
  }
  this.sky.position.copy(cp);
  this.r.render(this.scene, this.camera);
};
