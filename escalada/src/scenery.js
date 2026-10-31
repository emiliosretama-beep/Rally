// Paisaje: agua, nubes, islas lejanas, vegetación con viento, aves, lianas y campamentos.
// Extiende Gfx (render.js). Solo dibuja; no cambia el estado del juego.
'use strict';

// Textura de ruido que se repite sin costuras (detalle del terreno, espuma y nubes del cielo)
function detailTexture(seed) {
  const S = 128, rng = U.rng(seed);
  const layers = [8, 16, 32].map(n => { const a = new Float32Array(n * n); for (let i = 0; i < a.length; i++) a[i] = rng(); return { n, a }; });
  const amp = [0.25, 0.35, 0.4];
  const c = document.createElement('canvas'); c.width = c.height = S;
  const ctx = c.getContext('2d'), img = ctx.createImageData(S, S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    let v = 0;
    for (let li = 0; li < 3; li++) {
      const L = layers[li], fx = i / S * L.n, fy = j / S * L.n;
      const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const g = (a, b) => L.a[(b % L.n) * L.n + (a % L.n)];
      const v00 = g(x0, y0), v10 = g(x0 + 1, y0), v01 = g(x0, y0 + 1), v11 = g(x0 + 1, y0 + 1);
      v += amp[li] * (v00 + (v10 - v00) * sx + (v01 - v00) * sy + (v00 - v10 - v01 + v11) * sx * sy);
    }
    const b = Math.round(U.clamp((v - 0.5) * 1.5 + 0.5, 0, 1) * 255), k = (j * S + i) * 4;
    img.data[k] = img.data[k + 1] = img.data[k + 2] = b; img.data[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Textura de materiales del terreno y las paredes (RGBA, se repite sin costuras):
// R grano fino · G celdas (grietas en la roca, piedritas en los lechos) · B vetas alargadas
// (briznas de pasto, estratos) · A manchas grandes. Va en datos crudos para no perder precisión.
function materialTexture(seed) {
  const S = 256, rng = U.rng(seed), data = new Uint8Array(S * S * 4);
  const lattice = (nx, ny) => { const a = new Float32Array(nx * ny); for (let i = 0; i < a.length; i++) a[i] = rng(); return { a, nx, ny }; };
  const vn = (L, fx, fy) => {
    const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const X0 = ((x0 % L.nx) + L.nx) % L.nx, X1 = (X0 + 1) % L.nx, Y0 = ((y0 % L.ny) + L.ny) % L.ny, Y1 = (Y0 + 1) % L.ny;
    const v00 = L.a[Y0 * L.nx + X0], v10 = L.a[Y0 * L.nx + X1], v01 = L.a[Y1 * L.nx + X0], v11 = L.a[Y1 * L.nx + X1];
    return v00 + (v10 - v00) * sx + (v01 - v00) * sy + (v00 - v10 - v01 + v11) * sx * sy;
  };
  const grain = [16, 32, 64, 128].map(n => lattice(n, n)), gAmp = [0.15, 0.25, 0.3, 0.3];
  const blot = [4, 8, 16].map(n => lattice(n, n)), bAmp = [0.5, 0.32, 0.18];
  const streak = [lattice(48, 4), lattice(96, 8)];
  const CN = 14, cp = new Float32Array(CN * CN * 2);
  for (let i = 0; i < cp.length; i++) cp[i] = 0.15 + rng() * 0.7;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const u = i / S, v = j / S, k = (j * S + i) * 4;
    let r = 0; for (let l = 0; l < 4; l++) r += gAmp[l] * vn(grain[l], u * grain[l].nx, v * grain[l].ny);
    let a = 0; for (let l = 0; l < 3; l++) a += bAmp[l] * vn(blot[l], u * blot[l].nx, v * blot[l].ny);
    // celdas de Worley: distancia al borde (F2 - F1), cerca de 0 en las grietas
    const cx = u * CN, cy = v * CN, ix = Math.floor(cx), iy = Math.floor(cy);
    let d1 = 9, d2 = 9;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const gx = ix + dx, gy = iy + dy, wx = ((gx % CN) + CN) % CN, wy = ((gy % CN) + CN) % CN, o = (wy * CN + wx) * 2;
      const d = Math.hypot(gx + cp[o] - cx, gy + cp[o + 1] - cy);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    const b = 0.65 * vn(streak[0], u * 48, v * 4) + 0.35 * vn(streak[1], u * 96, v * 8);
    data[k] = Math.round(U.clamp((r - 0.5) * 1.8 + 0.5, 0, 1) * 255);
    data[k + 1] = Math.round(U.clamp((d2 - d1) * 1.6, 0, 1) * 255);
    data[k + 2] = Math.round(U.clamp((b - 0.5) * 2.2 + 0.5, 0, 1) * 255);
    data[k + 3] = Math.round(U.clamp((a - 0.5) * 2.0 + 0.5, 0, 1) * 255);
  }
  const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

// Material que se mece con el viento (pasto, hojas, copas). amp: metros por metro de altura.
Gfx.prototype._sway = function (mat, key, amp, minY) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = this.uTime;
    sh.uniforms.uWind = this.uWind;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;')
      .replace('#include <begin_vertex>', [
        '#include <begin_vertex>',
        '#ifdef USE_INSTANCING',
        '  vec2 ip = instanceMatrix[3].xz + modelMatrix[3].xz;',
        '#else',
        '  vec2 ip = modelMatrix[3].xz;',
        '#endif',
        '  float sk = max(position.y - ' + minY.toFixed(2) + ', 0.0) * ' + amp.toFixed(4) + ' * (0.5 + uWind);',
        '  float ph = uTime * 1.7 + ip.x * 0.21 + ip.y * 0.17;',
        '  transformed.x += (sin(ph) + 0.35 * sin(ph * 2.3)) * sk;',
        '  transformed.z += sin(ph * 0.8 + 1.3) * sk * 0.7;'
      ].join('\n'));
    // hojas y pasto de dos caras: la de atrás se ilumina igual (si no, sale negra)
    if (mat.side === THREE.DoubleSide && !mat.flatShading) sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize(vNormal);');
  };
  mat.customProgramCacheKey = () => 'sway-' + key;
  return mat;
};

// Reparte instancias en zonas para que la cámara y las sombras recorten lo que no ven.
// En Three r149 InstancedMesh recorta con la esfera de la geometría en su origen,
// así que cada zona se coloca en su centro y la geometría recibe una esfera que cubre la zona.
Gfx.prototype._scatter = function (geom, mat, items, place, opt) {
  opt = opt || {};
  if (!items.length) return [];
  const G = 6, half = this.world.half, cell = half * 2 / G, buckets = new Map();
  for (const it of items) {
    const ci = U.clamp(Math.floor((it.x + half) / cell), 0, G - 1), cj = U.clamp(Math.floor((it.z + half) / cell), 0, G - 1);
    const k = cj * G + ci;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(it);
  }
  geom.computeBoundingSphere();
  const gr = geom.boundingSphere.radius + geom.boundingSphere.center.length();
  let R = 0;
  const cells = [];
  buckets.forEach((list, k) => {
    const cx = ((k % G) + 0.5) * cell - half, cz = (Math.floor(k / G) + 0.5) * cell - half;
    let cy = 0;
    for (const it of list) cy += it.y;
    cy /= list.length;
    let rc = 0;
    for (const it of list) rc = Math.max(rc, Math.hypot(it.x - cx, it.y - cy, it.z - cz) + gr * (it.s || 1) * 1.6);
    R = Math.max(R, rc);
    cells.push({ list, cx, cy, cz, rc });
  });
  geom.boundingSphere = new THREE.Sphere(new THREE.Vector3(), R);
  const out = [];
  for (const c of cells) {
    const im = new THREE.InstancedMesh(geom, mat, c.list.length);
    im.position.set(c.cx, c.cy, c.cz);
    c.list.forEach((it, i) => {
      this._c.setRGB(1, 1, 1);
      place(it, this._m, this._c);
      const e = this._m.elements;
      e[12] -= c.cx; e[13] -= c.cy; e[14] -= c.cz;
      im.setMatrixAt(i, this._m);
      im.setColorAt(i, this._c);
    });
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.castShadow = !!opt.shadow && this.Q.shadow;
    im.receiveShadow = !!opt.receive && this.Q.shadow;
    im.updateMatrix(); im.matrixAutoUpdate = false;
    // para el recorte por distancia (ver _cullFar)
    im.userData.r = c.rc;
    im.userData.far = opt.far || 1e9;
    this.scene.add(im);
    this.farCull.push(im);
    out.push(im);
  }
  return out;
};

// ---------- agua ----------
Gfx.prototype._buildSea = function () {
  const w = this.world, W = w.N + 1;
  // Alturas del terreno en una textura (2 bytes por celda) para saber la profundidad
  const data = new Uint8Array(W * W * 4);
  for (let i = 0; i < W * W; i++) {
    const v = Math.round(U.clamp((w.h[i] + 20) / 340, 0, 1) * 65535);
    data[i * 4] = v >> 8; data[i * 4 + 1] = v & 255; data[i * 4 + 3] = 255;
  }
  const hm = new THREE.DataTexture(data, W, W, THREE.RGBAFormat);
  hm.magFilter = hm.minFilter = THREE.NearestFilter;
  hm.needsUpdate = true;
  const uni = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uTime: { value: 0 }, uHM: { value: null }, uDetail: { value: null },
    uHalf: { value: w.half }, uCell: { value: w.C }, uN: { value: w.N },
    uDeep: { value: new THREE.Color(0x1b6f9e) }, uShallow: { value: new THREE.Color(0x3fd0d4) },
    uSky: { value: new THREE.Color(0xbfe0f5) }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color(1, 1, 1) }
  }]);
  uni.uHM.value = hm; uni.uDetail.value = this.detailTex;
  const mat = new THREE.ShaderMaterial({
    uniforms: uni, transparent: true, depthWrite: false, fog: true,
    vertexShader: [
      'varying vec3 vW;',
      '#include <fog_pars_vertex>',
      'void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz;',
      ' vec4 mvPosition = viewMatrix * wp; gl_Position = projectionMatrix * mvPosition;',
      ' #include <fog_vertex>',
      '}'
    ].join('\n'),
    fragmentShader: [
      'uniform float uTime; uniform sampler2D uHM; uniform sampler2D uDetail; uniform float uHalf; uniform float uCell; uniform float uN;',
      'uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uSky; uniform vec3 uSunDir; uniform vec3 uSunCol;',
      'varying vec3 vW;',
      '#include <fog_pars_fragment>',
      'float hmAt(vec2 g){ vec4 c = texture2D(uHM, (g + 0.5) / (uN + 1.0)); return (c.r * 65280.0 + c.g * 255.0) / 65535.0 * 340.0 - 20.0; }',
      'float groundH(vec2 p){ vec2 g = (p + uHalf) / uCell;',
      ' if (g.x < 0.0 || g.y < 0.0 || g.x >= uN || g.y >= uN) return -14.0;',
      ' vec2 i = floor(g), f = g - i;',
      ' return mix(mix(hmAt(i), hmAt(i + vec2(1.0, 0.0)), f.x), mix(hmAt(i + vec2(0.0, 1.0)), hmAt(i + vec2(1.0, 1.0)), f.x), f.y); }',
      'void main(){',
      ' vec2 p = vW.xz; float t = uTime;',
      ' float depth = vW.y - groundH(p);',
      ' vec3 n = normalize(vec3(sin(p.x * 0.21 + t * 1.1) * 0.07 + sin(p.x * 0.73 + p.y * 0.41 + t * 1.9) * 0.035 + sin(p.y * 1.7 - t * 2.6) * 0.015, 1.0,',
      '   cos(p.y * 0.19 + t * 0.9) * 0.07 + cos(p.x * 0.52 - p.y * 0.93 + t * 1.6) * 0.035 + cos(p.x * 1.9 + t * 2.2) * 0.015));',
      ' vec3 V = normalize(cameraPosition - vW);',
      ' float fres = pow(1.0 - max(dot(n, V), 0.0), 4.0);',
      ' vec3 col = mix(uShallow, uDeep, smoothstep(0.2, 7.0, depth));',
      ' float caust = texture2D(uDetail, p * 0.09 + vec2(t * 0.02, t * 0.015)).r * texture2D(uDetail, p * 0.13 - vec2(t * 0.017, 0.0)).r;',
      ' col += vec3(0.25, 0.3, 0.25) * smoothstep(0.25, 0.6, caust) * (1.0 - smoothstep(0.5, 4.0, depth));',
      ' col = mix(col, uSky, clamp(fres * 0.75 + 0.05, 0.0, 0.8));',
      ' vec3 H = normalize(uSunDir + V);',
      ' col += uSunCol * pow(max(dot(n, H), 0.0), 160.0) * 1.4;',
      ' float wave = sin(t * 1.3 - depth * 2.6 + texture2D(uDetail, p * 0.05).r * 6.0);',
      ' float foamZ = 1.0 - smoothstep(0.0, 1.1 + wave * 0.3, depth);',
      ' float foamN = texture2D(uDetail, p * 0.35 + vec2(t * 0.05, -t * 0.03)).r;',
      ' float foam = foamZ * smoothstep(0.35, 0.65, foamN + foamZ * 0.45);',
      ' col = mix(col, vec3(0.96, 0.99, 1.0), clamp(foam, 0.0, 1.0));',
      ' float a = mix(0.45, 0.93, smoothstep(0.0, 3.5, depth));',
      ' a = max(a, foam * 0.95);',
      ' gl_FragColor = vec4(col, a);',
      ' #include <fog_fragment>',
      '}'
    ].join('\n')
  });
  const g = new THREE.PlaneGeometry(4000, 4000, 1, 1);
  g.rotateX(-Math.PI / 2);
  this.sea = new THREE.Mesh(g, mat);
  this.sea.position.y = -0.6;
  this.sea.frustumCulled = false;
  this.seaHM = hm;
  this.scene.add(this.sea);
};

