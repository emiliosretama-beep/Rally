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
sobre el JS unido si `node` existe. Más opciones: `--zip RUTA.zip` (index.html en la raíz, para itch.io),
`--only 00,01,02` (sólo esos prefijos) y `--append demo.js` (script extra al final), para pruebas parciales.

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

### API del motor (hecho; prueba: `test/engine.js`)

**Ejes.** Modelos mirando a +Z con +Y arriba: en coordenadas locales **+X es su IZQUIERDA** (sistema a derechas).
Derecha de la cámara = `[-cos(yaw), 0, sin(yaw)]`; subir el yaw gira a la izquierda (ratón a la derecha → restar yaw).
`M4.compose(pos,yaw,pitch,roll,scale,out)` = T·Ry(yaw)·Rx(-pitch)·Rz(roll)·S (pitch>0 sube el morro, roll>0 inclina a la
derecha; scale número o [sx,sy,sz]); `M4.fromYawPitch`, `M4.xfPoint(m,p,o)`, `M4.xfDir`, `M4.translate(m,x,y,z)` (m·T).
`V3.*` aceptan `o` final para no crear arrays; además `V3.madd, dist2, distXZ, copy, set, dirYaw(yaw), dirYP(yaw,pitch), yawOf(d)`.
`mixC(a,b,t)` mezcla colores; `hex()` acepta '#rgb'/'#rrggbb' o un array.

**Fotograma** (lo escribe `Game.render`; cada módulo dibuja en su paso):
```
GL.begin(dt)                                   // reloj GL.time, bajada automática, tamaño (GL.W/GL.H en px CSS)
Cam.set(Player.camera())                       // {eye,yaw,pitch,roll,fov(rad, o grados si >3.2),near,far}
GL.setLights(FX.lights())                      // [{pos,r,col}] (máx. 4; 2 en Baja; se quedan las más cercanas)
Shadow.render(Cam.eye, Cam.fwd, (prog,ci)=>{World.draw('shadow',ci); Actors.draw('shadow',ci);})
Post.begin(); Sky.draw();
World.draw('main'); Actors.draw('main'); FX.drawOpaque();   // cada uno empieza con Lit.setup(GL.progs.lit)
Post.grabDepth();                              // tras lo opaco: profundidad para partículas suaves, SSAO y rayos
decals.draw(); FX.draw();                      // transparentes (GL.blend, partículas, marcas)
Weapons.drawViewmodel();                       // → GL.drawViewmodel(fov, fn, sunVis)
Post.end();                                    // HUD (DOM) después
```
**Programa iluminado** `GL.progs.lit` (`Lit.setup(p)` lo deja listo: Env, cámara, sombras, luces, uModel identidad
`MI`, uInst 0, sin textura). Uniformes que tocan los módulos: `uModel` (mat4), `uInst` (0 normal · 1 instancias de
rumbo · 2 instancias con matriz), `uUseTex` + textura en la unidad 0, `uTint` (vec4: rgb + cantidad), `uAlpha`,
`uGloss` (metal 0..1), `uWet`, `uSway` (viento en instancias de modo 1; ×`Env.wind`), `uSunVis` (0..1), `uFogConst`
(−1 normal; 0..1 niebla fija para fondos). Color de vértice > 1.05 en algún canal = **emisivo** (sin luz, brilla con
el resplandor: fogonazos, trazadoras, ventanas encendidas). Lo que se cambie se deja como estaba (o se vuelve a
llamar a `Lit.setup`). Programa de sombras `GL.progs.depth` (lo pone `Shadow.render`): `uModel`, `uInst`, `uSway`.
Mezclas SIEMPRE con `GL.blend(null|'alpha'|'add'|'mul')` (conservan el alfa = máscara del arma para Post).

