// Postproceso: la escena se dibuja en una textura y luego se compone en pantalla con
// brillo (bloom), rayos de sol que se cuelan entre las orillas, color de cine, viñeta y
// suavizado de bordes (FXAA). Sin bibliotecas: cinco pasadas cortas, casi todas a 1/4 de tamaño.
// Solo se usa en calidad media y alta.
'use strict';

const POST_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';

function Post(gfx, opts) {
  const r = gfx.r;
  this.g = gfx; this.r = r;
  this.depthOK = r.capabilities.isWebGL2 || r.extensions.has('WEBGL_depth_texture');
  const mk = depth => new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: !!depth, stencilBuffer: false });
  this.rtScene = mk(true);
  this.q1 = mk(); this.q2 = mk(); this.e1 = mk(); this.e2 = mk(); this.rays = mk();
  this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  this.scene = new THREE.Scene();
  this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  this.quad.frustumCulled = false;
  this.scene.add(this.quad);
  this.sunUV = new THREE.Vector2(0.5, 0.5);
  // cuánto brilla y cómo se gradúa el color en cada montaña
  this.look = Object.assign({ bloom: 0.55, thr: 0.78, rays: 0.5, sat: 1.1, warm: 0.6, vign: 0.24 }, opts || {});

  const mat = (frag, uni) => new THREE.ShaderMaterial({ vertexShader: POST_VS, fragmentShader: frag, uniforms: uni, depthTest: false, depthWrite: false });

  // 1) brillo: baja a 1/4 promediando 4 muestras y se queda con lo que pasa del umbral;
  //    en alfa guarda el cielo cerca del sol (fuente de los rayos)
  this.mBright = mat([
    'uniform sampler2D tCol; uniform sampler2D tDepth; uniform vec2 uTexel; uniform float uThr; uniform float uHasDepth; uniform vec2 uSun;',
    'varying vec2 vUv;',
    'void main(){',
    '  vec3 c = texture2D(tCol, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture2D(tCol, vUv + uTexel * vec2(1.0, -1.0)).rgb',
    '         + texture2D(tCol, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture2D(tCol, vUv + uTexel * vec2(1.0, 1.0)).rgb;',
    '  c *= 0.25;',
    '  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));',
    // solo lo que de verdad brilla: curva estricta sobre el umbral (la arena o la nieve al sol no deben lavar la imagen)
    '  float mxC = max(c.r, max(c.g, c.b)), satC = (mxC - min(c.r, min(c.g, c.b))) / (mxC + 1e-3);',
    // luz propia (lava, chispas, faroles): muy saturado y al tope
    '  float emis = smoothstep(0.6, 0.9, satC) * smoothstep(0.95, 0.99, mxC);',
    '  float k = smoothstep(uThr, 1.0, max(l, mxC * emis)); k *= k;',
    '  float skyD = uHasDepth > 0.5 ? step(0.99995, texture2D(tDepth, vUv).r) : smoothstep(0.85, 0.97, l) * step(0.45, vUv.y);',
    '  float nearSun = 1.0 - smoothstep(0.0, 0.55, distance(vUv, uSun));',
    // el cielo (sol, nubes encendidas) y la luz propia brillan enteros; las superficies claras (arena, nieve) apenas
    '  gl_FragColor = vec4(c * k * mix(0.3, 0.7, max(skyD, emis)), skyD * (0.35 + 0.65 * nearSun) * smoothstep(0.5, 0.97, l));',
    '}'].join('\n'),
    { tCol: { value: null }, tDepth: { value: null }, uTexel: { value: new THREE.Vector2() }, uThr: { value: 0.8 }, uHasDepth: { value: 0 }, uSun: { value: this.sunUV } });

  // 2) desenfoque gaussiano separable (9 muestras con interpolación lineal)
  this.mBlur = mat([
    'uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;',
    'void main(){',
    '  vec4 s = texture2D(tSrc, vUv) * 0.2270270270;',
    '  s += (texture2D(tSrc, vUv + uDir * 1.3846153846) + texture2D(tSrc, vUv - uDir * 1.3846153846)) * 0.3162162162;',
    '  s += (texture2D(tSrc, vUv + uDir * 3.2307692308) + texture2D(tSrc, vUv - uDir * 3.2307692308)) * 0.0702702703;',
    '  gl_FragColor = s;',
    '}'].join('\n'), { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });

  // 3) rayos de sol: desenfoque radial del cielo brillante hacia el sol
  this.mRays = mat([
    'uniform sampler2D tSrc; uniform vec2 uSun; uniform float uVis; varying vec2 vUv;',
    'void main(){',
    '  vec2 d = (uSun - vUv) / 28.0; vec2 p = vUv; float acc = 0.0, wgt = 1.0;',
    '  for (int i = 0; i < 28; i++) { acc += texture2D(tSrc, p).a * wgt; wgt *= 0.955; p += d; }',
    '  float fall = 1.0 - smoothstep(0.1, 0.9, distance(vUv, uSun));',
    '  gl_FragColor = vec4(vec3(acc / 20.0 * uVis * fall), 1.0);',
    '}'].join('\n'), { tSrc: { value: null }, uSun: { value: this.sunUV }, uVis: { value: 0 } });

  // 4) composición: FXAA sobre la escena + brillo + rayos + color + viñeta + tramado
  this.mComp = mat([
    'uniform sampler2D tCol; uniform sampler2D tQ; uniform sampler2D tE; uniform sampler2D tRays;',
    'uniform vec2 uTexel; uniform float uBloom; uniform float uRays; uniform vec3 uRayCol; uniform float uSat; uniform float uWarm; uniform float uVign; uniform float uStorm;',
    'varying vec2 vUv;',
    'float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }',
    'vec3 fxaa(vec2 uv){',
    '  vec3 cM = texture2D(tCol, uv).rgb;',
    '  vec3 cNW = texture2D(tCol, uv + vec2(-1.0, -1.0) * uTexel).rgb, cNE = texture2D(tCol, uv + vec2(1.0, -1.0) * uTexel).rgb;',
    '  vec3 cSW = texture2D(tCol, uv + vec2(-1.0, 1.0) * uTexel).rgb, cSE = texture2D(tCol, uv + vec2(1.0, 1.0) * uTexel).rgb;',
    '  float lM = luma(cM), lNW = luma(cNW), lNE = luma(cNE), lSW = luma(cSW), lSE = luma(cSE);',
    '  float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE))), lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));',
    '  if (lMax - lMin < max(0.0312, lMax * 0.125)) return cM;',
    '  vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), (lNW + lSW) - (lNE + lSE));',
    '  float red = max((lNW + lNE + lSW + lSE) * 0.03125, 0.0078125);',
    '  float rcp = 1.0 / (min(abs(dir.x), abs(dir.y)) + red);',
    '  dir = clamp(dir * rcp, vec2(-8.0), vec2(8.0)) * uTexel;',
    '  vec3 a = 0.5 * (texture2D(tCol, uv + dir * (1.0 / 3.0 - 0.5)).rgb + texture2D(tCol, uv + dir * (2.0 / 3.0 - 0.5)).rgb);',
    '  vec3 b = a * 0.5 + 0.25 * (texture2D(tCol, uv - dir * 0.5).rgb + texture2D(tCol, uv + dir * 0.5).rgb);',
    '  float lB = luma(b);',
    '  return (lB < lMin || lB > lMax) ? a : b;',
    '}',
    'void main(){',
    '  vec3 c = fxaa(vUv);',
    '  vec3 bl = texture2D(tQ, vUv).rgb * 0.55 + texture2D(tE, vUv).rgb * 0.75;',
    '  c += bl * uBloom;',
    '  c += uRayCol * texture2D(tRays, vUv).r * uRays;',
    // color de cine: un poco más de contraste en los medios y saturación que respeta lo ya saturado
    '  float l = luma(c);',
    '  c = mix(c, c * c * (3.0 - 2.0 * c), 0.18);',
    '  float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));',
    '  float vib = (uSat - 1.0) * (1.0 - (mx - mn));',
    '  c = mix(vec3(l), c, 1.0 + vib * (1.0 - uStorm * 0.8));',
    // sombras un poco frías, luces cálidas
    '  vec3 tone = mix(vec3(0.965, 0.99, 1.045), vec3(1.045, 1.01, 0.95), smoothstep(0.15, 0.85, l));',
    '  c *= mix(vec3(1.0), tone, uWarm);',
    '  vec2 q = vUv - 0.5; float v = 1.0 - uVign * smoothstep(0.2, 0.75, dot(q, q) * 2.2);',
    '  c *= v;',
    '  c += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;',
    '  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);',
    '}'].join('\n'),
    { tCol: { value: null }, tQ: { value: null }, tE: { value: null }, tRays: { value: null }, uTexel: { value: new THREE.Vector2() },
      uBloom: { value: 0.5 }, uRays: { value: 0.5 }, uRayCol: { value: new THREE.Color(1, 0.9, 0.7) }, uSat: { value: 1.1 }, uWarm: { value: 0.6 },
      uVign: { value: 0.24 }, uStorm: { value: 0 } });
  this.w = 0; this.h = 0;
}