// ---------- nubes e islas lejanas ----------
Gfx.prototype._buildClouds = function () {
  const w = this.world, rng = U.rng(w.seed ^ 0xc10d), qk = { low: 0.5, med: 0.8, high: 1 }[this.q] || 0.8;
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive: 0x6a7480 });
  const variants = [0, 1, 2].map(k => {
    const parts = [], n = 4 + k;
    for (let i = 0; i < n; i++) {
      const sx = 1.2 + rng() * 1.1;
      parts.push({ g: new THREE.IcosahedronGeometry(1, 1), m: mtx((i - n / 2) * 1.5 + rng() * 0.6, rng() * 0.5 + (i % 2) * 0.3, rng() * 1.4 - 0.7, 0, rng() * 3, 0, sx, 0.7 + rng() * 0.5, sx * 0.9), c: 0xffffff });
    }
    return mergeColored(parts);
  });
  const top = this.world.summit.y;
  const layers = [
    { y: top * 0.42, n: 48, rMin: 210, rMax: 780, s: [8, 15] },
    { y: top * 0.86, n: 28, rMin: 150, rMax: 900, s: [10, 18] },
    { y: top * 1.9, n: 16, rMin: 40, rMax: 950, s: [14, 26] }
  ];
  const lists = [[], [], []];
  for (const L of layers) {
    const n = Math.round(L.n * qk);
    for (let k = 0, tries = 0; k < n && tries < n * 6; tries++) {
      const a = rng() * Math.PI * 2, r = L.rMin + rng() * (L.rMax - L.rMin);
      const x = Math.cos(a) * r, z = Math.sin(a) * r, y = L.y + (rng() - 0.5) * 14;
      const s = L.s[0] + rng() * (L.s[1] - L.s[0]);
      if (w.heightAt(x, z) > y - s * 0.9 || w.heightAt(x + s * 3, z) > y - s || w.heightAt(x - s * 3, z) > y - s) continue;
      lists[k % 3].push({ x, y, z, s, rot: rng() * 6.28 });
      k++;
    }
  }
  this.clouds = new THREE.Group();
  lists.forEach((list, i) => {
    if (!list.length) return;
    const im = new THREE.InstancedMesh(variants[i], mat, list.length);
    list.forEach((c, j) => {
      this._m.compose(this._v.set(c.x, c.y, c.z), this._q.setFromEuler(this._e.set(0, c.rot, 0)), new THREE.Vector3(c.s, c.s * 0.75, c.s));
      im.setMatrixAt(j, this._m);
    });
    im.frustumCulled = false;
    this.clouds.add(im);
  });
  this.scene.add(this.clouds);
  // Islas en el horizonte: siluetas que toman el color del cielo (en la montaña nevada hay cordilleras)
  if (w.snow) return;
  const parts = [];
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + rng() * 0.5, r = 1150 + rng() * 450, h = 30 + rng() * 110, rad = 60 + rng() * 120;
    parts.push({ g: new THREE.ConeGeometry(rad, h, 7, 1), m: mtx(Math.cos(a) * r, h / 2 - 6, Math.sin(a) * r, 0, rng() * 3, 0, 1, 1, 0.6 + rng() * 0.6), c: 0xffffff });
    if (rng() < 0.6) parts.push({ g: new THREE.ConeGeometry(rad * 0.6, h * 0.6, 6, 1), m: mtx(Math.cos(a + 0.05) * (r + rad * 0.7), h * 0.3 - 6, Math.sin(a + 0.05) * (r + rad * 0.7)), c: 0xe0e0e0 });
  }
  this.islandMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false });
  this.islands = new THREE.Mesh(mergeColored(parts), this.islandMat);
  this.islands.frustumCulled = false;
  this.scene.add(this.islands);
};

