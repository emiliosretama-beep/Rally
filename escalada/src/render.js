// Todo lo que se dibuja con Three.js. Lee el estado del juego; no lo cambia.
'use strict';

function Gfx(canvas, world, quality) {
  this.world = world;
  this.q = quality;
  const Q = { low: { dpr: 1, far: 380, trees: 0.55, shadow: false, shadowMap: 0, particles: 0.5, post: false },
              med: { dpr: 1.5, far: 520, trees: 0.85, shadow: true, shadowMap: 1024, particles: 0.8, post: true },
              high: { dpr: 2, far: 700, trees: 1, shadow: true, shadowMap: 2048, particles: 1, post: true } }[quality] || null;
  this.Q = Q;
  // con postproceso el suavizado lo hace el FXAA (el del lienzo no aplica a la textura de la escena)
  const r = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.dpr));
  if (Q.shadow) { r.shadowMap.enabled = true; r.shadowMap.type = quality === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap; }
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
  this._c2 = new THREE.Color();
  // uniformes compartidos por los materiales que se mecen con el viento
  this.uTime = { value: 0 };
  this.uWind = { value: 0.3 };
  this.detailTex = detailTexture(world.seed ^ 0xd37a);
  this.matTex = materialTexture(world.seed ^ 0x51c3);
  if (quality !== 'low') this.matTex.anisotropy = Math.min(4, this.r.capabilities.getMaxAnisotropy());
  this.farCull = [];  // mallas que se ocultan cuando quedan tras la niebla
  this._buildLights();
  this._buildSky();
  this.isSnow = !!world.snow;
  this._buildTerrain();
  if (this.isSnow) this._buildCloudSea(); else this._buildSea();
  this._buildClouds();
  this._buildTrees();
  this._buildRocks();
  if (!this.isSnow) { this._buildGrass(); this._buildGrassField(); this._buildMotes(); }
  this._buildProps();
  this._buildRoute();
  this._buildCamps();
  this._buildCharacter();
  this._buildParticles();
  this._buildBirds();
  if (this.isSnow) this._buildK2();
  // postproceso: en la nieve brilla menos (todo es blanco) y el color es más frío
  if (Q.post) this.post = new Post(this, this.isSnow ? { bloom: 0.3, thr: 0.93, rays: 0.3, sat: 1.06, warm: 0.3, vign: 0.22 }
                                                      : { bloom: 0.42, thr: 0.86, rays: 0.36, sat: 1.12, warm: 0.6, vign: 0.24 });
  this.resize();
}

// Si el aparato no alcanza (menos de ~42 cuadros por segundo durante 2.5 s), baja la
// resolución interna poco a poco; si aun así no alcanza, apaga el postproceso. Nunca sube.
Gfx.prototype._adaptPerf = function () {
  // los primeros segundos no cuentan (se compilan los shaders y hay tirones)
  const now = performance.now(), A = this._perf || (this._perf = { t0: now + 5000, n: 0, bad: 0, dpr: this.r.getPixelRatio() });
  if (now < A.t0) return;
  A.n++;
  if (now - A.t0 < 2500) return;
  const fps = A.n * 1000 / (now - A.t0);
  A.t0 = now; A.n = 0;
  if (fps >= 42 || document.hidden) { A.bad = 0; return; }
  if (++A.bad < 2) return;
  A.bad = 0;
  if (A.dpr > 1.01) {
    A.dpr = Math.max(1, A.dpr - 0.25);
    this.r.setPixelRatio(A.dpr);
    this.resize();
  } else if (this.post && fps < 36) {
    this.post.dispose(); this.post = null;
  }
};

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
  if (this.post) this.post.dispose();
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
    return { g, c: new THREE.Color(pt.c === undefined ? 0xffffff : pt.c) };
  });
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), col = new Float32Array(total * 3);
  let o = 0;
  for (const { g, c } of geoms) {
    g.computeVertexNormals();
    const P = g.attributes.position.array, Nn = g.attributes.normal.array, VC = g.attributes.color && g.attributes.color.array;
    pos.set(P, o * 3); nor.set(Nn, o * 3);
    const n = g.attributes.position.count;
    for (let i = 0; i < n; i++) {
      // pequeña variación por vértice para que no se vea plano
      const k = 0.92 + ((i * 7919) % 17) / 17 * 0.16;
      const vr = VC ? VC[i * 3] : 1, vg = VC ? VC[i * 3 + 1] : 1, vb = VC ? VC[i * 3 + 2] : 1;
      col[(o + i) * 3] = c.r * k * vr; col[(o + i) * 3 + 1] = c.g * k * vg; col[(o + i) * 3 + 2] = c.b * k * vb;
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
    s.mapSize.set(this.Q.shadowMap, this.Q.shadowMap);
    s.camera.left = -22; s.camera.right = 22; s.camera.top = 22; s.camera.bottom = -22;
    s.camera.near = 1; s.camera.far = 120;
    s.bias = -0.0008;
  }
};

