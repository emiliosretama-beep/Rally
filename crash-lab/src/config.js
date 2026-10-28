// Crash Lab: ajustes, textos y guardado.
// Todo lo que se afina seguido vive aquí, separado de la lógica.
var CL = window.CL || (window.CL = {});

CL.TUNING = {
  pxPerMeter: 40,          // escala para mostrar km/h
  gravity: 1.15,
  // Motor: velocidad angular máxima de las llantas (rad por paso) por nivel
  // (radio 21 px: 0.75 ≈ 85 km/h, 0.95 ≈ 108 km/h, 1.15 ≈ 130 km/h)
  motorSpin: [0.75, 0.95, 1.15],
  motorAccel: 0.03,        // qué tan rápido llegan las llantas a su velocidad objetivo (por paso de 1/60 s)
  brakeSpin: -0.3,         // reversa
  airTorque: 0.004,        // giro del auto en el aire
  nitroAccel: 0.16,        // velocidad extra (px/paso) que gana el auto por cada 1/60 s de nitro
  nitroFuel: 2.2,          // segundos de nitro por intento
  // Daño
  substeps: 2,             // subpasos de física por cada 1/60 s: evita que el auto atraviese objetos a alta velocidad
  spawnGrace: 0.6,         // segundos sin daño al aparecer (el auto cae unos px al suelo)
  impactMin: 2.5,          // velocidad de impacto (px/paso) a partir de la cual hay daño
  crashMinValue: 400,      // o daño acumulado (en $) que también cuenta como choque (varios golpes chicos)
  crashMinDmg: 10,         // daño de un solo golpe que cuenta como "choque" e inicia el reporte (los barriles no cuentan)
  impactPow: 1.6,
  wheelExtraMin: 5,        // umbral extra de impacto para las llantas
  damageMul: 1.0,
  coreShare: 0.25,         // parte del golpe que también recibe el chasis
  bigHit: 13,              // golpe que dispara cámara lenta automática
  autoSlowSecs: 0.9,
  slowScale: 0.28,
  // Fin del choque
  restSpeed: 0.6,
  restSecs: 1.3,
  maxCrashSecs: 7
};

// Valor en $ de cada pieza (para el contador de daño y el dinero ganado)
CL.PART_VALUE = { core: 4000, cabin: 2500, hood: 1200, bumperF: 600, bumperR: 600, spoiler: 800, wheel: 500 };

CL.UPGRADES = {
  motor: { costs: [6000, 14000], max: 3 },  // nivel 1 gratis, luego 2 y 3
  nitro: { cost: 9000 },
  sponsor: { cost: 7000, mul: 1.5 }          // el pago sale del daño: el patrocinador lo multiplica
};

