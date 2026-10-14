# FRENTE 44 — estado del desarrollo

Última actualización: 14 de octubre de 2026.

## Hecho (fase 1, casi terminada)
- Plan y contrato entre módulos: `DESIGN.md`.
- Motor gráfico portado del rally (`src/01_gl.js`, `src/02_geo.js`): sombras suaves en dos cascadas,
  cielo con nubes, niebla, luces puntuales, instancias con matriz, posprocesado y calidades
  Baja/Media/Alta/Ultra.
- Controles completos (`src/10_input.js`): teclado y ratón, mando y táctil.
- Mundo (`src/20_world.js`): terreno, colisiones, disparos contra el escenario, navegación y coberturas.
- Jugador (`src/30_player.js`) y bucle con guion de misiones y API de pruebas `F44` (`src/90_main.js`).
- Versiones provisionales (STUB) de armas, soldados, IA, efectos, sonido, interfaz y menús.
- Nivel de prueba jugable de principio a fin; `test/smoke.js` pasa sin errores.

## Pendiente
1. Terminar la fase 1: revisión completa y corrección (choques, granadas, muerte, táctil, calidad).
2. Fase 2, en paralelo y cada uno en su archivo:
   - armas y efectos (`31_weapons.js`, `50_fx.js`);
   - soldados y vehículos animados y su IA (`40_actors.js`, `41_ai.js`);
   - misiones de la campaña y supervivencia (`21_levels.js` y prefabricados de `20_world.js`);
   - sonido y voces (`11_audio.js`);
   - interfaz, menús e iPad (`60_hud.js`, `61_menu.js`, retoques de `10_input.js`).
3. Fase 3: que el piloto automático complete cada misión, rendimiento en iPad, revisión,
   README y zip.

## Cómo construir y probar
```
python3 wwii/build.py                 # genera wwii/index.html
python3 wwii/build.py --zip RUTA.zip  # zip para itch.io (index.html en la raíz)
node wwii/test/smoke.js               # prueba de humo (Playwright)
```
