// El Gigante Blanco: una expedición por una montaña nevada al estilo del K2.
// Cinco tramos de campamento en campamento: la cascada de hielo del glaciar, la gran ladera,
// la banda de roca, el hombro y el cuello de botella hasta la cumbre.
// Usa el mismo constructor que los barrancos (route.js) con piezas nuevas: laderas con cuerda
// fija, escaleras sobre grietas, saltos de grieta, aristas y la travesía bajo el serac.
'use strict';

const K2_PEAK = { x: 0, z: 108 };   // la cumbre: los tramos apuntan hacia aquí

const K2_SECTIONS = [
  {
    id: 'k_icefall', start: { x: -14, z: -290, y: 0 }, angRel: 0.6, Wb: 2.4, depth: 5, walls: false, dry: true, amp: 0.45, npcLat: -0.9,
    segs: [
      { t: 'walk', len: 14 },
      { t: 'ladderBridge', gap: 6, nm: 'c_k_ladder1', par: 12, gem: 'under' },
      { t: 'walk', len: 10, rise: 2, turn: -0.3 },
      { t: 'step', h: 7, fall: 'N', surf: 'ladder', ice: true, nm: 'c_k_serac1', par: 14, gem: [2.0, 5.2] },
      { t: 'walk', len: 6, rise: 2, turn: 0.4 },
      { t: 'walk', len: 5 },
      { t: 'crevJump', gap: 2.2, rise: 0.4, nm: 'c_k_jump', par: 8 },
      { t: 'walk', len: 6, rise: 2 },
      { t: 'walk', len: 5 },
      { t: 'ladderBridge', gap: 9, double: true, wind: true, nm: 'c_k_ladder2', par: 14 },
      { t: 'walk', len: 8, rise: 3, turn: -0.2 },
      { t: 'step', h: 9, fall: 'N', surf: 'ice', anchors: [3.2, 6.4], nm: 'c_k_serac2', par: 20 },
      { t: 'walk', len: 6, rise: 1 },
      { t: 'end' }
    ]
  },
  {
    id: 'k_slope', angRel: -0.8, Wb: 2.4, depth: 4, walls: false, dry: true, amp: 0.45, npcLat: 0,
    segs: [
      { t: 'walk', len: 8, rise: 2 },
      { t: 'slope', len: 20, rise: 27, nm: 'c_k_slope1', par: 32 },
      { t: 'walk', len: 6, rise: 1, turn: 0.6 },
      { t: 'walk', len: 5 },
      { t: 'crevJump', gap: 2.6, rise: 1.2, nm: 'c_k_berg', par: 8 },
      { t: 'walk', len: 5, rise: 1 },
      { t: 'slope', len: 18, rise: 24, wind: true, nm: 'c_k_slope2', par: 30 },
      { t: 'walk', len: 8, rise: 2 },
      { t: 'end' }
    ]
  },
  {
    id: 'k_rock', angRel: 0.8, Wb: 2.6, depth: 5, walls: false, dry: true, amp: 0.5, npcLat: 0,
    segs: [
      { t: 'walk', len: 8, rise: 2 },
      { t: 'step', h: 9, fall: 'N', bands: [[3.5, 1.5]], nm: 'c_k_rockband', par: 18, gem: [-1.9, 7.6] },
      { t: 'walk', len: 5, rise: 1 },
      { t: 'step', h: 12, fall: 'N', crack: [[-1.4, 0.4, -1, 4.4], [-0.2, 1.8, 3.8, 8.2], [-1.6, 0.4, 7.6, 12]], nm: 'c_k_chimney', par: 22, gem: [1.6, 11] },
      { t: 'walk', len: 6, rise: 2, turn: -0.4 },
      { t: 'slope', len: 12, rise: 16, gully: true, nm: 'c_k_couloir', par: 22 },
      { t: 'walk', len: 5, rise: 1 },
      { t: 'step', h: 7, fall: 'N', surf: 'ice', nm: 'c_k_mixed', par: 16 },
      { t: 'walk', len: 5, rise: 1 },
      { t: 'end' }
    ]
  },
  {
    id: 'k_shoulder', angRel: -0.6, Wb: 2.6, depth: 4, walls: false, dry: true, amp: 0.45, npcLat: 0,
    segs: [
      { t: 'walk', len: 8, rise: 3 },
      { t: 'ridge', len: 26, rise: 6, wind: true, aim: true, nm: 'c_k_ridge1', par: 22 },
      { t: 'walk', len: 8 },
      { t: 'ladderBridge', gap: 7, wind: true, nm: 'c_k_ladder3', par: 12, gem: 'under' },
      { t: 'walk', len: 10, rise: 2, turn: 0.5 },
      { t: 'slope', len: 14, rise: 19, nm: 'c_k_slope3', par: 26 },
      { t: 'walk', len: 6, rise: 1 },
      { t: 'end' }
    ]
  },
  {
    id: 'k_summit', angRel: 0.35, Wb: 2.6, depth: 5, walls: false, dry: true, amp: 0.45, npcLat: 0,
    segs: [
      { t: 'walk', len: 8, rise: 3 },
      { t: 'slope', len: 22, rise: 30, gully: true, icefall: true, nm: 'c_k_bottleneck', par: 36 },
      { t: 'walk', len: 6 },
      { t: 'seracTraverse', len: 16, side: 'L', nm: 'c_k_traverse', par: 26 },
      { t: 'walk', len: 6, rise: 2 },
      { t: 'step', h: 7, fall: 'N', surf: 'ice', nm: 'c_k_lastwall', par: 16, gem: [-1.8, 5.5] },
      { t: 'walk', len: 4 },
      { t: 'ridge', toPeak: 4, rise: 12, wind: true, aim: true, nm: 'c_k_summitridge', par: 26 },
      { t: 'walk', len: 4, rise: 1 },
      { t: 'end', summit: true }
    ]
  }
];