const SKY_KEYS = [
  { t: 0.0,  top: 0x6fa8dc, hor: 0xf2d7b6, sun: 0xfff0d8, si: 0.95, hs: 0xcfe6ff, hg: 0x6b5a45, hi: 0.7 },
  { t: 0.45, top: 0x3a80d2, hor: 0xc4e2f5, sun: 0xffffff, si: 1.1,  hs: 0xd8ecff, hg: 0x6b6050, hi: 0.8 },
  { t: 0.8,  top: 0x4a6fb3, hor: 0xf6c890, sun: 0xffd6a0, si: 1.0,  hs: 0xe9d9c8, hg: 0x5e4a3a, hi: 0.7 },
  { t: 1.0,  top: 0x2d3f78, hor: 0xf08a5d, sun: 0xff9a62, si: 0.85, hs: 0xdcc0b4, hg: 0x5a4840, hi: 0.78 }
];

Gfx.prototype._buildSky = function () {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) },
                sunCol: { value: new THREE.Color() }, storm: { value: 0 }, uDetail: { value: this.detailTex }, uTime: { value: 0 } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: [
      'uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; uniform float storm; uniform sampler2D uDetail; uniform float uTime; varying vec3 vDir;',
      'float cloudD(vec2 p) { return texture2D(uDetail, p).r * 0.6 + texture2D(uDetail, p * 2.7 + 0.31).r * 0.3 + texture2D(uDetail, p * 6.1 + 0.77).r * 0.1; }',
      'void main(){ vec3 d = normalize(vDir); float h = max(d.y, 0.0);',
      // cielo: horizonte claro, cenit más profundo
      ' vec3 c = mix(hor, top, pow(h, 0.5));',
      ' c = mix(c, top * 0.82, smoothstep(0.55, 1.0, h) * 0.35);',
      ' if (d.y < 0.0) c = hor * (1.0 - min(-d.y * 1.5, 0.12));',
      ' float s = max(dot(d, sunDir), 0.0);',
      // sol: disco nítido (pasa del blanco para que el brillo lo encienda), corona y halo ancho
      ' float disc = smoothstep(0.99955, 0.9998, s);',
      ' vec3 sunL = sunCol * (disc * 2.2 + pow(s, 260.0) * 0.7 + pow(s, 24.0) * 0.18 + pow(s, 5.0) * 0.06);',
      // bruma del horizonte, más cálida del lado del sol
      ' float haze = exp(-h * 9.0);',
      ' c = mix(c, mix(hor, sunCol, pow(s, 3.0) * 0.3), haze * 0.5);',
      // nubes en dos alturas, con sombra propia y borde plateado hacia el sol
      ' vec2 cuv = d.xz / (d.y + 0.22) * 0.32 + vec2(uTime * 0.003, uTime * 0.001);',
      ' vec2 toSun = normalize(sunDir.xz + vec2(1e-4)) * 0.035;',
      ' float cd = cloudD(cuv), cl = smoothstep(0.47, 0.76, cd) * smoothstep(0.0, 0.16, d.y);',
      ' float shade = clamp(1.0 - (cloudD(cuv + toSun) - cd) * 3.2, 0.55, 1.15);',
      ' vec3 cc = mix(vec3(1.0), sunCol, 0.35) * shade;',
      ' cc = mix(cc, hor * 0.82, smoothstep(0.66, 0.9, cd) * 0.35);',
      ' cc += sunCol * pow(s, 6.0) * (1.0 - smoothstep(0.5, 0.75, cd)) * 0.55;',
      ' vec2 cuv2 = d.xz / (d.y + 0.35) * 0.14 + vec2(uTime * 0.0012, -uTime * 0.0007) + 0.5;',
      ' float cl2 = smoothstep(0.55, 0.85, cloudD(cuv2)) * smoothstep(0.02, 0.3, d.y) * 0.45;',
      ' c = mix(c, mix(vec3(1.0), sunCol, 0.5), cl2);',
      ' c += sunL * (1.0 - cl * 0.85) * (1.0 - storm);',
      ' c = mix(c, cc, cl * 0.85);',
      ' c = mix(c, hor, storm * 0.85);',
      ' gl_FragColor = vec4(c, 1.0); }'
    ].join('\n')
  });
  this.sky = new THREE.Mesh(new THREE.SphereGeometry(1800, 24, 12), mat);
  this.sky.renderOrder = -1;
  this.scene.add(this.sky);
};