// ---------- vegetación ----------
// Punto al azar sobre suelo caminable, repartido de forma uniforme por área
Gfx.prototype._spots = function (rng, n, minH, maxH, minNY, noSand) {
  const w = this.world, nv = { x: 0, y: 1, z: 0 }, out = [];
  const r1 = CFG.CRATER_R + 6, r2 = CFG.BASE_R + 6;
  for (let t = 0; t < n * 4 && out.length < n; t++) {
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng() * (r2 * r2 - r1 * r1) + r1 * r1);
    const x = Math.cos(a) * r, z = Math.sin(a) * r, y = w.heightAt(x, z);
    if (y < minH || y > maxH) continue;
    w.normalAt(x, z, nv, 0.9);
    if (nv.y < minNY) continue;
    if (noSand && y < 9 && r > CFG.BASE_R - 30) continue;
    if (w.blockAt(x, y + 0.2, z, 0.4)) continue;
    out.push({ x, y, z, s: 0.7 + rng() * 0.7, rot: rng() * 6.28, b: w.biomeIndex(y), r: rng() });
  }
  return out;
};

Gfx.prototype._buildGrass = function () {
  const rng = U.rng(this.world.seed ^ 0x6a55);
  const nG = { low: 1300, med: 3200, high: 5500 }[this.q] || 3200;
  // matas de pasto: 5 hojas finas, oscuras abajo y claras en la punta
  const pos = [], col = [], nor = [];
  for (let b = 0; b < 6; b++) {
    const a = rng() * 6.28, off = rng() * 0.14, h = 0.32 + rng() * 0.38, lean = 0.08 + rng() * 0.14, wd = 0.05;
    const bx = Math.cos(a) * off, bz = Math.sin(a) * off, px = -Math.sin(a) * wd, pz = Math.cos(a) * wd;
    pos.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, bx + Math.cos(a) * lean, h, bz + Math.sin(a) * lean);
    col.push(0.45, 0.5, 0.4, 0.45, 0.5, 0.4, 1, 1, 0.92);
    nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
  }
  const gg = new THREE.BufferGeometry();
  gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  gg.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  const gmat = this._sway(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 'grass', 0.32, 0);
  const tint = [0x9cc860, 0x58a040, 0x8fa860, 0x777777];
  const snowLine = CFG.BIOMES[1].top + 12;
  const grass = this._spots(rng, nG, 2.2, snowLine, 0.84, true);
  this._scatter(gg, gmat, grass, (it, m, c) => {
    m.compose(this._v.set(it.x, it.y - 0.03, it.z), this._q.setFromEuler(this._e.set(0, it.rot, 0)), new THREE.Vector3(it.s, it.s * (0.8 + it.r * 0.6), it.s));
    c.set(tint[it.b]).multiplyScalar(0.85 + it.r * 0.3);
  }, { far: 70 });
  // flores
  const fg = mergeColored([
    { g: new THREE.CylinderGeometry(0.012, 0.012, 0.26, 3), m: mtx(0, 0.13, 0), c: 0x3d7a2c },
    { g: new THREE.IcosahedronGeometry(0.07, 0), m: mtx(0, 0.28, 0, 0, 0, 0, 1, 0.45, 1), c: 0xffffff },
    { g: new THREE.IcosahedronGeometry(0.025, 0), m: mtx(0, 0.305, 0), c: 0xffe066 }
  ]);
  const fmat = this._sway(new THREE.MeshLambertMaterial({ vertexColors: true }), 'flower', 0.25, 0);
  const pal = [[0xff5a6e, 0xffd23f, 0xffffff, 0xff8ad8], [0xff3b3b, 0xffb020, 0xb46bff, 0xffffff], [0xffffff, 0x9ec9ff, 0xffffff, 0xe0b0ff]];
  const flowers = this._spots(rng, Math.round(nG * 0.16), 3, snowLine, 0.86, true);
  this._scatter(fg, fmat, flowers, (it, m, c) => {
    m.compose(this._v.set(it.x, it.y, it.z), this._q.setFromEuler(this._e.set(0, it.rot, 0)), new THREE.Vector3(it.s, it.s, it.s));
    c.set(pal[Math.min(2, it.b)][(it.r * 4) | 0]);
  }, { far: 60 });
  // helechos en la selva
  const fparts = [];
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2 + rng() * 0.3;
    fparts.push({ g: new THREE.ConeGeometry(0.16, 1.15, 3), m: mtx(Math.cos(a) * 0.42, 0.32, Math.sin(a) * 0.42, Math.sin(a) * 1.05, 0, -Math.cos(a) * 1.05, 1, 1, 0.3), c: i % 2 ? 0x2f8a3a : 0x3fa046 });
  }
  const fern = mergeColored(fparts);
  const fernMat = this._sway(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), 'fern', 0.07, 0.2);
  const ferns = this._spots(rng, Math.round(nG * 0.12), CFG.BIOMES[0].top - 6, CFG.BIOMES[1].top, 0.8, true);
  this._scatter(fern, fernMat, ferns, (it, m, c) => {
    m.compose(this._v.set(it.x, it.y - 0.05, it.z), this._q.setFromEuler(this._e.set(0, it.rot, 0)), new THREE.Vector3(it.s, it.s, it.s));
    c.setHSL(0.3, 0.2, 0.45 + it.r * 0.25);
  }, { far: 90 });
};

