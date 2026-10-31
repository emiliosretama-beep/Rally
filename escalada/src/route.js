// La ruta de la v0.4: cuatro barrancos que suben en zigzag por la cara sur del volcán.
// Cada barranco es un cauce: rápidos con rocas, cascadas que se trepan por un lado, pozas que
// se cruzan colgado de la pared, cornisas y puentes sobre gargantas, y una pared de cabecera
// que lleva a la fogata. Todo es determinista.
//
// Coordenadas de un barranco: s = metros a lo largo del cauce (hacia arriba), lat = hacia la
// izquierda (mirando cauce arriba). Las paredes son "franjas": superficies verticales con
// relieve que se escalan donde hay zonas con presas. Fuera de las zonas la roca es lisa.
'use strict';

const GORGES = [
  {
    id: 'g_river', start: { x: -32, z: -206, y: 2 }, ang: 0.85, Wb: 4.4, depth: 5,
    segs: [
      { t: 'walk', len: 10, depth: 7 },
      { t: 'step', h: 4, fall: 'R', nm: 'c_first', par: 10 },
      { t: 'walk', len: 8, turn: 0.22, depth: 9 },
      { t: 'boulders', len: 16, n: 4, nm: 'c_boulders', par: 12 },
      { t: 'walk', len: 4 },
      { t: 'step', h: 7, fall: 'L', nm: 'c_fall2', par: 14, gem: [-2.2, 5.5] },
      { t: 'traverse', len: 14, side: 'L', nm: 'c_pool', par: 24, gem: true },
      { t: 'walk', len: 6, turn: -0.4, depth: 13 },
      { t: 'step', h: 7, fall: 'R', bands: [[3, 1.6]], nm: 'c_lunge', par: 16 },
      { t: 'walk', len: 5, depth: 15 },
      { t: 'step', h: 12, fall: 'L', surf: 'ladder', head: true, nm: 'c_ladder', par: 14 }
    ]
  },
  {
    id: 'g_jungle', ang: -0.9, Wb: 4.6, depth: 6,
    segs: [
      { t: 'walk', len: 8, depth: 9 },
      { t: 'step', h: 9, fall: 'R', surf: 'vine', nm: 'c_vines', par: 16, gem: [3.6, 7.5] },
      { t: 'walk', len: 4, turn: 0.2, depth: 12 },
      { t: 'ledge', len: 16, side: 'R', nm: 'c_ledge', par: 16 },
      { t: 'walk', len: 4, depth: 14 },
      { t: 'bridge', len: 12, miss: [3, 7, 8], nm: 'c_bridge', par: 12, gem: 'under' },
      { t: 'walk', len: 4, turn: -0.3, depth: 15 },
      { t: 'step', h: 9, fall: 'L', surf: 'crumble', nm: 'c_crumble', par: 14 },
      { t: 'walk', len: 4, depth: 16 },
      // grieta en zigzag: [lat0, lat1, y0, y1] relativos al pie de la pared
      { t: 'step', h: 10, fall: 'R', crack: [[0.6, 2.4, -1, 4.2], [1.8, 3.8, 3.6, 7.6], [0.6, 2.6, 7, 10]], nm: 'c_crack', par: 18 },
      { t: 'walk', len: 5, depth: 18, turn: 0.25 },
      { t: 'step', h: 14, fall: 'C', head: true, nm: 'c_bigwall', par: 24, gem: [3.2, 11] }
    ]
  },
  {
    id: 'g_ice', ang: 0.9, Wb: 4.4, depth: 6, frozen: true,
    segs: [
      { t: 'walk', len: 8, depth: 10 },
      { t: 'step', h: 10, fall: 'L', surf: 'ice', nm: 'c_ice', par: 22, gem: [-3.4, 8] },
      { t: 'walk', len: 4, depth: 13 },
      { t: 'ledge', len: 18, side: 'L', wind: true, nm: 'c_wind', par: 18 },
      { t: 'walk', len: 4, depth: 14, turn: -0.25 },
      { t: 'hookGap', len: 8, rise: 3, nm: 'c_hook', par: 10 },
      { t: 'walk', len: 4, depth: 16 },
      { t: 'step', h: 12, fall: 'R', nm: 'c_frostwall', par: 22, gem: [3.2, 9] },
      { t: 'walk', len: 4, depth: 16 },
      { t: 'zipline', len: 18, drop: 3, nm: 'c_zip', par: 10 },
      { t: 'walk', len: 5, depth: 17, turn: 0.3 },
      { t: 'step', h: 12, fall: 'C', bands: [[3, 1.6], [7.6, 1.7]], head: true, nm: 'c_lunge2', par: 22 }
    ]
  },
  {
    id: 'g_fire', ang: -0.8, Wb: 4.4, depth: 6, lava: true,
    segs: [
      { t: 'walk', len: 8, depth: 10 },
      { t: 'step', h: 12, fall: 'L', hazard: 'steam', nm: 'c_steam', par: 22, gem: [-3.5, 10.5] },
      { t: 'walk', len: 4, depth: 13 },
      { t: 'boulders', len: 16, n: 4, sink: true, nm: 'c_lava', par: 14, gem: 'side' },
      { t: 'walk', len: 4, depth: 15 },
      { t: 'step', h: 10, fall: 'R', surf: 'crumble', nm: 'c_crumble2', par: 16 },
      { t: 'walk', len: 5, depth: 20, turn: 0.2 },
      { t: 'step', h: 18, fall: 'C', head: true, summit: true, nm: 'c_final', par: 30, gem: [-3.3, 14] }
    ]
  }
];