**Mallas.** `GL.mesh({p,n,c,u,idx},{inst|mat,dyn})`, `GL.fromGeo(g)`, `GL.draw(m,count?)`, `GL.free(m)`,
`GL.tex(canvasOImageData, repeat, nomip)`. Instancias modo 1: `GL.instOf(g)` / `GL.instFrom(malla)` +
`GL.setInst(m, Float32Array(n*10), n)` con `[x,y,z, yaw, sx,sy,sz, r,g,b]`. Modo matriz: `GL.matInst(geo|datos|malla)`
+ `GL.setMatInst(m, Float32Array(n*19), n)` con `[16 de la matriz (columnas), r,g,b]`. Instanciada sin instancias no dibuja.

**Luces y efectos.** `GL.setLights(arr)`, `GL.setSpot(pos, dir, intensidad)` (linterna/reflector, 0 = apagado).
Las puntuales iluminan con caída suave hasta su radio, dan brillo al metal y tiñen la niebla cercana.
`Post.fx = {hurt, blast, ads, scope}` (0..1: viñeta roja y desaturación · destello y desenfoque · viñeta al apuntar ·
máscara circular del visor). `Env.flash` 0..1 (explosión/relámpago: aclara ambiente y cielo; lo apaga quien lo pone).

**Env** (`Env.set(def)`; lo que falte toma el valor por defecto, un día claro de verano; colores array o '#hex'):
`sunDir` (luz principal hacia la luz; de noche la luna) o `sunEl`/`sunAz` en grados · `sunCol` · `ambSky`, `ambGnd`
(ambiente del cielo/suelo) · `fog`, `fogN`, `fogF` (niebla entre esas distancias), `fogSun` (la niebla se aclara hacia
el sol), `mist` [y base, alto, cantidad] (neblina baja) · `zen`, `hor` (cielo) · `cloud` 0..1, `cloudCol`, `cloudDark` ·
`stars` 0..1, `moon` 0..1, `moonDir` (por defecto = sunDir) · `sunK` (disco y rayos del sol; 0 de noche/nublado) ·
`shK` (fuerza de la sombra; null = automática: sol 0.74, luna 0.45) · `wind` · `wet` (para `uWet` del suelo) ·
`grade` {tint, sat, con, vig, bloom, sepia}. `Env.sunVec(el, az)`.

**Cam**: `Cam.set(o)` rellena `P, V, VP, INV` (inversa de VP), `M` (base de la cámara = compose(eye,yaw,pitch,roll)),
`fwd, right, up, eye, fov, near, far`, frustum; `Cam.sphereVisible(c, r)`; `Cam.toScreen(p, o)` → [x, y px CSS, 1 delante/0 detrás].

**Sombras**: `Shadow.render(ctr, fwd, drawCasters(prog, ci, cascada))` (devuelve false sin sombras: Baja, noche sin luna);
`Shadow.active`, `Shadow.near(ci, x, z, r)` para descartar lejanos en cada cascada. Sin mapa de sombras (Baja) se usan
manchas: marcas `blob` de `DecalBuf` (se apagan solas donde hay sombra real) y, para lo que se mueve,
`GL.drawBlobs(Float32Array(n*10), n)` con `[x,y,z, yaw, ancho, largo, alfa, 0,0,0]` sólo si `!Shadow.active`.

**Arma en primera persona**: `GL.drawViewmodel(fov, fn(prog), sunVis)`: borra profundidad, proyección propia (cerca 0.02),
sin niebla ni sombras (sunVis 0..1 oscurece el sol si el jugador está a la sombra) y alfa 0 (no recibe SSAO ni rayos).
Dentro de fn se pone `uModel` = `Cam.M`·local por pieza (local: +X izquierda, +Y arriba, +Z adelante).

**Partículas**: `GL.drawParticles(Float32Array(n*10), n, add)` con `[x,y,z, tamaño, alfa, giro, celda, r,g,b]`;
celdas del atlas: 0 humo, 1 fuego, 2 chispa, 3 tierra/escombro (1 y 2 no reciben luz; el humo se ilumina con el sol,
el ambiente y las luces puntuales). `add=true` aditivas. Fundido suave con la profundidad en Media+. Ordenarlas de
lejos a cerca es cosa de FX. Máximo recomendado `GFX.G.parts`.

