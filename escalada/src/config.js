// Valores de ajuste del juego. Todo lo que se afina seguido vive aquí.
'use strict';

const CFG = {
  // Mundo
  N: 256,            // celdas por lado del mapa de alturas
  CELL: 2,           // metros por celda
  SHORE_R: 236,      // radio de la costa
  BASE_R: 214,       // radio donde empieza la montaña
  // Estos cuatro los recalcula World a partir de la ruta (cumbre y fogatas)
  PEAK_H: 197,       // altura del borde del cráter
  CRATER_R: 21,      // radio del borde del cráter
  LAVA_H: 167,       // nivel del lago de lava dentro del cráter
  // Biomas por altura: cada tramo de la ruta termina en la fogata del siguiente bioma
  BIOMES: [
    { id: 'shore', top: 38 },
    { id: 'jungle', top: 105 },
    { id: 'alpine', top: 147 },
    { id: 'caldera', top: 999 }
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
  lungeUp: 7.4,
  lungeOut: 0.8,
  radius: 0.36,
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
  anchorRegen: 0.22,      // descansar colgado de un gancho
  clipDist: 2.6,          // distancia para engancharse a un gancho al pasar
  // tipos de pared: cuánto cansa y qué tan rápido se sube
  surf: {
    rock:   { drain: 1,    speed: 1 },
    ice:    { drain: 1.9,  speed: 0.9 },
    vine:   { drain: 0.45, speed: 1.25 },
    ladder: { drain: 0.25, speed: 1.35 }
  },
  hookSpeed: 19,

  // Cámara
  camDist: 4.6,
  camDistClimb: 5.6,
  camHeight: 1.35,

  // Duración del día (segundos de partida de mañana a atardecer)
  dayLength: 1500
};

// Insignias que se ganan una vez y se guardan
const BADGES = [
  { id: 'tramo1',  icon: '🔥' },
  { id: 'first',   icon: '🏔️' },
  { id: 'clean',   icon: '😇' },
  { id: 'hard',    icon: '💀' },
  { id: 'gold',    icon: '🥇' },
  { id: 'allgold', icon: '🏆' },
  { id: 'gems',    icon: '💎' },
  { id: 'speed',   icon: '⏱️' }
];