// Cielo de altura: más azul arriba, el reflejo de la nieve abajo
const SKY_KEYS_SNOW = [
  { t: 0.0,  top: 0x3f78c8, hor: 0xdbe7f2, sun: 0xfff1de, si: 1.0,  hs: 0xd6e6fb, hg: 0x8f9db3, hi: 0.78 },
  { t: 0.45, top: 0x2563bd, hor: 0xcfe2f3, sun: 0xffffff, si: 1.12, hs: 0xdcebff, hg: 0x95a4ba, hi: 0.82 },
  { t: 0.8,  top: 0x3a5ea8, hor: 0xf0d6b8, sun: 0xffdcb0, si: 1.0,  hs: 0xe6dcd6, hg: 0x8a8ea8, hi: 0.74 },
  { t: 1.0,  top: 0x26366e, hor: 0xf3a676, sun: 0xffa36a, si: 0.85, hs: 0xd7b8b0, hg: 0x6c6c88, hi: 0.66 }
];

Gfx.prototype.setTimeOfDay = function (t, storm) {
  const KEYS = this.isSnow ? SKY_KEYS_SNOW : SKY_KEYS;
  let a = KEYS[0], b = KEYS[KEYS.length - 1];
  for (let i = 0; i < KEYS.length - 1; i++) if (t >= KEYS[i].t && t <= KEYS[i + 1].t) { a = KEYS[i]; b = KEYS[i + 1]; break; }
  const k = (t - a.t) / Math.max(0.0001, b.t - a.t);
  const u = this.sky.material.uniforms, tmp = this._c2;
  const mix = (x, y, out) => out.set(x).lerp(tmp.set(y), k);
  mix(a.top, b.top, u.top.value);
  mix(a.hor, b.hor, u.hor.value);
  mix(a.sun, b.sun, u.sunCol.value);
  u.top.value.lerp(tmp.set(0xc3ccd6), storm * 0.8);
  u.hor.value.lerp(tmp.set(0xc3ccd6), storm * 0.7);
  u.storm.value = storm;
  this.storm = storm;
  this.scene.fog.color.copy(u.hor.value);
  if (this.uRim) this.uRim.value.copy(u.hor.value).lerp(tmp.set(u.sunCol.value), 0.3).multiplyScalar(0.42 * (1 - storm * 0.5));
  this.sun.color.copy(u.sunCol.value);
  this.sun.intensity = U.lerp(a.si, b.si, k) * (1 - storm * 0.45);
  this.hemi.color.set(a.hs).lerp(tmp.set(b.hs), k);
  this.hemi.groundColor.set(a.hg).lerp(tmp.set(b.hg), k);
  this.hemi.intensity = U.lerp(a.hi, b.hi, k) + storm * 0.15;
  // el sol cruza de este a oeste, bajo al final de la tarde
  const ang = U.lerp(0.35, Math.PI - 0.25, t);
  this.sunDir = this.sunDir || new THREE.Vector3();
  // el sol pasa por el sur: ilumina la cara del volcán donde está la ruta
  this.sunDir.set(Math.cos(ang) * 0.75, Math.sin(ang) * 0.75 + 0.12, -0.55).normalize();
  u.sunDir.value.copy(this.sunDir);
  if (this.sea) {
    const su = this.sea.material.uniforms;
    su.uSky.value.copy(u.hor.value);
    su.uSunDir.value.copy(this.sunDir);
    su.uSunCol.value.copy(u.sunCol.value).multiplyScalar(1 - storm * 0.8);
    su.uDeep.value.set(0x1b6f9e).lerp(tmp.set(0x4c6274), storm * 0.6);
  }
  if (this.islandMat) this.islandMat.color.copy(u.hor.value).lerp(tmp.set(0x4a5a78), 0.3);
  if (this.rangeMat) { this.rangeMat.emissive.copy(u.hor.value).multiplyScalar(0.45 + storm * 0.3); this.rangeMat.color.setScalar(0.72 - storm * 0.3); }
  if (this.cloudSea) { const cu = this.cloudSea.material.uniforms; cu.uSun.value.copy(u.sunCol.value); cu.uHor.value.copy(u.hor.value); cu.uStorm.value = storm; }
};

// ---------- terreno ----------
const COL = {
  sand: new THREE.Color(0xe6d29c), wet: new THREE.Color(0xc8ad78), shoreGrass: new THREE.Color(0x93bf5b),
  jungle: new THREE.Color(0x4e9a3a), jungleDark: new THREE.Color(0x3b7c2e), rockWarm: new THREE.Color(0x8c7c68),
  rockGrey: new THREE.Color(0x80808a), alpineGrass: new THREE.Color(0x86a866), snow: new THREE.Color(0xf1f4f9), tundra: new THREE.Color(0x9a9886),
  ice: new THREE.Color(0xb9dcef), lavaGlow: new THREE.Color(0xc0502a),
  ash: new THREE.Color(0x4d4446), basalt: new THREE.Color(0x3a3335), lavaRock: new THREE.Color(0x6a3a2c), seabed: new THREE.Color(0xb7a57a)
};