**Marcas** `new DecalBuf(max, N=3)` (anillo: las viejas se reemplazan): `addGround(x,z,r,giro,celda,col,alfa,H,blob)`
(sigue el relieve con `H(x,z)`), `addQuad(pos, normal, r, giro, celda, col, alfa)` (paredes), `fade(i,a)`, `clear()`,
`draw()`, `free()`. Celdas: 0 mancha de sombra, 1 agujero de bala, 2 agujero en madera, 3 quemadura, 4 sangre, 5 cráter,
6 salpicadura de tierra, 7 hoyo en nieve.

**Calidad** `GFX`: `GFX.level` / `GFX.set('baja'|'media'|'alta'|'ultra')`, `GFX.name()` (efectiva), `GFX.G` = preset
con `shadow, R0, R1, taps, bloom, hdr, clouds, msaa, prMax, depth, soft, god, ssao, parts, lights, dist (distancia de
dibujo ×), lod (0..3)`. `GFX.auto=false` en pruebas. Bus: `gfxAuto` {level} (aviso al bajar), `glLost`, `glRestored`
(el motor se rehace solo; cada módulo vuelve a crear sus mallas y texturas; Game recarga la misión).

**Geo** (02_geo.js): `tri, quad, hexa, box(x0,x1,y0,y1,z0,z1,col,caras), bbox(..., bisel, col)` (caja biselada),
`beam(a,b,w,h)`, `cyl(r0,r1,y0,y1,seg,col)`, `tube(a,b,r0,r1,seg,col)`, `lathe([[r,y],...], seg, col|fn)`
(revolución, perfil de abajo arriba por fuera), `sphere(r,seg,rings,col,half)`, `capsule(r,h,seg,col)`, `ico(r,col)`,
`wedge(x0,x1,y0,y1,z0,z1,col)` (rampa hacia +Z), `rbox(..., radio, col, n, abombado)`, `sandbag(largo,ancho,alto,col)`,
`grid(x0,z0,x1,z1,nx,nz,col,H,cfn,uvK)`; `mark()`, `xform(desde, fn)`, `xformM(desde, m4)`, `translate, scale,
recolor, tint, vary(desde, rnd, 0.06)` (tono por triángulo), `uvProj(desde, repeticiones/m)`, `merge(g, m4)`, `data()`;
`Geo.gridData(x0,z0,ancho,fondo,nx,nz,H,cfn,uvK)` → malla indexada de relieve con normales suaves. Giros `rotX/rotY/rotZ(a,tx,ty,tz)`.
**Tex** (texturas de detalle casi blancas; el color lo pone el vértice): `Tex.ground('grass'|'dirt'|'sand'|'snow'|'mud', semilla)`,
`Tex.wood, plaster, brick, stone, metal, roof` (semilla), `Tex.particles()`, `Tex.decals()`; `canvasTex(w,h,fn)`,
`vnoise/fbm2` (ruido de valor).

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
**Hecho (fase 2).** Además: `Snd.play` acepta `{pos, vol, rate, by (actor: caché de oclusión), delay, me (arma del jugador, sin 3D), prio
(roba la voz más vieja del tipo), far 0..1, k (fuerza del paso), cl (clase del arma en recargas), hit, dur, size, spoon}` y devuelve la voz o null.
Nombres extra: `reload_out|in|bolt|clip|charge`, `shell`, `gear`, `pain`, `death` (gritos sintéticos), `hitmark`, `killmark`, `helmet`, `debris`,
`pickup`, `ammo`, `mount`, `dismount`, `jump`, `incoming` (silbido con `dur`), `objective_done`; `Snd.names()` los lista todos. Bucles:
`Snd.loop('tank_engine'|'halftrack_engine', {pos, follow})` (motor, cadenas, torreta) + `Snd.move(id,pos)`, `Snd.set(id, velocidad, giroTorreta)`,
`Snd.stop(id, fundido)`; `ambience_battle|wind|night|fire|surf|forest`. Los carros (`a.tank`) suenan solos. `Snd.music('menu'|'tension'|'victory'|
'death'|null)` (título/informe → menú; combate → capa de tensión automática; `missionComplete`/`playerDied` → fanfarria/golpe).
`Snd.ambience([...])`, `Snd.deafen(0..1)`, `Snd.duck(bool)`, `Snd.stats()`, `Snd.render(nombre, {dur, far, raw})` (prueba sin conexión).
Opcional en cada misión: `ambience` (lista de los anteriores), `battle` (0..1, tiroteo lejano; 0 = nada) y `reverb` ('open'|'village'|'indoor'|
'forest'|'beach'); si faltan se deducen del entorno (`env.stars`/`snow`, `ground:'sand'`). Reverb interior/pueblo automática por rayos.
`Voice.say(quién, clave, texto?)`: quién = nombre ('Hayes','Russo','Kowalski','Díaz','Instructor','radio'), 'ally', 'axis' o **un actor** (su bando y
nombre; los gritos de alemanes a más de 40 m no se oyen). Claves de `CALLOUTS`: grenade, throwing, reloading, enemySpotted, enemyLeft, enemyRight,
contact, coverMe, takeCover, getDown, manDown, medic, clear, moveUp, follow, flank, sniper, mg, tank, fire, attack, alarm, halt, retreat, hit, niceShot,
good, hurry (cada una con enfriamiento). `Voice.ally(clave, pos?)` lo grita el aliado más cercano. Las frases de `LINES`/texto propio cortan los gritos.

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


