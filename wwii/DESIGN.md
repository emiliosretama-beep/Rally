# FRENTE 44 — documento de diseño y contrato técnico

Juego de disparos en primera persona de la Segunda Guerra Mundial, de un solo jugador,
inspirado en los clásicos del género de la época (campaña lineal con escuadra aliada,
objetivos en brújula, salud que se regenera, armas recogidas del enemigo). Todo el juego
sale en **un solo archivo** `wwii/index.html` (para itch.io, como Born to Rally), hecho con
WebGL 2, Web Audio y voz del sistema, sin librerías ni recursos externos (sólo Google Fonts).

Nombre: **FRENTE 44** — subtítulo *Normandía · Las Ardenas*. Estudio: ERAGAMES.
Idioma por defecto español (también inglés). Sin marcas reales ni nombres de juegos
comerciales. **Sin esvásticas ni símbolos nazis**: los alemanes llevan uniforme gris
campaña, casco Stahlhelm y equipo, sin insignias políticas.

Plataformas: iPad/tableta (táctil) es la prioritaria, también ordenador (teclado y ratón con
bloqueo del puntero) y mando. Objetivo: 60 fps en un iPad reciente en calidad Media.

---------------------------------------------------------------------------------------------

## 1. Estructura del código

```
wwii/
  DESIGN.md          este documento (contrato entre módulos)
  build.py           une src/*.js en orden alfabético dentro de src/shell.html -> index.html
  index.html         RESULTADO (no editar a mano; se regenera con build.py)
  src/shell.html     HTML + CSS + capas de interfaz; contiene la marca /*__JS__*/
  src/00_util.js     utilidades, RNG, vectores, M4
  src/01_gl.js       motor WebGL2: GL, shaders, Shadow, Post, calidad gráfica
  src/02_geo.js      constructor de geometría (Geo) y texturas por canvas
  src/10_input.js    entrada: teclado/ratón, mando, táctil -> Input.cmd
  src/11_audio.js    Snd (sintetizador) y Voice (voces de la escuadra)
  src/20_world.js    World: terreno, colisiones, raycast, navegación, coberturas, dibujo estático
  src/21_levels.js   LEVELS: misiones, guiones, objetivos
  src/30_player.js   Player: movimiento, cámara, salud, interacción
  src/31_weapons.js  WEAPONS, Weapons: armas, balística, granadas, arma en primera persona
  src/40_actors.js   Actors: modelos y animación de soldados y vehículos, impactos por zona
  src/41_ai.js       AI: comportamiento de enemigos, aliados y tanques
  src/50_fx.js       FX: partículas, marcas, trazadoras, luces puntuales, temblor de cámara
  src/60_hud.js      HUD: retícula, munición, brújula, indicadores, avisos, subtítulos
  src/61_menu.js     menús, opciones, guardado, textos ES/EN (I18N)
  src/90_main.js     Game: estados, bucle fijo, carga de misiones, API de pruebas (F44)
  test/              guiones de Playwright (ver §9)
```

Todos los archivos son *scripts* normales que comparten el ámbito global (nada de módulos ES).
`build.py` los concatena por orden de nombre, así que un archivo sólo puede usar **en el momento
de cargar** lo definido en archivos anteriores; dentro de funciones puede usar cualquier cosa.
Cada módulo expone **un objeto global** con el nombre indicado (p. ej. `const FX={...}`).
Estilo: el del rally (`index.html` de la raíz): código compacto, comentarios breves en español,
sin dependencias. Nada de `console.log` en el resultado salvo errores reales.

`python3 wwii/build.py [--out RUTA]` escribe `wwii/index.html` (o RUTA). Debe fallar con
mensaje claro si falta la marca o algún archivo, y comprobar la sintaxis con `node --check`
sobre el JS unido si `node` existe.

## 2. Convenciones del mundo

- Metros, eje Y hacia arriba. Rumbo (`yaw`) en radianes: 0 mira hacia +Z, crece hacia +X
  (dirección = `[sin(yaw), 0, cos(yaw)]`). Cabeceo (`pitch`) positivo mira hacia arriba.
