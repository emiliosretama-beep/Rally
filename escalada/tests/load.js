// Carga la lógica del juego (sin gráficos) en Node para las pruebas.
// Uso: require('./load')(); deja World, Player, U, CFG, GORGES, K2_SECTIONS y MOUNTAINS como globales.
// SRC=/otra/carpeta/src permite probar otra copia del código.
'use strict';
const fs = require('fs'), path = require('path');
module.exports = function load(src) {
  src = src || process.env.SRC || path.join(__dirname, '..', 'src');
  const files = ['util.js', 'config.js', 'route.js', 'k2route.js', 'mountains.js', 'world.js', 'k2world.js', 'player.js'];
  const code = files.map(f => fs.readFileSync(path.join(src, f), 'utf8').replace("'use strict';", '')).join('\n');
  (0, eval)(code + ';globalThis.World=World;globalThis.U=U;globalThis.CFG=CFG;globalThis.Player=Player;' +
    'globalThis.GORGES=GORGES;globalThis.K2_SECTIONS=K2_SECTIONS;globalThis.MOUNTAINS=MOUNTAINS;');
};