const RIM_OUT = 2.9;   // el suelo sigue 2.9 m detrás de cada pared: así la rampa del terreno queda oculta
const CAMP_R = 8;      // radio plano de los campamentos

function GorgeBuilder(R, def, gi) {
  this.R = R; this.def = def; this.gi = gi;
  this.ang = def.ang; this.Wb = def.Wb; this.depth = def.depth; this.amp = def.amp === undefined ? 0.6 : def.amp;
  this.x = def.start.x; this.z = def.start.z; this.F = def.start.y;
  this.s = 0;
  this.samples = [];
  this.walls = def.walls === undefined ? true : def.walls; // ¿paredes a los lados? (en la montaña nevada solo en los canales)
  this.dry = !!def.dry;                // sin río
  this.steps = [];                     // escalones { s, Fl, Fu } (para tallar el terreno bajo las repisas)
  this.npcLat = def.npcLat === undefined ? -1.3 : def.npcLat;
  this.LIP = 6.2; this.EDGE = 3;       // fondo de las repisas y largo de los bordes de los fosos
  this.zones = { L: [], R: [] };       // zonas escalables en las paredes laterales (por s)
  this.sideAnchors = [];               // ganchos en las paredes laterales (por s)
  this.ledges = { L: [], R: [] };      // tramos con cornisa (ahí la pared casi no tiene relieve)
  this.pits = [];                      // fosos: { s0, s1, y, water, lava, deep }
  this.water = [];                     // tramos de río poco profundo { s0, s1 }
  this.frozen = !!def.frozen; this.lava = !!def.lava;
}

const GBP = GorgeBuilder.prototype;
GBP.H = function () { return { x: Math.sin(this.ang), z: Math.cos(this.ang) }; };
GBP.L = function () { return { x: Math.cos(this.ang), z: -Math.sin(this.ang) }; };
// punto en (lat, adelante) desde la posición actual del cauce
GBP.P = function (lat, fwd) { const H = this.H(), L = this.L(); return { x: this.x + L.x * lat + H.x * fwd, z: this.z + L.z * lat + H.z * fwd }; };

// Avanza por el cauce: un punto por metro. rise = metros que sube en todo el tramo (laderas)
GBP.walk = function (len, o) {
  o = o || {};
  const turn = o.turn || 0, d0 = this.depth, d1 = o.depth === undefined ? d0 : o.depth, s0 = this.s;
  // justo después de una repisa o de un foso el suelo tiene que seguir plano (los bloques son planos)
  let flatN = 0;
  for (let i = 0; i < len; i++) if (this.s + i < (this.flatUntil || -1)) flatN++;
  // (sin pasar de ~25° en los caminos: lo empinado solo en las laderas con cuerda)
  const r = Math.min(o.npc === 'jumar' ? 9 : 0.45, (o.rise || 0) / Math.max(1, len - flatN)), wl = o.walls === undefined ? this.walls : o.walls;
  const wL = wl === true || wl === 'L', wR = wl === true || wl === 'R';
  for (let i = 0; i < len; i++) {
    const ri = this.s < (this.flatUntil || -1) ? 0 : r;
    this.samples.push({ x: this.x, z: this.z, ang: this.ang, s: this.s, F: this.F, rise: ri, Wb: this.Wb, rim: this.F + this.depth, amp: this.amp, wL, wR, ridge: !!o.ridge });
    if (i % 2 === 0 && !o.noNpc) this.npcNode(o.npcLat === undefined ? this.npcLat : o.npcLat, 0, o.npc || 'walk', { y: this.F });
    this.ang += turn / len;
    const H = this.H();
    this.x += H.x; this.z += H.z; this.s += 1; this.F += ri;
    this.depth = U.lerp(d0, d1, (i + 1) / len);
  }
  if (!o.dry && !this.dry) this.water.push({ s0, s1: this.s });
};

