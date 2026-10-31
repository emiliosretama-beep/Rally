// Dibujo del Gigante Blanco: nieve, glaciar y grietas, montañas lejanas, mar de nubes,
// cuerdas fijas con estacas, escaleras de aluminio, faroles de los campamentos, letreros
// de los campos y los escaladores de la expedición. Extiende Gfx. Solo dibuja.
'use strict';

// Colores de las paredes de cada tramo (hielo azul o roca oscura con nieve)
const K2_PAL = [
  { rock: 0x9fc6e0, rock2: 0xdcecf8, wet: 0x6f9ec0, moss: 0xffffff, cap: 0xf2f7fb, floor: 0xe6edf4 },  // la cascada de hielo
  { rock: 0xa9c4d8, rock2: 0xe3eef6, wet: 0x7fa0b8, moss: 0xffffff, cap: 0xf4f8fb, floor: 0xe9eff5 },  // la gran ladera
  { rock: 0x5a524c, rock2: 0x7a6c60, wet: 0x3a3532, moss: 0xe8eef5, cap: 0xeef3f8, floor: 0xe3e9f0 },  // la banda de roca
  { rock: 0x8fb4cc, rock2: 0xdde9f2, wet: 0x6c8ea8, moss: 0xffffff, cap: 0xf5f8fb, floor: 0xedf2f7 },  // el hombro
  { rock: 0x9dbad0, rock2: 0xe2edf5, wet: 0x6f8fa8, moss: 0xffffff, cap: 0xf6f9fc, floor: 0xf0f4f8 }   // la cumbre
];

Gfx.prototype._terrainColorSnow = function (x, y, z, ny, out, vi) {
  const w = this.world, nz = w.noise, tmp = this._c2, t3 = this._c3 || (this._c3 = new THREE.Color());
  const v = nz.n2(x * 0.13, z * 0.13) * 0.035 + nz.fbm(x * 0.03, z * 0.03, 2) * 0.045;
  // nieve: blanca en lo plano, azulada en las hondonadas
  out.set(0xf1f5fa).lerp(tmp.set(0xcfdcea), U.clamp(0.45 - nz.fbm(x * 0.02 + 5, z * 0.02, 2) * 1.6, 0, 1) * 0.65);
  // roca en lo empinado
  const steep = U.smooth(0.84, 0.62, ny);
  if (steep > 0) {
    tmp.set(0x4b4643).lerp(t3.set(0x72685e), U.clamp(0.5 + nz.fbm(x * 0.08, y * 0.12 + z * 0.02, 2) * 1.4, 0, 1));
    out.lerp(tmp, steep);
  }
  // glaciar azulado al pie, con grietas
  const pk = w.peak, r = Math.hypot(x - pk.x, z - pk.z);
  if (y < 8 && r > 280) {
    const gl = U.smooth(8, 0, y) * U.smooth(280, 340, r);
    out.lerp(tmp.set(0xbcd8ec), gl * 0.5);
    if (Math.abs(nz.n2(x * 0.06, z * 0.24)) < 0.035) out.lerp(tmp.set(0x5d84a8), gl * 0.75);
  }
  // morrena junto al campamento base
  const c0 = w.camps[0], dc = Math.hypot(x - c0.x, z - c0.z);
  if (dc < 34) out.lerp(tmp.set(0x8a857e), U.smooth(34, 14, dc) * (nz.n2(x * 0.3, z * 0.3) > -0.1 ? 0.8 : 0.3));
  if (vi !== undefined && w.gmap[vi]) {
    if (w.pmap[vi]) {
      // grieta: hielo azul cada vez más oscuro hacia el fondo
      const p = w.pits[w.pmap[vi] - 1];
      return out.set(0x1f3a5a).lerp(tmp.set(0x8fbbe0), U.clamp((y - p.y) / 12, 0, 1));
    }
    out.lerp(tmp.set(0xc4ced9), 0.32); // nieve pisada por la expedición
  }
  out.multiplyScalar(1 + v);
  return out;
};

