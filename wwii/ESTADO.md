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

## Pausa (20 de octubre de 2026) — resumen para seguir
**Hecho**
- Fase 1 (motor y base jugable) y fase 2 (todos los módulos completos): armas y efectos, soldados,
  tanques e IA, las 5 misiones + supervivencia + escena del título, sonido y voces, HUD, menús y
  controles táctiles/mando. Cada módulo pasó sus propias pruebas.
- Fase 3, pasos 1 y 2: el juego completo pasa smoke, armas, IA, interfaz, sonido y motor sin errores;
  aplicadas las peticiones entre módulos (ver arriba). `wwii/index.html` está construido y pasa smoke.

**Falta (fase 3)**
3. Rendimiento para iPad: medir llamadas de dibujo y ms por fotograma en el título y cada misión en
   calidad Media y aligerar (la escena del título es pesada).
4. Pasar `test/missions.js` con el juego completo (bot + god) y una partida sin god por misión en Regular.
5. Repaso visual de cada misión, apuntando y en iPad apaisado.
6. `wwii/README.md` y zip final.

## Paso 3 — rendimiento (20 de octubre de 2026)
Medido en calidad Media (640×400, SwiftShader; llamadas de dibujo y triángulos por fotograma contando
`drawElements/drawArrays*`, JS = ms de `Game.render`, sim = ms de simulación por fotograma de 60 Hz):

| escena | antes: llamadas / k triáng. / sim | después |
|---|---|---|
| título | 291 / 369 | 126 / 360 |
| instrucción | 237 / 437 / **4,4 ms** | 158 / 236 / 0,04 ms |
| playa | 375 / 690 | 241 / 534 |
| pueblo | 383 / 480 | 229 / 317 |
| bocage | 390 / 542 | 217 / 388 |
| Bastoña | 115 / 213 | 86 / 121 |
| supervivencia | 289 / 274 | 193 / 326 |
| rally (referencia) | 166 / 230 | — |

JS de render 0,4–1,8 ms y simulación 0,04–0,5 ms por fotograma en todas. Cambios: relieve en cuadros de
64 m con 3 niveles de detalle por distancia; trozos de objetos de 64 m y una sola malla de sombra por
trozo; instancias (árboles, sacos, erizos, hierba) recortadas por fotograma a lo que se ve y, en sombras,
por cascada; la hierba y las piezas pequeñas de los soldados no dan sombra; cielo dibujado después de lo
opaco (sólo píxeles de cielo); de cerca a lejos y relieve al final; la IA ya no recalcula sin parar un
camino imposible (eso costaba 4 ms en la instrucción) y no piensa por los figurantes quietos. En la
escena del título los árboles que atravesaba la cámara se apartan. Todas las pruebas siguen pasando.

## Paso 4 — campaña completa (20 de octubre de 2026)
- `test/missions.js` (piloto + god, Regular) pasa entero: instrucción 140 s simulados, playa 72 s,
  pueblo 124 s, bocage 79 s, Bastoña 137 s (1 salto del piloto), supervivencia 3 oleadas y récord;
  reinicio desde punto de control a mitad de cada misión correcto; sin errores de consola.
- Sin god en Regular (el piloto no se cubre): instrucción, playa y bocage se completan con 0–1 muertes.
  En el pueblo (defensa del cruce) y en Bastoña (Tiger) el piloto muere varias veces porque se planta
  de pie a 10–20 m del vehículo. Arreglado lo injusto: la ametralladora de los vehículos mataba en
  0,4 s (5 balas de 20 seguidas); ahora 12 por bala y el doble de dispersión contra el jugador; el
  cañón tiene más error contra el jugador, su metralla hace 110 (un impacto directo sigue matando) y
  un carro recién aparecido o tras volver al punto de control espera 3,5–5,5 s antes del primer disparo.
- Comprobado que agachado tras una cobertura el jugador aguanta 40 s sin morir frente al semioruga,
  el Tiger, la playa y el francotirador del bocage (además de la prueba de coberturas de `test/ai.js`).

Además (última pasada): los enemigos tardan 0,6 s en disparar al jugador desde que lo ven (al asomarse
no le cosen al instante; la prueba «al descubierto» fallaba a veces con el primer impacto a 0,7 s) y el
piloto ya no se queda atascado en el bocage cuando el enemigo agachado no se ve desde su punto de tiro
(la campaña completa vuelve a pasar entera).

## Paso 5 — repaso visual (20 de octubre de 2026)
Capturas del título, informe, cada misión (cadera y apuntando) y la disposición táctil en 1024×768
(título, informe, juego, apuntar, pausa). Arreglado: el arma en primera persona quedaba negra de noche
(Sainte-Mère-Église): ahora recibe algo de luz ambiente fría según lo oscura que sea la escena; el cartel
de inicio de misión subía encima de los subtítulos y se pisaban; en el título la cámara ya no atraviesa
árboles. Sin problemas de costuras en el relieve con los niveles de detalle.

## Paso 6 — documentación (20 de octubre de 2026)
- `wwii/README.md`: qué es, misiones, controles por dispositivo, cómo construir y probar, subir a itch.io.

## Pendiente / conocido
- El piloto automático sin god muere a menudo contra los vehículos (se planta de pie delante); un jugador
  que se cubre aguanta. La animación de recarga del Garand tapa bastante pantalla un instante.
- SwiftShader no es un buen sustituto del iPad: falta medir en un iPad real (objetivo 60 fps en Media).
- La ceniza del pueblo de noche apenas se ve (gris sobre oscuro); de noche suben el triple de brasas.