- Paso fijo de simulación `FIX = 1/120` s. Render a la frecuencia de la pantalla.
- Jugador: cápsula de radio 0.35 m; altura de ojos 1.62 m de pie, 1.05 m agachado.
- Soldados: misma cápsula; zonas de impacto: cabeza (x4 daño), torso (x1), brazos/piernas (x0.75).
- Vida del jugador 100 con regeneración (empieza 4 s después del último daño, ~25/s);
  dificultad: Recluta / Regular / Veterano (daño enemigo x0.5 / x1 / x1.8, precisión IA).
- Bus de eventos global `Bus` (en 00_util.js): `Bus.on(nombre, fn)`, `Bus.off`, `Bus.emit(nombre, datos)`.
  Eventos estándar (los datos son objetos):
  - `shot` {pos, dir, weapon, by, loud} — cualquier disparo (para sonido e IA que oye).
  - `impact` {pos, normal, surface, by} — bala contra el mundo.
  - `hit` {actor, part, dmg, pos, by, kill} — bala o metralla contra un actor.
  - `kill` {actor, by, weapon, headshot}
  - `explosion` {pos, radius, dmg, by}
  - `playerHurt` {dmg, from(pos)} · `playerDied` {} · `objective` {index, text} · `checkpoint` {}
  - `missionComplete` {stats} · `missionFailed` {reason}
  - `say` {who, key, text} — frase de un personaje (subtítulo + voz)
- Superficies (`surface`): 'dirt','grass','sand','snow','wood','metal','stone','flesh','water'.

## 3. Motor gráfico (01_gl.js, 02_geo.js) — portado y ampliado desde el rally

Se copia y adapta del `index.html` del rally: `M4`, `Geo`, `GL` (prog, mesh, buf, instancias,
draw, free, tex), `canvasTex`, sombras `Shadow` (dos cascadas en atlas 2×1 con PCF manual de
pesos bilineales y desplazamiento según la normal, **reiniciando uModel en cada cascada**),
posprocesado `Post` (MSAA, resplandor, gradación, viñeta) y calidades `GFX` baja/media/alta/ultra
con bajada automática si faltan fotogramas. Ampliaciones necesarias:

- **Instancias con matriz**: además del modo actual (posición, rumbo, escala, color), un modo
  `uInst=2` con matriz 4×4 por instancia (atributos 7-10) y color (atributo 6). Lo usan los
  soldados (una llamada por tipo de pieza para todos los soldados) y los objetos sueltos.
  API: `GL.matInst(geoOrMesh)` crea la malla; `GL.setMatInst(m, Float32Array(n*19), n)` con 16
  valores de matriz + 3 de color por instancia.
- **Luces puntuales**: hasta 4 (`uPL[4]` posición+radio, `uPLC[4]` color) para fogonazos,
  explosiones, fuegos y linternas. `FX` las gestiona; `GL.setLights(arr)`.
- **Niebla de humo/polvo** y cielo con nubes (del rally); luna y estrellas para misiones de noche.
- **Capa de primera persona**: `GL.drawViewmodel(fn)` limpia profundidad, usa proyección propia
  (FOV del arma) y la misma luz; sin sombras propias pero oscurecida si el jugador está a la sombra.
- **Posprocesado de combate** (uniformes de Post): `hurt` 0..1 (viñeta roja y desaturación),
  `blast` 0..1 (aturdimiento: desenfoque leve y destello), `ads` 0..1 (viñeta del visor),
  `sepia` (gradación de la época, suave: nada de grano ni aberración cromática).
- Sombras del sol en Media/Alta/Ultra; en Baja, manchas suaves bajo objetos (como el rally).
- `Render.frame(dt)` en 01_gl.js NO existe: el orden de dibujo lo lleva `Game.render()` (90_main.js):
  sombras → cielo → `World.draw` → `Actors.draw` → `FX.drawOpaque` → transparentes (`FX.draw`)
  → `Weapons.drawViewmodel` → Post → HUD (DOM).

Paleta y estilo: low-poly con sombreado plano y colores por vértice, como el rally, con
gradación cálida y algo desaturada de la época. Explosiones y humo volumétricos con partículas.

## 4. Módulos y su API pública (el contrato)

Los nombres y firmas de esta sección son obligatorios. Se pueden añadir funciones, no cambiar éstas.

