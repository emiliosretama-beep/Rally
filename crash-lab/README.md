# Crash Lab (DEV)

Sandbox de choques 2D para navegador (ERAGames). Chocas un auto de rally, se abolla, pierde piezas, ganas dinero según el daño y lo gastas en el taller.

## Cómo jugar

- **▶ / → / D**: acelerar (en el aire gira el auto hacia atrás)
- **◀ / ← / A**: frenar y reversa (en el aire gira hacia adelante)
- **N₂O / N / Shift**: nitro (se compra en el taller)
- **Espacio**: cámara lenta · **R**: reiniciar · **Esc**: menú
- Botón **●**: graba un clip de hasta 30 s (en iPhone se abre el menú de compartir)

Pruebas: **Muro**, **Rampa** y **Caída** (la grúa te suelta al tocar ▶).
Taller: **Motor** (niveles 2 y 3), **Nitro** y **Patrocinador** (+50% de pago).

## Estructura

| Archivo | Qué hace |
|---|---|
| `index.html` | Pantallas, HUD, controles táctiles y estilos |
| `src/config.js` | Ajustes de física y daño, textos ES/EN y guardado |
| `src/car.js` | Auto compuesto, daño por pieza, abolladuras y piezas que se sueltan |
| `src/levels.js` | Las 3 pruebas |
| `src/render.js` | Dibujo en canvas, cámara y partículas |
| `src/audio.js` | Sonido sintetizado (motor y golpes) |
| `src/main.js` | Bucle de paso fijo, entrada, flujo de pantallas y grabación |
| `lib/matter.min.js` | Matter.js 0.19.0 (incluido para que funcione sin internet en itch.io) |

## Ajustar el feeling

Abre `index.html?debug=1` para ver un panel con deslizadores (gravedad, daño, aceleración, umbral de impacto, nitro).
Cuando encuentres valores que te gusten, pásalos a `CL.TUNING` en `src/config.js`.

## Publicar en itch.io

Comprime **el contenido** de esta carpeta (que `index.html` quede en la raíz del zip) y súbelo como juego HTML.