// Paso del camino que siguen los escaladores de la IA
GBP.npcNode = function (lat, fwd, mode, extra) {
  const p = this.P(lat, fwd);
  this.R.npc.push(Object.assign({ x: p.x, z: p.z, y: this.F, mode, gi: this.gi, s: this.s + fwd }, extra || {}));
};

// Convierte en canal (con paredes) los últimos n metros del camino
GBP.gully = function (n) {
  for (let i = Math.max(0, this.samples.length - n); i < this.samples.length; i++) { this.samples[i].wL = true; this.samples[i].wR = true; }
};

GBP.anchorPost = function (lat, fwd, y) {
  const p = this.P(lat, fwd);
  this.R.anchors.push({ x: p.x, y: y + 1.15, z: p.z, ground: y, wall: false, idx: this.R.anchors.length, tramo: this.gi });
};

GBP.challenge = function (seg) {
  if (!seg.nm) return;
  const p = this.P(0, 0), H = this.H();
  this.R.challenges.push({ nm: seg.nm, t: seg.t, par: seg.par || 15, x: p.x, y: this.F, z: p.z, fx: H.x, fz: H.z, tramo: this.gi, idx: this.R.challenges.length,
    bands: !!seg.bands, side: seg.side || null, fall: seg.fall || null, len: seg.len || 0, h: seg.h || 0, surf: seg.surf || 'rock', W: this.Wb });
};

// Caja orientada con el cauce: centro en (lat, adelante), w de ancho (lateral) y l de largo
GBP.block = function (lat, fwd, w, l, y0, y1, kind, extra) {
  const p = this.P(lat, fwd);
  const b = Object.assign({ cx: p.x, cy: (y0 + y1) / 2, cz: p.z, hx: w / 2, hy: (y1 - y0) / 2, hz: l / 2,
    c: Math.cos(this.ang), s: -Math.sin(this.ang), kind: kind || 'rock', tramo: this.gi, id: this.R.blocks.length }, extra || {});
  this.R.blocks.push(b);
  return b;
};

// Franja recta de lado a lado del cauce, mirando cauce abajo (para escalones y paredes del otro lado)
GBP.crossStrip = function (y0, y1, amp) {
  const W = this.Wb, H = this.H(), half = W + 2.2, pts = [];
  for (let u = 0; u <= half * 2 + 0.001; u += 1) {
    const p = this.P(half - u, 0);
    pts.push({ x: p.x, z: p.z, nx: -H.x, nz: -H.z, u, y0, y1, amp });
  }
  const strip = { id: this.R.strips.length, pts, zones: [], seed: this.R.strips.length * 13 + 7, kind: 'step', tramo: this.gi, len: half * 2, half };
  this.R.strips.push(strip);
  return strip;
};