// ---------- piezas nuevas del constructor ----------
// Cuerda fija entre dos puntos del camino (en s) a un lado (lat). El mundo calcula los puntos
// sobre la nieve cuando el terreno ya está hecho. steep: es para subir laderas empinadas.
GBP.fixedLine = function (sA, sB, lat, steep, h) {
  const R = this.R, idx = R.anchors.length;
  const line = { id: R.lines.length, gi: this.gi, sA, sB, lat, steep: !!steep, h: h === undefined ? 0.55 : h, idx, tramo: this.gi };
  R.lines.push(line);
  // ocupa un lugar en el orden de los ganchos: así se engancha en el orden de la ruta
  R.anchors.push({ line: line.id, lineOnly: true, idx, tramo: this.gi, wall: false });
  return line;
};

GBP.windZone = function (len, force, sg) {
  const L = this.L(), c0 = this.P(0, 0), c1 = this.P(0, len);
  this.R.winds.push({ x0: Math.min(c0.x, c1.x) - 7, x1: Math.max(c0.x, c1.x) + 7, z0: Math.min(c0.z, c1.z) - 7, z1: Math.max(c0.z, c1.z) + 7, y0: this.F - 4, y1: this.F + (this.lastRise || 0) + 6,
    dx: L.x * sg, dz: L.z * sg, period: 6, dur: 1.6, warn: 1.4, force, phase: 1 + this.gi, tramo: this.gi });
};

// Ladera empinada: no se puede caminar; se sube jalándose de la cuerda fija (mantener Agarrar)
GBP.slope = function (seg) {
  this.challenge(seg);
  const s0 = this.s, len = seg.len, lat = seg.lineLat === undefined ? 0.9 : seg.lineLat;
  const line = this.fixedLine(s0 - 4, s0 + len + 3, lat, true);
  line.steepA = s0; line.steepB = s0 + len;
  if (seg.gully) this.gully(3);
  this.lastRise = seg.rise;
  if (seg.wind) this.windZone(len, 6, 1);
  this.walk(len, { rise: seg.rise, walls: seg.gully ? true : undefined, npc: 'jumar', npcLat: lat - 0.55 });
  if (seg.gully) for (let i = 0; i < 3; i++) this.walk(1, { walls: true, noNpc: i > 0 });
  if (seg.icefall) {
    // bloques de hielo que se sueltan del serac de arriba y bajan rodando por carriles:
    // uno a cada lado de la cuerda, por turnos (te mueves al otro lado de la cuerda para esquivar)
    // y otro lejos, que solo se ve
    this.R.icefalls.push({ gi: this.gi, s0: s0 - 1, s1: s0 + len, lanes: [lat - 0.6, lat + 0.6, lat - 2.6], periods: [5.2, 5.2, 6.1], phase: [0.4, 3.0, 1.3], speed: 9, tramo: this.gi });
  }
};