Gfx.prototype._terrainColor = function (x, y, z, ny, out, vi) {
  const w = this.world, nz = w.noise;
  if (this.isSnow) return this._terrainColorSnow(x, y, z, ny, out, vi);
  // dentro de un barranco: lecho de piedra, más oscuro y mojado bajo el río y en los fosos
  if (vi !== undefined && w.gmap[vi]) {
    const g = w.gorges[w.gmap[vi] - 1], s = w.gS[vi], lat = Math.abs(w.gLat[vi]);
    this._floorColor(g.gi, x, y, z, out);
    const P = GORGE_PAL[g.gi], pit = w.pmap[vi];
    if (pit) return out.lerp(this._c2.set(P.wet), 0.7);
    for (const ws of g.water) if (s >= ws.s0 && s <= ws.s1 && lat < w.gorgeW(g, s) * 0.6) { out.lerp(this._c2.set(P.wet), g.frozen ? 0.1 : 0.55); break; }
    return out;
  }
  const v = nz.n2(x * 0.15, z * 0.15) * 0.06 + nz.fbm(x * 0.03, z * 0.03, 2) * 0.08;
  const y2 = y + nz.fbm(x * 0.02 + 3, z * 0.02, 2) * 10;
  let flat;
  if (y < -0.5) flat = COL.seabed;
  else if (y < 1.2) flat = COL.wet;
  else if (y2 < 9 && Math.hypot(x, z) > CFG.BASE_R - 30) flat = COL.sand;
  else if (y2 < CFG.BIOMES[0].top) { out.copy(COL.shoreGrass).lerp(COL.jungle, U.smooth(20, 42, y2)); flat = out.clone(); }
  else if (y2 < CFG.BIOMES[1].top) { out.copy(COL.jungle).lerp(COL.jungleDark, U.smooth(-0.2, 0.3, nz.fbm(x * 0.04, z * 0.04, 2))); flat = out.clone(); }
  else if (y2 < CFG.BIOMES[2].top) { out.copy(COL.alpineGrass).lerp(COL.tundra, U.smooth(CFG.BIOMES[1].top + 2, CFG.BIOMES[1].top + 18, y2)); flat = out.clone(); }
  else { out.copy(COL.ash).lerp(COL.basalt, U.smooth(-0.1, 0.4, nz.fbm(x * 0.05, z * 0.05, 2))); flat = out.clone(); }
  let rock;
  if (y2 < CFG.BIOMES[1].top) rock = COL.rockWarm;
  else if (y2 < CFG.BIOMES[2].top) rock = COL.rockGrey;
  else rock = y > CFG.PEAK_H - 6 || Math.hypot(x, z) < CFG.CRATER_R ? COL.lavaRock : COL.basalt;
  if (rock === COL.basalt && nz.fbm(x * 0.06 + 11, z * 0.06, 2) > 0.38) rock = COL.lavaGlow; // vetas rojizas
  const steep = U.smooth(0.8, 0.62, ny);
  out.copy(flat).lerp(rock, y < 1.2 ? 0 : steep);
  if (steep > 0.3 && w.isIce(x, y, z)) out.lerp(COL.ice, steep * 0.85);
  out.r *= 1 + v; out.g *= 1 + v; out.b *= 1 + v;
  return out;
};

