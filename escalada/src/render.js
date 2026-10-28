// Todo lo que se dibuja con Three.js. Lee el estado del juego; no lo cambia.
'use strict';

function Gfx(canvas, world, quality) {
  this.world = world;
  this.q = quality;
  const Q = { low: { dpr: 1, far: 380, trees: 0.55, shadow: false, shadowMap: 0, particles: 0.5 },
              med: { dpr: 1.5, far: 520, trees: 0.85, shadow: true, shadowMap: 1024, particles: 0.8 },
              high: { dpr: 2, far: 700, trees: 1, shadow: true, shadowMap: 2048, particles: 1 } }[quality] || null;
  this.Q = Q;
  const r = new THREE.WebGLRenderer({ canvas, antialias: quality === 'high', powerPreference: 'high-performance' });
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
  this.farCull = [];  // mallas que se ocultan cuando quedan tras la niebla
  this._buildLights();
  this._buildSky();
  this._buildTerrain();
  this._buildSea();
  this._buildClouds();
  this._buildTrees();
  this._buildRocks();
  this._buildGrass();
  this._buildProps();
  this._buildRoute();
  this._buildCamps();
  this._buildCharacter();
  this._buildParticles();
  this._buildBirds();
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
  { t: 1.0,  top: 0x2d3f78, hor: 0xf08a5d, sun: 0xff9a62, si: 0.8,  hs: 0xd7b4a8, hg: 0x4a3a36, hi: 0.6 }
];

Gfx.prototype._buildSky = function () {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(0, 1, 0) },
                sunCol: { value: new THREE.Color() }, storm: { value: 0 }, uDetail: { value: this.detailTex }, uTime: { value: 0 } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: [
      'uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; uniform float storm; uniform sampler2D uDetail; uniform float uTime; varying vec3 vDir;',
      'void main(){ vec3 d = normalize(vDir); float h = max(d.y, 0.0); vec3 c = mix(hor, top, pow(h, 0.55));',
      ' if (d.y < 0.0) c = hor;',
      ' float s = max(dot(d, sunDir), 0.0);',
      ' c += sunCol * (pow(s, 900.0) * 1.6 + pow(s, 12.0) * 0.25) * (1.0 - storm);',
      // nubes altas: ruido proyectado en una bóveda
      ' vec2 cuv = d.xz / (d.y + 0.22) * 0.32 + vec2(uTime * 0.003, uTime * 0.001);',
      ' float cl = texture2D(uDetail, cuv).r * 0.62 + texture2D(uDetail, cuv * 2.7 + 0.31).r * 0.38;',
      ' cl = smoothstep(0.5, 0.78, cl) * smoothstep(0.0, 0.16, d.y);',
      ' vec3 cc = mix(vec3(1.0), sunCol, 0.4) * (0.88 + 0.12 * pow(s, 4.0));',
      ' c = mix(c, cc, cl * 0.8);',
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
  const u = this.sky.material.uniforms, tmp = this._c2;
  const mix = (x, y, out) => out.set(x).lerp(tmp.set(y), k);
  mix(a.top, b.top, u.top.value);
  mix(a.hor, b.hor, u.hor.value);
  mix(a.sun, b.sun, u.sunCol.value);
  u.top.value.lerp(tmp.set(0xc3ccd6), storm * 0.8);
  u.hor.value.lerp(tmp.set(0xc3ccd6), storm * 0.7);
  u.storm.value = storm;
  this.scene.fog.color.copy(u.hor.value);
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

// Detalle por píxel: grano triplanar, vetas en la roca, nieve nítida en lo plano
// de los Alpes y arena mojada en la orilla.
Gfx.prototype._terrainShader = function (mat) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uDetail = { value: this.detailTex };
    sh.uniforms.uSnowLo = { value: CFG.BIOMES[1].top + 10 };
    sh.uniforms.uSnowHi = { value: CFG.BIOMES[2].top };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vTW;\nuniform sampler2D uDetail;\nuniform float uSnowLo;\nuniform float uSnowHi;')
      .replace('#include <color_fragment>', [
        '#include <color_fragment>',
        'vec3 tdx = dFdx(vTW), tdy = dFdy(vTW);',
        'vec3 tn = normalize(cross(tdx, tdy));',
        'if (tn.y < 0.0) tn = -tn;',
        'vec3 bw = pow(abs(tn), vec3(4.0)); bw /= (bw.x + bw.y + bw.z + 1e-4);',
        'float d1 = texture2D(uDetail, vTW.zy * 0.55).r * bw.x + texture2D(uDetail, vTW.xz * 0.55).r * bw.y + texture2D(uDetail, vTW.xy * 0.55).r * bw.z;',
        'float d2 = texture2D(uDetail, vTW.xz * 0.045 + 0.37).r;',
        'float steepF = 1.0 - smoothstep(0.6, 0.8, tn.y);',
        'float band = smoothstep(-0.2, 0.9, sin(vTW.y * 1.7 + d2 * 5.0));',
        'float strata = 1.0 + steepF * ((band - 0.5) * 0.12 + (d1 - 0.5) * 0.1);',
        'diffuseColor.rgb *= (0.91 + d1 * 0.18) * strata * (0.95 + d2 * 0.1);',
        'float snowH = smoothstep(uSnowLo, uSnowLo + 14.0, vTW.y + (d2 - 0.5) * 18.0) * (1.0 - smoothstep(uSnowHi, uSnowHi + 8.0, vTW.y));',
        'float snowF = smoothstep(0.74, 0.86, tn.y + (d1 - 0.5) * 0.15);',
        'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.93, 0.95, 0.99) * (0.94 + d1 * 0.08), snowH * snowF);',
        'diffuseColor.rgb *= mix(0.72, 1.0, smoothstep(-0.5, 0.9, vTW.y));'
      ].join('\n'));
  };
  mat.customProgramCacheKey = () => 'terrain';
};