// Escalón: la cascada cae por un lado y se trepa por el otro (fall 'N' = sin cascada, toda la pared)
GBP.step = function (seg) {
  const R = this.R, h = seg.h, Fl = this.F, Fu = this.F + h, W = this.Wb;
  this.challenge(seg);
  if (!this.walls) this.gully(6);
  const strip = this.crossStrip(Fl - 1.5, Fu, seg.amp === undefined ? 0.55 : seg.amp);
  const latToU = lat => strip.half - lat;
  const surf = seg.surf || 'rock';
  this.steps.push({ s: this.s, Fl, Fu });
  // zonas escalables (en lat): la mitad sin cascada, o los dos lados si la cascada va al centro
  const ranges = seg.fall === 'L' ? [[-(W - 0.4), -0.5]] : seg.fall === 'R' ? [[0.5, W - 0.4]] : seg.fall === 'N' ? [[-(W - 0.4), W - 0.4]] : [[1.4, W - 0.4], [-(W - 0.4), -1.4]];
  const zc = (ranges[0][0] + ranges[0][1]) / 2;
  if (seg.crack) {
    for (const [a, b, y0, y1] of seg.crack) strip.zones.push({ u0: latToU(Math.max(a, b)), u1: latToU(Math.min(a, b)), y0: Fl + y0, y1: Fl + y1, type: 'rock' });
  } else {
    const cuts = (seg.bands || []).map(([b0, bh]) => [Fl + b0, Fl + b0 + bh]).sort((a, b) => a[0] - b[0]);
    for (const [la, lb] of ranges) {
      let ua = latToU(Math.max(la, lb)), ub = latToU(Math.min(la, lb));
      if (surf === 'ladder') { const m = (ua + ub) / 2; ua = m - 0.75; ub = m + 0.75; }
      if (surf === 'vine') { strip.zones.push({ u0: ua, u1: ub, y0: Fl - 1, y1: Fu, type: 'vine' }); continue; }
      let y0 = Fl - 1;
      for (const [c0, c1] of cuts) { strip.zones.push({ u0: ua, u1: ub, y0, y1: c0, type: surf }); y0 = c1; }
      strip.zones.push({ u0: ua, u1: ub, y0, y1: Fu, type: surf });
    }
  }
  if (surf === 'crumble') for (const z of strip.zones) z.crumble = true;
  if (seg.ice) for (const z of strip.zones) if (z.type === 'ladder') z.wallIce = true;
  // cascada (agua, hielo o lava): roca lisa y mojada
  if (seg.fall !== 'N') {
    const fr = seg.fall === 'L' ? [0.3, W + 0.6] : seg.fall === 'R' ? [-(W + 0.6), -0.3] : [-1.1, 1.1];
    R.falls.push({ strip: strip.id, u0: latToU(fr[1]), u1: latToU(fr[0]), top: Fu, bot: Fl, kind: this.lava ? 'lava' : this.frozen ? 'ice' : 'water', tramo: this.gi, s: this.s, latC: (fr[0] + fr[1]) / 2 });
  }
  // ganchos: uno en un poste junto al pie de la zona y luego en la pared
  this.anchorPost(zc + (zc > 0 ? 1.1 : -1.1), -1.6, Fl);
  // la IA: al pie de la pared, sube por el centro de la zona y sale a la repisa
  const npcLat = seg.crack ? (seg.crack[0][0] + seg.crack[0][1]) / 2 : surf === 'ladder' ? zc : zc + 0.4;
  this.npcNode(npcLat, -1.0, 'walk', { y: Fl });
  if (seg.crack) {
    for (const [a, b, y0, y1] of seg.crack) for (let y = Math.max(0.2, y0 + 1.2); y <= y1 - 0.2; y += 1.4) this.R.npc.push({ strip: strip.id, u: latToU((a + b) / 2), y: Fl + y - 1, mode: 'climb', gi: this.gi });
  } else {
    for (let y = 0.2; y <= h - 0.3; y += 1.3) this.R.npc.push({ strip: strip.id, u: latToU(npcLat), y: Fl + y - 1, mode: 'climb', gi: this.gi });
  }
  this.npcNode(npcLat, 1.0, 'mantle', { y: Fu });
  if (seg.crack) {
    seg.crack.slice(1).forEach(([a, b, y0, y1]) => R.anchors.push({ strip: strip.id, u: latToU((a + b) / 2), y: Fl + Math.min(y1 - 1.2, (y0 + y1) / 2 + 0.6), wall: true, idx: R.anchors.length, tramo: this.gi }));
  } else {
    const every = surf === 'ice' ? 4 : 5;
    // seg.anchors: alturas a mano (si no, uno cada 4-5 m)
    const ks = seg.anchors || [];
    if (!seg.anchors) for (let k = every; k < h - 1.2; k += every) ks.push(k);
    for (let i = 0; i < ks.length; i++) {
      const k = ks[i];
      let kk = k;
      // nunca dentro de una banda lisa: justo encima de ella
      for (const [b0, bh] of (seg.bands || [])) if (kk > b0 - 0.8 && kk < b0 + bh + 0.6) kk = b0 + bh + 0.7;
      if (kk >= h - 1) continue;
      // un gancho en cada columna escalable a cada altura (con cascada en medio, si no, una columna
      // se quedaría sin gancho y la caída llegaría hasta el suelo)
      for (const rr of ranges) {
        const lat = surf === 'ladder' ? zc + 0.55 : (rr[0] + rr[1]) / 2 + (ranges.length > 1 ? 0 : (i % 2 ? 0.6 : -0.6));
        R.anchors.push({ strip: strip.id, u: latToU(lat), y: Fl + kk, wall: true, idx: R.anchors.length, tramo: this.gi });
      }
    }
  }
  if (Array.isArray(seg.gem)) R.gemsLocal.push({ strip: strip.id, u: latToU(seg.gem[0]), y: Fl + seg.gem[1], tramo: this.gi });
  if (seg.hazard === 'rockfall') {
    const lanes = [];
    for (const [a, b] of ranges) lanes.push(latToU(a + (b - a) * 0.2), latToU(a + (b - a) * 0.5), latToU(a + (b - a) * 0.8));
    R.rockfalls.push({ strip: strip.id, lanes, top: Fu + 1, bot: Fl, periods: [4.2, 3.4, 4.8, 3.8, 4.4, 3.6], phase: [0, 1.3, 2.6, 0.7, 2.0, 3.1], tramo: this.gi });
  }
  if (seg.hazard === 'steam') {
    let k = 0;
    const rr = ranges[0], a = Math.min(rr[0], rr[1]), b = Math.max(rr[0], rr[1]);
    for (let yy = 2.6; yy < h - 1.5; yy += 2.8) {
      // filas alternadas: hay que esquivar de lado o esperar a que paren
      const lats = k++ % 2 ? [a + (b - a) * 0.15, a + (b - a) * 0.62] : [a + (b - a) * 0.38, a + (b - a) * 0.85];
      for (const lat of lats) R.steamsLocal.push({ strip: strip.id, u: latToU(lat), y: Fl + yy, period: 3.6, phase: (k * 1.37 + lat * 0.7 + 10) % 3.6, dur: 1.2 });
    }
  }
  // repisa de arriba: tapa la rampa del terreno y es donde se sale de la pared
  this.block(0, this.LIP / 2, (W + 3) * 2, this.LIP, Fl - 1, Fu, 'lip');
  this.F = Fu;
  this.flatUntil = this.s + this.LIP + 0.5;
  if (seg.head) { this.head = { s: this.s, F: Fu, summit: !!seg.summit }; return; }
  this.walk(4, this.walls ? { noNpc: true } : { walls: true, noNpc: true });
};