// Detalle por píxel con la textura de materiales: el color de cada vértice dice qué es
// (pasto, roca, arena, nieve, lecho de piedra) y aquí se le pone su textura y relieve con la luz.
// En calidad baja va sin relieve y con menos lecturas de textura.
Gfx.prototype._terrainShader = function (mat) {
  const hq = this.q !== 'low';
  if (hq) mat.defines = Object.assign(mat.defines || {}, { TERRAIN_HQ: 1 });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uMat = { value: this.matTex };
    // en la montaña nevada la nieve ya viene en los colores (así se nota el camino pisado)
    sh.uniforms.uSnowLo = { value: this.isSnow ? 99999 : CFG.BIOMES[1].top + 10 };
    sh.uniforms.uSnowHi = { value: this.isSnow ? 99999 : CFG.BIOMES[2].top };
    sh.uniforms.uLowDark = { value: this.isSnow ? 0 : 1 };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', [
        '#include <common>',
        'varying vec3 vTW;',
        'uniform sampler2D uMat;',
        'uniform float uSnowLo;',
        'uniform float uSnowHi;',
        'uniform float uLowDark;',
        'vec4 triTex(vec3 p, vec3 bw, float sc) {',
        '  return texture2D(uMat, p.zy * sc) * bw.x + texture2D(uMat, p.xz * sc) * bw.y + texture2D(uMat, p.xy * sc + 0.5) * bw.z;',
        '}'
      ].join('\n'))
      .replace('#include <color_fragment>', [
        '#include <color_fragment>',
        'vec3 tdx = dFdx(vTW), tdy = dFdy(vTW);',
        'vec3 tn = normalize(cross(tdx, tdy));',
        'if (tn.y < 0.0) tn = -tn;',
        'vec3 bw = pow(abs(tn), vec3(4.0)); bw /= (bw.x + bw.y + bw.z + 1e-4);',
        'vec4 mA = triTex(vTW, bw, 0.11);',                 // cada 9 m: grietas, estratos
        '#ifdef TERRAIN_HQ',
        'vec4 mB = triTex(vTW, bw, 0.55);',                 // cada 1.8 m: grano, piedritas, briznas
        '#else',
        'vec4 mB = mA;',
        '#endif',
        'vec4 mC = texture2D(uMat, vTW.xz * 0.018 + 0.31);', // cada 55 m: manchas grandes
        'float steepF = 1.0 - smoothstep(0.6, 0.8, tn.y);',
        'vec3 base = diffuseColor.rgb;',
        'float lum = dot(base, vec3(0.3, 0.59, 0.11));',
        'float mxC = max(base.r, max(base.g, base.b)), mnC = min(base.r, min(base.g, base.b));',
        'float sat = (mxC - mnC) / (mxC + 1e-3);',
        'float snowK = smoothstep(0.7, 0.84, lum) * (1.0 - smoothstep(0.08, 0.17, sat));',
        'float grassK = smoothstep(0.015, 0.09, base.g - max(base.r, base.b)) * (1.0 - steepF);',
        'float sandK = smoothstep(0.05, 0.16, base.r - base.b) * smoothstep(0.55, 0.72, lum) * (1.0 - grassK) * (1.0 - snowK);',
        'float rockK = max(steepF, (1.0 - grassK) * (1.0 - sandK) * smoothstep(0.36, 0.12, sat)) * (1.0 - snowK * 0.75);',
        'float pebK = (1.0 - steepF) * (1.0 - grassK) * (1.0 - snowK) * (1.0 - sandK) * smoothstep(0.32, 0.1, sat) * smoothstep(0.72, 0.5, lum);',
        'vec3 col = base * (0.84 + mC.a * 0.26) * (1.0 - grassK * 0.06);',
        // pasto: matas más oscuras, manchas secas y briznas
        'col = mix(col, col * mix(vec3(0.82, 0.9, 0.76), vec3(1.07, 1.05, 0.84), mC.r), grassK * 0.55);',
        'col *= 1.0 + grassK * ((mB.b - 0.5) * 0.22 + (mB.r - 0.5) * 0.12);',
        // roca: grietas, estratos y grano
        'float crack = (1.0 - smoothstep(0.0, 0.075, mA.g)) * smoothstep(0.38, 0.68, mA.b);',
        'float band = smoothstep(-0.2, 0.9, sin(vTW.y * 1.7 + mC.r * 5.0 + mA.b * 2.0));',
        'col *= 1.0 + rockK * ((band - 0.5) * 0.18 + (mB.r - 0.5) * 0.22 + (mA.r - 0.5) * 0.12);',
        'col *= 1.0 - rockK * crack * 0.55 * (1.0 - snowK);',
        // lechos y ceniza: piedritas con su contorno
        'float peb = smoothstep(0.04, 0.16, mB.g);',
        'float pebMask = smoothstep(0.3, 0.75, mA.a);',
        'col *= 1.0 - pebK * (1.0 - peb) * 0.22 * pebMask;',
        'col *= 1.0 + pebK * ((mB.r - 0.5) * 0.22 + (mA.r - 0.5) * 0.12);',
        // arena: rizos del viento
        'float rip = sin(dot(vTW.xz, vec2(0.9, 0.45)) * 3.1 + mC.r * 6.0 + mB.r);',
        'col *= 1.0 + sandK * (rip * 0.05 + (mB.r - 0.5) * 0.12);',
        // nieve: ondas del viento, azul en lo hondo
        'float sast = sin(dot(vTW.xz, vec2(0.35, 0.8)) * 2.2 + mC.r * 9.0 + mA.r * 2.0);',
        'col = mix(col, col * vec3(0.92, 0.96, 1.05), snowK * (0.5 - 0.5 * sast) * 0.55);',
        'col *= 1.0 + snowK * (mB.r - 0.5) * 0.05;',
        'diffuseColor.rgb = col;',
        // nieve de las cumbres del volcán
        'float snowH = smoothstep(uSnowLo, uSnowLo + 14.0, vTW.y + (mC.r - 0.5) * 18.0) * (1.0 - smoothstep(uSnowHi, uSnowHi + 8.0, vTW.y)) * smoothstep(0.26, 0.38, lum);',
        'float snowF = smoothstep(0.74, 0.86, tn.y + (mB.r - 0.5) * 0.15);',
        'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.95, 0.99) * (0.94 + mB.r * 0.08), snowH * snowF);',
        'float snowAll = max(snowK, snowH * snowF);',
        // relieve (en metros) para la luz: la nieve no se agrieta, solo hace ondas
        'float tH = (mB.r * 0.5 + mA.r * 0.3) * (1.0 - snowAll * 0.7) + rockK * (band * 0.5 - crack * 1.1) * (1.0 - snowAll) + grassK * mB.b * 0.6 + pebK * peb * 0.7 * pebMask + sandK * rip * 0.3 + snowAll * sast * 0.5;',
        'float tBump = 0.05 * mix(0.6, 1.0, rockK);',
        'float tSpark = snowAll * smoothstep(0.86, 0.97, texture2D(uMat, vTW.xz * 1.9 + cameraPosition.xz * 0.21).r) * (1.0 - smoothstep(0.03, 0.09, length(tdx) + length(tdy))) * tn.y;',
        // lo bajo (orilla del mar) un poco más oscuro
        'diffuseColor.rgb *= mix(mix(1.0, 0.72, uLowDark), 1.0, smoothstep(-0.5, 0.9, vTW.y));'
      ].join('\n'))
      .replace('#include <normal_fragment_maps>', [
        '#include <normal_fragment_maps>',
        // un poco de facetas en la roca (estilo low poly) y relieve de la textura
        'normal = normalize(mix(normal, normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition))), 0.2 + 0.4 * steepF));',
        '#ifdef TERRAIN_HQ',
        '{',
        '  vec3 nW = inverseTransformDirection(normal, viewMatrix);',
        '  vec3 r1 = cross(tdy, nW), r2 = cross(nW, tdx);',
        '  float det = dot(tdx, r1);',
        '  vec3 grad = sign(det) * (dFdx(tH) * r1 + dFdy(tH) * r2) * tBump;',
        '  nW = normalize(abs(det) * nW - grad);',
        '  normal = normalize((viewMatrix * vec4(nW, 0.0)).xyz);',
        '}',
        '#endif'
      ].join('\n'))
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(0.6, 0.65, 0.75) * tSpark;');
  };
  mat.customProgramCacheKey = () => 'terrain2' + (this.isSnow ? '-snow' : '') + (hq ? '-hq' : '');
};

