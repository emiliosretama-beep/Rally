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

## Pausa (15 de octubre de 2026)
- Sonido y voces (`11_audio.js`): terminado.
- Armas/efectos/jugador, soldados/IA, misiones y menús/controles: avanzados pero sin terminar
  (los agentes se pararon a petición). Las 5 misiones y supervivencia ya cargan y se juegan en parte.
- Peticiones pendientes entre módulos: ver la lista del agente de sonido (L.barrage, reloadStep,
  pasos de soldados, subtítulos con textContent).
- Para seguir: terminar cada módulo, que `F44.bot` complete todas las misiones (`test/missions.js`),
  fase 3 de integración, rendimiento en iPad y zip.

## Integración (20 de octubre de 2026)
- Paso 1 — construcción combinada: smoke, armas, IA, interfaz, sonido y motor pasan sin errores de consola. Las pruebas
  arrancan ya en calidad Media (ajustes en localStorage antes de cargar) y el primer clic del menú tiene 120 s de margen.
  Arreglos: subtítulos táctiles que tapaban el botón Recargar en iPad apaisado; pruebas desfasadas (texto alemán
  «Handgranate», puntos de supervivencia que ahora lleva el guion).
- Paso 2 — peticiones entre módulos: créditos tras Bastoña (botón Créditos en el final), pantalla de resultados de
  supervivencia al continuar tras morir (`Menu.survivalEnd`), música del menú (nombres `music_*` → `Snd.music`), aviso
  de carro que apunta (HUD + voz + torreta), voces y nombres del reparto `CAST`, granadas que ya no ruedan 20 m en llano,
  sonido de casquillos/sacar arma/tipo de explosión/silbido según distancia, `explode` con el id del arma, disparo
  automático táctil sólo en Input, `frozen:'still'` respetado, ceniza en el pueblo de noche y en supervivencia.