### Util (00_util.js)
`clamp, lerp, smooth(t), mulberry32(seed), hex('#rrggbb')->[r,g,b], V3` con
`V3.add/sub/scale/dot/cross/len/norm/dist/lerp` (arrays de 3), `angNorm(a)`, `Bus`, `FIX`,
`M4` (del rally + `M4.fromYawPitch`, `M4.compose(pos, yaw, pitch, roll, scale, out)`, `M4.xfPoint`).

### Input (10_input.js)
`Input.init(canvas)`, `Input.update(dt)` (una vez por fotograma de render) y el comando del
fotograma `Input.cmd`:
`{mx, mz (-1..1 movimiento lateral/frontal), lookX, lookY (radianes este fotograma), fire, fireDown
(pulsado este fotograma), ads, reload, jump, crouch (alterna), sprint, grenade, melee, use,
swap, next/prev, pause, aimAssist (0..1 según dispositivo)}`.
Dispositivo activo `Input.device` = 'kbm' | 'pad' | 'touch'. Táctil: palanca virtual izquierda,
arrastre en la mitad derecha para mirar, botones (Disparar grande, Apuntar, Recargar, Granada,
Agacharse, Saltar, Cambiar arma, Usar contextual, Cuchillo, Pausa) dibujados en `#touch`.
Opción de disparo automático táctil (dispara solo al tener un enemigo bajo la retícula).
`Input.override = cmd|null` (pruebas: sustituye la entrada real).

### Snd y Voice (11_audio.js)
`Snd.init()` (tras el primer gesto del usuario), `Snd.play(name, {pos, vol, rate})` con sonido
3D simple (panorama y atenuación según la cámara) y `Snd.loop(name)/Snd.stop(id)`. Nombres:
disparos `garand, thompson, kar98, mp40, mg42, colt, bar, bazooka, cannon`; `ping` (peine del
Garand), `reload_*`, `dryfire`, `explosion`, `explosion_far`, `whizz` (bala que pasa cerca),
`crack`, `impact_<surface>`, `step_<surface>`, `grenade_bounce`, `pin`, `knife`, `hurt`, `heartbeat`,
`tinnitus`, `tank_engine` (bucle), `turret`, `ui_move`, `ui_ok`, `ui_back`, `objective`, `checkpoint`,
`ambience_battle`/`ambience_wind`/`ambience_night` (bucles), música `music_menu`, `music_victory`,
`music_tension` (síntesis sencilla, que no canse). `Snd.setListener(pos, yaw)`, `Snd.master`,
`Snd.vol.{fx,music,voice}`. Escucha el `Bus` (shot, impact, explosion, hit...) para sonar solo.
`Voice.say(who, key)` con frases por clave en ES/EN (aliados en el idioma del juego; alemanes en
alemán con voz de-DE si existe, si no se omite la voz y queda el subtítulo). Emite `say`.

### World (20_world.js)
`World.build(levelDef)` crea todo el escenario a partir de la descripción de §6;
`World.clear()`; `World.height(x,z)`; `World.surfaceAt(x,z)`;
`World.raycast(o, d, maxT, opts) -> {t, pos, normal, surface, actor, part} | null`
(terreno, colisionadores y, si `opts.actors`, también soldados; `opts.ignore` = actor a ignorar;
`opts.pierce` para atravesar madera fina); `World.los(a, b)` (línea de visión, bool);
`World.moveCapsule(pos, vel, radius, height, dt) -> {pos, onGround, hitWall}` (deslizamiento por
paredes, escalones de hasta 0.45 m, pendientes); `World.overlapSphere(c, r)`;
navegación: `World.nav.path(from, to) -> [[x,y,z],...] | null`, `World.nav.near(p)`,
coberturas: `World.cover.find(p, threatPos, maxDist) -> {pos, low, dirToThreat} | null`,
`World.cover.claim(c, actor)/release`. Interactuables: `World.usables` (ametralladoras fijas,
cargas explosivas, cajas de munición). Destruibles: barriles y cajas (`World.damage(...)`).
Dibujo: `World.draw(pass)` con pass 'shadow' | 'main'; geometría estática unida por trozos de 32 m.