Gfx.prototype._buildTerrain = function () {
  const w = this.world, N = w.N, C = w.C, H = w.h, W = N + 1, CH = 64;
  // sombreado suave (las facetas y el relieve los pone el shader)
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  this._terrainShader(mat);
  this.terrainMat = mat;
  const nv = { x: 0, y: 1, z: 0 }, col = new THREE.Color();
  // Colores por vértice compartidos, con sombreado de grietas: lo que queda más
  // bajo que sus vecinos (pie de las paredes, hondonadas) se oscurece un poco
  const colors = new Float32Array(W * W * 3);
  // el terreno escondido detrás de las paredes (la zanja bajo la tapa) se pinta como la orilla
  // y sin oscurecer: si asoma entre la tapa y el terreno no parece un hoyo negro
  const behindWall = k => {
    const gm = w.gmap[k];
    if (!gm || w.pmap[k]) return null;
    const g = w.gorges[gm - 1], s = w.gS[k], q = g.samples[U.clamp(Math.round(s), 0, g.samples.length - 1)], lat = w.gLat[k];
    const walled = lat >= 0 ? q.wL !== false : q.wR !== false;
    return walled && q.Wb !== undefined && Math.abs(lat) > q.Wb + 0.3 ? w.gorgeRim(g, s) : null;
  };
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const x = i * C - w.half, z = j * C - w.half, k = j * W + i;
    const rimY = behindWall(k);
    if (rimY !== null) {
      this._terrainColor(x, rimY, z, 0.97, col);
      colors[k * 3] = col.r; colors[k * 3 + 1] = col.g; colors[k * 3 + 2] = col.b;
      continue;
    }
    w.normalAt(x, z, nv, 1.0);
    this._terrainColor(x, H[k], z, nv.y, col, k);
    let sum = 0, cnt = 0;
    for (let dj = -2; dj <= 2; dj++) for (let di = -2; di <= 2; di++) {
      const ii = i + di, jj = j + dj;
      if (ii < 0 || jj < 0 || ii > N || jj > N) continue;
      sum += H[jj * W + ii]; cnt++;
    }
    const diff = sum / cnt - H[k];
    const ao = diff > 0 ? U.clamp(1 - diff * 0.045, 0.55, 1) : U.clamp(1 - diff * 0.012, 1, 1.08);
    colors[k * 3] = col.r * ao; colors[k * 3 + 1] = col.g * ao; colors[k * 3 + 2] = col.b * ao;
  }
  this.tColors = colors;
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
      // la misma diagonal que usa la física (World.diag)
      if (w.diag && w.diag[(cj * CH + j) * N + ci * CH + i]) {
        idx[t++] = a; idx[t++] = d; idx[t++] = b;
        idx[t++] = b; idx[t++] = d; idx[t++] = c;
      } else {
        idx[t++] = a; idx[t++] = c; idx[t++] = b;
        idx[t++] = a; idx[t++] = d; idx[t++] = c;
      }
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
    // el recorte por distancia usa el centro de la esfera envolvente del trozo
    m.position.set(0, 0, 0);
    m.userData.r = g.boundingSphere.radius;
    m.userData.far = 1e9;
    m.userData.c = g.boundingSphere.center;
    this.scene.add(m);
    this.chunks.push(m);
  }
};