**Formato de escenario** (lo que devuelve `level.build()`): `{bounds:[x0,z0,x1,z1], water:{y,col}, terrain:{tex, h(x,z), color(x,z,n,y,prof), surface(x,z),
mods:[{t:'crater'|'trench'|'flat'|'hill',...}], res, margin}, props:[{t, x, z, yaw, y?, id?, pt?, ...}], cover:[], usables:[]}`. Los props se colocan en orden
(los de dispersión al final, porque evitan los colisionadores ya puestos). `id` hace el objeto dinámico (malla propia: `World.remove(id)`, `World.setM/hinge`);
`pt` sólo da prefijo a sus puntos con nombre. **Prefabricados** (PREFABS, +X local = izquierda, +Z = frente): `box wall ruin rubble sandbags crate barrel fence hedge
tree{kind:oak|pine|bare|snowy|poplar|split|stump|bush|sbush} log rock hedgehog wire crater trench{pts,w,d,rampA,rampB,bags} bunker{w,d,h,slit,mg} tower church{lit,ruined}
house{w,d,h,storeys,mat,roof,doors,windows,ruined,burnt,lit,smoke} barn haystack bales cart poles{pts,every,broken} wreck{kind:truck|tank|jeep|halftrack,burnt,smoke,fire}
flak{aim,el,broken} foxhole{r,d,bags} nest{r,a0,a1,mg,tag} table{radio,maps,lamp} pews target{tag} barrier vault seawall{len,h,breach:{at,w}} lcvp lcvpramp{id,open}
hut tent hedgerow{pts,h,gaps:[[tramo,t,ancho]],trees} scatter{x0,z0,x1,z1,n,items,minD,avoid} tufts{x0..z1,n,type,cols,avoid} well memorial signpost chute ship
obstacle{k:stake|logramp} fx{kind:fire|smoke,size} ammo` y `gun stairs` de la fase 1.
**Puntos con nombre**: `World.points['pref.nombre'] = [x,y,z,yaw]` (`World.point(n)`): casas `door in up w0..` (ventanas altas), iglesia/torre `belfry nave altar`,
búnker `door in gun gun2 charge roof`, flak `charge gun`, nido `gun mg`, malecón `breach top`, lancha `hinge deck`, pozo `in`.
`World.fxPts` (fuegos y humos de los prefabricados; Game los enciende al cargar). Nuevas: `World.colOn(c,on,nav)`, `World.setM(id,M)`, `World.hinge(id,pivot,yaw,ang)`;
`World.addProp` recalcula la navegación. La navegación sube por escaleras y rampas hechas de colisionadores (escalones de 0,45 m).

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