### Levels (21_levels.js)
`LEVELS` = lista ordenada de misiones; cada una `{id, name:{es,en}, place:{es,en}, date,
brief:{es,en}, env:{...}, build(W) -> datos del escenario, start:{pos,yaw}, loadout:[...],
squad:[...], objectives:[...], script(L) }` (ver §6). Más el modo `survival`.

### Player (30_player.js)
`Player` con `pos, vel, yaw, pitch, health, stance ('stand'|'crouch'), onGround, alive,
inv (armas, máx. 2 + pistola + granadas), eye() -> [x,y,z], dir() -> [x,y,z]`,
`Player.spawn(pos, yaw, loadout)`, `Player.update(dt, cmd)`, `Player.damage(dmg, fromPos, by)`,
`Player.camera()` -> `{eye, yaw, pitch, fov, roll}` con balanceo al andar, retroceso y temblor.
Uso contextual: recoger arma del suelo (cambia por la actual), coger munición, usar ametralladora
fija, colocar carga. Caída/muerte: pantalla de muerte y volver al último punto de control.

### Weapons (31_weapons.js)
`WEAPONS` tabla de definiciones: `garand, thompson, bar, colt, kar98, kar98s (mira telescópica),
mp40, stg44, mg42mount, bazooka, frag (granada aliada), stiel (granada de palo), knife`.
Cada una: daño, cadencia, modo (semi/auto/cerrojo), cargador, reserva, dispersión (cadera/
apuntando/moviendo), retroceso, tiempo de recarga (táctica/vacía), alcance y caída de daño,
FOV al apuntar, modelo. `Weapons.update(dt, cmd)` del jugador; `Weapons.fire(owner, def, origin,
dir)` disparo de cualquiera (jugador o IA): raycast con `World.raycast(..,{actors:true})`,
penetración, trazadoras, `Bus.emit('shot'|'impact'|'hit')`. `Weapons.throwGrenade(owner, pos, vel,
type, fuse)` granadas con rebotes y cocinado. Cohetes del bazooka. Ametralladora fija.
Arma en primera persona procedimental con manos: balanceo, paso, carrera, apuntar,
retroceso, recarga animada (sacar cargador, meter, cerrojo; peine del Garand que sale volando),
cambio de arma, cuchillo. `Weapons.drawViewmodel()`; `Weapons.pickups` armas en el suelo
(las que sueltan los enemigos al morir, `Weapons.drop(def, pos, ammo)`).

### Actors (40_actors.js)
`Actors.list`; `Actors.spawn({team:'ally'|'axis', kind:'rifle'|'smg'|'mg'|'officer'|'sniper',
pos, yaw, name, weapon}) -> actor` con `{id, team, pos, yaw, health, alive, stance, aim:[yaw,pitch],
weapon, anim}`; vehículos `Actors.spawnTank({...})`, `Actors.spawnHalftrack`.
Modelos procedimentales low-poly: aliados (casco M1, uniforme oliva, mochila) y alemanes (casco
Stahlhelm, gris campaña, cartucheras, máscara de gas en lata); oficial con gorra; tanque tipo
Panzer IV / Tiger sin insignias. Animación por piezas (andar, correr, agachado, apuntar, disparar,
recargar, lanzar granada, reacción a impacto, caídas de muerte variadas). Dibujo instanciado
por pieza: `Actors.draw(pass)`. Impactos: `Actors.raycast(o,d,maxT) -> {t, actor, part}`;
`Actors.damage(actor, dmg, part, info)` emite `hit`/`kill`, suelta arma, cuerpo queda en el suelo
(se retiran los más antiguos si hay más de 25).

### AI (41_ai.js)
`AI.update(dt)` para todos los actores con cerebro. Enemigos: percepción (cono de visión, `World.los`,
oyen disparos por `Bus`), estados patrulla/alerta/combate, cubrirse con `World.cover`, asomarse y
disparar con precisión según dificultad/distancia/movimiento del objetivo, supresión al recibir
fuego cerca, flanquear, lanzar granadas si el jugador lleva tiempo cubierto, cargar de vez en cuando,
retirarse. Fichas de ataque (como los juegos del género): sólo N enemigos disparan a la vez al
jugador según dificultad. Ametralladores en nidos (MG42) con fuego de supresión en ráfagas.
Aliados: siguen al jugador o a puntos del guion, se cubren, disparan a enemigos, gritan avisos
("¡Granada!", "¡Recargando!", "¡Enemigo a la izquierda!") con `Voice.say`. Pueden ser
inmortales en el guion (`hero:true`). Tanques: siguen una ruta, giran torreta, avisan y disparan
proyectiles al jugador, ametralladora coaxial. Pathfinding con `World.nav`.