// ---------- vegetación ----------
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
  if (this.isSnow) this.fires = this._buildLanterns(); else this.fires = w.campfires.map(f => {
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
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(7, 7).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: this.glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.45 }));
    pool.position.y = 0.06;
    fl.add(pool);
    g.add(fl);
    // tronco para sentarse
    const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.6, 6), lam(0x7a5a3a));
    seat.rotation.z = Math.PI / 2; seat.position.set(0, 0.22, 1.9);
    g.add(seat);
    S.add(g);
    return { g, fl, glow };
  });
  // Avión estrellado
  const wr = w.wreck || { x: 0, y: -999, z: 0, rot: 0 }, pg = new THREE.Group();
  const white = lam(0xe9edf1), red = lam(0xc4302b), dark = lam(0x3c4048);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.0, 9, 10), white); body.rotation.z = Math.PI / 2; body.position.y = 1.1;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2, 10), white); nose.rotation.z = -Math.PI / 2; nose.position.set(5.5, 1.1, 0);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.18, 11), white); wing.position.set(0.5, 1.0, 0); wing.rotation.x = 0.12;
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 0.15), red); tail.position.set(-4.2, 2.4, 0);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.02, 1.2, 10), red); stripe.rotation.z = Math.PI / 2; stripe.position.set(-1.5, 1.1, 0);
  const win = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 2.3), dark); win.position.set(4.5, 1.7, 0);
  [body, nose, wing, tail, stripe, win].forEach(m => { m.castShadow = this.Q.shadow; pg.add(m); });
  pg.position.set(wr.x, wr.y - 0.4, wr.z); pg.rotation.set(0.05, wr.rot, 0.18);
  if (w.wreck) S.add(pg);
  this.ventTex = glowTexture('rgba(255,120,40,1)', 'rgba(255,60,0,0)');
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
  if (w.crater) {
    this.lava.position.set(w.crater.x, CFG.LAVA_H, w.crater.z);
    S.add(this.lava);
    const lavaGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.ventTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5, fog: false }));
    lavaGlow.position.set(w.crater.x, CFG.LAVA_H + 14, w.crater.z); lavaGlow.scale.set(90, 40, 1);
    S.add(lavaGlow);
  }
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
};

// ---------- personaje ----------
// Cada pieza que se mueve es una sola malla (piezas fijas unidas) para pocas llamadas de dibujo.
// Luz de contorno: el borde de la silueta toma el color del cielo (resalta contra el fondo)
Gfx.prototype._rimify = function (mat) {
  if (!this.uRim) this.uRim = { value: new THREE.Color(0.3, 0.32, 0.36) };
  mat.onBeforeCompile = sh => {
    sh.uniforms.uRim = this.uRim;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRim;')
      .replace('#include <emissivemap_fragment>', [
        '#include <emissivemap_fragment>',
        'float rimF = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);',
        'totalEmissiveRadiance += uRim * pow(rimF, 2.6);'
      ].join('\n'));
  };
  mat.customProgramCacheKey = () => 'rim' + (mat.vertexColors ? 'v' : '') + (mat.flatShading ? 'f' : '');
  return mat;
};

