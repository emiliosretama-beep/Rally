// Utilidades: números aleatorios con semilla, ruido y matemáticas pequeñas.
'use strict';

const U = {};

// Generador determinista (mulberry32). Misma semilla = misma montaña.
U.rng = function (seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

U.hashStr = function (s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};

// Ruido de valor 2D suave con tabla de permutación sembrada.
U.makeNoise = function (seed) {
  const r = U.rng(seed);
  const perm = new Uint8Array(512);
  const vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) { perm[i] = i; vals[i] = r() * 2 - 1; }
  for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  function n2(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const X = xi & 255, Y = yi & 255;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = vals[perm[X + perm[Y]]], b = vals[perm[X + 1 + perm[Y]]];
    const c = vals[perm[X + perm[Y + 1]]], d = vals[perm[X + 1 + perm[Y + 1]]];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, oct) {
    let s = 0, amp = 0.5, f = 1, norm = 0;
    for (let i = 0; i < oct; i++) { s += n2(x * f, y * f) * amp; norm += amp; amp *= 0.5; f *= 2.03; }
    return s / norm;
  }
  return { n2, fbm };
};

U.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
U.lerp = (a, b, t) => a + (b - a) * t;
U.smooth = (a, b, v) => { const t = U.clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
U.damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
U.angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };

U.fmtTime = function (s) {
  s = Math.max(0, s);
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return m + ':' + (r < 10 ? '0' : '') + r;
};

// Fecha local AAAA-MM-DD para la montaña del día.
U.todayKey = function () {
  const d = new Date();
  const p = n => (n < 10 ? '0' : '') + n;
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
};

// Guardado seguro: el juego sigue funcionando si localStorage está bloqueado.
U.store = {
  KEY: 'btc_save',
  VERSION: 1,
  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return null;
      const d = JSON.parse(raw);
      return d && d.v === this.VERSION ? d : null;
    } catch (e) { return null; }
  },
  save(d) {
    try { d.v = this.VERSION; localStorage.setItem(this.KEY, JSON.stringify(d)); } catch (e) { /* sin guardado */ }
  }
};
