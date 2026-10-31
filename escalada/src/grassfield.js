// Campo de pasto denso alrededor del jugador: miles de briznas instanciadas en mosaicos que
// se reacomodan al caminar. Toman el color del suelo, se mecen con el viento, se apartan
// al pasar el escalador y se encogen en el borde (no se ve dónde termina). Solo calidad media y alta.
'use strict';

const GRASS_TILE = 6;

Gfx.prototype._buildGrassField = function () {
  const w = this.world, cfg = { med: { R: 24, dens: 3.0, cap: 7000 }, high: { R: 34, dens: 3.6, cap: 15000 } }[this.q];
  if (!cfg || this.isSnow || !this.tColors) return;
  const N = w.N, W = N + 1, C = w.C, col = this.tColors, nv = { x: 0, y: 1, z: 0 };
  // dónde hay pasto: suelo verde, poco empinado y fuera de los barrancos
  const mask = new Uint8Array(W * W);
  for (let k = 0; k < W * W; k++) {
    if (w.gmap[k]) continue;
    const r = col[k * 3], g = col[k * 3 + 1], b = col[k * 3 + 2], green = g - Math.max(r, b);
    if (green < 0.04) continue;
    const x = (k % W) * C - w.half, z = Math.floor(k / W) * C - w.half;
    w.normalAt(x, z, nv, 1.0);
    if (nv.y < 0.82) continue;
    mask[k] = Math.round(U.clamp((green - 0.04) / 0.1, 0, 1) * U.smooth(0.82, 0.92, nv.y) * 255);
  }
  this.grassMask = mask;
  // una mata: 5 briznas finas, oscuras abajo y claras en la punta
  const rng = U.rng(w.seed ^ 0x9a55), pos = [], vc = [], nor = [];
  for (let k = 0; k < 5; k++) {
    const a = k / 5 * Math.PI * 2 + rng() * 0.8, off = 0.04 + rng() * 0.12, h = 0.36 + rng() * 0.3, lean = 0.08 + rng() * 0.16, wd = 0.028 + rng() * 0.012;
    const bx = Math.cos(a) * off, bz = Math.sin(a) * off, px = -Math.sin(a) * wd, pz = Math.cos(a) * wd;
    pos.push(bx - px, 0, bz - pz, bx + px, 0, bz + pz, bx + Math.cos(a) * lean, h, bz + Math.sin(a) * lean);
    vc.push(0.55, 0.58, 0.5, 0.55, 0.58, 0.5, 1.18, 1.16, 1.0);
    nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(vc, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  this.uGrassP = { value: new THREE.Vector3(0, -999, 0) };
  this.uGrassC = { value: new THREE.Vector3() };
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = this.uTime; sh.uniforms.uWind = this.uWind;
    sh.uniforms.uP = this.uGrassP; sh.uniforms.uC = this.uGrassC; sh.uniforms.uR = { value: cfg.R };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime; uniform float uWind; uniform vec3 uP; uniform vec3 uC; uniform float uR;')
      .replace('#include <begin_vertex>', [
        '#include <begin_vertex>',
        'vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);',
        // se encoge al alejarse de la cámara (no se nota el borde del campo)
        'float fade = 1.0 - smoothstep(uR * 0.62, uR * 0.97, distance(ip.xz, uC.xz));',
        'transformed *= fade;',
        'float hk = position.y;',
        'float ph = uTime * 1.9 + ip.x * 0.23 + ip.z * 0.19;',
        'float gust = 0.6 + 0.4 * sin(uTime * 0.45 + ip.x * 0.03 + ip.z * 0.02);',
        'transformed.x += (sin(ph) * 0.55 + 0.25 * sin(ph * 2.7)) * hk * hk * (0.6 + uWind) * gust;',
        'transformed.z += sin(ph * 0.83 + 1.3) * hk * hk * (0.45 + uWind) * gust * 0.8;'
      ].join('\n'))
      .replace('#include <project_vertex>', [
        // el escalador las aparta al pasar (en el espacio del mundo)
        'vec4 wp = modelMatrix * instanceMatrix * vec4(transformed, 1.0);',
        'vec2 dp = wp.xz - uP.xz; float dd = length(dp);',
        'float push = (1.0 - smoothstep(0.25, 1.1, dd)) * step(abs(wp.y - uP.y), 1.6) * hk * 1.8;',
        'wp.xz += normalize(dp + vec2(1e-4)) * push; wp.y -= push * 0.35;',
        'vec4 mvPosition = viewMatrix * wp;',
        'gl_Position = projectionMatrix * mvPosition;'
      ].join('\n'));
  };
  // las dos caras de la brizna se iluminan como el suelo (sin voltear la normal en la cara de atrás)
  const fragPatch = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize(vNormal);');
  };
  const vb = mat.onBeforeCompile;
  mat.onBeforeCompile = sh => { vb(sh); fragPatch(sh); };
  mat.customProgramCacheKey = () => 'grassfield';
  const mesh = new THREE.InstancedMesh(geo, mat, cfg.cap);
  mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cfg.cap * 3), 3);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
  mesh.count = 0;
  mesh.frustumCulled = false;
  mesh.receiveShadow = this.Q.shadow;
  this.scene.add(mesh);
  this.grassField = { mesh, cfg, tiles: new Map(), at: null };
};