CL.I18N = {
  es: {
    subtitle: 'Choca. Destroza. Repara.',
    play: 'Jugar', garage: 'Taller', back: 'Volver', lang: 'English',
    sound: 'Sonido', on: 'Sí', off: 'No',
    chooseLevel: 'Elige la prueba',
    lvl_wall: 'Muro', lvl_wall_d: 'Acelera a fondo contra el muro de concreto.',
    lvl_ramp: 'Rampa', lvl_ramp_d: 'Salta el hueco y aterriza en las cajas.',
    lvl_drop: 'Caída', lvl_drop_d: 'La grúa te suelta desde 25 metros.',
    best: 'Récord', none: '—',
    damage: 'Daño', speed: 'km/h', money: 'Dinero',
    hint_drive: '▶ acelerar · ◀ frenar · en el aire giran el auto',
    hint_drop: 'Toca ▶ para soltar el auto',
    results: 'Reporte del choque', partsLost: 'Piezas perdidas', earned: 'Ganaste',
    newRecord: '¡Nuevo récord!', total: 'PÉRDIDA TOTAL',
    retry: 'Reparar y repetir', levels: 'Pruebas',
    motor: 'Motor', motor_d: 'Más velocidad, choques más fuertes.',
    nitro: 'Nitro', nitro_d: 'Botón N: empuje extra por 2 segundos.',
    sponsor: 'Patrocinador', sponsor_d: 'Te pagan 50% más por cada choque.',
    level: 'Nivel', buy: 'Comprar', owned: 'Comprado', maxed: 'Al máximo',
    rec: 'Grabar clip', recStop: 'Detener', recSaved: 'Clip guardado', recNo: 'Tu navegador no puede grabar',
    pause: 'Menú', slow: 'Cámara lenta', mute: 'Silenciar',
    gas: 'Acelerar', brake: 'Frenar', nitroBtn: 'Nitro',
    restart: 'Reiniciar',
    p_core: 'Chasis', p_cabin: 'Cabina', p_hood: 'Cofre', p_bumperF: 'Defensa del.', p_bumperR: 'Defensa tras.', p_spoiler: 'Alerón', p_wheel: 'Llanta'
  },
  en: {
    subtitle: 'Crash. Wreck. Repair.',
    play: 'Play', garage: 'Garage', back: 'Back', lang: 'Español',
    sound: 'Sound', on: 'On', off: 'Off',
    chooseLevel: 'Pick a test',
    lvl_wall: 'Wall', lvl_wall_d: 'Floor it into the concrete wall.',
    lvl_ramp: 'Ramp', lvl_ramp_d: 'Jump the gap and land on the crates.',
    lvl_drop: 'Drop', lvl_drop_d: 'The crane drops you from 25 meters.',
    best: 'Best', none: '—',
    damage: 'Damage', speed: 'km/h', money: 'Cash',
    hint_drive: '▶ throttle · ◀ brake · in the air they flip the car',
    hint_drop: 'Tap ▶ to release the car',
    results: 'Crash report', partsLost: 'Parts lost', earned: 'You earned',
    newRecord: 'New record!', total: 'TOTALED',
    retry: 'Repair and retry', levels: 'Tests',
    motor: 'Engine', motor_d: 'More speed, harder crashes.',
    nitro: 'Nitro', nitro_d: 'N button: extra push for 2 seconds.',
    sponsor: 'Sponsor', sponsor_d: 'Get paid 50% more for every crash.',
    level: 'Level', buy: 'Buy', owned: 'Owned', maxed: 'Maxed',
    rec: 'Record clip', recStop: 'Stop', recSaved: 'Clip saved', recNo: 'Your browser cannot record',
    pause: 'Menu', slow: 'Slow motion', mute: 'Mute',
    gas: 'Throttle', brake: 'Brake', nitroBtn: 'Nitro',
    restart: 'Restart',
    p_core: 'Chassis', p_cabin: 'Cabin', p_hood: 'Hood', p_bumperF: 'Front bumper', p_bumperR: 'Rear bumper', p_spoiler: 'Spoiler', p_wheel: 'Wheel'
  }
};

// Guardado con versión. localStorage puede fallar (modo privado, iframes de itch.io):
// el juego funciona igual sin él.
CL.SAVE_KEY = 'crashlab.save';
CL.defaultSave = function () {
  return { v: 1, lang: null, sound: true, money: 0, motor: 1, nitro: false, sponsor: false, best: { wall: 0, ramp: 0, drop: 0 } };
};
CL.load = function () {
  var s = CL.defaultSave();
  try {
    var raw = localStorage.getItem(CL.SAVE_KEY);
    if (raw) {
      var d = JSON.parse(raw);
      if (d && d.v === 1) {
        for (var k in s) if (d[k] !== undefined) s[k] = d[k];
        s.best = Object.assign(CL.defaultSave().best, d.best || {});
      }
    }
  } catch (e) { /* sin guardado */ }
  return s;
};
CL.store = function (s) {
  try { localStorage.setItem(CL.SAVE_KEY, JSON.stringify(s)); } catch (e) { /* sin guardado */ }
};

CL.fmtMoney = function (n) {
  return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
