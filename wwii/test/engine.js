// Prueba del motor (00_util, 01_gl, 02_geo) sin el resto del juego: construye sólo esos archivos, monta una escena de demostración
// con page.evaluate y hace una captura por calidad (baja/media/alta/ultra), otra de noche y otra con efectos de combate.
// Uso: F44_OUT=/ruta/capturas node wwii/test/engine.js   (por defecto en el directorio temporal del sistema)
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs'), os = require('os'), zlib = require('zlib'), { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const OUT = process.env.F44_OUT || path.join(os.tmpdir(), 'frente44');
fs.mkdirSync(OUT, { recursive: true });
const HTML = path.join(OUT, 'engine_test.html');

// PNG mínimo -> estadísticas de luminancia (sin dependencias)
function pngStats(buf) {
  let p = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (p < buf.length) { const len = buf.readUInt32BE(p), type = buf.toString('ascii', p + 4, p + 8), d = buf.slice(p + 8, p + 8 + len);
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; } else if (type === 'IDAT') idat.push(d); else if (type === 'IEND') break; p += 12 + len; }
  const bpp = ct === 6 ? 4 : 3, raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * bpp, img = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) { const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) { const a = x >= bpp ? img[y * stride + x - bpp] : 0, b = y ? img[(y - 1) * stride + x] : 0, c = x >= bpp && y ? img[(y - 1) * stride + x - bpp] : 0;
      let v = raw[src + x]; if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      img[y * stride + x] = v & 255; } }
  let s = 0, s2 = 0, n = 0, top = [0, 0, 0], tn = 0;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) { const i = y * stride + x * bpp, l = 0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2]; s += l; s2 += l * l; n++;
    if (y < h * 0.12) { top[0] += img[i]; top[1] += img[i + 1]; top[2] += img[i + 2]; tn++; } }
  const mean = s / n; return { w, h, mean, std: Math.sqrt(Math.max(0, s2 / n - mean * mean)), top: top.map(v => Math.round(v / tn)) };
}