// Matas de un mosaico (siempre las mismas: no aparecen al azar al volver)
Gfx.prototype._grassTile = function (ti, tj) {
  const GF = this.grassField, key = ti + ',' + tj;
  let t = GF.tiles.get(key);
  if (t) return t;
  if (GF.tiles.size > 700) GF.tiles.clear();
  const w = this.world, W = w.N + 1, C = w.C, mask = this.grassMask, col = this.tColors;
  const rng = U.rng(((ti * 73856093) ^ (tj * 19349663) ^ w.seed) >>> 0);
  const n = Math.round(GF.cfg.dens * GRASS_TILE * GRASS_TILE), out = [];
  for (let k = 0; k < n; k++) {
    const x = (ti + rng()) * GRASS_TILE, z = (tj + rng()) * GRASS_TILE, keep = rng(), rot = rng() * 6.283, sc = 0.75 + rng() * 0.6, tint = 0.85 + rng() * 0.3;
    const i = Math.round((x + w.half) / C), j = Math.round((z + w.half) / C);
    if (i < 0 || j < 0 || i >= W || j >= W) continue;
    const vi = j * W + i, m = mask[vi] / 255;
    if (keep > m) continue;
    const y = w.heightAt(x, z);
    if (w.blockAt(x, y + 0.2, z, 0.25) || w.nearRoute && w.nearRoute(x, z, 0.6)) continue;
    out.push(x, y - 0.02, z, rot, sc, col[vi * 3] * tint, col[vi * 3 + 1] * tint, col[vi * 3 + 2] * tint);
  }
  t = new Float32Array(out);
  GF.tiles.set(key, t);
  return t;
};

Gfx.prototype._updateGrassField = function (cam, player) {
  const GF = this.grassField;
  if (!GF) return;
  this.uGrassC.value.copy(cam);
  if (player) this.uGrassP.value.copy(player); else this.uGrassP.value.set(0, -999, 0);
  const ci = Math.floor(cam.x / GRASS_TILE), cj = Math.floor(cam.z / GRASS_TILE);
  const at = ci + ',' + cj;
  if (GF.at === at) return;
  GF.at = at;
  const R = GF.cfg.R, rt = Math.ceil(R / GRASS_TILE), M = GF.mesh, mA = M.instanceMatrix.array, cA = M.instanceColor.array;
  let n = 0;
  for (let dj = -rt; dj <= rt && n < GF.cfg.cap; dj++) for (let di = -rt; di <= rt && n < GF.cfg.cap; di++) {
    const ti = ci + di, tj = cj + dj;
    // mosaicos que tocan el círculo
    const nx = U.clamp(cam.x, ti * GRASS_TILE, (ti + 1) * GRASS_TILE), nz = U.clamp(cam.z, tj * GRASS_TILE, (tj + 1) * GRASS_TILE);
    if (Math.hypot(nx - cam.x, nz - cam.z) > R) continue;
    const t = this._grassTile(ti, tj);
    for (let k = 0; k < t.length && n < GF.cfg.cap; k += 8) {
      const c = Math.cos(t[k + 3]) * t[k + 4], s = Math.sin(t[k + 3]) * t[k + 4], o = n * 16;
      mA[o] = c; mA[o + 1] = 0; mA[o + 2] = -s; mA[o + 3] = 0;
      mA[o + 4] = 0; mA[o + 5] = t[k + 4]; mA[o + 6] = 0; mA[o + 7] = 0;
      mA[o + 8] = s; mA[o + 9] = 0; mA[o + 10] = c; mA[o + 11] = 0;
      mA[o + 12] = t[k]; mA[o + 13] = t[k + 1]; mA[o + 14] = t[k + 2]; mA[o + 15] = 1;
      cA[n * 3] = t[k + 5]; cA[n * 3 + 1] = t[k + 6]; cA[n * 3 + 2] = t[k + 7];
      n++;
    }
  }
  M.count = n;
  M.instanceMatrix.needsUpdate = true;
  M.instanceColor.needsUpdate = true;
};