// Mar de nubes alrededor del valle: desde los campos altos la montaña sale de las nubes
Gfx.prototype._buildCloudSea = function () {
  const w = this.world;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uDetail: { value: this.detailTex }, uSun: { value: new THREE.Color(1, 1, 1) }, uHor: { value: new THREE.Color(0xdbe7f2) }, uStorm: { value: 0 }, uHalf: { value: w.half - 40 } },
    transparent: true, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vW = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }',
    fragmentShader: [
      'uniform float uTime; uniform sampler2D uDetail; uniform vec3 uSun; uniform vec3 uHor; uniform float uStorm; uniform float uHalf; varying vec3 vW;',
      'void main(){ vec2 p = vW.xz;',
      ' float n = texture2D(uDetail, p * 0.0016 + vec2(uTime * 0.0015, 0.0)).r * 0.6 + texture2D(uDetail, p * 0.0047 - vec2(0.0, uTime * 0.0025)).r * 0.4;',
      ' float edge = max(abs(p.x), abs(p.y));',
      ' float hole = smoothstep(uHalf - 10.0, uHalf + 80.0, edge);',
      ' float far = 1.0 - smoothstep(1700.0, 2150.0, length(p));',
      ' float a = smoothstep(0.3, 0.58, n) * hole * far;',
      ' vec3 c = mix(vec3(0.88, 0.92, 0.97), uSun, 0.3) * (0.84 + n * 0.22);',
      ' c = mix(c, uHor, 0.2 + uStorm * 0.4);',
      ' gl_FragColor = vec4(c, a * 0.96); }'
    ].join('\n')
  });
  const g = new THREE.PlaneGeometry(4400, 4400, 1, 1);
  g.rotateX(-Math.PI / 2);
  this.cloudSea = new THREE.Mesh(g, mat);
  this.cloudSea.position.y = 42;
  this.cloudSea.frustumCulled = false;
  this.cloudSea.renderOrder = 1;
  this.scene.add(this.cloudSea);
};

// Faroles de los campamentos (se prenden al llegar): hacen el papel de las fogatas
Gfx.prototype._buildLanterns = function () {
  const w = this.world, S = this.scene;
  const glowTex = glowTexture('rgba(255,214,140,0.95)', 'rgba(255,170,60,0)');
  const lampG = mergeColored([
    { g: new THREE.CylinderGeometry(0.035, 0.035, 1.5, 5), m: mtx(0, 0.75, 0), c: 0x3a3f46 },
    { g: new THREE.BoxGeometry(0.22, 0.28, 0.22), m: mtx(0, 1.55, 0), c: 0x2a2d33 }
  ]);
  const vmat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffd98a });
  return w.campfires.map((f, i) => {
    const g = new THREE.Group(), p = this.world.campFrame(i).at(2.8, 4.6);
    g.position.set(p.x, p.y, p.z);
    g.add(new THREE.Mesh(lampG, vmat));
    const fl = new THREE.Group();
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.16), lightMat); bulb.position.y = 1.55;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.scale.set(3.4, 3.4, 1); glow.position.y = 1.55;
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(6, 6).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35 }));
    pool.position.y = 0.05;
    fl.add(bulb); fl.add(glow); fl.add(pool);
    g.add(fl);
    S.add(g);
    return { g, fl, glow };
  });
};

Gfx.prototype._buildK2 = function () {
  this._buildRanges();
  this._buildFixedLines();
  this._buildLadders();
  this._buildLabels();
  this._buildNPCs();
};