Gfx.prototype._buildTrees = function () {
  const T = this.world.trees, rng = U.rng(this.world.seed ^ 0x7733);
  const cut = list => list.slice(0, Math.floor(list.length * this.Q.trees));
  // Palmera de tronco curvo y hojas caídas
  const palmParts = [];
  let px = 0, py = 0;
  for (let i = 0; i < 5; i++) {
    const h = 1.15, lean = 0.06 + i * 0.05;
    palmParts.push({ g: new THREE.CylinderGeometry(0.15 - i * 0.012, 0.2 - i * 0.012, h, 6), m: mtx(px + Math.sin(lean) * h / 2, py + h / 2, 0, 0, 0, -lean), c: i % 2 ? 0x8b6a45 : 0x9c7a52 });
    px += Math.sin(lean) * h; py += Math.cos(lean) * h * 0.98;
  }
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2;
    const c1 = i % 3 === 0 ? 0x3c8f37 : i % 3 === 1 ? 0x4fae44 : 0x46a03e;
    palmParts.push({ g: new THREE.ConeGeometry(0.42, 1.8, 4), m: mtx(px + Math.cos(a) * 0.8, py + 0.2, Math.sin(a) * 0.8, Math.sin(a) * 1.35, 0, -Math.cos(a) * 1.35, 1, 1, 0.28), c: c1 });
    palmParts.push({ g: new THREE.ConeGeometry(0.34, 1.6, 4), m: mtx(px + Math.cos(a) * 2.1, py - 0.35, Math.sin(a) * 2.1, Math.sin(a) * 2.1, 0, -Math.cos(a) * 2.1, 1, 1, 0.28), c: c1 });
  }
  for (let i = 0; i < 3; i++) palmParts.push({ g: new THREE.IcosahedronGeometry(0.2, 0), m: mtx(px + Math.cos(i * 2.1) * 0.25, py - 0.2, Math.sin(i * 2.1) * 0.25), c: 0x6b4a2a });
  const palmG = mergeColored(palmParts);
  // Árbol de selva con raíces, varias copas y lianas colgando
  const jParts = [
    { g: new THREE.CylinderGeometry(0.28, 0.5, 7, 7), m: mtx(0, 3.5, 0), c: 0x6e5338 },
    { g: new THREE.IcosahedronGeometry(2.8, 0), m: mtx(0, 7.6, 0, 0, 0, 0, 1.1, 0.75, 1.1), c: 0x3a8a32 },
    { g: new THREE.IcosahedronGeometry(2.0, 0), m: mtx(1.7, 6.6, 0.8), c: 0x4ea83c },
    { g: new THREE.IcosahedronGeometry(1.8, 0), m: mtx(-1.5, 6.9, -0.9), c: 0x2f7a2a },
    { g: new THREE.IcosahedronGeometry(1.5, 0), m: mtx(0.2, 9.0, -0.4), c: 0x56b442 }
  ];
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * Math.PI * 2 + 0.4;
    jParts.push({ g: new THREE.ConeGeometry(0.22, 1.4, 4), m: mtx(Math.cos(a) * 0.45, 0.45, Math.sin(a) * 0.45, Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6), c: 0x5e4630 });
  }
  for (let i = 0; i < 5; i++) {
    const a = rng() * 6.28, r = 1.4 + rng() * 1.2, l = 2 + rng() * 2.5;
    jParts.push({ g: new THREE.CylinderGeometry(0.03, 0.03, l, 3), m: mtx(Math.cos(a) * r, 6.6 - l / 2, Math.sin(a) * r), c: 0x2f6a2a });
  }
  const jungleG = mergeColored(jParts);
  // Pino de cinco pisos y su versión con nieve en las puntas
  const pine = snowy => {
    const parts = [{ g: new THREE.CylinderGeometry(0.16, 0.3, 2.6, 6), m: mtx(0, 1.3, 0), c: 0x5d4632 }];
    for (let i = 0; i < 5; i++) {
      const r = 2.3 - i * 0.4, h = 2.3 - i * 0.2, y = 2.3 + i * 1.15;
      parts.push({ g: new THREE.ConeGeometry(r, h, 8), m: mtx(0, y, 0, 0, i * 0.4, 0), c: i % 2 ? 0x2a613a : 0x2f6b3f });
      if (snowy) parts.push({ g: new THREE.ConeGeometry(r * 0.72, h * 0.42, 8), m: mtx(0, y + h * 0.33, 0, 0, i * 0.4, 0), c: 0xf2f6fa });
    }
    return mergeColored(parts);
  };
  const place = (t, m, c) => {
    m.compose(this._v.set(t.x, t.y - 0.25, t.z), this._q.setFromEuler(this._e.set(0, t.rot, 0)), new THREE.Vector3(t.s, t.s * (0.9 + (t.rot % 1) * 0.25), t.s));
    c.setHSL(0, 0, 0.88 + (t.rot % 1) * 0.24);
  };
  const mk = key => this._sway(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }), key, 0.012, 2.5);
  // los árboles lejanos ya casi se funden con la niebla
  const tf = { shadow: true, far: this.Q.far * 0.72 };
  this._scatter(palmG, mk('palm'), cut(T.palm), place, tf);
  this._scatter(jungleG, mk('jungle'), cut(T.jungle), place, tf);
  const pines = cut(T.pine);
  const snowLine = CFG.BIOMES[1].top + 12;
  this._scatter(pine(false), mk('pine'), pines.filter(t => t.y < snowLine), place, tf);
  this._scatter(pine(true), mk('pine2'), pines.filter(t => t.y >= snowLine), place, tf);
};