// Fin del tramo sin pared de cabecera (se llega caminando al campamento)
GBP.end = function (seg) { this.head = { s: this.s, F: this.F, summit: !!seg.summit }; };

// Foso de lado a lado del cauce con bordes rectos (bloques) en los dos extremos
GBP.pit = function (len, y, water, o) {
  o = o || {};
  const F = this.F, W = this.Wb, s0 = this.s;
  this.pits.push({ s0, s1: s0 + len, y, water, lava: this.lava, deep: !!o.deep, wide: !!o.wide });
  const E = this.EDGE;
  this.flatUntil = s0 + len + E + 0.5;
  this.block(0, -E / 2, (W + 3) * 2, E, F - 3, F, 'edge');
  if (!o.noEnd) this.block(0, len + E / 2, (W + 3) * 2, E, (o.endF === undefined ? F : o.endF) - 3, o.endF === undefined ? F : o.endF, 'edge');
};

// Rocas en un rápido (o en lava): saltar de una a otra; al caer, la cuerda te detiene
GBP.boulders = function (seg) {
  this.challenge(seg);
  const n = seg.n, len = seg.len, F = this.F;
  const g = (len - n * 2.4) / (n + 1);
  this.pit(len, F - 3, this.lava ? F - 1.6 : F - 0.7);
  this.anchorPost(2.0, -1.0, F);
  for (let i = 0; i < n; i++) {
    const f = g + 1.2 + i * (2.4 + g), lat = (i % 2 ? -0.8 : 0.8);
    const top = F + 0.3 + (i % 2) * 0.25;
    const mv = seg.sink && i % 2 === 1 ? { amp: 0.75, period: 3.6 + i * 0.3, phase: i * 1.1 } : null;
    this.block(lat, f, 2.7, 2.5, F - 4, top, this.lava ? 'basalt' : 'boulder', mv ? { move: mv } : null);
    if (seg.gem === 'side' && i === n - 2) {
      const gl = lat + (lat > 0 ? 2.5 : -2.5), gp = this.P(gl, f);
      this.block(gl, f, 1.6, 1.7, F - 4, F + 0.5, this.lava ? 'basalt' : 'boulder');
      this.R.gems.push({ x: gp.x, y: F + 1.7, z: gp.z, tramo: this.gi });
    }
  }
  this.walk(len, { dry: true });
};

// Poza profunda: se cruza colgado de una franja de presas en la pared lateral
GBP.traverse = function (seg) {
  this.challenge(seg);
  const s0 = this.s, F = this.F, side = seg.side;
  this.pit(seg.len, F - 5, F - 1.2, { deep: true });
  this.zones[side].push({ s0: s0 - 2.5, s1: s0 + seg.len + 2.5, y0: F + 0.4, y1: F + 3.1, type: 'rock' });
  this.anchorPost(side === 'L' ? 2 : -2, -1.6, F);
  for (let s = s0 + 2; s < s0 + seg.len; s += 4) this.sideAnchors.push({ side, s, y: F + 2.2 });
  if (seg.gem) this.R.gemsSide.push({ gi: this.gi, side, s: s0 + seg.len * 0.5, y: F + 4.3 });
  this.walk(seg.len, { dry: true });
};