### FX (50_fx.js)
`FX.muzzle(pos, dir, size)`, `FX.tracer(a, b)`, `FX.impact(pos, normal, surface)` (polvo, astillas,
chispas, nieve; agujero de bala como marca), `FX.blood(pos, dir)` (moderado; opción para quitar),
`FX.explosion(pos, r)` (bola de fuego, humo, escombros, marca quemada, luz, onda, temblor),
`FX.smoke(pos, opts)` (columnas de humo de fondo, granadas de humo), `FX.fire(pos, size)` (fuegos
persistentes con luz), `FX.shell(pos, vel)` (casquillos), `FX.shake(amount)`, `FX.weather(env)`
(nieve, lluvia, ceniza), `FX.update(dt)`, `FX.draw()` y luces `FX.lights()` -> para `GL.setLights`.

### HUD (60_hud.js)
Capa DOM (+ canvas 2D para la brújula). `HUD.update(dt)`; retícula dinámica según dispersión
(se oculta al apuntar con mira), marcador de impacto (y de muerte, rojo), munición/peines/granadas,
brújula superior con estrella del objetivo y distancia, texto de objetivo, indicadores de daño
direccional, aviso de granada cercana con flecha, avisos de uso ("Mantén E/Usar para recoger MP40"),
subtítulos de `say`, mensajes "Punto de control", cartel de inicio de misión (lugar, fecha),
pantalla de muerte. Se adapta a táctil (no tapa los botones) y a pantallas apaisadas/verticales.

### Menús, opciones y guardado (61_menu.js)
Pantalla de título con escena 3D de fondo (cámara lenta por un escenario), Campaña (misiones
desbloqueadas en orden, con estrellas/medallas y mejor tiempo), Supervivencia, Opciones, Créditos.
Antes de cada misión: informe con mapa dibujado (canvas, estilo mapa militar), lugar, fecha,
objetivos, dificultad y botón Empezar. Pausa: continuar, reiniciar desde punto de control,
opciones, salir. Final de misión: estadísticas (tiempo, bajas, precisión, disparos a la cabeza,
muertes), medalla según dificultad, siguiente misión. Opciones: sensibilidad (separada para táctil,
ratón y mando), invertir Y, FOV, asistencia de apuntado, disparo automático táctil, tamaño y
opacidad de botones, calidad gráfica Baja/Media/Alta/Ultra (como el rally), sangre sí/no, volumen
general/efectos/música/voces, subtítulos, idioma ES/EN, dificultad. Todo con navegación por teclado
y mando (foco visible). `localStorage` con prefijo `frente44:` y a prueba de errores.
`I18N` y `t(key)` (como el rally).

### Game (90_main.js)
Estados: `title`, `brief`, `play`, `pause`, `dead`, `complete`. `Game.start(levelId, difficulty)`,
`Game.restartCheckpoint()`, `Game.update(dt)` (pasos fijos), `Game.render(dt)`, bucle con
`requestAnimationFrame`, pantalla completa, pérdida de contexto WebGL, pausa al perder el foco.
Objetivos y guion: `Game.level` (la definición activa) y `Game.L` (estado del guion: temporizadores,
disparadores, oleadas, puntos de control) — el sistema de guion vive aquí y lo usan las misiones.

## 5. Guion de misiones (lo implementa Game, lo usan los niveles)

Cada objetivo: `{text:{es,en}, marker:[x,y,z] | ()=>pos, done:(L)=>bool, onStart(L), onDone(L)}`.
Ayudantes en `L`: `L.wait(s)`, `L.trigger(boxOrSphere, fn)` (al entrar el jugador), `L.spawn(group)`
(soldados con ruta/destino), `L.wave(defs)`, `L.alive(tag)` (cuántos quedan con esa etiqueta),
`L.say(who, key)`, `L.checkpoint()`, `L.barrage(area, n, interval)` (fuego de artillería con aviso
de silbido), `L.fail(reason)`, `L.timer(name)`, `L.flags`. Los puntos de control guardan el estado
del jugador (vida llena, armas, munición) y del guion para reaparecer.