Gfx.prototype._buildRocks = function () {
  const rng = U.rng(this.world.seed ^ 0x40c5);
  const variants = [0].map(() => {
    const g = new THREE.DodecahedronGeometry(1, 0);
    const p = g.attributes.position, seen = new Map();
    // deformar igual los vértices repetidos para no abrir grietas
    for (let i = 0; i < p.count; i++) {
      const key = p.getX(i).toFixed(3) + p.getY(i).toFixed(3) + p.getZ(i).toFixed(3);
      if (!seen.has(key)) seen.set(key, [0.75 + rng() * 0.5, 0.55 + rng() * 0.35]);
      const j = seen.get(key);
      p.setXYZ(i, p.getX(i) * j[0], p.getY(i) * j[1], p.getZ(i) * j[0]);
    }
    g.computeVertexNormals();
    return g;
  });
  const mat = new THREE.MeshLambertMaterial({ flatShading: true });
  const cols = [0x9a8a75, 0x7d7a66, 0x8e9096, 0x403a3b];
  // una sola forma: la rotación y la escala ya dan variedad, y así son menos llamadas de dibujo
  [this.world.rocks].forEach((list, k) => this._scatter(variants[k], mat, list, (r, m, c) => {
    m.compose(this._v.set(r.x, r.y - r.s * 0.2, r.z), this._q.setFromEuler(this._e.set(r.rot * 0.3, r.rot, r.rot * 0.7)), new THREE.Vector3(r.s * 1.3, r.s, r.s * 1.1));
    c.set(cols[r.b]).multiplyScalar(0.82 + (r.rot % 1) * 0.3);
    if (r.b === 1 && (r.rot % 1) > 0.5) c.lerp(this._c2.set(0x4f8a3a), 0.35); // musgo
  }, { shadow: true, receive: true, far: 130 }));
};

