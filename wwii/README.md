# FRENTE 44

*Normandía · Las Ardenas* — juego de disparos en primera persona de la Segunda Guerra Mundial para
un jugador, que se juega en el navegador. Todo está en un solo archivo, `index.html`: WebGL 2,
Web Audio y voces con la síntesis de voz del sistema, sin librerías ni recursos externos (sólo las
fuentes de Google Fonts). Pensado sobre todo para iPad, también para ordenador y mando.

Campaña lineal con tu escuadra (sargento Hayes, cabo Russo, Kowalski y Díaz), objetivos en la
brújula, salud que se regenera, armas que se recogen del enemigo, ametralladoras fijas, cargas
explosivas, carros de combate y fuego de artillería. Interfaz en español (también en inglés).

## Misiones

1. **Campo de instrucción** (Inglaterra, mayo de 1944) — opcional: moverse, disparar a dianas,
   granadas, cargas y carrera de obstáculos contra el reloj.
2. **Playa de Normandía** (6 de junio de 1944) — la rampa cae, carrera por la arena bajo las
   ametralladoras, torpedo bangalore en la alambrada, dos nidos de MG42 y la salida de la playa.
3. **Sainte-Mère-Église** (noche del 5 al 6 de junio) — paracaidista perdido: reúne a la escuadra,
   limpia las casas, vuela el cañón antiaéreo y defiende el cruce contra un semioruga.
4. **El bocage** (junio de 1944) — setos, MG42, francotirador en el campanario, la MG capturada
   contra el contraataque y un carro que hay que destruir con el bazuca.
5. **Bastoña** (diciembre de 1944) — bosque nevado bajo la artillería, asalto, contraataque del
   Tiger y la toma de la iglesia. Termina con los créditos.
6. **Supervivencia** (extra) — pueblo en ruinas, oleadas crecientes, armas que se compran con
   puntos y récord guardado.

Dificultad Recluta / Regular / Veterano, con medalla y mejor tiempo por misión.

## Controles

| Acción | Teclado y ratón | Mando | Táctil (iPad) |
|---|---|---|---|
| Moverse | W A S D / flechas | Stick izquierdo | Palanca que aparece bajo el pulgar izquierdo |
| Mirar | Ratón (puntero bloqueado) | Stick derecho | Arrastrar en la mitad derecha |
| Correr | Mayús | L3 | Palanca a fondo hacia delante |
| Disparar | Clic izquierdo | RT | Botón grande rojo |
| Apuntar | Clic derecho | LT | Botón de mira (alterna) |
| Recargar | R | X | Botón de recarga |
| Granada (mantener = cocinar) | G | RB | Botón de granada |
| Saltar | Espacio | A | Botón de salto |
| Agacharse | C / Ctrl | B | Botón de agacharse |
| Cuchillo | V / F / botón central | LB / R3 | Botón de cuchillo |
| Cambiar arma | Q / rueda / 1 2 3 | Y / cruceta ◀ ▶ | Botón de cambio |
| Usar (recoger, MG, cargas) | E (mantener) | X | Botón Usar (aparece cuando hay algo) |
| Pausa | Esc / P | Start | Botón de pausa |

En Opciones: sensibilidad separada por dispositivo, invertir Y, campo de visión, ayuda al apuntar,
disparo automático táctil, tamaño y opacidad de los botones, calidad gráfica (Baja, Media, Alta,
Ultra; baja sola si el aparato no llega), sangre, volúmenes, subtítulos y su tamaño, idioma.

## Construir

```
python3 wwii/build.py                  # une src/*.js en src/shell.html -> wwii/index.html
python3 wwii/build.py --zip f44.zip    # además, un zip con index.html en la raíz
node wwii/test/smoke.js                # prueba de humo (Playwright + Chromium)
node wwii/test/missions.js             # el piloto automático juega toda la campaña
```

El código está en `wwii/src/` (un archivo por módulo, ver `DESIGN.md`); `index.html` no se edita a
mano. Las pruebas (`wwii/test/*.js`) aceptan `F44_HTML=<construcción>` y `F44_OUT=<carpeta de capturas>`.

## Subir a itch.io

1. `python3 wwii/build.py --zip frente44.zip`
2. En itch.io: *Create new project* → *Kind of project: HTML* → sube `frente44.zip` y marca
   *This file will be played in the browser*.
3. Tamaño del marco: 1280 × 720, con *Mobile friendly* (apaisado) y *Fullscreen button* activados.
4. Guarda y prueba en el iPad: el primer toque activa el sonido y la pantalla completa.

ERAGAMES · 2026
