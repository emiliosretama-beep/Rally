// El escalador: cuerpo con articulaciones (cadera, columna, cuello, hombros, codos, rodillas) y
// animación con cinemática inversa de dos huesos. Cada estado del jugador da una postura y
// objetivos para manos y pies (en el espacio del escalador): al escalar las manos van a presas
// reales y los pies pisan la roca; al caminar los pies pisan el terreno. Todo se suaviza para
// que los cambios de estado no salten. Extiende Gfx (render.js); solo dibuja.
'use strict';

// Medidas del cuerpo (metros). La raíz está en los pies; el escalador mira hacia +Z.
const CL = { hipY: 0.99, hipX: 0.105, hipDrop: 0.04, thigh: 0.45, shin: 0.43, ankle: 0.075,
  shX: 0.225, shY: 0.43, upArm: 0.29, foreArm: 0.265, neckY: 0.5, headY: 0.13 };

// Une piezas conservando sus normales suaves (se ve redondeado, no facetado).
// f(x, y, z) opcional: factor de brillo por vértice (sombreados, degradados).
function mergeSmooth(parts) {
  let nv = 0, ni = 0;
  const gs = parts.map(pt => {
    const g = pt.g.clone();
    if (pt.m) g.applyMatrix4(pt.m);
    nv += g.attributes.position.count;
    ni += g.index ? g.index.count : g.attributes.position.count;
    return { g, c: new THREE.Color(pt.c === undefined ? 0xffffff : pt.c), f: pt.f };
  });
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), col = new Float32Array(nv * 3);
  const idx = nv > 65000 ? new Uint32Array(ni) : new Uint16Array(ni);
  let o = 0, io = 0;
  for (const { g, c, f } of gs) {
    const P = g.attributes.position.array, N = g.attributes.normal.array, n = g.attributes.position.count;
    pos.set(P, o * 3); nor.set(N, o * 3);
    for (let i = 0; i < n; i++) {
      const k = f ? f(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]) : 1;
      col[(o + i) * 3] = c.r * k; col[(o + i) * 3 + 1] = c.g * k; col[(o + i) * 3 + 2] = c.b * k;
    }
    if (g.index) { const I = g.index.array; for (let i = 0; i < I.length; i++) idx[io + i] = I[i] + o; io += I.length; }
    else { for (let i = 0; i < n; i++) idx[io + i] = o + i; io += n; }
    o += n;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}

// Segmento de brazo o pierna a lo largo de -Y: cilindro que se adelgaza con esferas en las puntas
function limbParts(len, r0, r1, col, extra) {
  const p = [
    { g: new THREE.CylinderGeometry(r0, r1, len, 10, 1, true), m: mtx(0, -len / 2, 0), c: col },
    { g: new THREE.SphereGeometry(r0, 10, 6), m: mtx(0, 0, 0), c: col },
    { g: new THREE.SphereGeometry(r1, 10, 6), m: mtx(0, -len, 0), c: col }
  ];
  return extra ? p.concat(extra) : p;
}