// ---------- campamentos ----------
function tentGeom(color, door) {
  const A = [-1, 0, -1.1], B = [1, 0, -1.1], C = [0, 1.35, -1.1], D = [-1, 0, 1.1], E = [1, 0, 1.1], F = [0, 1.35, 1.1];
  const pos = [], col = [];
  const c1 = new THREE.Color(color), c2 = c1.clone().multiplyScalar(0.8), cd = new THREE.Color(door);
  const tri = (p, q, r, c) => { pos.push(...p, ...q, ...r); for (let i = 0; i < 3; i++) col.push(c.r, c.g, c.b); };
  tri(A, F, C, c1); tri(A, D, F, c1);
  tri(B, C, F, c2); tri(B, F, E, c2);
  tri(A, C, B, c2);
  tri(D, E, F, cd);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

Gfx.prototype._buildCamps = function () {
  if (this.world.snow) return this._buildCampsSnow();
  const w = this.world, tentCols = [0xf26b38, 0x2f8fd6, 0x3aa65a, 0xd94a5a];
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
  w.campfires.forEach((f, i) => {
    const toC = Math.atan2(-f.x, -f.z);
    const parts = [];
    const tx = Math.cos(toC) * -3.4, tz = Math.sin(toC) * -3.4;
    parts.push({ g: tentGeom(tentCols[i % 4], 0x3a2a20), m: mtx(tx - 1.2, 0, tz + 1.2, 0, -toC + 0.6, 0), c: 0xffffff });
    // mochila y leña
    parts.push({ g: new THREE.BoxGeometry(0.45, 0.6, 0.3), m: mtx(1.7, 0.3, -1.2, 0, 0.5, 0.12), c: 0x9c2f2f });
    for (let k = 0; k < 3; k++) parts.push({ g: new THREE.CylinderGeometry(0.1, 0.1, 1, 5), m: mtx(-1.6, 0.1 + k * 0.18, -1.5 + k * 0.05, Math.PI / 2, 0.3, 0), c: 0x6a4a30 });
    // banderines de oración en los campamentos altos
    if (f.biome >= 2) {
      const p1 = [-3, 0, 2.6], p2 = [3, 0, 2.2];
      parts.push({ g: new THREE.CylinderGeometry(0.04, 0.04, 2.4, 4), m: mtx(p1[0], 1.2, p1[2]), c: 0x8a6a4a });
      parts.push({ g: new THREE.CylinderGeometry(0.04, 0.04, 2.4, 4), m: mtx(p2[0], 1.2, p2[2]), c: 0x8a6a4a });
      const fc = [0x2f6fd6, 0xffffff, 0xd93a3a, 0x3aa65a, 0xffcf3a];
      const yaw = Math.atan2(p2[0] - p1[0], p2[2] - p1[2]) + Math.PI / 2;
      const cy = t => 2.35 - Math.sin(t * Math.PI) * 0.45;
      for (let k = 0; k < 10; k++) {
        // cordel entre banderines
        const t0 = k / 10, t1 = (k + 1) / 10;
        const a = [U.lerp(p1[0], p2[0], t0), cy(t0), U.lerp(p1[2], p2[2], t0)], b = [U.lerp(p1[0], p2[0], t1), cy(t1), U.lerp(p1[2], p2[2], t1)];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
        parts.push({ g: new THREE.BoxGeometry(0.015, 0.015, len), m: mtx((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, Math.atan2(b[1] - a[1], Math.hypot(b[0] - a[0], b[2] - a[2])) * -1, Math.atan2(b[0] - a[0], b[2] - a[2]), 0), c: 0xd9cfa8 });
        if (k > 0) parts.push({ g: new THREE.PlaneGeometry(0.22, 0.26), m: mtx(a[0], a[1] - 0.14, a[2], 0, yaw, 0), c: fc[k % 5] });
      }
    }
    // cajas del avión en el campamento inicial
    if (f.start) {
      parts.push({ g: new THREE.BoxGeometry(0.8, 0.6, 0.6), m: mtx(-2.2, 0.3, 1.8, 0, 0.3, 0), c: 0xb08a55 });
      parts.push({ g: new THREE.BoxGeometry(0.6, 0.5, 0.5), m: mtx(-2.1, 0.85, 1.8, 0, 0.8, 0), c: 0xc49a62 });
    }
    const m = new THREE.Mesh(mergeColored(parts), mat);
    m.position.set(f.x, f.y, f.z);
    m.castShadow = this.Q.shadow; m.receiveShadow = this.Q.shadow;
    this.scene.add(m);
  });
};

// ---------- aves ----------
Gfx.prototype._buildBirds = function () {
  const w = this.world, rng = U.rng(w.seed ^ 0xb12d), birds = [];
  const s = w.start;
  // en la montaña nevada: chovas negras que vuelan alrededor de los campamentos
  if (w.snow) for (const c of w.camps) for (let i = 0; i < 2; i++) {
    const a = rng() * 6.28;
    birds.push({ cx: c.x + Math.cos(a) * 12, cy: c.y + 10 + rng() * 14, cz: c.z + Math.sin(a) * 12, r: 14 + rng() * 22, sp: 6 + rng() * 3, ph: rng() * 6.28, sc: 0.75, col: 0x1d1d22, flap: 7 });
  }
  if (!w.snow) for (let i = 0; i < 9; i++) {
    const a = rng() * 6.28;
    birds.push({ cx: s.x + Math.cos(a) * 30, cy: 22 + rng() * 18, cz: s.z + Math.sin(a) * 30, r: 18 + rng() * 30, sp: 7 + rng() * 3, ph: rng() * 6.28, sc: 0.8, col: 0xf4f4f0, flap: 9 });
  }
  if (!w.snow) for (let i = 0; i < 4; i++) {
    const a = rng() * 6.28, rr = 70 + rng() * 40;
    birds.push({ cx: Math.cos(a) * rr * 0.3, cy: CFG.BIOMES[1].top + 25 + rng() * 20, cz: Math.sin(a) * rr * 0.3, r: rr, sp: 9 + rng() * 3, ph: rng() * 6.28, sc: 1.6, col: 0x5a4030, flap: 4 });
  }
  this.birdList = birds;
  const bodyG = mergeColored([
    { g: new THREE.IcosahedronGeometry(0.14, 0), m: mtx(0, 0, 0, 0, 0, 0, 0.9, 0.8, 2.4), c: 0xffffff },
    { g: new THREE.ConeGeometry(0.05, 0.14, 4), m: mtx(0, 0, 0.38, Math.PI / 2, 0, 0), c: 0xffb000 }
  ]);
  const wing = new THREE.BufferGeometry();
  wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.12, 0, 0, -0.12, 0.75, 0, -0.18, 0, 0, 0.12, 0.75, 0, -0.18, 0.55, 0, 0.05], 3));
  wing.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const wmat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
  this.birdBody = new THREE.InstancedMesh(bodyG, mat, birds.length);
  this.birdWing = new THREE.InstancedMesh(wing, wmat, birds.length * 2);
  birds.forEach((b, i) => {
    this.birdBody.setColorAt(i, this._c.set(b.col));
    this.birdWing.setColorAt(i * 2, this._c); this.birdWing.setColorAt(i * 2 + 1, this._c);
  });
  this.birdBody.frustumCulled = this.birdWing.frustumCulled = false;
  this.scene.add(this.birdBody); this.scene.add(this.birdWing);
  this._bq = new THREE.Quaternion(); this._bq2 = new THREE.Quaternion(); this._bs = new THREE.Vector3();
};