// Montañas lejanas alrededor (más bajas que el Gigante Blanco)
Gfx.prototype._buildRanges = function () {
  const w = this.world, rng = U.rng(w.seed ^ 0x9a9), pk = w.peak, parts = [];
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * Math.PI * 2 + rng() * 0.25, d = 760 + rng() * 950;
    const h = 120 + rng() * 120 + (d - 760) * 0.06, rad = 210 + rng() * 260;
    const g = new THREE.ConeGeometry(rad, h, 12, 6, true);
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k), ang = Math.atan2(z, x), fy = (y + h / 2) / h;
      // aristas marcadas y bordes irregulares (por posición, para no abrir grietas en la malla)
      const ridge = 1 - 0.28 * Math.abs(Math.sin(ang * 2.5 + i)) + w.noise.n2(x * 0.01 + i * 3, z * 0.01) * 0.1 * (1 - fy);
      pos.setXYZ(k, x * ridge, y, z * ridge);
      const snowy = fy > 0.38 + w.noise.n2(ang * 3 + i, fy * 4) * 0.12;
      c.set(snowy ? 0xf3f6fa : 0x5a5f6a);
      if (!snowy && w.noise.n2(ang * 9, fy * 9 + i) > 0.25) c.set(0xe6ecf3);
      c.multiplyScalar(0.85 + fy * 0.2);
      col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.translate(0, h / 2 - 70, 0);
    parts.push({ g, m: mtx(pk.x + Math.cos(a) * d, 0, pk.z + Math.sin(a) * d, 0, rng() * 3, 0), c: 0xffffff });
  }
  this.rangeMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, fog: false, emissive: 0x8899aa });
  const m = new THREE.Mesh(mergeColored(parts), this.rangeMat);
  m.frustumCulled = false;
  this.scene.add(m);
};

// Cuerdas fijas rojas sobre la nieve, con estacas de aluminio
Gfx.prototype._buildFixedLines = function () {
  const w = this.world, deco = [], stakes = [];
  const seg = (a, b, r) => {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, len = Math.hypot(dx, dy, dz);
    if (len < 1e-3) return;
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len));
    deco.push({ g: new THREE.CylinderGeometry(r, r, len, 4), m: new THREE.Matrix4().compose(new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2), q, new THREE.Vector3(1, 1, 1)), c: 0xffffff });
  };
  for (const L of w.lines) for (let i = 0; i < L.pts.length - 1; i++) {
    // un poco de comba entre estacas
    const a = L.pts[i], b = L.pts[i + 1], sa = Math.sin((i % 7) / 7 * Math.PI) * 0.12, sb = Math.sin(((i + 1) % 7 || 7) / 7 * Math.PI) * 0.12;
    seg({ x: a.x, y: a.y - sa, z: a.z }, { x: b.x, y: b.y - ((i + 1) % 7 ? sb : 0), z: b.z }, 0.025);
  }
  this.lineMat = new THREE.MeshLambertMaterial({ vertexColors: true, color: 0xd8382a, emissive: 0x000000 });
  if (deco.length) { const m = new THREE.Mesh(mergeColored(deco), this.lineMat); m.castShadow = this.Q.shadow; this.scene.add(m); }
  for (const p of w.pickets) {
    const h = (w.lines[p.line] ? w.lines[p.line].h : 0.6) + 0.12;
    stakes.push({ g: new THREE.CylinderGeometry(0.035, 0.03, h + 0.3, 5), m: mtx(p.x, p.y + h / 2 - 0.15, p.z), c: 0xc9ced4 });
    stakes.push({ g: new THREE.TorusGeometry(0.05, 0.015, 4, 8), m: mtx(p.x, p.y + h - 0.12, p.z, Math.PI / 2, 0, 0), c: 0x8a9096 });
  }
  if (stakes.length) this.scene.add(new THREE.Mesh(mergeColored(stakes), new THREE.MeshLambertMaterial({ vertexColors: true })));
};

// En la ventisca las cuerdas fijas brillan: son la guía para no perderse
Gfx.prototype.setLineGlow = function (k) {
  if (!this.lineMat) return;
  const g = U.clamp(k, 0, 1) * (0.75 + Math.sin(this.time * 4) * 0.15);
  this.lineMat.emissive.setRGB(0.85 * g, 0.18 * g, 0.08 * g);
};

