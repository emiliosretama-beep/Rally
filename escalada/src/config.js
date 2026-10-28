// Valores de ajuste del juego. Todo lo que se afina seguido vive aquí.
'use strict';

const CFG = {
  // Mundo
  N: 256,            // celdas por lado del mapa de alturas
  CELL: 2,           // metros por celda
  SHORE_R: 236,      // radio de la costa
  BASE_R: 214,       // radio donde empieza la montaña
  PEAK_H: 290,       // altura del borde del cráter
  CRATER_R: 26,      // radio del borde del cráter
  LAVA_H: 258,       // nivel del lago de lava dentro del cráter

  // Biomas por altura (metros). La fogata de cada bioma queda cerca de su techo.
  BIOMES: [
    { id: 'shore',  top: 42,  step: 9,  fire: 4 },
    { id: 'jungle', top: 122, step: 13, fire: 42 },
    { id: 'alpine', top: 212, step: 16, fire: 122 },
    { id: 'caldera', top: 999, step: 18, fire: 212 }
  ],

  // Personaje (unidades: metros y segundos)
  walkSpeed: 4.3,
  sprintSpeed: 7.2,
  groundAccel: 34,
  airAccel: 7,
  gravity: 22,
  jumpVel: 7.4,
  coyote: 0.12,
  jumpBuffer: 0.14,
  walkableNY: 0.66,      // normal.y mínima para poder caminar (~49°)
  climbSpeed: 2.1,
  lungeUp: 6.6,
  lungeOut: 0.8,
  radius: 0.36,
  safeFallSpeed: 11.5,   // por debajo de esta velocidad de impacto no hay daño
  fallDamage: 0.034,     // daño por cada m/s sobre la velocidad segura
  maxGrabSpeed: 20,      // si caes más rápido no te puedes agarrar

  // Resistencia (stamina). La barra completa vale 1.
  staRegen: 0.38,
  staRegenDelay: 0.55,
  staSprint: 0.10,
  staJump: 0.07,
  staClimbIdle: 0.04,
  staClimbMove: 0.075,
  staLunge: 0.19,
  staGrabFall: 0.012,     // costo extra por m/s al agarrarte cayendo
  pitonRegen: 0.16,

  // Afecciones (cada una se come parte de la barra de resistencia)
  hungerRate: 0.0009,
  coldRate: 0.0038,
  blizzardCold: 3.0,
  coldDecay: 0.02,
  fireWarm: 0.06,
  poisonDecay: 0.0045,
  lavaBurn: 0.42,
  ventBurn: 0.28,

  // Clima
  blizzardEvery: [70, 110],
  blizzardLen: [24, 36],
  windForce: 2.4,

  // Cámara
  camDist: 4.6,
  camDistClimb: 5.6,
  camHeight: 1.35,

  // Duración del día (segundos de partida de mañana a atardecer)
  dayLength: 1500,

  // Medallas (segundos)
  goldTime: 12 * 60,
  silverTime: 20 * 60
};

// Objetos. "eff" describe lo que hacen al usarse.
const ITEMS = {
  coconut:  { icon: '🥥', eff: { hunger: -0.30 } },
  berryRed: { icon: '🍓', eff: { hunger: -0.13 } },
  berryMys: { icon: '🫐', eff: { hunger: -0.15 }, mystery: true },
  granola:  { icon: '🍫', eff: { hunger: -0.45 } },
  bandage:  { icon: '🩹', eff: { injury: -0.30 } },
  medkit:   { icon: '⛑️', eff: { injury: -0.55, poison: -1 } },
  energy:   { icon: '⚡', eff: { bonus: 0.6 } },
  tea:      { icon: '☕', eff: { cold: -0.5, warmth: 35 } },
  antidote: { icon: '🌿', eff: { poison: -1 } },
  piton:    { icon: '📌', piton: true }
};

// Botín de las maletas por bioma (peso relativo).
const LOOT = {
  shore:   { granola: 3, bandage: 3, energy: 2, piton: 3, coconut: 2 },
  jungle:  { granola: 2, bandage: 2, energy: 2, piton: 3, antidote: 3, medkit: 1 },
  alpine:  { granola: 2, tea: 4, energy: 2, piton: 3, bandage: 2, medkit: 1 },
  caldera: { granola: 1, energy: 3, piton: 3, medkit: 2, bandage: 2 }
};