Gfx.prototype._updateBirds = function (t) {
  const L = this.birdList;
  for (let i = 0; i < L.length; i++) {
    const b = L[i], a = b.ph + t * b.sp / b.r;
    const x = b.cx + Math.cos(a) * b.r, z = b.cz + Math.sin(a) * b.r, y = b.cy + Math.sin(t * 0.3 + b.ph) * 3;
    const yaw = Math.atan2(-Math.sin(a), Math.cos(a));
    const glide = Math.sin(t * 0.5 + b.ph) > 0.2;
    const flap = glide ? 0.12 : Math.sin(t * b.flap + b.ph) * 0.65;
    this._bq.setFromEuler(this._e.set(0, yaw, 0.35));
    this._m.compose(this._v.set(x, y, z), this._bq, this._bs.set(b.sc, b.sc, b.sc));
    this.birdBody.setMatrixAt(i, this._m);
    this._bq2.setFromEuler(this._e.set(0, 0, flap)); this._bq2.premultiply(this._bq);
    this._m.compose(this._v, this._bq2, this._bs.set(b.sc, b.sc, b.sc));
    this.birdWing.setMatrixAt(i * 2, this._m);
    this._bq2.setFromEuler(this._e.set(0, 0, -flap)); this._bq2.premultiply(this._bq);
    this._m.compose(this._v, this._bq2, this._bs.set(-b.sc, b.sc, b.sc));
    this.birdWing.setMatrixAt(i * 2 + 1, this._m);
  }
  this.birdBody.instanceMatrix.needsUpdate = true;
  this.birdWing.instanceMatrix.needsUpdate = true;
};

// No dibujar lo que queda detrás de la niebla (ni lo pequeño que está lejos)
Gfx.prototype._cullFar = function () {
  const cp = this.camera.position, fog = this.scene.fog.far, L = this.farCull;
  for (let i = 0; i < L.length; i++) {
    const m = L[i], p = m.position;
    const d = Math.hypot(p.x - cp.x, p.y - cp.y, p.z - cp.z) - m.userData.r;
    m.visible = d < Math.min(fog, m.userData.far);
  }
};