// Escaleras de aluminio: sobre las grietas y por las paredes de hielo
Gfx.prototype._buildLadders = function () {
  const w = this.world, parts = [], sp = { x: 0, z: 0, nx: 0, nz: 0, y0: 0, y1: 0, amp: 0 };
  const AL = 0xc8cdd2, CAP = 0xe0642a;
  const cyl = (a, b, r, c) => {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z, len = Math.hypot(dx, dy, dz);
    if (len < 1e-3) return;
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / len, dy / len, dz / len));
    parts.push({ g: new THREE.CylinderGeometry(r, r, len, 5), m: new THREE.Matrix4().compose(new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2), q, new THREE.Vector3(1, 1, 1)), c });
  };
  for (const L of w.ladders) {
    const dx = L.b.x - L.a.x, dz = L.b.z - L.a.z, len = Math.hypot(dx, dz), fx = dx / len, fz = dz / len, px = -fz * 0.27, pz = fx * 0.27, y = L.y + 0.03;
    for (const sg of [-1, 1]) {
      cyl({ x: L.a.x + px * sg, y, z: L.a.z + pz * sg }, { x: L.b.x + px * sg, y, z: L.b.z + pz * sg }, 0.03, AL);
      for (const e of [L.a, L.b]) parts.push({ g: new THREE.BoxGeometry(0.09, 0.09, 0.12), m: mtx(e.x + px * sg, y, e.z + pz * sg, 0, Math.atan2(fx, fz), 0), c: CAP });
    }
    for (let d = 0.2; d < len; d += 0.33) {
      const cx = L.a.x + fx * d, cz = L.a.z + fz * d;
      cyl({ x: cx - px, y, z: cz - pz }, { x: cx + px, y, z: cz + pz }, 0.02, 0xaab1b8);
    }
    // dos escaleras amarradas con cuerda a la mitad
    if (L.joint >= 0) {
      const cx = L.a.x + fx * len * L.joint, cz = L.a.z + fz * len * L.joint;
      for (const sg of [-1, 1]) parts.push({ g: new THREE.TorusGeometry(0.05, 0.02, 4, 8), m: mtx(cx + px * sg, y, cz + pz * sg, 0, Math.atan2(fx, fz), 0), c: 0xd8382a });
    }
  }
  // en las paredes de hielo, las escaleras verticales llevan largueros
  for (const st of w.strips) for (const z of st.zones) {
    if (z.type !== 'ladder') continue;
    for (const uu of [z.u0 + 0.12, z.u1 - 0.12]) {
      let prev = null;
      for (let yy = z.y0 + 1.1; yy <= z.y1 + 0.05; yy += 1) {
        w.stripPoint(st, uu, sp);
        const r = w.relief(st, uu, yy, sp.amp) + 0.14, p = { x: sp.x + sp.nx * r, y: yy, z: sp.z + sp.nz * r };
        if (prev) cyl(prev, p, 0.03, AL);
        prev = p;
      }
    }
  }
  if (parts.length) { const m = new THREE.Mesh(mergeColored(parts), new THREE.MeshLambertMaterial({ vertexColors: true })); m.castShadow = this.Q.shadow; this.scene.add(m); }
};

// Letreros de los campos que se ven de lejos ("Campo 2", "Cumbre")
Gfx.prototype._labelTex = function (text) {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
  const x = cv.getContext('2d');
  x.font = '800 64px system-ui,-apple-system,"Segoe UI",sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 10; x.strokeStyle = 'rgba(20,10,10,0.75)'; x.strokeText(text, 256, 66);
  x.fillStyle = '#ff4a3a'; x.fillText(text, 256, 66);
  const t = new THREE.CanvasTexture(cv);
  return t;
};

Gfx.prototype._buildLabels = function () {
  const w = this.world;
  this.labels = w.checkpoints.map((c, i) => {
    const key = w.mtn.camps[i];
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._labelTex(T(key)), depthTest: false, depthWrite: false, transparent: true, sizeAttenuation: false, fog: false }));
    sp.scale.set(0.2, 0.05, 1);
    sp.position.set(c.x, c.y + 7, c.z);
    sp.renderOrder = 10;
    this.scene.add(sp);
    return { sp, key, lang: LANG, i };
  });
};

Gfx.prototype.updateLabels = function (game) {
  if (!this.labels) return;
  const cp = this.camera.position;
  for (const L of this.labels) {
    if (L.lang !== LANG) { L.sp.material.map.dispose(); L.sp.material.map = this._labelTex(T(L.key)); L.sp.material.needsUpdate = true; L.lang = LANG; }
    const d = L.sp.position.distanceTo(cp);
    const show = L.i > game.checkpoint && d > 22;
    L.sp.visible = show;
    if (show) L.sp.material.opacity = U.clamp((d - 22) / 25, 0, 1) * (1 - game.stormK * 0.7);
  }
};