// Cornisa: un sendero estrecho pegado a la pared sobre una garganta, con un cable para sujetarse
GBP.ledge = function (seg) {
  this.challenge(seg);
  const s0 = this.s, F = this.F, side = seg.side, sg = side === 'L' ? 1 : -1, W = this.Wb;
  this.pit(seg.len, F - 14, F - 12.6);
  this.ledges[side].push({ s0: s0 - 1.5, s1: s0 + seg.len + 1.5 });
  for (let f = 0; f < seg.len; f += 2) {
    // cada 6 m la cornisa se ensancha: ahí se espera a que pase la ráfaga
    const wide = f > 0 && f % 6 === 0, wdt = wide ? 2.2 : 1.25;
    this.block(sg * (W - wdt / 2), f + 1, wdt, 2.3, F - 2.5, F, 'ledge');
    if (f % 4 === 0) this.anchorPost(sg * (W - 0.35), f + 1, F);
  }
  this.R.cables.push({ gi: this.gi, side, s0: s0 - 1, s1: s0 + seg.len + 1, y: F + 1.3 });
  if (seg.wind) {
    const L = this.L(), c0 = this.P(0, 0), c1 = this.P(0, seg.len);
    this.R.winds.push({ x0: Math.min(c0.x, c1.x) - 8, x1: Math.max(c0.x, c1.x) + 8, z0: Math.min(c0.z, c1.z) - 8, z1: Math.max(c0.z, c1.z) + 8, y0: F - 3, y1: F + 5,
      dx: -L.x * sg, dz: -L.z * sg, period: 5.5, dur: 1.5, warn: 1.3, force: 8, phase: 2, tramo: this.gi });
  }
  this.walk(seg.len, { dry: true });
};

GBP.bridge = function (seg) {
  this.challenge(seg);
  const F = this.F, len = seg.len;
  this.pit(len, F - 14, F - 12.6);
  for (let i = 0; i < len; i++) {
    if (seg.miss && seg.miss.indexOf(i) >= 0) continue;
    this.block(0, i + 0.5, 1.7, 0.86, F - 0.22, F, 'wood');
  }
  for (const lat of [0.92, -0.92]) {
    const a = this.P(lat, -0.3), b = this.P(lat, len + 0.3);
    this.R.rails.push({ a: { x: a.x, y: F + 0.95, z: a.z }, b: { x: b.x, y: F + 0.95, z: b.z } });
    this.R.posts.push({ x: a.x, y: F, z: a.z, h: 1.2 }, { x: b.x, y: F, z: b.z, h: 1.2 });
  }
  if (seg.gem === 'under') { const p = this.P(0, seg.miss ? seg.miss[0] + 0.5 : len / 2); this.R.gems.push({ x: p.x, y: F - 1.6, z: p.z, tramo: this.gi }); }
  this.anchorPost(2.0, -1.6, F);
  this.walk(len, { dry: true });
};

// Garfio: un abismo y una pared lisa al otro lado; se cruza lanzando el garfio al anillo
GBP.hookGap = function (seg) {
  this.challenge(seg);
  const F = this.F, len = seg.len, rise = seg.rise || 0;
  this.pit(len, F - 14, F - 12.6, { noEnd: true });
  this.anchorPost(2.0, -1.6, F);
  this.walk(len, { dry: true });
  const Fu = F + rise;
  this.steps.push({ s: this.s, Fl: F, Fu });
  this.crossStrip(F - 15.5, Fu, 0.5);
  this.block(0, this.LIP / 2, (this.Wb + 3) * 2, this.LIP, F - 15, Fu, 'lip');
  const r = this.P(0, 0.6), l = this.P(0, 2.8);
  this.R.rings.push({ x: r.x, y: Fu + 3.4, z: r.z, land: { x: l.x, y: Fu, z: l.z } });
  this.R.posts.push({ x: r.x, y: Fu, z: r.z, h: 3.0 });
  this.F = Fu;
  this.walk(4, { dry: true });
};

GBP.zipline = function (seg) {
  this.challenge(seg);
  const F = this.F, len = seg.len, drop = seg.drop || 0;
  const a = this.P(0, 1.6);
  this.anchorPost(2.0, -0.8, F);
  this.walk(3, { dry: true });
  this.pit(len, F - 15, F - 13.6, { endF: F - drop });
  this.walk(len, { dry: true });
  this.F = F - drop;
  const b = this.P(0, 2.2);
  this.R.zips.push({ a: { x: a.x, y: F + 2.35, z: a.z }, b: { x: b.x, y: F - drop + 2.35, z: b.z } });
  this.R.posts.push({ x: a.x, y: F, z: a.z, h: 3.0 }, { x: b.x, y: F - drop, z: b.z, h: 3.0 });
  this.walk(4, { dry: true });
};