Además: `name, place, brief, env, start:{pos:[x,z]|[x,y,z],yaw}, loadout, squad:[{name,kind,hero,weapon,pos,yaw,frozen}], build, objectives, script(L),
finale(L)` (en vez de terminar sola al acabar los objetivos), `survival:true` + `score(L)->{points,wave,text}`. Frases de guion en `LINES`
`{clave:{who,es,en,de?}}`; reparto en `CAST[who] = {es,en,voice:{pitch,rate,lang}}`. Escena del menú: `TITLE_SCENE = {env, build, cam(t)->{eye,yaw,pitch,fov}, tick?}`;
`Game.toTitle()` la carga sola (cámara lenta alrededor de la plaza de un pueblo al amanecer); el menú no tiene que hacer nada.

## 5. Guion de misiones (lo implementa Game, lo usan los niveles)

Cada objetivo: `{text:{es,en}, marker:[x,y,z] | ()=>pos, done:(L)=>bool, onStart(L), onDone(L)}`.
Ayudantes en `L`: `L.wait(s)`, `L.trigger(boxOrSphere, fn)` (al entrar el jugador), `L.spawn(group)`
(soldados con ruta/destino), `L.wave(defs)`, `L.alive(tag)` (cuántos quedan con esa etiqueta),
`L.say(who, key)`, `L.checkpoint()`, `L.barrage(area, n, interval)` (fuego de artillería con aviso
de silbido), `L.fail(reason)`, `L.timer(name)`, `L.flags`. Los puntos de control guardan el estado
del jugador (vida llena, armas, munición) y del guion para reaparecer.

**Ampliaciones del guion (fase 2).** Atajos de objetivo: `reach:[x,z,r]`, `kill:'tag'|[tags]` (marcador = el más cercano), `flag:'nombre'`, `use:'tag'` (interactuable
que hay que usar; el piloto lo usa), `pickup:'arma'`, `marker:'pref.punto'`, `stay` (defensa: el piloto se queda), `direct` (sin navegación), `checkpoint:false`,
`bot(L,cmd,Bot,dt)` (control propio del piloto), `aim(L)` (dianas), `lob` (granadas a un punto). Texto dinámico con getters `{get es(){..}}`.
Ayudantes: `L.say(clave)` o `L.say(quién, clave)` · `yield* L.talk(['clave', 1.5, ['Russo','clave']])` · `L.on(evento, fn)` (se quita sola) · `L.spawn({..., behavior:
'hold'|'advance'|'patrol'|'charge'|'mg', route, goal, face, sight, leash, alert, mg, frozen})` (pos también 'pref.punto') · `L.squadTo(pts|null)` · `L.ally(nombre)` ·
`L.nearest(tag)` · `L.wave({..., goals, behavior, random, onSpawn})` · `L.barrage(zona, n, int, {air, r, dmg, safe})` (con `air`: estallidos en las copas) · `L.boom(p,r,dmg)` ·
`L.charge({pos, hold, fuse, remove, swap, flag, follow:actor, off, onBoom})` · `L.mg(p, yaw, {tag})` · `L.ammo(p)` · `L.usable(u)` · `L.useOf(tag)` · `L.pickup(arma, p, munición)` ·
`L.tank({pos, yaw, type:'pz4'|'tiger', half, route, health, tag})` · `L.ramp(id, s)` (baja la rampa de la lancha) · `L.cine(claves, s, fn)` (cámara de cine) · `L.fade(on)` ·
`L.fire/L.smoke(p)` · `L.timer(n,s,visible)/L.stopTimer(n)` · `L.complete({credits:true})` (`missionComplete.stats.credits` y Bus `credits` → el menú enseña los créditos).
Actores `frozen:true` (instructores: quietos, miran al jugador) o `'still'`. Bus nuevo: `credits` {}, `buy` {id,cost} (supervivencia). Récord de supervivencia:
`Save.survival` (+`Save.survivalWave`) si existe `Save.store`, si no `localStorage['frente44:survival']`; `Game.bestSurvival()`.

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