// ---------- Comprobaciones en node (sin navegador): normales de Geo, convenciones de M4 y Cam ----------
function unitChecks() {
  const vm = require('vm'), errs = [];
  const src = ['00_util.js', '01_gl.js', '02_geo.js'].map(f => fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')).join('\n');
  const ctx = { console, Math, Float32Array, Uint32Array, matchMedia: () => ({ matches: false }), window: { devicePixelRatio: 1, innerWidth: 800, innerHeight: 500 } };
  vm.createContext(ctx); vm.runInContext(src + ';this.X={Geo,M4,V3,Cam,GL};', ctx);
  const { Geo, M4, V3, Cam, GL } = ctx.X, col = [1, 1, 1], near = (a, b, e) => a.every((v, i) => Math.abs(v - b[i]) < (e || 1e-4));
  // primitivas cerradas: normales unitarias, hacia fuera y sin triángulos degenerados
  const conv = (name, g, c) => { let bad = 0; for (let i = 0; i < g.p.length; i += 9) { const P = k => [g.p[i + k * 3], g.p[i + k * 3 + 1], g.p[i + k * 3 + 2]], a = P(0), b = P(1), d = P(2), n = [g.n[i], g.n[i + 1], g.n[i + 2]];
      const area = V3.len(V3.cross(V3.sub(b, a), V3.sub(d, a))), m = [(a[0] + b[0] + d[0]) / 3 - c[0], (a[1] + b[1] + d[1]) / 3 - c[1], (a[2] + b[2] + d[2]) / 3 - c[2]];
      if (area < 1e-9 || Math.abs(V3.len(n) - 1) > 1e-3 || V3.dot(n, m) < -1e-6) bad++; }
    if (bad || g.u.length / 2 !== g.p.length / 3) errs.push('Geo.' + name + ': ' + bad + ' triángulos mal'); };
  let g; const G = () => (g = new Geo());
  G().box(-1, 1, 0, 2, -1, 1, col); conv('box', g, [0, 1, 0]); G().bbox(-1, 2, 0, 1, -0.5, 0.5, 0.1, col); conv('bbox', g, [0.5, 0.5, 0]);
  G().wedge(-1, 1, 0, 1, -1, 1, col); conv('wedge', g, [0, 0.33, 0.33]); G().tube([0, 0, 0], [1, 2, 0.5], 0.2, 0.1, 6, col); conv('tube', g, [0.5, 1, 0.25]);
  G().lathe([[0, 0], [1, 0], [1, 1], [0.5, 1.5], [0, 1.6]], 10, col); conv('lathe', g, [0, 0.8, 0]); G().sphere(1, 8, 5, col); conv('sphere', g, [0, 0, 0]);
  G().sphere(1, 8, 4, col, true); conv('sphere(half)', g, [0, 0.3, 0]); G().capsule(0.3, 1.8, 8, col); conv('capsule', g, [0, 0.9, 0]);
  G().rbox(-1, 1, 0, 0.5, -0.4, 0.4, 0.15, col, 3, 0.03); conv('rbox', g, [0, 0.25, 0]); G().sandbag(0.6, 0.35, 0.2, col); conv('sandbag', g, [0, 0.1, 0]);
  { const s = new Geo(); s.sphere(1, 8, 5, col); G().merge(s, M4.compose([3, 1, 2], 0.7, 0.3, 0.2, [2, 0.5, 1])); conv('merge', g, [3, 1, 2]); }
  // convenciones: +Z local -> dirección (yaw, pitch); +X local = izquierda = -Cam.right; la derecha se ve a la derecha de la pantalla
  const yaw = 0.7, pitch = 0.25, M = M4.compose([1, 2, 3], yaw, pitch, 0, 1);
  if (!near(M4.xfDir(M, [0, 0, 1]), V3.dirYP(yaw, pitch))) errs.push('M4.compose: +Z no apunta según yaw/pitch');
  GL.W = 800; GL.H = 500; Cam.set({ eye: [1, 2, 3], yaw, pitch, roll: 0.1, fov: 70 });
  if (!near(Cam.fwd, V3.dirYP(yaw, pitch))) errs.push('Cam.fwd');
  if (!near(M4.xfDir(Cam.M, [1, 0, 0]), V3.scale(Cam.right, -1))) errs.push('Cam.M: +X local no es la izquierda');
  if (!near(M4.xfDir(Cam.M, [0, 1, 0]), Cam.up)) errs.push('Cam.M: +Y local no es Cam.up');
  const c = Cam.toScreen(V3.madd(Cam.eye, Cam.fwd, 10)), r = Cam.toScreen(V3.madd(V3.madd(Cam.eye, Cam.fwd, 10), Cam.right, 2));
  if (!near([c[0], c[1]], [400, 250], 0.01)) errs.push('Cam.toScreen: el frente no cae en el centro ' + c);
  if (!(r[0] > 400)) errs.push('Cam.right no queda a la derecha de la pantalla');
  if (!Cam.sphereVisible(V3.madd(Cam.eye, Cam.fwd, 10), 0.1) || Cam.sphereVisible(V3.madd(Cam.eye, Cam.fwd, -10), 1)) errs.push('Cam.sphereVisible');
  const I = M4.mul(Cam.VP, Cam.INV, new Float32Array(16)); if (!near(Array.from(I), Array.from(M4.ident()), 1e-3)) errs.push('Cam.INV');
  return errs;
}

// ---------- Escena de demostración (se ejecuta en la página) ----------
function demo() {
  const cv = document.getElementById('c');
  if (!GL.init(cv)) throw new Error('sin WebGL2');
  GFX.auto = false;
  const rnd = mulberry32(7);
  const H = (x, z) => 0.45 * Math.sin(x * 0.05) * Math.cos(z * 0.04) + 0.12 * Math.sin(x * 0.17 + z * 0.11) + Math.max(0, (Math.hypot(x, z - 40) - 60) * 0.12);
  const D = window.D = {};
  // suelo con manchas de hierba seca y tierra
  const gA = hex('#5f7a3a'), gB = hex('#8a7a4e'), gC = hex('#6f6a50');
  D.ground = GL.mesh(Geo.gridData(-100, -80, 200, 200, 100, 100, H, (x, z) => { const m = clamp(0.5 + 0.5 * Math.sin(x * 0.07 + Math.sin(z * 0.05) * 2) * Math.sin(z * 0.06 + x * 0.02), 0, 1), k = 0.92 + 0.12 * Math.sin(x * 0.31 + z * 0.23);
    const c = mixC(gA, gB, m * 0.8); return Math.hypot(x - 2, z - 4) < 5 ? mixC(c, gC, 0.8) : c.map(v => v * k); }, 0.22));
  D.grass = GL.tex(Tex.ground('grass', 3), true);
  // cajas de madera, muro de ladrillo, casa encalada con tejado, barriles
  const wood = new Geo(), brick = new Geo(), plaster = new Geo(), roof = new Geo(), metal = new Geo();
  const crate = (x, z, s, yaw, col) => { const m = wood.mark(), y = H(x, z); wood.bbox(-s / 2, s / 2, 0, s, -s / 2, s / 2, s * 0.06, hex(col || '#a08458')); wood.xform(m, rotY(yaw, x, y, z)); };
  crate(3, 3, 1.1, 0.3); crate(4.3, 3.4, 0.9, -0.2); crate(3.5, 3.2 + 0.05, 0.8, 0.9); { const m = wood.mark(); wood.bbox(-0.45, 0.45, 0, 0.8, -0.45, 0.45, 0.05, hex('#8a7048')); wood.xform(m, rotY(0.5, 3.3, H(3, 3) + 1.1, 3)); }
  crate(-6, 9, 1.2, 0.1, '#6f7346'); crate(-5.2, 10.3, 1.0, 0.5, '#6f7346');
  wood.uvProj(0, 1.1);
  { const y = H(-2, 14); for (const [x0, x1] of [[-8, -2.5], [-1.2, 5]]) brick.bbox(x0, x1, y - 0.3, y + 1.6, 13.6, 14.2, 0.04, hex('#b07a5e')); brick.uvProj(0, 0.5); }
  { const y = H(12, 22) - 0.2; plaster.bbox(8, 16, y, y + 4.2, 18, 24, 0.08, hex('#e3dccb'));
    plaster.box(9.5, 10.6, y + 1.3, y + 2.6, 17.96, 18.0, hex('#2a2a26')); plaster.box(13, 14.1, y + 1.3, y + 2.6, 17.96, 18.0, hex('#2a2a26')); plaster.box(11.2, 12.4, y, y + 2.3, 17.96, 18.0, hex('#4a3a2a'));
    plaster.uvProj(0, 0.4);
    const r0 = [7.6, y + 4.2, 17.6], r1 = [16.4, y + 4.2, 17.6], r2 = [16.4, y + 4.2, 24.4], r3 = [7.6, y + 4.2, 24.4], t0 = [7.6, y + 6.6, 21], t1 = [16.4, y + 6.6, 21], rc = hex('#8a5a44'), ctr = [12, y + 4.6, 21];
    roof.quad(r0, r1, t1, t0, rc, ctr); roof.quad(r3, r2, t1, t0, rc, ctr); roof.tri(r0, t0, r3, hex('#d8d0bf'), ctr); roof.tri(r1, t1, r2, hex('#d8d0bf'), ctr); roof.uvProj(0, 0.6);
    for (let i = 0; i < roof.u.length; i += 2) { roof.u[i] = roof.p[i / 2 * 3] * 0.6; roof.u[i + 1] = -roof.p[i / 2 * 3 + 1] * 0.9; } }
  { const gm = new Geo(); gm.lathe([[0, 0], [0.3, 0], [0.3, 0.06], [0.29, 0.1], [0.3, 0.45], [0.29, 0.5], [0.3, 0.84], [0.3, 0.88], [0, 0.88]], 12, hex('#ffffff')); D.drumG = gm; }
  D.wood = GL.fromGeo(wood); D.brick = GL.fromGeo(brick); D.plaster = GL.fromGeo(plaster); D.roof = GL.fromGeo(roof);
  D.tWood = GL.tex(Tex.wood(2), true); D.tBrick = GL.tex(Tex.brick(1), true); D.tPlaster = GL.tex(Tex.plaster(1), true); D.tRoof = GL.tex(Tex.roof(1), true); D.tMetal = GL.tex(Tex.metal(1), true);
  // barriles (instancias modo 1) y erizos checos
  D.drums = GL.instOf(D.drumG); { const d = []; for (const [x, z, c] of [[-4, 4, '#4f5a35'], [-3.3, 4.4, '#4f5a35'], [-3.7, 3.6, '#6b2f22'], [7, 7, '#4f5a35']]) { const k = hex(c); d.push(x, H(x, z), z, rnd() * 6, 1, 1, 1, ...k); } GL.setInst(D.drums, new Float32Array(d), d.length / 10); }
  { const g = new Geo(), c = hex('#5a5550'); g.beam([-1, 0.05, 0], [1, 1.6, 0], 0.16, 0.16, c); g.beam([1, 0.05, 0], [-1, 1.6, 0], 0.16, 0.16, c); g.beam([0, 0.05, -1], [0, 1.6, 1], 0.16, 0.16, c);
    D.hedge = GL.instOf(g); const d = []; for (let i = 0; i < 5; i++) { const x = -18 + i * 4.5, z = 26 + (i % 2) * 3; d.push(x, H(x, z), z, i * 0.7, 0.9, 0.9, 0.9, 1, 1, 1); } GL.setInst(D.hedge, new Float32Array(d), 5); }
  // sacos terreros: nido de ametralladora en arco
  { const g = new Geo(); g.sandbag(0.62, 0.36, 0.2, hex('#ffffff')); D.bag = GL.instOf(g); const d = [];
    for (let l = 0; l < 3; l++) for (let i = 0; i < 9; i++) { const a = -0.9 + i * 0.225 + (l % 2) * 0.11, x = 6 + Math.sin(a) * 3.2, z = 12 + Math.cos(a) * 3.2, t = 0.85 + rnd() * 0.15, c = hex('#b8a77a');
      d.push(x, H(x, z) + l * 0.19, z, a + Math.PI / 2, 1, 1, 1, c[0] * t, c[1] * t, c[2] * t); } GL.setInst(D.bag, new Float32Array(d), d.length / 10); }
  // árboles instanciados que se mecen
  { const g = new Geo(), bark = hex('#5d4630'); g.lathe([[0.14, 0], [0.11, 0.25], [0.07, 0.6], [0, 0.66]], 6, bark);
    const pal = ['#3d6a2e', '#4b7a36', '#355f29'].map(hex);
    [[0, 0.62, 0, 0.42], [0.22, 0.5, 0.12, 0.3], [-0.2, 0.52, -0.1, 0.32], [0.05, 0.8, -0.05, 0.3]].forEach(([cx, cy, cz, cr], i) => { const m = g.mark(); g.ico(1, pal[i % 3]); g.xform(m, (v, n) => n ? [v[0] / cr, v[1] / (cr * 0.8), v[2] / cr] : [v[0] * cr + cx, v[1] * cr * 0.8 + cy, v[2] * cr + cz]); });
    g.vary(0, rnd, 0.06); D.tree = GL.instOf(g); const d = [];
    for (let i = 0; i < 26; i++) { const a = rnd() * 6.28, r = 16 + rnd() * 40, x = Math.sin(a) * r, z = 20 + Math.cos(a) * r * 0.7, s = 7 + rnd() * 5; if (Math.abs(x) < 9 && z < 26) continue; d.push(x, H(x, z) - 0.1, z, rnd() * 6, s, s, s, 0.9 + rnd() * 0.2, 0.9 + rnd() * 0.2, 0.9); }
    GL.setInst(D.tree, new Float32Array(d), d.length / 10); D.trees = d; }
  // soldados: una pieza instanciada con matriz (uInst=2) y color por instancia
  { const g = new Geo(), w = [1, 1, 1], skin = hex('#d9a982'), boot = hex('#2e2a24');
    g.box(-0.16, -0.03, 0, 0.82, -0.09, 0.09, w); g.box(0.03, 0.16, 0, 0.82, -0.09, 0.09, w); g.box(-0.16, -0.03, 0, 0.12, -0.1, 0.14, boot); g.box(0.03, 0.16, 0, 0.12, -0.1, 0.14, boot);
    const m = g.mark(); g.capsule(0.2, 0.66, 8, w); g.translate(m, 0, 0.8, 0); g.scale(m, 1, 1, 0.75); g.translate(m, 0, 0.2, 0);
    g.box(-0.29, -0.19, 0.95, 1.5, -0.08, 0.08, w); g.box(0.19, 0.29, 0.95, 1.5, -0.08, 0.08, w);
    const hm = g.mark(); g.sphere(0.12, 8, 5, skin); g.translate(hm, 0, 1.62, 0.01); const hl = g.mark(); g.sphere(0.155, 10, 4, hex('#4a5230'), true); g.translate(hl, 0, 1.64, 0);
    g.tube([0.24, 1.2, -0.1], [0.24, 1.25, 0.75], 0.025, 0.02, 6, hex('#2b2620'));
    D.sold = GL.matInst(g); const n = 12, d = new Float32Array(n * 19), M = new Float32Array(16);
    for (let i = 0; i < n; i++) { const ally = i < 6, x = ally ? -7 + i * 1.6 : -2 + (i - 6) * 1.7, z = ally ? 6 + (i % 2) * 1.2 : 18 + (i % 3) * 1.4, yaw = ally ? 0.2 : Math.PI - 0.3 + i * 0.1;
      M4.compose([x, H(x, z), z], yaw, 0, 0, 1 + (rnd() - 0.5) * 0.06, M); d.set(M, i * 19); d.set(ally ? hex('#6b6a43') : hex('#6c7069'), i * 19 + 16); }
    GL.setMatInst(D.sold, d, n); D.soldD = d; }
  // marcas: sombras suaves (Baja), quemadura, cráter, agujeros de bala en el muro
  D.dec = new DecalBuf(80, 3);
  for (let i = 0; i < D.trees.length; i += 10) D.dec.addGround(D.trees[i], D.trees[i + 2], D.trees[i + 4] * 0.32, 0, 0, null, 0.5, H, true);
  D.dec.addGround(3.6, 3.2, 1.6, 0, 0, null, 0.55, H, true);
  for (let i = 0; i < 12; i++) D.dec.addGround(D.soldD[i * 19 + 12], D.soldD[i * 19 + 14], 0.5, 0, 0, null, 0.45, H, true);
  D.dec.addGround(1.5, 5.5, 1.4, 0.5, 3, null, 0.9, H); D.dec.addGround(-10, 16, 3.2, 1.0, 5, null, 1, H); D.dec.addGround(-2, 11, 0.9, 2, 6, null, 0.8, H);
  for (let i = 0; i < 7; i++) D.dec.addQuad([-7 + i * 0.9 + rnd() * 0.4, H(-2, 14) + 0.4 + rnd() * 1.0, 13.59], [0, 0, -1], 0.07, rnd() * 6, 1, null, 1);
  // partículas
  D.pt = new Float32Array(400 * 10); D.ptA = new Float32Array(100 * 10);
  window.fillParts = t => { const P = D.pt, A = D.ptA; let n = 0, na = 0; const r = mulberry32(3);
    for (let i = 0; i < 46; i++) { const k = ((i / 46) + t * 0.05) % 1, x = 3.4 + Math.sin(i * 1.7) * 0.3 * (1 + k * 3) + k * 2.5, y = H(3, 3) + 1.6 + k * 11, z = 3.3 + Math.cos(i * 2.3) * 0.3 * (1 + k * 2), g = 0.33 + 0.25 * k;
      P.set([x, y, z, 0.5 + k * 2.6, 0.6 * (1 - k) * Math.min(1, k * 8), i * 0.7 + t * 0.2, 0, g, g * 0.98, g * 0.95], n++ * 10); }
    for (let i = 0; i < 18; i++) { const k = r(), x = 6 + (r() - 0.5) * 6, z = 12 + (r() - 0.5) * 3; P.set([x, H(x, z) + 0.3 + k * 0.8, z, 0.4 + k * 0.9, 0.35, r() * 6, 0, 0.72, 0.68, 0.6], n++ * 10); }
    for (let i = 0; i < 8; i++) { const x = -2 + r() * 2, z = 11 + r(); P.set([x, H(x, z) + 0.2 + r() * 1.2, z, 0.06 + r() * 0.06, 1, r() * 6, 3, 0.45, 0.38, 0.3], n++ * 10); }
    for (let i = 0; i < 14; i++) { const k = ((i / 14) + t * 0.9) % 1, x = 3.4 + (r() - 0.5) * 0.5, z = 3.3 + (r() - 0.5) * 0.5; A.set([x, H(3, 3) + 1.2 + k * 1.2, z, 0.55 * (1 - k * 0.6), 0.9 * (1 - k), r() * 0.6 - 0.3, 1, 1, 1, 1], na++ * 10); }
    for (let i = 0; i < 10; i++) A.set([3.4 + (r() - 0.5) * 1.2, H(3, 3) + 1.5 + r() * 2.5, 3.3 + (r() - 0.5) * 1.2, 0.04, 1, 0, 2, 1, 0.8, 0.45], na++ * 10);
    D.np = n; D.na = na; };
  // arma en primera persona (para probar GL.drawViewmodel)
  { const g = new Geo(), wd = hex('#7a5232'), mt = hex('#3a3b3c'); g.bbox(-0.03, 0.03, -0.07, 0.02, -0.42, 0.15, 0.012, wd); g.bbox(-0.028, 0.028, -0.06, 0.035, 0.15, 0.42, 0.01, wd);
    g.tube([0, 0.0, 0.1], [0, 0.0, 0.78], 0.012, 0.011, 8, mt); g.box(-0.022, 0.022, -0.01, 0.045, -0.12, 0.12, mt); g.box(-0.005, 0.005, 0.02, 0.05, 0.72, 0.74, mt);
    const s = g.mark(); g.rbox(-0.05, 0.05, -0.12, -0.03, -0.06, 0.06, 0.03, hex('#c8956c'), 2); g.translate(s, 0, -0.02, 0.32); D.gun = GL.fromGeo(g); }
  D.night = false;
  window.setNight = on => { D.night = on;
    Env.set(on ? { sunEl: 34, sunAz: 60, sunCol: [0.13, 0.16, 0.24], ambSky: [0.06, 0.075, 0.12], ambGnd: [0.025, 0.028, 0.035], fog: '#0b1222', fogN: 25, fogF: 260, fogSun: [0, 0, 0],
        zen: '#040916', hor: '#14203a', cloud: 0.3, cloudCol: [0.12, 0.15, 0.22], cloudDark: [0.04, 0.05, 0.08], stars: 1, moon: 1, sunK: 0, shK: 0.42,
        grade: { tint: [0.95, 0.98, 1.06], sat: 0.85, con: 1.08, vig: 0.42, bloom: 0.55, sepia: 0.05 } }
      : { sunEl: 36, sunAz: -128, mist: [0, 2.5, 0.0] }); };
  setNight(false);
  // un fotograma completo en el orden de Game.render (DESIGN §3)
  window.demoFrame = (t, opt) => { opt = opt || {}; const gl = GL.gl; GL.begin(1 / 60);
    Cam.set({ eye: opt.eye || [-1.5, H(-1.5, -6) + 1.62, -6], yaw: opt.yaw != null ? opt.yaw : 0.12, pitch: opt.pitch != null ? opt.pitch : -0.06, roll: 0, fov: 70, near: 0.08, far: 1200 });
    const fl = 0.85 + 0.15 * Math.sin(t * 23) * Math.sin(t * 7.3);
    GL.setLights([{ pos: [3.4, H(3, 3) + 1.7, 3.3], r: D.night ? 14 : 9, col: [2.4 * fl, 1.25 * fl, 0.4 * fl] }, { pos: [-2, H(-2, 11) + 1, 11], r: 5, col: [1.6, 1.1, 0.5] }]);
    const casters = (p, ci) => { const u = p.u;
      for (const m of [D.wood, D.brick, D.plaster, D.roof]) GL.draw(m);
      gl.uniform1f(u.uInst, 1); GL.draw(D.drums); GL.draw(D.hedge); GL.draw(D.bag); gl.uniform1f(u.uSway, 0.3 * Env.wind); GL.draw(D.tree); gl.uniform1f(u.uSway, 0);
      gl.uniform1f(u.uInst, 2); GL.draw(D.sold); gl.uniform1f(u.uInst, 0); };
    Shadow.render(Cam.eye, Cam.fwd, casters);
    Post.begin(); Sky.draw();
    const lp = GL.progs.lit, u = lp.u; Lit.setup(lp);
    gl.uniform1f(u.uUseTex, 1); gl.bindTexture(gl.TEXTURE_2D, D.grass); GL.draw(D.ground);
    gl.bindTexture(gl.TEXTURE_2D, D.tWood); GL.draw(D.wood); gl.bindTexture(gl.TEXTURE_2D, D.tBrick); GL.draw(D.brick);
    gl.bindTexture(gl.TEXTURE_2D, D.tPlaster); GL.draw(D.plaster); gl.bindTexture(gl.TEXTURE_2D, D.tRoof); GL.draw(D.roof);
    gl.uniform1f(u.uUseTex, 0); gl.uniform1f(u.uInst, 1); gl.uniform1f(u.uGloss, 0.5); GL.draw(D.drums); gl.uniform1f(u.uGloss, 0.25); GL.draw(D.hedge); gl.uniform1f(u.uGloss, 0);
    GL.draw(D.bag); gl.uniform1f(u.uSway, 0.3 * Env.wind); GL.draw(D.tree); gl.uniform1f(u.uSway, 0);
    gl.uniform1f(u.uInst, 2); GL.draw(D.sold); gl.uniform1f(u.uInst, 0);
    Post.grabDepth();
    D.dec.draw(); fillParts(t); GL.drawParticles(D.pt, D.np, false); GL.drawParticles(D.ptA, D.na, true);
    if (!opt.noGun) GL.drawViewmodel(55, p => { const M = M4.compose([-0.13, -0.14, 0.06], 0.035, 0.03, 0, 1); M4.mul(Cam.M, M, M); gl.uniformMatrix4fv(p.u.uModel, false, M); gl.uniform1f(p.u.uGloss, 0.35); GL.draw(D.gun); gl.uniform1f(p.u.uGloss, 0); }, 0.9);
    Post.end(); return gl.getError(); };
  return { gl: !!GL.gl, max: GL.gl.getParameter(GL.gl.MAX_SAMPLES) };
}

async function run() {
  execFileSync('python3', [path.join(ROOT, 'build.py'), '--only', '00,01,02', '--out', HTML], { stdio: 'inherit' });
  const errors = unitChecks();
  console.log('unitChecks', errors.length ? errors.join('; ') : 'ok');
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.goto('file://' + HTML);
  const info = await page.evaluate(demo);
  console.log('init', JSON.stringify(info));
  const shots = [];
  const frame = (t, opt) => page.evaluate(([t, opt]) => new Promise(res => requestAnimationFrame(() => res(demoFrame(t, opt)))), [t, opt || {}]);
  const shoot = async (name, t, opt) => {
    const t0 = Date.now(); const err = await frame(t, opt); if (err) errors.push(name + ': gl.getError ' + err);
    const file = path.join(OUT, 'engine_' + name + '.png'); const buf = await page.screenshot({ path: file, timeout: 180000 }); const st = pngStats(buf);
    console.log(name.padEnd(8), 'ms', String(Date.now() - t0).padStart(6), 'mean', st.mean.toFixed(1), 'std', st.std.toFixed(1), 'sky', st.top.join(','), file); shots.push([name, st]); return st; };
  for (const q of ['baja', 'media', 'alta', 'ultra']) {
    const g = await page.evaluate(q => { GFX.set(q); return { name: GFX.name(), sh: Shadow.size, post: !!Post.ms, hdr: Post.hdr }; }, q);
    console.log(q, JSON.stringify(g)); await shoot(q, 1.3);
  }
  await page.evaluate(() => { GFX.set('alta'); setNight(true); });
  await shoot('night', 2.1, { yaw: 0.35, pitch: 0.12 });
  await page.evaluate(() => { setNight(false); Post.fx.hurt = 0.7; Post.fx.ads = 0.6; });
  await shoot('fx', 0.5);
  // aturdimiento y visor: sólo que no haya errores
  for (const fx of [{ blast: 0.8 }, { scope: 1, ads: 1 }]) { const e = await page.evaluate(fx => { Object.assign(Post.fx, fx); const e = demoFrame(0.7); Object.assign(Post.fx, { hurt: 0, blast: 0, ads: 0, scope: 0 }); return e; }, fx); if (e) errors.push('fx ' + JSON.stringify(fx) + ': gl.getError ' + e); }
  // bajada automática de calidad: con fotogramas lentos debe avisar por el Bus y limitar la calidad
  const auto = await page.evaluate(() => { let got = null; Bus.on('gfxAuto', d => got = d.level); GFX.set('ultra'); GFX.auto = true; for (let i = 0; i < 90; i++) GFX.monitor(1 / 20);
    const r = { got, name: GFX.name() }; GFX.auto = false; GFX.set('alta'); return r; });
  console.log('auto', JSON.stringify(auto)); if (auto.got !== 'alta' || auto.name !== 'alta') errors.push('bajada automática: ' + JSON.stringify(auto));
  // pérdida y recuperación del contexto: el motor se rehace solo y vuelve a pintar el cielo sin errores
  const ctx = await page.evaluate(() => new Promise(res => { const ext = GL.gl.getExtension('WEBGL_lose_context'); if (!ext) return res({ skip: true });
    Bus.on('glRestored', () => requestAnimationFrame(() => { GL.begin(1 / 60); Cam.set({ eye: [0, 2, 0], yaw: 0, pitch: 0.2 }); Post.begin(); Sky.draw(); Post.end(); res({ ok: true, err: GL.gl.getError(), lost: GL.lost }); }));
    Bus.on('glLost', () => setTimeout(() => ext.restoreContext(), 50)); ext.loseContext(); setTimeout(() => res({ timeout: true }), 20000); }));
  console.log('context', JSON.stringify(ctx)); if (!ctx.skip && !(ctx.ok && !ctx.err && !ctx.lost)) errors.push('contexto: ' + JSON.stringify(ctx));
  await browser.close();
  // comprobaciones
  for (const [n, st] of shots) {
    if (st.std < 12) errors.push(n + ': imagen casi plana (std ' + st.std.toFixed(1) + ')');
    if (n === 'night' ? st.mean > 90 : (st.mean < 45 || st.mean > 215)) errors.push(n + ': brillo medio raro ' + st.mean.toFixed(1));
    if (n !== 'night' && n !== 'fx' && !(st.top[2] > st.top[0])) errors.push(n + ': el cielo no es azulado ' + st.top.join(','));
  }
  if (errors.length) { console.error('FALLOS:\n' + errors.join('\n')); process.exit(1); }
  console.log('engine: OK');
}
module.exports = { demo, pngStats, unitChecks, HTML, OUT };
if (require.main === module) run().catch(e => { console.error(e); process.exit(1); });