GBP.pitAt = function (s) { for (const p of this.pits) if (s >= p.s0 - 0.6 && s <= p.s1 + 0.6) return p; return null; };

// Paredes laterales: franjas que siguen el cauce a cada lado, en cada tramo seguido que tiene paredes
GBP.buildSides = function () {
  const R = this.R, S = this.samples, n = S.length, sEnd = this.s;
  const F0 = this.def.start.y, Fend = this.F;
  // tramos seguidos con pared (en el volcán, todo el barranco)
  const runsOf = side => {
    const out = [];
    let a = -1;
    for (let i = 0; i <= n; i++) {
      const on = i < n && (side === 'L' ? S[i].wL : S[i].wR);
      if (on && a < 0) a = i;
      if (!on && a >= 0) { out.push([a, i - 1]); a = -1; }
    }
    return out;
  };
  // la pared es más baja al empezar y al terminar cada tramo, para enlazar con lo que sigue
  const rimOf = (i, a, b) => {
    const q = S[i], first = a === 0, last = b === n - 1;
    const sa = S[a].s, sb = last ? sEnd : S[b].s + 1;
    const Fa = first ? F0 : S[a].F, Fb = last ? Fend : S[b].F;
    let r = Math.max(q.rim, q.F + 3.2);
    r = U.lerp(Fa + 0.4, r, U.smooth(sa, sa + 7, q.s));
    r = U.lerp(r, Fb + 0.4, U.smooth(sb - 7, sb + 1, q.s));
    return Math.max(r, q.F + (q.s < sa + 7 || q.s > sb - 7 ? 0.4 : 3.2));
  };
  this.rims = S.map(q => q.F + 0.4);
  const runs = { L: runsOf('L'), R: runsOf('R') };
  const rimSide = { L: S.map(q => q.F + 0.4), R: S.map(q => q.F + 0.4) };
  for (const side of ['L', 'R']) for (const [a, b] of runs[side]) for (let i = a; i <= b; i++) rimSide[side][i] = rimOf(i, a, b);
  for (let i = 0; i < n; i++) this.rims[i] = Math.max(rimSide.L[i], rimSide.R[i]);
  // borde de arriba de las paredes: el más alto de alrededor (así cubre el salto de cada escalón)
  this.rimTop = S.map((q, i) => { let m = -1e9; for (let k = Math.max(0, i - 2); k <= Math.min(n - 1, i + 2); k++) m = Math.max(m, this.rims[k]); return m; });
  for (const side of ['L', 'R']) for (const [a, b] of runs[side]) {
    const sg = side === 'L' ? 1 : -1, pts = [];
    let u = 0, prev = null;
    for (let i = a; i <= b; i++) {
      const q = S[i], L = { x: Math.cos(q.ang), z: -Math.sin(q.ang) };
      const x = q.x + L.x * q.Wb * sg, z = q.z + L.z * q.Wb * sg;
      if (prev) u += Math.hypot(x - prev.x, z - prev.z);
      // el pie de la pared llega hasta el punto más bajo de alrededor (escalones y fosos)
      let lo = 1e9, hi = -1e9;
      for (let k = Math.max(0, i - 2); k <= Math.min(n - 1, i + 2); k++) {
        const pk = this.pitAt(S[k].s);
        lo = Math.min(lo, (pk ? pk.y : S[k].F) - 1.5);
        if (k >= a && k <= b) hi = Math.max(hi, rimSide[side][k]);
      }
      let amp = q.amp;
      for (const l of this.ledges[side]) if (q.s > l.s0 - 2 && q.s < l.s1 + 2) amp = Math.min(amp, 0.12);
      pts.push({ x, z, nx: -L.x * sg, nz: -L.z * sg, u, y0: lo, y1: hi, s: q.s, amp });
      prev = { x, z };
    }
    if (pts.length < 2) continue;
    const strip = { id: R.strips.length, pts, zones: [], seed: R.strips.length * 13 + 3, kind: 'side', side, tramo: this.gi, len: u, gorge: this.gi };
    const sA = S[a].s, sB = S[b].s, inRun = s => s >= sA - 0.5 && s <= sB + 0.5;
    const uOf = s => { const i = U.clamp(Math.round(s - sA), 0, pts.length - 1); return pts[i].u; };
    for (const z of this.zones[side]) if (inRun((z.s0 + z.s1) / 2)) strip.zones.push({ u0: uOf(z.s0), u1: uOf(z.s1), y0: z.y0, y1: z.y1, type: z.type });
    for (const an of this.sideAnchors) if (an.side === side && inRun(an.s)) R.anchors.push({ strip: strip.id, u: uOf(an.s), y: an.y, wall: true, idx: R.anchors.length, tramo: this.gi });
    for (const g of R.gemsSide) if (g.gi === this.gi && g.side === side && inRun(g.s)) R.gemsLocal.push({ strip: strip.id, u: uOf(g.s), y: g.y, tramo: this.gi });
    for (const c of R.cables) if (c.gi === this.gi && c.side === side && inRun((c.s0 + c.s1) / 2)) { c.strip = strip.id; c.u0 = uOf(c.s0); c.u1 = uOf(c.s1); }
    for (const t of this.npcSide || []) if (t.side === side && inRun(t.s)) t.node.strip = strip.id, t.node.u = uOf(t.s);
    R.strips.push(strip);
  }
};