// Grieta con escalera de aluminio encima; una cuerda de mano a un lado
GBP.ladderBridge = function (seg) {
  this.challenge(seg);
  const F = this.F, gap = seg.gap, s0 = this.s;
  this.pit(gap, F - 14, F - 13.5, { wide: true });
  this.block(0, gap / 2, 0.62, gap + 1.5, F - 0.12, F + 0.03, 'ladder');
  const a = this.P(0, -0.75), b = this.P(0, gap + 0.75);
  this.R.ladders.push({ gi: this.gi, a: { x: a.x, z: a.z }, b: { x: b.x, z: b.z }, y: F + 0.03, w: 0.62, joint: seg.double ? 0.5 : -1, horiz: true });
  this.fixedLine(s0 - 3, s0 + gap + 3, 0.62, false, 1.0);
  if (seg.wind) this.windZone(gap, 5, 1);
  if (seg.gem === 'under') { const p = this.P(0, gap / 2); this.R.gems.push({ x: p.x, y: F - 2.4, z: p.z, tramo: this.gi }); }
  this.npcNode(0, -0.9, 'walk', { y: F });
  for (let f = 0; f <= gap; f += 1) this.npcNode(0, f, 'ladder', { y: F + 0.03 });
  this.walk(gap, { noNpc: true });
};

// Grieta estrecha para saltar; el otro lado puede estar más alto (la rimaya)
GBP.crevJump = function (seg) {
  this.challenge(seg);
  const F = this.F, gap = seg.gap, rise = seg.rise || 0;
  this.pit(gap, F - 12, F - 11.5, { wide: true, endF: F + rise });
  this.anchorPost(1.4, -1.6, F);
  this.npcNode(0, -0.4, 'walk', { y: F });
  this.npcNode(0, gap + 0.7, 'jump', { y: F + rise });
  this.walk(gap, { noNpc: true });
  this.F = F + rise;
  if (rise > 0.01) this.steps.push({ s: this.s, Fl: F, Fu: F + rise });
};

// Arista: camino estrecho con caída a los dos lados, viento y cuerda fija por la cresta
GBP.ridge = function (seg) {
  const pk = this.opts && this.opts.peak;
  if (seg.aim && pk) this.ang = Math.atan2(pk.x - this.x, pk.z - this.z);
  this.challenge(seg);
  let len = seg.len;
  if (seg.toPeak && pk) len = Math.max(10, Math.round(Math.hypot(pk.x - this.x, pk.z - this.z) - seg.toPeak));
  const W0 = this.Wb, s0 = this.s;
  this.Wb = seg.W || 2.3;
  this.fixedLine(s0 - 2, s0 + len + 2, 0.55, false, 0.7);
  this.lastRise = seg.rise;
  if (seg.wind) this.windZone(len, 6.5, 1);
  this.R.ridges.push({ gi: this.gi, x: this.P(0, len / 2).x, z: this.P(0, len / 2).z });
  this.walk(len, { rise: seg.rise, ridge: true, npcLat: -0.2 });
  this.Wb = W0;
};

// Travesía bajo el serac: se cruza colgado de la pared de hielo, sobre el vacío
GBP.seracTraverse = function (seg) {
  this.challenge(seg);
  const s0 = this.s, F = this.F, side = seg.side, sg = side === 'L' ? 1 : -1;
  // la pared empieza un poco antes y termina un poco después
  for (let i = Math.max(0, this.samples.length - 4); i < this.samples.length; i++) this.samples[i][side === 'L' ? 'wL' : 'wR'] = true;
  this.pit(seg.len, F - 14, F - 13.5, { wide: true, deep: true });
  this.zones[side].push({ s0: s0 - 2.5, s1: s0 + seg.len + 2.5, y0: F + 0.4, y1: F + 3.1, type: 'ice' });
  this.anchorPost(sg * 1.4, -1.6, F);
  for (let s = s0 + 2; s < s0 + seg.len; s += 4) this.sideAnchors.push({ side, s, y: F + 2.2 });
  this.npcSide = this.npcSide || [];
  this.npcNode(sg * (this.Wb - 0.6), -1.2, 'walk', { y: F });
  for (let s = s0 - 1; s <= s0 + seg.len + 1; s += 1) {
    const node = { mode: 'climb', y: F + 0.9, gi: this.gi };
    this.R.npc.push(node);
    this.npcSide.push({ side, s, node });
  }
  this.walk(seg.len, { walls: side, noNpc: true });
  for (let i = 0; i < 3; i++) this.walk(1, { walls: side, noNpc: i > 0 });
};

function buildK2Route() { return buildRoute(K2_SECTIONS, { peak: K2_PEAK, summitOnTop: true, cell: 3 }); }