Gfx.prototype._buildTerrain = function () {
  const w = this.world, N = w.N, C = w.C, H = w.h, W = N + 1, CH = 64;
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  this._terrainShader(mat);
  this.terrainMat = mat;
  const nv = { x: 0, y: 1, z: 0 }, col = new THREE.Color();
  // Colores por vértice compartidos, con sombreado de grietas: lo que queda más
  // bajo que sus vecinos (pie de las paredes, hondonadas) se oscurece un poco
  const colors = new Float32Array(W * W * 3);
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    const x = i * C - w.half, z = j * C - w.half, k = j * W + i;
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
  this.lava.position.set(w.crater.x, CFG.LAVA_H, w.crater.z);
  S.add(this.lava);
  const lavaGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.ventTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5, fog: false }));
  lavaGlow.position.set(w.crater.x, CFG.LAVA_H + 14, w.crater.z); lavaGlow.scale.set(90, 40, 1);
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
};

// ---------- personaje ----------
// Cada pieza que se mueve es una sola malla (piezas fijas unidas) para pocas llamadas de dibujo.
Gfx.prototype._buildCharacter = function () {
  const vmat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const JK = 0xf07b1f, JK2 = 0xc85f12, PANTS = 0x2f3e5c, SKIN = 0xf0bf98, PACK = 0x9c2f2f, BOOT = 0x3a2a20, HAT = 0x2a8fd6, GLOVE = 0x2b2b2b, ROPE = 0xe8c23a, SCARF = 0xd8343a;
  const mesh = parts => { const m = new THREE.Mesh(mergeColored(parts), vmat); m.castShadow = this.Q.shadow; return m; };
  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body);
  body.position.y = 0.95;
  // torso, arnés, mochila con cuerda y colchoneta, bufanda
  body.add(mesh([
    { g: new THREE.CapsuleGeometry(0.25, 0.3, 3, 8), m: mtx(0, 0.36, 0, 0, 0, 0, 1, 1, 0.74), c: JK },
    { g: new THREE.BoxGeometry(0.05, 0.5, 0.02), m: mtx(0, 0.38, 0.185), c: JK2 },
    { g: new THREE.TorusGeometry(0.24, 0.035, 4, 12), m: mtx(0, 0.08, 0, Math.PI / 2, 0, 0, 1, 0.76, 1), c: 0x30343c },
    { g: new THREE.TorusGeometry(0.035, 0.012, 3, 6), m: mtx(0.16, 0.02, 0.15), c: 0xd8c040 },
    { g: new THREE.TorusGeometry(0.035, 0.012, 3, 6), m: mtx(-0.12, 0.02, 0.16), c: 0x9fd0ff },
    { g: new THREE.BoxGeometry(0.46, 0.6, 0.26), m: mtx(0, 0.38, -0.3), c: PACK },
    { g: new THREE.BoxGeometry(0.48, 0.12, 0.3), m: mtx(0, 0.7, -0.3), c: 0x7a2222 },
    { g: new THREE.BoxGeometry(0.14, 0.3, 0.14), m: mtx(0.29, 0.3, -0.3), c: 0x7a2222 },
    { g: new THREE.BoxGeometry(0.14, 0.3, 0.14), m: mtx(-0.29, 0.3, -0.3), c: 0x7a2222 },
    { g: new THREE.TorusGeometry(0.15, 0.045, 4, 12), m: mtx(0, 0.38, -0.45), c: ROPE },
    { g: new THREE.CylinderGeometry(0.11, 0.11, 0.56, 7), m: mtx(0, 0.84, -0.3, 0, 0, Math.PI / 2), c: 0x4a7a3a },
    { g: new THREE.TorusGeometry(0.15, 0.06, 5, 10), m: mtx(0, 0.72, 0.01, Math.PI / 2, 0, 0), c: SCARF }
  ]));
  // cola de la bufanda, que ondea
  const scarf = new THREE.Group(); scarf.position.set(0.08, 0.72, -0.12);
  const tail = mesh([{ g: new THREE.BoxGeometry(0.11, 0.42, 0.04), m: mtx(0, -0.2, 0), c: SCARF }, { g: new THREE.BoxGeometry(0.115, 0.05, 0.045), m: mtx(0, -0.33, 0), c: 0xffffff }]);
  scarf.add(tail); body.add(scarf);
  // cabeza con gorro, pompón, lentes de nieve, ojos y nariz
  const head = new THREE.Group(); head.position.y = 0.93; body.add(head);
  head.add(mesh([
    { g: new THREE.SphereGeometry(0.235, 10, 8), m: mtx(0, 0, 0), c: SKIN },
    { g: new THREE.SphereGeometry(0.25, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), m: mtx(0, 0.035, 0), c: HAT },
    { g: new THREE.CylinderGeometry(0.255, 0.255, 0.08, 12), m: mtx(0, 0.05, 0), c: 0x1d6fae },
    { g: new THREE.IcosahedronGeometry(0.075, 0), m: mtx(0, 0.3, 0), c: 0xffffff },
    { g: new THREE.TorusGeometry(0.25, 0.022, 3, 14), m: mtx(0, 0.13, 0, Math.PI / 2 + 0.25, 0, 0), c: 0x222831 },
    { g: new THREE.BoxGeometry(0.28, 0.08, 0.05), m: mtx(0, 0.17, 0.2, -0.5, 0, 0), c: 0xffa53a },
    { g: new THREE.SphereGeometry(0.028, 5, 4), m: mtx(0.08, 0.0, 0.215), c: 0x1a1a1a },
    { g: new THREE.SphereGeometry(0.028, 5, 4), m: mtx(-0.08, 0.0, 0.215), c: 0x1a1a1a },
    { g: new THREE.SphereGeometry(0.035, 5, 4), m: mtx(0, -0.05, 0.235), c: 0xe0957a },
    { g: new THREE.SphereGeometry(0.035, 5, 4), m: mtx(0.13, -0.06, 0.18), c: 0xf29a8a },
    { g: new THREE.SphereGeometry(0.035, 5, 4), m: mtx(-0.13, -0.06, 0.18), c: 0xf29a8a }
  ]));
  const limb = (x, y, len, w, col, endCol, boot) => {
    const piv = new THREE.Group(); piv.position.set(x, y, 0);
    const parts = [{ g: new THREE.CapsuleGeometry(w / 2, len - w, 2, 6), m: mtx(0, -len / 2, 0), c: col }];
    if (boot) {
      parts.push({ g: new THREE.BoxGeometry(w + 0.06, 0.15, w + 0.18), m: mtx(0, -len - 0.02, 0.05), c: endCol });
      parts.push({ g: new THREE.BoxGeometry(w + 0.07, 0.04, w + 0.2), m: mtx(0, -len - 0.09, 0.05), c: 0x8a7a68 });
    } else {
      parts.push({ g: new THREE.IcosahedronGeometry(w * 0.68, 0), m: mtx(0, -len, 0), c: endCol });
      parts.push({ g: new THREE.CylinderGeometry(w * 0.62, w * 0.62, 0.06, 6), m: mtx(0, -len + 0.08, 0), c: JK2 });
    }
    piv.add(mesh(parts));
    body.add(piv);
    return piv;
  };
  this.ch = {
    root, body, head, scarf,
    armL: limb(0.33, 0.6, 0.56, 0.15, JK, GLOVE), armR: limb(-0.33, 0.6, 0.56, 0.15, JK, GLOVE),
    legL: limb(0.13, 0.02, 0.84, 0.19, PANTS, BOOT, true), legR: limb(-0.13, 0.02, 0.84, 0.19, PANTS, BOOT, true)
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

Gfx.prototype.updateCharacter = function (pl, pos, dt) {
  const c = this.ch, t = this.time, st = pl.state;
  c.root.position.set(pos.x, pos.y, pos.z);
  c.root.rotation.set(0, pl.yaw, 0);
  c.body.rotation.set(0, 0, 0);
  c.body.position.set(0, 0.95, 0);
  let aL = 0, aR = 0, lL = 0, lR = 0, aLz = 0.12, aRz = -0.12, lLz = 0, lRz = 0;
  const hs = Math.hypot(pl.vel.x, pl.vel.z);
  let ik = false;
  if (st === 'zip' || st === 'ride' || st === 'ascend') {
    const s = st === 'ascend' ? Math.sin(pl.climbAnim) * 0.3 : 0;
    aL = -2.9 + s; aR = -2.9 - s; lL = st === 'ride' ? -0.9 : -0.3; lR = st === 'ride' ? -0.6 : 0.2; aLz = 0.15; aRz = -0.15;
    c.body.rotation.x = st === 'ride' ? 0.1 : -0.15;
  } else if (st === 'climb') {
    const s = Math.sin(pl.climbAnim);
    aL = -2.7 + s * 0.45; aR = -2.7 - s * 0.45;
    lL = -0.5 - Math.max(0, s) * 0.7; lR = -0.5 - Math.max(0, -s) * 0.7;
    aLz = 0.35; aRz = -0.35;
    c.body.rotation.x = 0.12;
    c.body.position.z = 0.08;
    // al subir el cuerpo se pega a la roca y se separa a tirones
    c.body.position.y = 0.95 + Math.abs(s) * 0.04;
    if (pl.slip > 0) { c.body.rotation.z = (Math.random() - 0.5) * 0.05 * pl.slip; c.body.position.x = (Math.random() - 0.5) * 0.02 * pl.slip; }
    ik = !!pl.cs;
  } else if (st === 'mantle') {
    const m = pl.mantle, k = m ? Math.min(1, m.t) : 1;
    aL = aR = -2.6 + k * 1.6; lL = -1.4 + k; lR = -0.3; c.body.rotation.x = 0.55 - k * 0.4;
  } else if (pl.swim) {
    const s = Math.sin(t * 6);
    c.body.rotation.x = 1.1; c.body.position.y = 0.6; aL = -2.4 + s; aR = -2.4 - s; lL = s * 0.4; lR = -s * 0.4;
  } else if (!pl.grounded) {
    const flail = pl.vel.y < -8 ? Math.sin(t * 18) * 0.5 : 0;
    aL = -2.2 + flail; aR = -2.2 - flail; aLz = 0.5; aRz = -0.5; lL = -0.6; lR = 0.25;
    if (pl.taut) { aL = aR = -2.9; lL = -0.3; lR = -0.2; c.body.rotation.x = -0.1; }
  } else if (pl.onCable) {
    // en la cornisa, agarrado del cable que va por la pared
    const ph = pl.animDist * 2.6, k = Math.min(1, hs / CFG.walkSpeed) * 0.5, s = Math.sin(ph);
    lL = s * k; lR = -s * k; aL = -1.9 + s * 0.15; aR = -1.6 - s * 0.15; aLz = 0.6; aRz = 0.2;
    c.body.rotation.z = 0.08;
  } else if (hs > 0.3) {
    const ph = pl.animDist * (pl.sprinting ? 2.2 : 2.6), k = Math.min(1, hs / CFG.walkSpeed) * (pl.sprinting ? 1.1 : 0.75);
    const s = Math.sin(ph);
    lL = s * k; lR = -s * k; aL = -s * k * 0.8; aR = s * k * 0.8;
    c.body.position.y = 0.95 + Math.abs(Math.cos(ph)) * 0.06 * k;
    c.body.rotation.x = pl.sprinting ? 0.22 : 0.06;
    if (pl.wade) c.body.position.y -= 0.04;
  } else {
    const b = Math.sin(t * 2) * 0.03;
    aL = b; aR = -b; c.body.position.y = 0.95 + b * 0.3;
    if (pl.stamina < 0.15) { c.body.rotation.x = 0.35; aL = aR = 0.3; } // jadeando
  }
  const k = 1 - Math.exp(-18 * dt);
  // al escalar, manos y pies buscan presas de verdad en la roca
  if (ik && this._climbIK(pl, dt)) {
    const I = this._ik, kk = 1 - Math.exp(-30 * dt);
    const set = (limb, r) => { limb.rotation.x += (r.x - limb.rotation.x) * kk; limb.rotation.z += (r.z - limb.rotation.z) * kk; };
    set(c.armL, I.rot[0]); set(c.armR, I.rot[1]); set(c.legL, I.rot[2]); set(c.legR, I.rot[3]);
  } else {
    if (this._ik) this._ik.active = false;
    c.armL.rotation.x += (aL - c.armL.rotation.x) * k; c.armR.rotation.x += (aR - c.armR.rotation.x) * k;
    c.armL.rotation.z += (aLz - c.armL.rotation.z) * k; c.armR.rotation.z += (aRz - c.armR.rotation.z) * k;
    c.legL.rotation.x += (lL - c.legL.rotation.x) * k; c.legR.rotation.x += (lR - c.legR.rotation.x) * k;
    c.legL.rotation.z += (lLz - c.legL.rotation.z) * k; c.legR.rotation.z += (lRz - c.legR.rotation.z) * k;
  }
  // la bufanda ondea con la velocidad y el viento
  const fl = U.clamp(hs * 0.12 + Math.abs(pl.vel.y) * 0.05 + this.uWind.value * 0.4, 0, 1.2);
  c.scarf.rotation.x = -(0.15 + fl) + Math.sin(this.time * (7 + fl * 6)) * 0.12 * (0.3 + fl);
  c.scarf.rotation.z = Math.sin(this.time * 5.3) * 0.1 * fl;
  // cuerda del garfio: de la mano al punto de enganche
  if (st === 'zip' && pl.zip) {
    const h = pl.zip.ring, hx = pos.x, hy = pos.y + 1.9, hz = pos.z;
    const d = Math.hypot(h.x - hx, h.y - hy, h.z - hz);
    this.rope.visible = d > 0.3;
    this.rope.position.set(hx, hy, hz);
    this.rope.lookAt(h.x, h.y, h.z);
    this.rope.scale.set(1, 1, d);
  } else this.rope.visible = false;
  // sombra
  const gh = this.world.groundBelow(pos.x, pos.y + 0.2, pos.z), dh = pos.y - gh;
  const show = st !== 'climb' && st !== 'zip' && st !== 'ride' && st !== 'ascend' && dh > -0.5 && dh < 30;
  this.blob.visible = show;
  if (show) {
    const s = U.clamp(1.1 - dh * 0.03, 0.35, 1.1);
    this.blob.position.set(pos.x, gh + 0.06, pos.z);
    this.blob.scale.set(s, 1, s);
    this.blob.material.opacity = U.clamp(1 - dh * 0.05, 0.2, 1);
  }
};

// Manos y pies sobre presas reales: una mano se estira hacia una presa nueva mientras la otra sostiene.
// Devuelve false si no hay presas cerca (entonces se usa la pose de siempre).
Gfx.prototype._climbIK = function (pl, dt) {
  const list = this.holds.get(pl.cs.id);
  if (!list || !list.length) return false;
  const I = this._ik || (this._ik = { pts: [null, null, null, null], from: [null, null, null, null], k: -1, rot: [{ x: 0, z: 0 }, { x: 0, z: 0 }, { x: 0, z: 0 }, { x: 0, z: 0 }], active: false });
  const c = this.ch, cu = pl.cu, cy = pl.pos.y + 1, du = pl.dirU;
  const moving = Math.abs(pl.cu - (I.lastU === undefined ? pl.cu : I.lastU)) + Math.abs(cy - (I.lastY === undefined ? cy : I.lastY)) > 1e-4;
  const mu = pl.cu - (I.lastU === undefined ? pl.cu : I.lastU), my = cy - (I.lastY === undefined ? cy : I.lastY);
  I.lastU = pl.cu; I.lastY = cy;
  // presa más cercana al punto ideal (lado: -1 izquierda, +1 derecha en u)
  const pick = (side, y0, y1, ideal, exclude) => {
    let best = null, bd = 1e9;
    for (let i = 0; i < list.length; i++) {
      const h = list[i];
      if (h.y < y0 || h.y > y1 || h === exclude) continue;
      const du2 = h.u - (cu + side * du * 0.3), dy = h.y - ideal;
      if (Math.abs(du2) > 0.65) continue;
      const d = du2 * du2 + dy * dy * 0.6;
      if (d < bd) { bd = d; best = h; }
    }
    return best;
  };
  const sideOf = [-1, 1, -1, 1];
  const want = i => i < 2 ? pick(sideOf[i], cy + 0.15, cy + 1.05, cy + 0.6 + (my > 0 ? 0.25 : 0), I.pts[1 - i]) : pick(sideOf[i] * 0.6, cy - 1.35, cy - 0.55, cy - 0.95, I.pts[5 - i]);
  const kNow = Math.floor(pl.climbAnim / Math.PI);
  if (!I.active) { for (let i = 0; i < 4; i++) { I.pts[i] = want(i); I.from[i] = null; } I.k = kNow; I.active = true; }
  if (kNow !== I.k) {
    I.k = kNow;
    // se mueve una mano y el pie contrario
    const hand = kNow % 2, foot = 3 - hand;
    for (const i of [hand, foot]) { I.from[i] = I.pts[i] ? { x: I.pts[i].x, y: I.pts[i].y, z: I.pts[i].z } : null; I.pts[i] = want(i) || I.pts[i]; }
  }
  // si una presa quedó muy lejos (resbalón, viento), buscar otra
  for (let i = 0; i < 4; i++) {
    const h = I.pts[i];
    if (!h || Math.abs(h.u - cu) > 0.95 || Math.abs(h.y - (i < 2 ? cy + 0.6 : cy - 0.95)) > 0.85) { I.pts[i] = want(i); I.from[i] = null; }
  }
  void moving; void mu;
  c.root.updateMatrixWorld(true);
  const ph = pl.climbAnim / Math.PI - kNow; // 0..1 dentro del movimiento actual
  const v = this._v, sh = this._ikv || (this._ikv = new THREE.Vector3());
  const piv = [c.armL, c.armR, c.legL, c.legR];
  for (let i = 0; i < 4; i++) {
    const h = I.pts[i];
    if (!h) { I.rot[i].x = i < 2 ? -2.7 : -0.5; I.rot[i].z = i < 2 ? (i ? -0.35 : 0.35) : 0; continue; }
    const moverNow = (i === kNow % 2 || i === 3 - kNow % 2) && I.from[i] && ph < 1;
    let tx = h.x, ty = h.y, tz = h.z;
    if (moverNow) {
      // arco: la mano se separa de la roca a mitad del movimiento
      const e = U.smooth(0, 1, ph), f = I.from[i];
      tx = U.lerp(f.x, h.x, e) + pl.wallN.x * Math.sin(ph * Math.PI) * 0.15;
      ty = U.lerp(f.y, h.y, e) + Math.sin(ph * Math.PI) * 0.06;
      tz = U.lerp(f.z, h.z, e) + pl.wallN.z * Math.sin(ph * Math.PI) * 0.15;
    }
    v.set(tx, ty, tz);
    c.body.worldToLocal(v);
    sh.copy(piv[i].position);
    v.sub(sh);
    const l = v.length() || 1;
    v.multiplyScalar(1 / l);
    const rz = Math.asin(U.clamp(v.x, -1, 1)), cz = Math.cos(rz) || 1e-3;
    I.rot[i].z = rz;
    I.rot[i].x = Math.atan2(-v.z / cz, -v.y / cz);
  }
  return true;
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
  this.sea.material.uniforms.uTime.value = t;
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
  this.sea.position.y = -0.6 + Math.sin(t * 0.6) * 0.06;
  this._updateParticles(dt);
  // sombras siguiendo al jugador
  if (this.sunDir) {
    // las sombras siguen al escalador (o a la cámara del menú)
    const p = this.ch.root.visible ? this.ch.root.position : this.camera.position;
    this.sun.position.set(p.x + this.sunDir.x * 60, p.y + this.sunDir.y * 60, p.z + this.sunDir.z * 60);
    this.sun.target.position.copy(p);
  }
  this.sky.position.copy(cp);
  this.r.render(this.scene, this.camera);
};