Post.prototype.setSize = function (w, h) {
  w = Math.max(4, Math.round(w)); h = Math.max(4, Math.round(h));
  if (w === this.w && h === this.h) return;
  this.w = w; this.h = h;
  this.rtScene.setSize(w, h);
  if (this.depthOK) {
    if (this.rtScene.depthTexture) this.rtScene.depthTexture.dispose();
    const dt = new THREE.DepthTexture(w, h);
    dt.type = THREE.UnsignedIntType;
    this.rtScene.depthTexture = dt;
  }
  const qw = Math.max(2, w >> 2), qh = Math.max(2, h >> 2), ew = Math.max(2, w >> 3), eh = Math.max(2, h >> 3);
  this.q1.setSize(qw, qh); this.q2.setSize(qw, qh); this.rays.setSize(qw, qh);
  this.e1.setSize(ew, eh); this.e2.setSize(ew, eh);
};

Post.prototype._pass = function (m, target) {
  this.quad.material = m;
  this.r.setRenderTarget(target);
  this.r.render(this.scene, this.cam);
};

// sun: dirección del sol en el mundo; storm: 0..1
Post.prototype.render = function (scene, camera, sun, storm) {
  const r = this.r, L = this.look;
  r.getDrawingBufferSize(this._sz || (this._sz = new THREE.Vector2()));
  this.setSize(this._sz.x, this._sz.y);
  // dónde queda el sol en la pantalla, y si está delante de la cámara
  let vis = 0;
  if (sun) {
    const p = this._sp || (this._sp = new THREE.Vector3());
    p.copy(camera.position).addScaledVector(sun, 1000).project(camera);
    const fwd = this._fw || (this._fw = new THREE.Vector3());
    camera.getWorldDirection(fwd);
    if (fwd.dot(sun) > 0) {
      this.sunUV.set(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5);
      vis = (1 - U.smooth(0.55, 1.1, Math.max(Math.abs(p.x), Math.abs(p.y)))) * U.smooth(0.0, 0.25, fwd.dot(sun)) * (1 - storm);
    }
  }
  r.setRenderTarget(this.rtScene);
  r.render(scene, camera);

  const mb = this.mBright.uniforms;
  mb.tCol.value = this.rtScene.texture; mb.tDepth.value = this.depthOK ? this.rtScene.depthTexture : null;
  mb.uHasDepth.value = this.depthOK ? 1 : 0; mb.uThr.value = L.thr;
  mb.uTexel.value.set(1 / this.w, 1 / this.h);
  this._pass(this.mBright, this.q1);

  const bu = this.mBlur.uniforms;
  const blur = (a, b, w, h, s) => {
    bu.tSrc.value = a.texture; bu.uDir.value.set(s / w, 0); this._pass(this.mBlur, b);
    bu.tSrc.value = b.texture; bu.uDir.value.set(0, s / h); this._pass(this.mBlur, a);
  };
  blur(this.q1, this.q2, this.q1.width, this.q1.height, 1.0);
  // segundo nivel, más ancho, a 1/8
  bu.tSrc.value = this.q1.texture; bu.uDir.value.set(0, 0); this._pass(this.mBlur, this.e1);
  blur(this.e1, this.e2, this.e1.width, this.e1.height, 1.4);

  const mr = this.mRays.uniforms;
  mr.tSrc.value = this.q1.texture; mr.uVis.value = vis;
  if (vis > 0.01 && L.rays > 0) this._pass(this.mRays, this.rays);

  const mc = this.mComp.uniforms;
  mc.tCol.value = this.rtScene.texture; mc.tQ.value = this.q1.texture; mc.tE.value = this.e1.texture; mc.tRays.value = this.rays.texture;
  mc.uTexel.value.set(1 / this.w, 1 / this.h);
  mc.uBloom.value = L.bloom * (1 - storm * 0.4);
  mc.uRays.value = vis > 0.01 ? L.rays : 0;
  if (sun) mc.uRayCol.value.copy(this.g.sun.color).lerp(this._white || (this._white = new THREE.Color(1, 1, 1)), 0.25);
  mc.uSat.value = L.sat; mc.uWarm.value = L.warm; mc.uVign.value = L.vign; mc.uStorm.value = storm;
  this._pass(this.mComp, null);
};

Post.prototype.dispose = function () {
  for (const t of [this.rtScene, this.q1, this.q2, this.e1, this.e2, this.rays]) t.dispose();
  if (this.rtScene.depthTexture) this.rtScene.depthTexture.dispose();
  for (const m of [this.mBright, this.mBlur, this.mRays, this.mComp]) m.dispose();
};