## 6. Campaña

1. **Campo de instrucción** — Inglaterra, mayo 1944. Tutorial corto y opcional: moverse, agacharse,
   saltar, disparar a dianas de madera, apuntar, recargar, lanzar granadas a un círculo, carrera de
   obstáculos cronometrada, recoger un arma. Sargento instructor con voz.
2. **Playa de Normandía** — 6 de junio de 1944, amanecer gris. La rampa de la lancha cae, carrera
   por la arena entre erizos checos y cráteres con fuego de ametralladoras y artillería (silbidos y
   explosiones de arena), llegar al muro, subir por la brecha, destruir dos nidos de MG42 con granadas
   en la tronera o cargas, limpiar la trinchera y el búnker, asegurar la salida.
3. **Sainte-Mère-Église** — noche del 5 al 6 de junio. Paracaidista separado; pueblo a oscuras con
   casas ardiendo (luz de fuego), reunir a la escuadra, limpiar casas, destruir un cañón antiaéreo
   con una carga, defender el cruce contra un contraataque con semioruga (bazooka).
4. **El bocage** — junio 1944, día. Campos cercados por setos altos, francotirador en el campanario,
   MG42 en los setos, usar la ametralladora fija capturada para rechazar una oleada, destruir un
   tanque con el bazooka o una carga en la parte trasera.
5. **Bastoña (Las Ardenas)** — diciembre 1944, nieve y niebla. Bosque nevado con trincheras,
   bombardeo de artillería que astilla los árboles, defender la línea en oleadas, contraataque con
   Tiger, avanzar al pueblo y tomar la iglesia. Final con cinemática corta y créditos.
6. **Supervivencia** (modo extra): pueblo en ruinas, oleadas crecientes de enemigos, cajas de
   munición, armas en las paredes que se compran con puntos, récord guardado.

Cada misión: 8–15 minutos, puntos de control frecuentes, compañeros con nombre (sargento Hayes,
cabo Russo, soldado Kowalski, soldado Díaz), variedad de ritmo (tensión, calma, asalto, defensa).

## 7. Rendimiento

Geometría estática unida por trozos; instancias para todo lo repetido; soldados y vehículos con
`uInst=2`; IA pensando a 10 Hz repartida entre fotogramas; raycast con rejilla espacial; máximo
de partículas por calidad; resolución dinámica y bajada automática de calidad como el rally.
Nada de asignar memoria en el bucle caliente (reutilizar arrays).

## 8. Accesibilidad y experiencia

Subtítulos, botones táctiles configurables, asistencia de apuntado, sensibilidad, invertir Y,
dificultad. Los menús se usan con táctil, ratón, teclado y mando. Primer gesto: iniciar audio y
pedir pantalla completa en móviles si se toca el botón.

## 9. Pruebas (test/)

Playwright con Chromium de SwiftShader (`--use-angle=swiftshader --enable-unsafe-swiftshader`),
`require('/opt/node22/lib/node_modules/playwright')`, ventanas pequeñas (p. ej. 800×500), muy lento
(1–3 fps): las pruebas avanzan la simulación a mano con la API `F44`:

```
F44.start(levelId, diff)        // carga la misión y salta el informe
F44.step(n)                     // n pasos fijos de simulación (sin render)
F44.render()                    // un fotograma de render
F44.input(cmd|null)             // fija Input.override
F44.bot(true|false)             // piloto automático: va al objetivo y dispara a lo que ve (para recorrer misiones)
F44.god(true|false)             // jugador invulnerable
F44.teleport(x,y,z,yaw)
F44.state()                     // {mode, level, objective, player:{pos,health,weapon,ammo}, enemies, allies, fps}
F44.skipObjective()
```

Cada módulo trae su prueba `test/<modulo>.js` que debe pasar sin errores de consola. `test/all.js`
ejecuta las rápidas. Las capturas se guardan fuera del repositorio (en el directorio temporal que
indique la tarea).