Cada módulo trae su prueba `test/<modulo>.js` que debe pasar sin errores de consola. Las capturas van a la
carpeta de la variable `F44_OUT` (por defecto `/tmp/frente44`); poner `GFX.auto=false` (SwiftShader va lento) y
responder a fonts.googleapis.com con un CSS vacío (`page.route`) para que no haya errores de red en la consola.
`test/engine.js` construye sólo 00/01/02, monta una escena de prueba y exporta `{demo, pngStats}` para reutilizarlos. `test/all.js`
ejecuta las rápidas. Las capturas se guardan fuera del repositorio (en el directorio temporal que
indique la tarea).

## 10. Fase 2: reparto del trabajo (cada agente sólo edita sus archivos)

| Parte | Archivos propios |
|---|---|
| Armas, efectos y jugador | `31_weapons.js`, `50_fx.js`, `30_player.js` |
| Soldados, vehículos e IA | `40_actors.js`, `41_ai.js` |
| Misiones y escenarios | `21_levels.js`, `20_world.js` (prefabricados y relieve; la API de colisión, raycast, navegación y coberturas no cambia), `90_main.js` (guion y `F44.bot`) |
| Sonido y voces | `11_audio.js` |
| Interfaz, menús y controles | `60_hud.js`, `61_menu.js`, `10_input.js`, `src/shell.html` |

- Si hace falta algo de un archivo ajeno, se usa su API pública o el `Bus`; los cambios que sólo
  puede hacer su dueño se apuntan en el informe final. Nunca se edita un archivo ajeno.
- Construcción privada para probar sin pisarse:
  `B=<carpeta privada>/src; rm -rf $B; mkdir -p $B; cp <base>/* $B/; cp wwii/src/<propios> $B/;`
  `python3 wwii/build.py --src $B --out <carpeta privada>/index.html` y
  `F44_HTML=<carpeta privada>/index.html node wwii/test/smoke.js`.
  Nadie ejecuta `build.py` sin `--out` (el `wwii/index.html` público lo genera el coordinador).
- Eventos del `Bus` que ya existen (además de §2): `step` {pos,surface,run}, `reload` {by,weapon},
  `reloadStep` {by,weapon,step:'out'|'in'|'bolt'|'clip'|'charge'}, `dryfire`, `ping` {pos},
  `pin`, `throw`, `grenadeBounce` {pos}, `whizz` {pos}, `melee` {by,hit}, `pickup` {id}, `ammo`,
  `mount`/`dismount` {u}, `jump`, `incoming` {pos} (proyectil de artillería que llega),
  `destroyed` {pos}, `objectiveDone` {index}, `spawn` {actor}, `device` {device},
  `settings` {key,value}, `gfxAuto`, `glLost`, `glRestored`, `pointerUnlock`.
  Quien añada eventos nuevos los documenta aquí.
  Sonido (11_audio.js): `say` lleva además `de` (alemán) y `actor`; el texto alemán va con la traducción entre paréntesis.
  Opcionales que Snd aprovecha: `step` de soldados {pos, surface, by:actor, run}; `throw` {by, type}; `incoming` {pos, t (s hasta el impacto)};
  `reloadStep` del jugador (sin él, Snd hace una recarga genérica por clase de arma y el cerrojo del Kar98).
- Textos de voz: `LINES` (en `21_levels.js`, frases de guion: `{clave:{who, es, en, de?}}`) y
  `CALLOUTS` (en `11_audio.js`, gritos de combate genéricos en ES/EN/DE: granada, recargando,
  enemigo a la vista, cubridme, hombre caído...). `Voice.say(who, key)` busca primero en `LINES`
  y luego en `CALLOUTS` (en tiempo de ejecución, así no importa el orden de carga).