// Polen y polvo flotando alrededor de la cámara, encendidos por el sol. Todo en la GPU:
// cada partícula da vueltas en una caja que sigue a la cámara (no hay que moverlas en JS).
Gfx.prototype._buildMotes = function () {
  const n = { med: 240, high: 460 }[this.q];
  if (!n || this.isSnow) return;
  const pos = new Float32Array(n * 3), rnd = new Float32Array(n);
  for (let i = 0; i < n; i++) { pos[i * 3] = Math.random() * 34 - 17; pos[i * 3 + 1] = Math.random() * 16 - 8; pos[i * 3 + 2] = Math.random() * 34 - 17; rnd[i] = Math.random(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: this.uTime, uCam: { value: new THREE.Vector3() }, uScale: { value: 300 }, uCol: { value: new THREE.Color(1, 0.9, 0.7) } },
    vertexShader: [
      'uniform float uTime; uniform vec3 uCam; uniform float uScale; attribute float aRnd; varying float vA;',
      'void main(){',
      '  vec3 p = position + vec3(sin(uTime * 0.31 + aRnd * 20.0) * 1.3, sin(uTime * 0.23 + aRnd * 13.0) * 0.9 + uTime * 0.12 * (aRnd - 0.35), cos(uTime * 0.27 + aRnd * 17.0) * 1.3);',
      '  vec3 box = vec3(34.0, 16.0, 34.0);',
      '  p = mod(p - uCam + box * 0.5, box) - box * 0.5 + uCam;',
      '  vec4 mv = modelViewMatrix * vec4(p, 1.0);',
      '  gl_Position = projectionMatrix * mv;',
      '  gl_PointSize = 0.05 * (0.6 + aRnd) * uScale / max(-mv.z, 0.5);',
      '  float tw = 0.55 + 0.45 * sin(uTime * (1.5 + aRnd * 2.0) + aRnd * 40.0);',
      '  vA = (1.0 - smoothstep(9.0, 16.0, length(p - uCam))) * smoothstep(0.6, 2.0, -mv.z) * tw * (0.35 + 0.65 * fract(aRnd * 7.31));',
      '}'].join('\n'),
    fragmentShader: [
      'uniform vec3 uCol; varying float vA;',
      'void main(){ float r = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.05, r) * vA; gl_FragColor = vec4(uCol * a * 0.55, 1.0); }'
    ].join('\n')
  });
  this.motes = new THREE.Points(g, mat);
  this.motes.frustumCulled = false;
  this.scene.add(this.motes);
};

Gfx.prototype._updateMotes = function (cam) {
  if (!this.motes) return;
  const u = this.motes.material.uniforms;
  u.uCam.value.copy(cam);
  u.uScale.value = this.r.domElement.height * 0.5 / Math.tan(this.camera.fov * Math.PI / 360);
  u.uCol.value.copy(this.sun.color).multiplyScalar(0.7 + 0.3 * this.sun.intensity);
};