Gfx.prototype._buildClimber = function () {
  const SN = this.isSnow, S = this.Q.shadow;
  const mat = this._rimify(new THREE.MeshLambertMaterial({ vertexColors: true }));
  const flat = this._rimify(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
  // ropa: chamarra naranja y pantalón azul en el volcán; traje de pluma amarillo y negro en la nieve
  const C = SN
    ? { jk: 0xf2b21b, jk2: 0x1c1d22, pants: 0x1f2026, skin: 0xe9b48e, pack: 0x23252b, boot: 0xd8452c, helm: 0xc8302a, glove: 0x1e1f24, rope: 0xd63a2a, harness: 0x2a2c33, hair: 0x2b1d14 }
    : { jk: 0xf07b1f, jk2: 0xb85514, pants: 0x2f3e5c, skin: 0xefbd95, pack: 0x9c2f2f, boot: 0x5a3320, helm: 0x2a8fd6, glove: 0x3a3a3a, rope: 0xe8c23a, harness: 0x30343c, hair: 0x3b2618 };
  const mk = (parts, m) => { const o = new THREE.Mesh(mergeSmooth(parts), m || mat); o.castShadow = S; return o; };
  const G = () => new THREE.Group();
  const root = G(), hips = G(), spine = G(), neck = G(), head = G();
  root.add(hips); hips.add(spine); spine.add(neck); neck.add(head);
  hips.position.y = CL.hipY; spine.position.y = 0.03; neck.position.y = CL.neckY; head.position.y = CL.headY; head.scale.setScalar(1.12);
  const puffy = (r, n, y0, y1, col) => { const out = []; for (let i = 0; i < n; i++) out.push({ g: new THREE.TorusGeometry(r, 0.022, 5, 14), m: mtx(0, U.lerp(y0, y1, (i + 0.5) / n), 0, Math.PI / 2, 0, 0, 1, 0.72, 1), c: col }); return out; };

  // cadera: pantalón y arnés con mosquetones y anilla de aseguramiento
  hips.add(mk([
    { g: new THREE.SphereGeometry(0.18, 14, 10), m: mtx(0, -0.035, 0, 0, 0, 0, 1, 0.82, 0.8), c: C.pants },
    { g: new THREE.TorusGeometry(0.176, 0.027, 6, 18), m: mtx(0, 0.0, 0, Math.PI / 2, 0, 0, 1, 0.8, 1), c: C.harness },
    { g: new THREE.TorusGeometry(0.035, 0.012, 5, 10), m: mtx(0, -0.06, 0.12, 0, 0, 0), c: 0xd0d4da },
    { g: new THREE.TorusGeometry(0.028, 0.008, 4, 10), m: mtx(0.13, -0.03, 0.06, 0, 1.2, 0), c: 0xd8c040 },
    { g: new THREE.TorusGeometry(0.028, 0.008, 4, 10), m: mtx(-0.13, -0.03, 0.06, 0, -1.2, 0), c: 0x9fd0ff },
    { g: new THREE.TorusGeometry(0.028, 0.008, 4, 10), m: mtx(0.15, -0.03, -0.02, 0, 1.5, 0), c: 0xe0603a }
  ]));
  // cintas exprés que cuelgan del arnés y se mecen
  const draws = [];
  for (const [x, z, c] of [[0.145, 0.02, 0x3fbf5a], [-0.145, 0.02, 0xe04a8a], [-0.15, -0.05, 0x3fa0e0]]) {
    const d = G(); d.position.set(x, -0.03, z);
    d.add(mk([{ g: new THREE.BoxGeometry(0.018, 0.09, 0.008), m: mtx(0, -0.05, 0), c }, { g: new THREE.TorusGeometry(0.02, 0.006, 4, 8), m: mtx(0, -0.1, 0, 0, Math.PI / 2, 0), c: 0xc8ccd2 }], flat));
    hips.add(d); draws.push(d);
  }
  // bolsa de magnesio atrás (volcán)
  if (!SN) hips.add(mk([
    { g: new THREE.CylinderGeometry(0.05, 0.045, 0.1, 10), m: mtx(0, -0.02, -0.16), c: 0x2bb3a8 },
    { g: new THREE.TorusGeometry(0.048, 0.01, 5, 12), m: mtx(0, 0.03, -0.16, Math.PI / 2, 0, 0), c: 0xf2f2f2 }
  ]));

  // torso: perfil torneado (cintura, pecho, hombros), cierre, bolsillos y capucha
  const prof = [[0.0, -0.02], [0.16, 0.0], [0.175, 0.08], [0.172, 0.16], [0.195, 0.26], [0.212, 0.34], [0.195, 0.41], [0.13, 0.47], [0.065, 0.5]].map(([r, y]) => new THREE.Vector2(r, y));
  const torso = [
    { g: new THREE.LatheGeometry(prof, 16), m: mtx(0, 0, 0, 0, 0, 0, 1, 1, 0.72), c: C.jk, f: (x, y) => 0.88 + 0.14 * U.smooth(0, 0.4, y) },
    { g: new THREE.BoxGeometry(0.02, 0.4, 0.01), m: mtx(0, 0.24, 0.15), c: C.jk2 },
    { g: new THREE.BoxGeometry(0.1, 0.075, 0.02), m: mtx(0.085, 0.16, 0.13, 0, 0.25, 0), c: C.jk2 },
    { g: new THREE.BoxGeometry(0.1, 0.075, 0.02), m: mtx(-0.085, 0.16, 0.13, 0, -0.25, 0), c: C.jk2 },
    // hombros de otro color
    { g: new THREE.SphereGeometry(0.088, 10, 6), m: mtx(0.19, 0.42, 0, 0, 0, 0, 1, 0.8, 1), c: C.jk2 },
    { g: new THREE.SphereGeometry(0.088, 10, 6), m: mtx(-0.19, 0.42, 0, 0, 0, 0, 1, 0.8, 1), c: C.jk2 },
    // capucha en la espalda / cuello alto
    { g: new THREE.TorusGeometry(0.085, 0.04, 6, 14), m: mtx(0, 0.49, -0.01, Math.PI / 2, 0, 0, 1, 1, 0.9), c: SN ? 0xd9d4c8 : C.jk2 }
  ];
  if (SN) torso.push(...puffy(0.175, 4, 0.06, 0.36, 0xd99a12));
  // tirantes de la mochila
  torso.push({ g: new THREE.BoxGeometry(0.04, 0.36, 0.02), m: mtx(0.1, 0.27, 0.138, -0.08, 0, 0), c: C.harness }, { g: new THREE.BoxGeometry(0.04, 0.36, 0.02), m: mtx(-0.1, 0.27, 0.138, -0.08, 0, 0), c: C.harness });
  spine.add(mk(torso));
  // mochila con la cuerda enrollada arriba (se mece un poco)
  const pack = G(); pack.position.set(0, 0.28, -0.15); spine.add(pack);
  pack.add(mk([
    { g: new THREE.CapsuleGeometry(0.135, 0.22, 4, 10), m: mtx(0, 0, -0.06, 0, 0, 0, 1.2, 1, 0.64), c: C.pack, f: (x, y) => 0.85 + 0.2 * U.smooth(-0.2, 0.2, y) },
    { g: new THREE.BoxGeometry(0.2, 0.1, 0.03), m: mtx(0, -0.07, -0.135), c: SN ? 0x3a3c44 : 0x7a2222 },
    { g: new THREE.TorusGeometry(0.11, 0.035, 6, 16), m: mtx(0, 0.2, -0.06, Math.PI / 2, 0, 0, 1, 0.75, 1), c: C.rope },
    { g: new THREE.TorusGeometry(0.075, 0.03, 6, 14), m: mtx(0, 0.22, -0.06, Math.PI / 2, 0, 0, 1, 0.75, 1), c: C.rope }
  ]));
  // bandana que ondea (volcán) o el cordón de la capucha (nieve)
  const scarf = G(); scarf.position.set(0.05, 0.47, -0.07); spine.add(scarf);
  scarf.add(mk([{ g: new THREE.BoxGeometry(0.07, 0.26, 0.015), m: mtx(0, -0.12, 0), c: SN ? 0xd63a2a : 0xd8343a }, { g: new THREE.BoxGeometry(0.072, 0.03, 0.017), m: mtx(0, -0.24, 0), c: 0xffffff }], flat));

  // cabeza: cara, ojos que parpadean, cejas que se fruncen, boca que jadea; casco y lámpara
  head.add(mk([
    { g: new THREE.SphereGeometry(0.1, 16, 12), m: mtx(0, 0.0, 0.0, 0, 0, 0, 0.92, 1.08, 1), c: C.skin },
    { g: new THREE.SphereGeometry(0.05, 10, 8), m: mtx(0, -0.065, 0.035, 0, 0, 0, 1.15, 0.7, 1), c: C.skin },
    { g: new THREE.ConeGeometry(0.018, 0.04, 6), m: mtx(0, -0.005, 0.1, Math.PI / 2, 0, 0), c: 0xe0a07e },
    { g: new THREE.SphereGeometry(0.022, 6, 5), m: mtx(0.092, -0.005, 0, 0, 0, 0, 0.6, 1, 1), c: C.skin },
    { g: new THREE.SphereGeometry(0.022, 6, 5), m: mtx(-0.092, -0.005, 0, 0, 0, 0, 0.6, 1, 1), c: C.skin },
    { g: new THREE.SphereGeometry(0.099, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), m: mtx(0, 0.008, -0.012, -0.35, 0, 0), c: C.hair },
    // casco con visera, franja y lámpara
    { g: new THREE.SphereGeometry(0.118, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), m: mtx(0, 0.035, -0.005, 0, 0, 0, 1, 0.95, 1.06), c: C.helm, f: (x, y) => 0.85 + 0.25 * U.smooth(0.03, 0.14, y) },
    { g: new THREE.TorusGeometry(0.115, 0.012, 5, 18), m: mtx(0, 0.035, -0.005, Math.PI / 2, 0, 0, 1, 1.06, 1), c: SN ? 0x1c1d22 : 0xf2f2f2 },
    { g: new THREE.BoxGeometry(0.035, 0.026, 0.02), m: mtx(0, 0.07, 0.118, -0.3, 0, 0), c: 0x2a2a2a },
    { g: new THREE.CylinderGeometry(0.012, 0.012, 0.01, 10), m: mtx(0, 0.07, 0.13, Math.PI / 2 - 0.3, 0, 0), c: 0xfff6c8 },
    { g: new THREE.BoxGeometry(0.008, 0.11, 0.008), m: mtx(0.085, -0.04, 0.02, 0, 0, 0.15), c: 0x222222 },
    { g: new THREE.BoxGeometry(0.008, 0.11, 0.008), m: mtx(-0.085, -0.04, 0.02, 0, 0, -0.15), c: 0x222222 }
  ]));
  // gafas de nieve sobre el casco
  if (SN) head.add(mk([
    { g: new THREE.BoxGeometry(0.17, 0.045, 0.03), m: mtx(0, 0.065, 0.095, -0.35, 0, 0), c: 0xff8a2a },
    { g: new THREE.TorusGeometry(0.105, 0.008, 4, 18, Math.PI), m: mtx(0, 0.06, 0.0, 0, 0, Math.PI / 2 - Math.PI / 2, 1, 0.5, 1), c: 0x111111 }
  ], flat));
  const eyes = G(); eyes.position.set(0, 0.012, 0.086); head.add(eyes);
  eyes.add(mk([
    { g: new THREE.SphereGeometry(0.014, 8, 6), m: mtx(0.034, 0, 0, 0, 0, 0, 1, 1, 0.6), c: 0xf6f6f6 },
    { g: new THREE.SphereGeometry(0.014, 8, 6), m: mtx(-0.034, 0, 0, 0, 0, 0, 1, 1, 0.6), c: 0xf6f6f6 },
    { g: new THREE.SphereGeometry(0.008, 6, 5), m: mtx(0.034, 0, 0.007), c: 0x2a1c12 },
    { g: new THREE.SphereGeometry(0.008, 6, 5), m: mtx(-0.034, 0, 0.007), c: 0x2a1c12 }
  ]));
  const brows = [G(), G()];
  brows.forEach((b, i) => { b.position.set(i ? -0.034 : 0.034, 0.038, 0.092); b.add(mk([{ g: new THREE.BoxGeometry(0.03, 0.007, 0.008), c: C.hair }], flat)); head.add(b); });
  const mouth = mk([{ g: new THREE.BoxGeometry(0.032, 0.008, 0.008), c: 0x6a2a24 }], flat);
  mouth.position.set(0, -0.052, 0.093); head.add(mouth);

  // brazos: hombro → brazo → antebrazo → mano (guante); mangas con puño de otro color
  const arm = side => {
    const sh = G(); sh.position.set(side * CL.shX, CL.shY, 0); spine.add(sh);
    sh.add(mk(limbParts(CL.upArm, 0.066, 0.056, C.jk, SN ? puffy(0.064, 2, -0.08, -0.22, 0xd99a12) : null)));
    const el = G(); el.position.y = -CL.upArm; sh.add(el);
    el.add(mk(limbParts(CL.foreArm, 0.055, 0.046, C.jk, [{ g: new THREE.CylinderGeometry(0.051, 0.051, 0.045, 10), m: mtx(0, -CL.foreArm + 0.022, 0), c: C.jk2 }])));
    const hand = G(); hand.position.y = -CL.foreArm; el.add(hand);
    hand.add(mk([
      { g: new THREE.SphereGeometry(0.05, 10, 8), m: mtx(0, -0.05, 0.005, 0, 0, 0, 0.88, 1.15, 0.72), c: C.glove },
      { g: new THREE.CapsuleGeometry(0.014, 0.03, 3, 6), m: mtx(side * -0.028, -0.035, 0.022, 0.4, 0, side * 0.5), c: C.glove }
    ]));
    return { sh, el, hand };
  };
  // piernas: cadera → muslo → rodilla → espinilla → pie (zapato de escalar o bota con crampones)
  const leg = side => {
    const hp = G(); hp.position.set(side * CL.hipX, -CL.hipDrop, 0); hips.add(hp);
    hp.add(mk(limbParts(CL.thigh, 0.09, 0.07, C.pants, [{ g: new THREE.TorusGeometry(0.092, 0.018, 5, 14), m: mtx(0, -0.07, 0, Math.PI / 2, 0, 0), c: C.harness }].concat(SN ? puffy(0.084, 2, -0.15, -0.35, 0x2c2d33) : []))));
    const kn = G(); kn.position.y = -CL.thigh; hp.add(kn);
    kn.add(mk(limbParts(CL.shin, 0.068, 0.055, C.pants, [{ g: new THREE.SphereGeometry(0.036, 8, 6), m: mtx(0, 0, 0.055), c: SN ? 0x2c2d33 : 0x3a4a6a }])));
    const ft = G(); ft.position.y = -CL.shin; kn.add(ft);
    const bootParts = [
      { g: new THREE.CapsuleGeometry(0.056, 0.15, 4, 10), m: mtx(0, -CL.ankle + 0.04, 0.06, Math.PI / 2, 0, 0, 1, 1, 0.75), c: C.boot },
      { g: new THREE.CylinderGeometry(0.064, 0.058, 0.085, 10), m: mtx(0, -0.01, 0, 0, 0, 0), c: SN ? C.boot : C.pants },
      { g: new THREE.BoxGeometry(0.115, 0.024, 0.28), m: mtx(0, -CL.ankle + 0.005, 0.06), c: SN ? 0x2a2a2a : 0xc8402a }
    ];
    if (SN) for (let i = 0; i < 5; i++) bootParts.push({ g: new THREE.ConeGeometry(0.01, 0.035, 4), m: mtx(((i % 2) - 0.5) * 0.06, -CL.ankle - 0.02, -0.04 + i * 0.045, Math.PI, 0, 0), c: 0xb8bec6 });
    ft.add(mk(bootParts, flat));
    return { hp, kn, ft };
  };
  const arms = [arm(1), arm(-1)], legs = [leg(1), leg(-1)];
  // piolets en las manos
  const axe = () => {
    const m = mk([
      { g: new THREE.CylinderGeometry(0.014, 0.017, 0.5, 6), m: mtx(0, -0.25, 0.02), c: 0x2b6fd6 },
      { g: new THREE.BoxGeometry(0.022, 0.035, 0.22), m: mtx(0, -0.5, 0.08), c: 0x9aa3ad },
      { g: new THREE.BoxGeometry(0.02, 0.04, 0.05), m: mtx(0, -0.5, -0.06), c: 0x6d757e }
    ], flat);
    m.rotation.x = -0.5; m.position.set(0, -0.04, 0.02); m.visible = false;
    return m;
  };
  const axeL = axe(), axeR = axe();
  arms[0].hand.add(axeL); arms[1].hand.add(axeR);
  // las piezas diminutas no necesitan sombra (ahorra dibujos en la pasada de sombras)
  for (const o of [eyes, mouth, scarf, ...brows, ...draws]) o.traverse(m => { if (m.isMesh) m.castShadow = false; });
  this.scene.add(root);
  this.ch = { root, hips, spine, neck, head, eyes, brows, mouth, pack, scarf, draws, arms, legs, axeL, axeR };
  // postura suavizada (objetivos en el espacio del escalador)
  const V = () => new THREE.Vector3();
  this._cp = {
    hands: [V().set(0.22, 0.9, 0.05), V().set(-0.22, 0.9, 0.05)], feet: [V().set(0.11, 0, 0.03), V().set(-0.11, 0, 0.03)],
    hip: V().set(0, CL.hipY, 0), hipR: V(), spR: V(), look: { yaw: 0, pitch: 0 },
    aPole: [V().set(1, -0.4, -1).normalize(), V().set(-1, -0.4, -1).normalize()], lPole: [V().set(0.2, 0, 1).normalize(), V().set(-0.2, 0, 1).normalize()],
    footPitch: [0, 0], open: 0, effort: 0
  };
  this._cw = { // destino de este cuadro (se suaviza hacia aquí)
    hands: [V(), V()], feet: [V(), V()], hip: V(), hipR: V(), spR: V(), look: { yaw: 0, pitch: 0 },
    aPole: [V(), V()], lPole: [V(), V()], footPitch: [0, 0], open: 0, effort: 0
  };
  this._cx = { land: 0, idleT: 0, blinkT: 2, restT: 0, puffed: false, lastState: '', v: V(), v2: V(), v3: V(), q: new THREE.Quaternion(), q2: new THREE.Quaternion(), q3: new THREE.Quaternion(), m: new THREE.Matrix4(),
    x: V(), y: V(), z: V(), e: V(), f: V(), p: V(), d: V() };
};

// Base de un hueso: su eje -Y apunta en "down" y su +Z hacia "fwd" (lo más posible)
Gfx.prototype._boneQ = function (q, down, fwd) {
  const X = this._cx, y = X.y.copy(down).negate(), z = X.z.copy(fwd).addScaledVector(y, -fwd.dot(y));
  if (z.lengthSq() < 1e-6) z.set(0, 0, 1).addScaledVector(y, -y.z);
  if (z.lengthSq() < 1e-6) z.set(1, 0, 0);
  z.normalize();
  const x = X.x.crossVectors(y, z);
  X.m.makeBasis(x, y, z);
  return q.setFromRotationMatrix(X.m);
};

// IK de dos huesos en el espacio del padre del primer hueso. T y pole en ese espacio.
// endQ (opcional): orientación deseada de la mano/pie en ese mismo espacio.
Gfx.prototype._ik2 = function (up, low, end, a, b, T, pole, endQ) {
  const X = this._cx, S = up.position, d0 = X.d.subVectors(T, S);
  let d = d0.length();
  const dir = d > 1e-5 ? d0.multiplyScalar(1 / d) : d0.set(0, -1, 0);
  d = U.clamp(d, Math.abs(a - b) + 0.02, a + b - 0.003);
  const cosA = U.clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  const pp = X.p.copy(pole).addScaledVector(dir, -pole.dot(dir));
  if (pp.lengthSq() < 1e-6) pp.set(0, 0, 1).addScaledVector(dir, -dir.z);
  pp.normalize();
  const e = X.e.copy(dir).multiplyScalar(cosA).addScaledVector(pp, sinA);
  // dirección del segundo hueso: del codo/rodilla al objetivo (ya recortado al alcance)
  const f = X.f.copy(dir).multiplyScalar(d).addScaledVector(e, -a).normalize();
  const qU = this._boneQ(X.q, e, pp), qL = this._boneQ(X.q2, f, pp);
  up.quaternion.copy(qU);
  low.quaternion.copy(qU).invert().multiply(qL);
  if (end && endQ) end.quaternion.copy(qL).invert().multiply(endQ);
};

// Presas para manos y pies al escalar (posiciones en el mundo): una mano y el pie contrario se
// mueven a la vez, con un arco que separa la mano de la roca a medio camino.
Gfx.prototype._climbTargets = function (pl, out) {
  const list = this.holds.get(pl.cs.id);
  if (!list || !list.length) return false;
  const I = this._ik || (this._ik = { pts: [null, null, null, null], from: [null, null, null, null], k: -1, active: false, mover: -1, ph: 0 });
  const cu = pl.cu, cy = pl.pos.y + 1, du = pl.dirU;
  const my = cy - (I.lastY === undefined ? cy : I.lastY);
  I.lastY = cy;
  const pick = (side, y0, y1, ideal, exclude) => {
    let best = null, bd = 1e9;
    for (let i = 0; i < list.length; i++) {
      const h = list[i];
      if (h.y < y0 || h.y > y1 || h === exclude) continue;
      const du2 = h.u - (cu + side * du * 0.2), dy = h.y - ideal;
      if (Math.abs(du2) > 0.6) continue;
      const dd = du2 * du2 + dy * dy * 0.6;
      if (dd < bd) { bd = dd; best = h; }
    }
    return best;
  };
  const sideOf = [-1, 1, -1, 1];
  const want = i => i < 2 ? pick(sideOf[i], cy + 0.3, cy + 1.0, cy + 0.72 + (my > 0 ? 0.15 : 0), I.pts[1 - i]) : pick(sideOf[i] * 0.6, cy - 1.3, cy - 0.5, cy - 0.92, I.pts[5 - i]);
  const kNow = Math.floor(pl.climbAnim / Math.PI);
  if (!I.active) { for (let i = 0; i < 4; i++) { I.pts[i] = want(i); I.from[i] = null; } I.k = kNow; I.active = true; }
  if (kNow !== I.k) {
    I.k = kNow;
    const hand = kNow % 2, foot = 3 - hand;
    for (const i of [hand, foot]) { I.from[i] = I.pts[i] ? { x: I.pts[i].x, y: I.pts[i].y, z: I.pts[i].z } : null; I.pts[i] = want(i) || I.pts[i]; }
  }
  for (let i = 0; i < 4; i++) {
    const h = I.pts[i];
    if (!h || Math.abs(h.u - cu) > 0.9 || Math.abs(h.y - (i < 2 ? cy + 0.72 : cy - 0.92)) > 0.8) { I.pts[i] = want(i); I.from[i] = null; }
  }
  const ph = pl.climbAnim / Math.PI - kNow;
  I.mover = kNow % 2; I.ph = ph;
  for (let i = 0; i < 4; i++) {
    const h = I.pts[i], o = out[i];
    if (!h) { o.ok = false; continue; }
    o.ok = true;
    let tx = h.x, ty = h.y, tz = h.z;
    const moverNow = (i === kNow % 2 || i === 3 - kNow % 2) && I.from[i] && ph < 1;
    if (moverNow) {
      const e = U.smooth(0, 1, ph), f = I.from[i], arc = Math.sin(ph * Math.PI);
      tx = U.lerp(f.x, h.x, e) + pl.wallN.x * arc * 0.14;
      ty = U.lerp(f.y, h.y, e) + arc * 0.07;
      tz = U.lerp(f.z, h.z, e) + pl.wallN.z * arc * 0.14;
    }
    o.v.set(tx, ty, tz);
  }
  return true;
};

// Una vez por cuadro: postura según el estado del jugador, IK, cara y detalles
Gfx.prototype.updateCharacter = function (pl, pos, dt) {
  const c = this.ch, w = this.world, t = this.time, st = pl.state, X = this._cx, W = this._cw;
  c.root.position.set(pos.x, pos.y, pos.z);
  c.root.rotation.set(0, pl.yaw, 0);
  c.root.updateMatrixWorld(true);
  const hs = Math.hypot(pl.vel.x, pl.vel.z);
  // por defecto: de pie, relajado
  W.hip.set(0, CL.hipY, 0); W.hipR.set(0, 0, 0); W.spR.set(0, 0, 0);
  W.hands[0].set(0.21, 0.9, 0.04); W.hands[1].set(-0.21, 0.9, 0.04);
  W.feet[0].set(0.11, 0, 0.03); W.feet[1].set(-0.11, 0, -0.01);
  W.aPole[0].set(0.7, -0.2, -1); W.aPole[1].set(-0.7, -0.2, -1);
  W.lPole[0].set(0.2, 0, 1); W.lPole[1].set(-0.2, 0, 1);
  W.footPitch[0] = W.footPitch[1] = 0;
  W.look.yaw = 0; W.look.pitch = 0.05;
  let rate = 16, groundFeet = false, lookAt = null, open = 0, effort = 0;
  const toRoot = (wx, wy, wz, out) => c.root.worldToLocal(out.set(wx, wy, wz));
  const ct = this._ct || (this._ct = [0, 1, 2, 3].map(() => ({ ok: false, v: new THREE.Vector3() })));
  if (st !== X.lastState) { X.lastState = st; X.restT = 0; }
  if (st !== 'climb' && this._ik) this._ik.active = false;

  if (this.celebrate) {
    // ¡cumbre! brazos arriba y saltitos
    const b = Math.abs(Math.sin(t * 4.2));
    W.hip.y += b * 0.06;
    W.hands[0].set(0.3 + Math.sin(t * 8.4) * 0.03, 2.05 + b * 0.08, 0.06); W.hands[1].set(-0.3, 2.05 + Math.abs(Math.sin(t * 4.2 + 1)) * 0.08, 0.06);
    W.aPole[0].set(1, 0, -0.3); W.aPole[1].set(-1, 0, -0.3);
    W.look.pitch = -0.45; open = 0.8; groundFeet = true;
  } else if (st === 'climb') {
    rate = 26;
    W.hip.z = 0.12; W.hip.y = CL.hipY + Math.abs(Math.sin(pl.climbAnim)) * 0.04;
    W.spR.x = -0.12;
    W.aPole[0].set(0.8, -1, -0.45); W.aPole[1].set(-0.8, -1, -0.45);
    W.lPole[0].set(0.9, 0.15, 0.55); W.lPole[1].set(-0.9, 0.15, 0.55);
    W.footPitch[0] = W.footPitch[1] = 0.35;
    W.hands[0].set(0.2, 1.78, 0.38); W.hands[1].set(-0.2, 1.9, 0.38);
    W.feet[0].set(0.17, 0.1, 0.32); W.feet[1].set(-0.17, 0.25, 0.32);
    if (pl.cs && this._climbTargets(pl, ct)) {
      if (ct[0].ok) toRoot(ct[0].v.x, ct[0].v.y, ct[0].v.z, W.hands[0]);
      if (ct[1].ok) toRoot(ct[1].v.x, ct[1].v.y, ct[1].v.z, W.hands[1]);
      // presa de pie → punto del tobillo
      if (ct[2].ok) { toRoot(ct[2].v.x, ct[2].v.y, ct[2].v.z, W.feet[0]); W.feet[0].z -= 0.06; }
      if (ct[3].ok) { toRoot(ct[3].v.x, ct[3].v.y, ct[3].v.z, W.feet[1]); W.feet[1].z -= 0.06; }
      const I = this._ik, mv = I.mover;
      // se gira un poco hacia la mano que alcanza y mira la presa
      W.hipR.y = (mv ? -1 : 1) * 0.1 * Math.sin(I.ph * Math.PI);
      if (I.pts[mv]) lookAt = I.pts[mv];
    }
    effort = 1 - pl.stamina;
    if (pl.resting) {
      // descanso en un gancho: una mano sostiene, la otra se sacude y busca magnesio
      X.restT += dt;
      const hi = W.hands[0].y >= W.hands[1].y ? 0 : 1, lo = 1 - hi, sd = lo === 0 ? 1 : -1, cyc = X.restT % 4.2;
      if (cyc < 2.6) {
        const sh = Math.min(1, X.restT * 2);
        W.hands[lo].set(sd * 0.3 + Math.sin(t * 27) * 0.05 * sh, 0.92 + Math.sin(t * 31) * 0.04 * sh, 0.16);
        X.puffed = false;
      } else {
        W.hands[lo].set(sd * 0.06, 0.96, -0.2);
        W.aPole[lo].set(sd, 0.2, 0.3);
        if (!X.puffed && cyc > 3.0 && !this.isSnow) {
          X.puffed = true;
          this.chalkPuff = true; // main.js toca el sonido
          c.hips.localToWorld(X.v.set(0, -0.02, -0.16));
          this.burst(X.v.x, X.v.y + 0.05, X.v.z, 10, { color: 0xffffff, speed: 0.6, up: 0.4, life: 0.9, size: 0.18, grav: -0.2, alpha: 0.5 });
        }
      }
      W.look.pitch = 0.5; lookAt = null; effort *= 0.4;
    } else X.restT = 0;
    // brazos cansados: tiemblan
    if (pl.stamina < 0.35 || pl.slip > 0) {
      const tr = Math.max(pl.slip, (0.35 - pl.stamina) / 0.35) * 0.018;
      for (let i = 0; i < 2; i++) { W.hands[i].x += Math.sin(t * 41 + i * 2) * tr; W.hands[i].y += Math.sin(t * 37 + i) * tr; }
      W.hip.x += Math.sin(t * 23) * tr * 0.6;
      open = Math.max(open, (0.35 - pl.stamina) * 2.5);
    }
  } else if (st === 'jumar' && pl.line) {
    // cuerda fija: el puño en la cuerda, el piolet clavado adelante, patadas en la nieve
    rate = 18;
    const L = pl.line, s = Math.sin(pl.climbAnim);
    const q = w.alongPts(L.pts, Math.min(L.len, pl.lineD + 0.75), X.v2);
    toRoot(q.x, q.y + 0.05, q.z, W.hands[1]);
    W.hands[0].set(0.28, 0.55 + Math.max(0, -s) * 0.25, 0.55);
    W.hip.set(0, CL.hipY - 0.12, -0.04); W.spR.x = 0.42; W.hipR.x = 0.15;
    W.aPole[0].set(0.8, -0.6, -0.3); W.aPole[1].set(-0.6, -1, -0.2);
    W.feet[0].set(0.13, 0, 0.15 + Math.max(0, s) * 0.3); W.feet[1].set(-0.13, 0, 0.15 + Math.max(0, -s) * 0.3);
    W.feet[0].y += Math.max(0, s) * 0.12; W.feet[1].y += Math.max(0, -s) * 0.12;
    groundFeet = true;
    lookAt = q; effort = (1 - pl.stamina) * 0.8;
    if (pl.resting) { W.spR.x = 0.2; W.look.pitch = 0.35; lookAt = null; open = 0.5; }
  } else if (pl.arresting) {
    // frenando con el piolet: boca abajo, el piolet bajo el pecho, piernas abiertas
    rate = 12;
    W.hip.set(0, 0.38, -0.05); W.hipR.x = 1.25;
    W.hands[0].set(0.14, 0.32, 0.72); W.hands[1].set(-0.06, 0.3, 0.52);
    W.feet[0].set(0.26, 0.06, -0.92); W.feet[1].set(-0.26, 0.06, -0.92);
    W.lPole[0].set(0.3, -1, 0.1); W.lPole[1].set(-0.3, -1, 0.1);
    W.look.pitch = -0.6; effort = 1; open = 0.6;
  } else if (st === 'mantle' && pl.mantle) {
    // subir al borde: las manos se quedan en la orilla (en el mundo) mientras el cuerpo pasa encima;
    // primero el pecho sobre el borde, luego la rodilla arriba
    rate = 45;
    const m = pl.mantle, k = Math.min(1, m.t);
    const ex = m.ex - Math.sin(pl.yaw) * 0.3, ez = m.ez - Math.cos(pl.yaw) * 0.3;
    toRoot(ex, m.ey + 0.02, ez, X.v3);
    W.hands[0].set(X.v3.x + 0.2, X.v3.y, Math.max(0.12, X.v3.z)); W.hands[1].set(X.v3.x - 0.2, X.v3.y, Math.max(0.12, X.v3.z));
    W.spR.x = 0.65 - k * 0.35; W.hip.z = -0.08 * (1 - k); W.hip.y = CL.hipY - 0.12 * Math.sin(k * Math.PI);
    W.aPole[0].set(0.6, 0.2, -1); W.aPole[1].set(-0.6, 0.2, -1);
    W.feet[0].set(0.12, Math.max(0, X.v3.y) * U.smooth(0.2, 0.7, k), 0.25 * U.smooth(0.2, 0.7, k)); W.feet[1].set(-0.12, 0.05, -0.12);
    W.lPole[0].set(0.3, 0.3, 1);
    W.look.pitch = 0.2; effort = 0.9; open = 0.7;
  } else if (st === 'zip' && pl.zip) {
    // garfio: el brazo estirado hacia el anillo
    rate = 14;
    const r = pl.zip.ring; toRoot(r.x, r.y, r.z, X.v3);
    W.hands[1].copy(X.v3).sub(X.v.set(-CL.shX, CL.hipY + CL.shY + 0.03, 0)).setLength(0.7).add(X.v);
    W.hands[0].set(0.4, 1.3, -0.2);
    W.feet[0].set(0.12, 0.3, -0.3); W.feet[1].set(-0.12, 0.2, -0.15);
    lookAt = r;
  } else if (st === 'ride') {
    // tirolesa: colgado de las dos manos, piernas recogidas
    rate = 14;
    W.hands[0].set(0.1, 2.02, 0.04); W.hands[1].set(-0.1, 2.02, -0.04);
    W.aPole[0].set(1, 0, -0.3); W.aPole[1].set(-1, 0, -0.3);
    W.feet[0].set(0.13, 0.5, 0.42); W.feet[1].set(-0.13, 0.45, 0.38);
    W.lPole[0].set(0.3, 0.5, 1); W.lPole[1].set(-0.3, 0.5, 1);
    W.look.pitch = 0.2; open = 0.6;
  } else if (st === 'ascend' && pl.anchor) {
    // la cuerda te sube: mano sobre mano hacia el gancho, los pies caminan en la pared
    rate = 16;
    const a = pl.anchor; toRoot(a.x, a.y, a.z, X.v3);
    const s = Math.sin(pl.climbAnim * 1.5);
    X.v.set(0, 1.05, 0); X.v3.sub(X.v).normalize();
    W.hands[0].copy(X.v).addScaledVector(X.v3, 0.45 + s * 0.15); W.hands[1].copy(X.v).addScaledVector(X.v3, 0.45 - s * 0.15);
    W.hands[0].x += 0.06; W.hands[1].x -= 0.06;
    W.feet[0].set(0.14, 0.35 + Math.max(0, s) * 0.2, 0.42); W.feet[1].set(-0.14, 0.35 + Math.max(0, -s) * 0.2, 0.42);
    W.hipR.x = -0.2; W.look.pitch = -0.5; effort = 0.6;
  } else if (pl.swim) {
    rate = 14;
    const a = t * 4.4;
    W.hip.set(0, 0.55, 0); W.hipR.x = 1.3;
    W.hands[0].set(0.25, 0.6 + Math.sin(a) * 0.35, 0.55 + Math.cos(a) * 0.45); W.hands[1].set(-0.25, 0.6 + Math.sin(a + Math.PI) * 0.35, 0.55 + Math.cos(a + Math.PI) * 0.45);
    W.feet[0].set(0.12, 0.45 + Math.sin(t * 9) * 0.08, -0.8); W.feet[1].set(-0.12, 0.45 + Math.sin(t * 9 + 3) * 0.08, -0.8);
    W.look.pitch = -0.7;
  } else if (!pl.grounded) {
    rate = 12;
    if (pl.taut) {
      // colgado de la cuerda: sentado en el arnés, manos en la cuerda, pies contra la pared
      const a = pl.anchor;
      W.hip.set(0, CL.hipY, -0.12); W.hipR.x = -0.35; W.spR.x = 0.1;
      if (a) {
        toRoot(a.x, a.y, a.z, X.v3); X.v.set(0, 0.98, 0); X.v3.sub(X.v).normalize();
        W.hands[0].copy(X.v).addScaledVector(X.v3, 0.5); W.hands[1].copy(X.v).addScaledVector(X.v3, 0.72);
        W.hands[0].x += 0.05; W.hands[1].x -= 0.05;
        lookAt = a;
      } else { W.hands[0].set(0.1, 1.8, 0.1); W.hands[1].set(-0.1, 2.0, 0.1); }
      W.feet[0].set(0.15, 0.55, 0.5); W.feet[1].set(-0.15, 0.45, 0.48);
      W.lPole[0].set(0.4, 0.4, 1); W.lPole[1].set(-0.4, 0.4, 1);
      effort = 0.5; open = 0.7;
    } else if (pl.vel.y > 1) {
      // subiendo en el salto: rodillas recogidas, brazos arriba
      W.hands[0].set(0.28, 1.8, 0.32); W.hands[1].set(-0.28, 1.8, 0.32);
      W.feet[0].set(0.12, 0.38, 0.1); W.feet[1].set(-0.12, 0.25, -0.05);
      W.aPole[0].set(1, -0.3, -0.5); W.aPole[1].set(-1, -0.3, -0.5);
      W.look.pitch = -0.3;
    } else if (pl.vel.y < -8) {
      // cayendo fuerte: brazos y piernas sueltos
      for (let i = 0; i < 2; i++) {
        const sd = i ? -1 : 1, ph = t * 13 + i * 2.1;
        W.hands[i].set(sd * (0.5 + Math.sin(ph) * 0.12), 1.65 + Math.sin(ph * 1.2) * 0.22, Math.sin(ph * 0.9) * 0.2);
        W.feet[i].set(sd * 0.17, 0.12 + Math.max(0, Math.sin(ph * 1.1)) * 0.2, Math.cos(ph) * 0.15);
      }
      W.aPole[0].set(1, 0, -0.5); W.aPole[1].set(-1, 0, -0.5);
      W.look.pitch = 0.5; open = 1;
    } else {
      W.hands[0].set(0.42, 1.45, 0.12); W.hands[1].set(-0.42, 1.45, 0.12);
      W.feet[0].set(0.15, 0.1, 0.06); W.feet[1].set(-0.15, 0.03, -0.06);
      W.aPole[0].set(1, -0.5, -0.4); W.aPole[1].set(-1, -0.5, -0.4);
      W.look.pitch = 0.3;
    }
  } else if (pl.onLadder || pl.onCable || hs > 0.3) {
    // caminar / correr / escalera / cornisa: pasos con los pies sobre el terreno
    rate = 30; groundFeet = true;
    const ladder = pl.onLadder, cable = pl.onCable, sprint = pl.sprinting;
    const freq = sprint ? 2.2 : ladder ? 3.4 : 2.6, ph = pl.animDist * freq, k = Math.min(1, hs / CFG.walkSpeed);
    const stride = (sprint ? 0.52 : ladder ? 0.2 : cable ? 0.22 : 0.36) * k, lift = (sprint ? 0.2 : 0.12) * k * (pl.wade ? 2 : 1);
    for (let i = 0; i < 2; i++) {
      const sd = i ? -1 : 1, f = ph + (i ? Math.PI : 0);
      W.feet[i].set(sd * (ladder ? 0.07 : 0.1), Math.max(0, Math.cos(f)) * lift, Math.sin(f) * stride + 0.02);
      // brazos al revés que las piernas, codos doblados al correr
      W.hands[i].set(sd * (sprint ? 0.2 : 0.22), (sprint ? 1.02 : 0.92) + Math.max(0, Math.sin(f)) * 0.06 * k, -Math.sin(f) * (sprint ? 0.32 : 0.22) * k + (sprint ? 0.08 : 0.03));
    }
    W.hip.y = CL.hipY - 0.05 * k + Math.abs(Math.cos(ph)) * 0.035 * k;
    W.hipR.y = Math.sin(ph) * 0.12 * k; W.spR.y = -Math.sin(ph) * 0.2 * k;
    W.spR.x = sprint ? 0.24 : 0.07;
    W.aPole[0].set(0.3, -0.3, -1); W.aPole[1].set(-0.3, -0.3, -1);
    if (ladder) {
      // equilibrio: brazos abiertos, una mano en la cuerda de mano
      W.hands[0].set(0.5, 1.25, 0.1); W.hands[1].set(-0.5, 1.25, 0.1);
      if (pl.line) {
        const nr = w.lineNearest(pl.line, pos.x, pos.y + 1, pos.z, X.d), q = w.alongPts(pl.line.pts, nr.d + 0.25, X.v2);
        toRoot(q.x, q.y, q.z, X.v3);
        W.hands[X.v3.x > 0 ? 0 : 1].copy(X.v3);
      }
      W.aPole[0].set(1, -0.5, -0.2); W.aPole[1].set(-1, -0.5, -0.2);
      W.spR.x = 0.15; W.look.pitch = 0.45;
    } else if (cable) {
      W.hands[0].set(0.25, 1.72, 0.32); W.hands[1].set(-0.25, 1.66, 0.32);
      W.aPole[0].set(1, -0.6, -0.3); W.aPole[1].set(-1, -0.6, -0.3);
    }
    if (sprint) open = 0.5;
    X.idleT = 0;
    if (hs > 0.5) W.look.yaw = 0;
  } else {
    // de pie: respira, cambia el peso de pie y mira alrededor
    groundFeet = true; rate = 10;
    X.idleT += dt;
    W.hip.x = Math.sin(t * 0.6) * 0.025; W.hip.y = CL.hipY - 0.015 + Math.sin(t * 1.9) * 0.006;
    W.hipR.z = Math.sin(t * 0.6) * 0.03;
    W.look.yaw = Math.sin(t * 0.37) * 0.45 + Math.sin(t * 0.13) * 0.3;
    if (X.idleT > 6 && (X.idleT % 11) < 2.5) { this.camera.getWorldPosition(X.v3); lookAt = { x: X.v3.x, y: X.v3.y, z: X.v3.z }; }
    if (pl.stamina < 0.2) {
      // agotado: manos en las rodillas, jadeando
      W.hipR.x = 0.35; W.spR.x = 0.72; W.hip.y = CL.hipY - 0.1; W.hip.z = -0.08;
      W.hands[0].set(0.13, 0.55, 0.24); W.hands[1].set(-0.13, 0.55, 0.24);
      W.aPole[0].set(1, 0, -0.2); W.aPole[1].set(-1, 0, -0.2);
      W.lPole[0].set(0.3, 0, 1); W.lPole[1].set(-0.3, 0, 1);
      W.look.pitch = -0.5; W.look.yaw = 0; lookAt = null; open = 1;
    } else if (pl.cold > 0.6) {
      // con frío: se abraza
      W.hands[0].set(-0.1, 1.28, 0.17); W.hands[1].set(0.1, 1.22, 0.18);
      W.aPole[0].set(1, -1, 0); W.aPole[1].set(-1, -1, 0);
      W.spR.x = 0.12;
    }
  }
  // aterrizaje: se agacha y se levanta
  if (X.land > 0) {
    const k = X.land;
    W.hip.y -= 0.3 * k; W.spR.x += 0.35 * k;
    W.hands[0].z += 0.2 * k; W.hands[1].z += 0.2 * k; W.hands[0].y -= 0.25 * k; W.hands[1].y -= 0.25 * k;
    X.land = Math.max(0, X.land - dt * 3);
  }
  // pies sobre el terreno (caminar, de pie, cuerda fija): cada pie a la altura del suelo bajo él
  if (groundFeet) {
    let lo = 0;
    for (let i = 0; i < 2; i++) {
      c.root.localToWorld(X.v.copy(W.feet[i]));
      const gy = w.groundBelow(X.v.x, pos.y + 0.7, X.v.z) - pos.y;
      const off = U.clamp(gy, -0.45, 0.5);
      W.feet[i].y += off;
      lo = Math.min(lo, off);
    }
    W.hip.y += lo * 0.85;
  }
  // mirar: hacia un punto del mundo, si lo hay
  if (lookAt) {
    toRoot(lookAt.x, lookAt.y, lookAt.z, X.v3);
    X.v3.y -= W.hip.y + CL.neckY + 0.1;
    W.look.yaw = Math.atan2(X.v3.x, X.v3.z) - W.hipR.y - W.spR.y;
    W.look.pitch = -Math.atan2(X.v3.y, Math.hypot(X.v3.x, X.v3.z)) - W.spR.x - W.hipR.x;
  }
  W.look.yaw = U.clamp(W.look.yaw, -1.2, 1.2); W.look.pitch = U.clamp(W.look.pitch, -0.9, 0.8);
  W.open = open; W.effort = effort;

  // suavizar hacia la postura de este cuadro
  const P = this._cp, k = 1 - Math.exp(-rate * dt), kh = 1 - Math.exp(-Math.min(rate, 14) * dt);
  for (let i = 0; i < 2; i++) {
    P.hands[i].lerp(W.hands[i], k); P.feet[i].lerp(W.feet[i], groundFeet ? 1 - Math.exp(-40 * dt) : k);
    P.aPole[i].lerp(W.aPole[i], kh); P.lPole[i].lerp(W.lPole[i], kh);
    P.footPitch[i] += (W.footPitch[i] - P.footPitch[i]) * kh;
  }
  P.hip.lerp(W.hip, k); P.hipR.lerp(W.hipR, kh); P.spR.lerp(W.spR, kh);
  P.look.yaw += (W.look.yaw - P.look.yaw) * (1 - Math.exp(-6 * dt)); P.look.pitch += (W.look.pitch - P.look.pitch) * (1 - Math.exp(-6 * dt));
  P.open += (W.open - P.open) * kh; P.effort += (W.effort - P.effort) * kh;

  // aplicar: cadera, columna (respira), cabeza
  c.hips.position.copy(P.hip);
  c.hips.rotation.set(P.hipR.x, P.hipR.y, P.hipR.z);
  const breath = Math.sin(t * (2 + (1 - pl.stamina) * 4.5)) * (0.012 + (1 - pl.stamina) * 0.02);
  c.spine.rotation.set(P.spR.x + breath * 0.5, P.spR.y, P.spR.z);
  c.spine.scale.set(1, 1 + breath * 0.4, 1 + breath);
  c.head.rotation.set(P.look.pitch * 0.6, P.look.yaw * 0.65, 0);
  c.neck.rotation.set(P.look.pitch * 0.4, P.look.yaw * 0.35, 0);
  // tiritando de frío
  if (pl.cold > 0.6) { const sh = (pl.cold - 0.6) * 0.06; c.hips.position.x += (Math.random() - 0.5) * sh; c.spine.rotation.z += (Math.random() - 0.5) * sh; }
  c.root.updateMatrixWorld(true);
  // IK: brazos en el espacio de la columna, piernas en el de la cadera
  for (let i = 0; i < 2; i++) {
    const A = c.arms[i];
    c.root.localToWorld(X.v.copy(P.hands[i])); c.spine.worldToLocal(X.v);
    this._ik2(A.sh, A.el, null, CL.upArm, CL.foreArm + 0.04, X.v, X.v3.copy(P.aPole[i]).normalize());
    const Lg = c.legs[i];
    c.root.localToWorld(X.v.copy(P.feet[i])); X.v.y += CL.ankle;
    c.hips.worldToLocal(X.v);
    // el pie queda derecho respecto al escalador (o con la punta hacia la roca)
    X.q3.setFromEuler(this._e.set(P.footPitch[i] - P.hipR.x, -P.hipR.y, -P.hipR.z));
    this._ik2(Lg.hp, Lg.kn, Lg.ft, CL.thigh, CL.shin, X.v, X.v3.copy(P.lPole[i]).normalize(), X.q3);
  }
  // cara: parpadeo, cejas con el esfuerzo, boca que jadea
  X.blinkT -= dt;
  if (X.blinkT < 0) X.blinkT = 2.2 + Math.random() * 3;
  c.eyes.scale.y = X.blinkT < 0.12 ? 0.15 : 1;
  const ef = U.clamp(P.effort, 0, 1);
  c.brows[0].rotation.z = -ef * 0.45; c.brows[1].rotation.z = ef * 0.45;
  c.brows[0].position.y = c.brows[1].position.y = 0.038 - ef * 0.006;
  c.mouth.scale.set(1 - P.open * 0.2, 1 + U.clamp(P.open, 0, 1) * 2.6 * (0.7 + 0.3 * Math.sin(t * 9)), 1);
  // mochila, cintas y bandana se mecen
  const fl = U.clamp(hs * 0.12 + Math.abs(pl.vel.y) * 0.05 + this.uWind.value * 0.4, 0, 1.2);
  c.pack.rotation.x = Math.sin(t * 7) * 0.02 * fl - U.clamp(pl.vel.y * 0.01, -0.06, 0.06);
  for (let i = 0; i < c.draws.length; i++) { const d = c.draws[i]; d.rotation.x = Math.sin(t * 6 + i) * 0.25 * (0.2 + fl) - P.hipR.x * 0.8; d.rotation.z = Math.sin(t * 4.3 + i * 2) * 0.15 * fl; }
  c.scarf.rotation.x = -(0.2 + fl) + Math.sin(t * (7 + fl * 6)) * 0.12 * (0.3 + fl);
  c.scarf.rotation.z = Math.sin(t * 5.3) * 0.1 * fl;
  // piolets: al escalar hielo, en la cuerda fija y al frenar
  const iceClimb = st === 'climb' && (pl.surf === 'ice' || (this.isSnow && pl.surf !== 'ladder'));
  c.axeR.visible = iceClimb || st === 'jumar' || pl.arresting;
  c.axeL.visible = iceClimb || pl.arresting || (st === 'jumar');
  if (st === 'jumar') c.axeR.visible = false;

  // cuerda del garfio: de la mano al punto de enganche
  if (st === 'zip' && pl.zip) {
    const h = pl.zip.ring;
    c.arms[1].hand.getWorldPosition(X.v);
    const d = Math.hypot(h.x - X.v.x, h.y - X.v.y, h.z - X.v.z);
    this.rope.visible = d > 0.3;
    this.rope.position.copy(X.v);
    this.rope.lookAt(h.x, h.y, h.z);
    this.rope.scale.set(1, 1, d);
  } else this.rope.visible = false;
  // sombra
  const gh = w.groundBelow(pos.x, pos.y + 0.2, pos.z), dh = pos.y - gh;
  const show = st !== 'climb' && st !== 'zip' && st !== 'ride' && st !== 'ascend' && st !== 'jumar' && dh > -0.5 && dh < 30;
  this.blob.visible = show;
  if (show) {
    const s = U.clamp(1.0 - dh * 0.03, 0.35, 1.0);
    this.blob.position.set(pos.x, gh + 0.06, pos.z);
    this.blob.scale.set(s * 0.8, 1, s * 0.8);
    this.blob.material.opacity = U.clamp(1 - dh * 0.05, 0.2, 1);
  }
};

// Golpe al caer de pie: se agacha según la fuerza
Gfx.prototype.charLand = function (pw) { if (this._cx) this._cx.land = Math.max(this._cx.land, U.clamp(0.35 + pw * 0.8, 0, 1)); };