Gfx.prototype._buildCharacter = function () {
  // el escalador (modelo y animación) está en climber.js
  this._buildClimber();
  // Sombra circular bajo el jugador (ayuda a calcular saltos)
  const sc = document.createElement('canvas'); sc.width = sc.height = 64;
  const sx = sc.getContext('2d'), gr = sx.createRadialGradient(32, 32, 4, 32, 32, 30);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  sx.fillStyle = gr; sx.fillRect(0, 0, 64, 64);
  const sg = new THREE.PlaneGeometry(1, 1); sg.rotateX(-Math.PI / 2);
  this.blob = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  this.scene.add(this.blob);
  // cuerda del garfio
  this.rope = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1, 4).translate(0, 0.5, 0).rotateX(Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xe8c23a }));
  this.rope.visible = false;
  this.scene.add(this.rope);
  // fantasma de tu mejor subida
  const gm = new THREE.MeshBasicMaterial({ color: 0x9fdcff, transparent: true, opacity: 0.38, depthWrite: false });
  this.ghost = new THREE.Group();
  const gb = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.7, 3, 8), gm); gb.position.y = 0.95;
  const gh = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), gm); gh.position.y = 1.75;
  this.ghost.add(gb); this.ghost.add(gh);
  this.ghost.visible = false;
  this.scene.add(this.ghost);
};

Gfx.prototype.setGhost = function (p) {
  this.ghost.visible = !!p;
  if (p) { this.ghost.position.set(p.x, p.y, p.z); this.ghost.rotation.y = p.yaw; }
};

// updateCharacter y la IK de escalada están en climber.js

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

// Partículas que flotan alrededor de la cámara: nieve en los Alpes, ceniza en la caldera, polen en la selva
const MOTES = {
  snow: { fall: 2.5, storm: 2, color: 0xffffff, size: 0.1, op: 0.85, sway: 0.2 },
  ash: { fall: 0.9, storm: 0, color: 0x5a5555, size: 0.12, op: 0.8, sway: 0.4 },
  pollen: { fall: -0.12, storm: 0, color: 0xfff1a0, size: 0.07, op: 0.75, sway: 0.6 }
};
Gfx.prototype.updateSnow = function (dt, camPos, amount, wind, mode) {
  this.snow.visible = amount > 0.02;
  if (!this.snow.visible) return;
  const M = MOTES[mode] || MOTES.snow, P = this.snowPos, n = Math.floor(this.snowN * U.clamp(amount, 0, 1));
  const fall = M.fall + amount * M.storm, t = this.time;
  for (let i = 0; i < n; i++) {
    const sw = Math.sin(t * 0.8 + i) * M.sway;
    let x = P[i * 3] + (wind.x * 1.5 + sw) * dt, y = P[i * 3 + 1] - fall * dt, z = P[i * 3 + 2] + (wind.z * 1.5 + Math.cos(t * 0.7 + i) * M.sway) * dt;
    if (y < -15) y += 40; if (y > 25) y -= 40;
    if (x < -30) x += 60; if (x > 30) x -= 60; if (z < -30) z += 60; if (z > 30) z -= 60;
    P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z;
  }
  this.snow.geometry.setDrawRange(0, n);
  this.snow.geometry.attributes.position.needsUpdate = true;
  this.snow.position.copy(camPos);
  this.snow.material.color.set(M.color);
  this.snow.material.opacity = M.op;
  this.snow.material.size = M.size + (mode === 'snow' ? amount * 0.08 : 0);
};

// ---------- cuadro ----------
Gfx.prototype.render = function (dt, st) {
  this.time += dt;
  const t = this.time, w = this.world;
  this.uTime.value = t;
  if (this.sea) this.sea.material.uniforms.uTime.value = t;
  if (this.cloudSea) this.cloudSea.material.uniforms.uTime.value = t;
  this.sky.material.uniforms.uTime.value = t;
  this.clouds.rotation.y = t * 0.004;
  this._updateBirds(t);
  this._cullFar();
  const cp0 = this.camera.position, fogFar = this.scene.fog.far;
  for (const m of this.chunks) {
    const c = m.userData.c;
    m.visible = Math.hypot(c.x - cp0.x, c.y - cp0.y, c.z - cp0.z) - m.userData.r < fogFar;
  }
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
  const cp = this.camera.position;
  this.lava.material.uniforms.t.value = t;
  this.flag.rotation.y = Math.sin(t * 2.2) * 0.35;
  this.flag.scale.y = 1 + Math.sin(t * 5) * 0.05;
  if (this.sea) this.sea.position.y = -0.6 + Math.sin(t * 0.6) * 0.06;
  this._updateParticles(dt);
  // sombras siguiendo al jugador
  if (this.sunDir) {
    // las sombras siguen al escalador (o a la cámara del menú)
    const p = this.ch.root.visible ? this.ch.root.position : this.camera.position;
    this.sun.position.set(p.x + this.sunDir.x * 60, p.y + this.sunDir.y * 60, p.z + this.sunDir.z * 60);
    this.sun.target.position.copy(p);
  }
  this.sky.position.copy(cp);
  this._updateGrassField(cp, this.ch.root.visible ? this.ch.root.position : null);
  this._updateMotes(cp);
  if (st === 'play') this._adaptPerf();
  if (this.post) this.post.render(this.scene, this.camera, this.sunDir, this.storm || 0);
  else this.r.render(this.scene, this.camera);
};
