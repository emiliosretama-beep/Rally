// Las montañas del juego. Cada una arma su ruta y su terreno; el resto del motor es el mismo.
'use strict';

const MOUNTAINS = {
  // v0.4: la isla volcánica y sus cuatro barrancos
  volcano: {
    id: 'volcano', kind: 'island', seed: 20261028, N: 256, CELL: 2, icon: '🌋',
    route: () => buildRoute(GORGES),
    biomes: [{ id: 'shore', top: 38 }, { id: 'jungle', top: 105 }, { id: 'alpine', top: 147 }, { id: 'caldera', top: 999 }],
    cfg: { SHORE_R: 236, BASE_R: 214 },
    rec: '', // prefijo de los récords (el volcán conserva los de la v0.4)
    camps: ['camp_beach', 'camp_v1', 'camp_v2', 'camp_v3', 'camp_top']
  },
  // v0.5: el Gigante Blanco, expedición en una montaña nevada
  k2: {
    id: 'k2', kind: 'snow', seed: 20261030, N: 256, CELL: 3, icon: '🏔️',
    route: () => buildK2Route(),
    biomes: [{ id: 'k_glacier', top: 0 }, { id: 'k_snow', top: 0 }, { id: 'k_rockb', top: 0 }, { id: 'k_high', top: 0 }, { id: 'k_top', top: 9999 }],
    cfg: { SHORE_R: 99999, BASE_R: 99999 },
    rec: 'k2:',
    camps: ['camp_base', 'camp_1', 'camp_2', 'camp_3', 'camp_4', 'camp_top']
  }
};
const MOUNTAIN_IDS = ['volcano', 'k2'];