// Arma la ruta de una montaña. defs: los tramos; opts.peak: la cumbre hacia la que apuntan (montaña nevada)
function buildRoute(defs, opts) {
  defs = defs || GORGES; opts = opts || {};
  const R = {
    gorges: [], strips: [], blocks: [], anchors: [], gems: [], gemsLocal: [], gemsSide: [], rings: [], zips: [], winds: [],
    rockfalls: [], steamsLocal: [], falls: [], checkpoints: [], challenges: [], rails: [], posts: [], cables: [], camps: [],
    lines: [], icefalls: [], ladders: [], npc: [], ridges: []
  };
  const angTo = (p, q) => Math.atan2(q.x - p.x, q.z - p.z);
  const angOf = (def, at) => def.ang !== undefined ? def.ang : angTo(at, opts.peak) + (def.angRel || 0);
  // campamento de partida (la playa o el campamento base) = punto de control 0
  const g0 = defs[0], a0 = angOf(g0, g0.start), H0 = { x: Math.sin(a0), z: Math.cos(a0) };
  const c0 = { x: g0.start.x - H0.x * 10, z: g0.start.z - H0.z * 10 };
  R.camps.push({ x: c0.x, y: g0.start.y, z: c0.z, r: CAMP_R + 2, beach: true });
  R.checkpoints.push({ x: c0.x, y: g0.start.y, z: c0.z, tramo: 0 });
  R.npc.push({ x: c0.x, z: c0.z, y: g0.start.y, mode: 'rest', gi: 0, camp: 0 });
  let prev = null;
  defs.forEach((def, gi) => {
    if (!def.start) def.start = prev;
    const B = new GorgeBuilder(R, Object.assign({}, def, { ang: angOf(def, def.start) }), gi);
    B.opts = opts;
    // con celdas de terreno más grandes, las repisas y los bordes tienen que tapar más
    if (opts.cell) { B.LIP = Math.ceil((opts.cell * 2.95 + 0.4) * 2) / 2; B.EDGE = Math.ceil((opts.cell * 1.45 + 0.6) * 2) / 2; }
    for (const seg of def.segs) {
      if (seg.t === 'walk') B.walk(seg.len, seg);
      else B[seg.t](seg);
    }
    B.buildSides();
    const H = B.H(), cd = B.head.summit && opts.summitOnTop ? 3 : 11, c = { x: B.x + H.x * cd, z: B.z + H.z * cd };
    R.gorges.push({ id: def.id, gi, samples: B.samples, rims: B.rimTop, pits: B.pits, water: B.water, frozen: B.frozen, lava: B.lava, steps: B.steps,
      start: { x: def.start.x, z: def.start.z, F: def.start.y }, end: { x: B.x, z: B.z, F: B.F, s: B.s, ang: B.ang } });
    R.camps.push({ x: c.x, y: B.F, z: c.z, r: CAMP_R, summit: B.head.summit });
    R.npc.push({ x: c.x, z: c.z, y: B.F, mode: 'rest', gi: gi + 1, camp: gi + 1 });
    if (B.head.summit) {
      R.summit = { x: c.x, y: B.F, z: c.z };
      R.checkpoints.push({ x: c.x, y: B.F, z: c.z, tramo: gi + 1, summit: true });
      // en el volcán el cráter queda justo detrás de la cumbre
      if (!opts.summitOnTop) { const cr = 18; R.crater = { x: c.x + H.x * (cr + 13), z: c.z + H.z * (cr + 13), r: cr }; }
    } else {
      R.checkpoints.push({ x: c.x, y: B.F, z: c.z, tramo: gi + 1 });
      // el siguiente tramo arranca al otro lado del campamento
      const a = angOf(defs[gi + 1], c);
      prev = { x: c.x + Math.sin(a) * 9, z: c.z + Math.cos(a) * 9, y: B.F };
    }
  });
  R.gems.forEach((g, i) => { g.idx = i; });
  return R;
}