// Escaladores de la IA: tres colores de traje, cada pieza en una malla por instancias
Gfx.prototype._buildNPCs = function () {
  const N = 6, vmat = this._rimify(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  const suits = [0xf2b21b, 0xd23b2b, 0x3a7bd5];
  this.npcBodies = suits.map(suit => {
    const g = mergeColored([
      { g: new THREE.CapsuleGeometry(0.27, 0.32, 3, 8), m: mtx(0, 0.36, 0, 0, 0, 0, 1, 1, 0.78), c: suit },
      { g: new THREE.BoxGeometry(0.48, 0.64, 0.3), m: mtx(0, 0.4, -0.32), c: 0x23252b },
      { g: new THREE.TorusGeometry(0.15, 0.045, 4, 10), m: mtx(0, 0.4, -0.49), c: 0xd8382a },
      { g: new THREE.SphereGeometry(0.235, 9, 7), m: mtx(0, 0.93, 0), c: 0xf0bf98 },
      { g: new THREE.SphereGeometry(0.255, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2), m: mtx(0, 0.97, 0), c: suit === 0xf2b21b ? 0xc8302a : 0xf4f4f4 },
      { g: new THREE.BoxGeometry(0.3, 0.09, 0.06), m: mtx(0, 0.95, 0.2), c: 0x1a1d24 }
    ]);
    const im = new THREE.InstancedMesh(g, vmat, N);
    im.frustumCulled = false; im.castShadow = this.Q.shadow;
    this.scene.add(im);
    return im;
  });
  const limbG = (len, w, end, boot) => {
    const parts = [{ g: new THREE.CapsuleGeometry(w / 2, len - w, 2, 6), m: mtx(0, -len / 2, 0), c: 0xffffff }];
    if (boot) parts.push({ g: new THREE.BoxGeometry(w + 0.06, 0.15, w + 0.18), m: mtx(0, -len - 0.02, 0.05), c: end });
    else parts.push({ g: new THREE.IcosahedronGeometry(w * 0.68, 0), m: mtx(0, -len, 0), c: end });
    return mergeColored(parts);
  };
  // brazos y piernas con su propio material: el color de cada escalador va por instancia
  const lmat = () => this._rimify(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  this.npcArms = new THREE.InstancedMesh(limbG(0.56, 0.15, 0x555555, false), lmat(), N * 2);
  this.npcLegs = new THREE.InstancedMesh(limbG(0.84, 0.19, 0xd8452c, true), lmat(), N * 2);
  for (let k = 0; k < N; k++) {
    for (const j of [k * 2, k * 2 + 1]) { this.npcArms.setColorAt(j, this._c.set(suits[k % 3])); this.npcLegs.setColorAt(j, this._c.set(0x2a2b31)); }
  }
  for (const m of [this.npcArms, this.npcLegs]) { if (m.instanceColor) m.instanceColor.needsUpdate = true; m.frustumCulled = false; m.castShadow = this.Q.shadow; this.scene.add(m); }
  this._nm = { root: new THREE.Matrix4(), body: new THREE.Matrix4(), tmp: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), v: new THREE.Vector3(), one: new THREE.Vector3(1, 1, 1), zero: new THREE.Vector3(0.0001, 0.0001, 0.0001) };
};

Gfx.prototype.updateNPCs = function (exp, dt) {
  if (!this.npcBodies || !exp) return;
  const M = this._nm, cp = this.camera.position, t = this.time;
  const limb = (mesh, j, px, py, rx, rz) => {
    M.tmp.compose(M.v.set(px, py, 0), M.q.setFromEuler(M.e.set(rx, 0, rz)), M.one);
    M.tmp.premultiply(M.body);
    mesh.setMatrixAt(j, M.tmp);
  };
  exp.list.forEach((n, k) => {
    const vis = Math.hypot(n.x - cp.x, n.y - cp.y, n.z - cp.z) < 150;
    // pose según lo que va haciendo
    const s = Math.sin(n.anim), mv = n.moving ? 1 : 0.15;
    let aL = -s * 0.5 * mv, aR = s * 0.5 * mv, lL = s * 0.6 * mv, lR = -s * 0.6 * mv, aLz = 0.12, aRz = -0.12, lean = 0.16, bob = Math.abs(Math.cos(n.anim)) * 0.05 * mv, bz = 0;
    if (n.wait > 0) { aL = 0.1; aR = -0.1; lL = lR = 0; lean = 0.05 + Math.sin(t * 1.3 + k) * 0.03; bob = 0; }
    else if (n.mode === 'jumar') { aR = -2.55; aL = -1.3 - Math.max(0, -s) * 0.5; lL = -0.25 - Math.max(0, s) * 0.8; lR = -0.25 - Math.max(0, -s) * 0.8; lean = 0.42; }
    else if (n.mode === 'climb') { aL = -2.7 + s * 0.45; aR = -2.7 - s * 0.45; lL = -0.5 - Math.max(0, s) * 0.7; lR = -0.5 - Math.max(0, -s) * 0.7; aLz = 0.35; aRz = -0.35; lean = 0.12; bz = 0.08; }
    else if (n.mode === 'ladder') { aL = aR = -0.5; aLz = 0.9; aRz = -0.9; lL = s * 0.3; lR = -s * 0.3; lean = 0.15; }
    else if (n.mode === 'mantle' || n.mode === 'jump') { aL = aR = -2.3; lL = -1; lR = -0.3; lean = 0.4; }
    if (n.mode === 'summit') { aR = -2.9 + Math.sin(t * 6 + k) * 0.25; aL = 0.1; lean = -0.05; }
    M.root.compose(M.v.set(n.x, n.y, n.z), M.q.setFromEuler(M.e.set(0, n.yaw, 0)), vis ? M.one : M.zero);
    M.tmp.compose(M.v.set(0, 0.95 + bob, bz), M.q.setFromEuler(M.e.set(lean, 0, 0)), M.one);
    M.body.multiplyMatrices(M.root, M.tmp);
    this.npcBodies.forEach((im, vi) => {
      if (vi === n.variant) im.setMatrixAt(k, M.body);
      else { M.tmp.compose(M.v.set(0, -999, 0), M.q.identity(), M.zero); im.setMatrixAt(k, M.tmp); }
    });
    limb(this.npcArms, k * 2, 0.34, 0.6, aL, aLz); limb(this.npcArms, k * 2 + 1, -0.34, 0.6, aR, aRz);
    limb(this.npcLegs, k * 2, 0.13, 0.02, lL, 0); limb(this.npcLegs, k * 2 + 1, -0.13, 0.02, lR, 0);
  });
  for (const im of this.npcBodies) im.instanceMatrix.needsUpdate = true;
  this.npcArms.instanceMatrix.needsUpdate = true; this.npcLegs.instanceMatrix.needsUpdate = true;
};

// Campamentos de la expedición: tiendas de domo, banderines de oración y tanques de oxígeno
Gfx.prototype._buildCampsSnow = function () {
  const w = this.world, rng = U.rng(w.seed ^ 0xca), parts = [];
  const dome = new THREE.SphereGeometry(1, 9, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  const tentCols = [0xf2b21b, 0xe8562a, 0xd23b2b, 0x3a7bd5, 0xf2b21b, 0x46a65a];
  const flagCols = [0x2f6fd6, 0xffffff, 0xd93a3a, 0x3aa65a, 0xffcf3a];
  const tent = (x, z, y, rot, col, big) => {
    const s = big ? 1.6 : 1;
    parts.push({ g: dome, m: mtx(x, y, z, 0, rot, 0, 1.3 * s, 1.0 * s, 1.1 * s), c: col });
    parts.push({ g: new THREE.ConeGeometry(0.55 * s, 0.9 * s, 4, 1, true), m: mtx(x + Math.sin(rot) * 1.15 * s, y + 0.4 * s, z + Math.cos(rot) * 1.15 * s, Math.PI / 2, rot, 0, 1, 1, 0.8), c: col });
    parts.push({ g: new THREE.BoxGeometry(0.5 * s, 0.6 * s, 0.05), m: mtx(x + Math.sin(rot) * 1.5 * s, y + 0.35 * s, z + Math.cos(rot) * 1.5 * s, 0, rot, 0), c: 0x2a2a30 });
  };
  const flags = (p1, p2) => {
    for (const p of [p1, p2]) parts.push({ g: new THREE.CylinderGeometry(0.05, 0.05, 3, 4), m: mtx(p.x, p.y + 1.5, p.z), c: 0x8a6a4a });
    const yaw = Math.atan2(p2.x - p1.x, p2.z - p1.z) + Math.PI / 2, n = 12;
    for (let k = 1; k < n; k++) {
      const t = k / n, x = U.lerp(p1.x, p2.x, t), z = U.lerp(p1.z, p2.z, t), y = U.lerp(p1.y, p2.y, t) + 2.9 - Math.sin(t * Math.PI) * 0.6;
      parts.push({ g: new THREE.PlaneGeometry(0.3, 0.34), m: mtx(x, y - 0.18, z, 0, yaw, 0), c: flagCols[k % 5] });
    }
  };
  // tiendas a los lados del camino, delante de donde apareces (lat, fwd); el camino cruza por el centro
  const TENTS_BASE = [[4.6, 1.8], [-4.6, 3.0], [5.0, 5.4], [-5.0, 6.6], [4.4, 8.6]], TENTS = [[-4.6, 2.4], [4.6, 2.0], [-4.8, 5.8]];
  w.camps.forEach((c, ci) => {
    const { dir, at } = w.campFrame(ci);
    const list = ci === 0 ? TENTS_BASE : c.summit ? [] : TENTS;
    list.forEach(([lat, fwd], k) => {
      const side = Math.sign(lat), p = at(lat, fwd + (rng() - 0.5) * 0.6);
      tent(p.x, p.z, p.y, dir + side * 1.4 + (rng() - 0.5) * 0.6, tentCols[(k + ci) % tentCols.length], false);
    });
    if (ci === 0) {
      // tienda comedor del campamento base (detrás, a un lado) y piedras alrededor, sin tapar el camino
      const p = at(-7.2, -3.5);
      parts.push({ g: new THREE.BoxGeometry(4, 1.6, 2.8), m: mtx(p.x, p.y + 0.8, p.z, 0, dir, 0), c: 0xe8e2d0 });
      parts.push({ g: new THREE.ConeGeometry(2.6, 1, 4), m: mtx(p.x, p.y + 2.1, p.z, 0, dir + Math.PI / 4, 0, 1, 1, 0.75), c: 0xd8d0bc });
      for (let k = 0; k < 18; k++) {
        const a = k / 18 * 6.28, lat = Math.cos(a) * 9.6, fwd = Math.sin(a) * 9.6;
        if (Math.abs(lat) < 3 || (lat < -4.5 && fwd < -1.5 && fwd > -5.5)) continue;
        const q = at(lat, fwd);
        parts.push({ g: new THREE.DodecahedronGeometry(0.35 + rng() * 0.25, 0), m: mtx(q.x, q.y + 0.15, q.z, rng(), rng(), rng()), c: 0x7d7a74 });
      }
    }
    // banderines de oración a los lados del camino, nunca cruzándolo (más en la base y en la cumbre)
    if (c.summit) { flags(at(-6.5, -5), at(-6.5, 5)); flags(at(6.5, -5), at(6.5, 5)); }
    else if (ci === 0) { flags(at(-7.2, 0.5), at(-7.2, 6.8)); flags(at(7.2, -2), at(7.2, 6)); }
    else flags(at(-6.5, -3), at(-6.5, 4));
    if (!c.summit && ci > 0) for (let k = 0; k < 3; k++) { const p = at(2.6 + k * 0.35, 6.4); parts.push({ g: new THREE.CylinderGeometry(0.11, 0.11, 0.62, 6), m: mtx(p.x, p.y + 0.31, p.z, 0, 0, 0.1 * k), c: 0xe06a2a }); }
  });
  const m = new THREE.Mesh(mergeColored(parts), new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide }));
  m.castShadow = this.Q.shadow; m.receiveShadow = this.Q.shadow;
  this.scene.add(m);
};
