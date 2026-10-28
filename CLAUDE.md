# Reglas del repo (ERAGames · Emilio)

## Juegos

- **Todo juego que se entregue lleva la intro de ERAGames al arrancar.** Sin excepción, también en versiones DEV y prototipos.
  - La intro oficial está en `era-intro/intro_era_games.html`. Se pega **tal cual** justo después de `<body>`; no se rediseña ni se inventa otra.
  - Dura ~2.6 s, se quita sola y se salta con un toque o una tecla. API: `ERASplash.done` (promesa) y `ERASplash.skip()`.
  - **Toque fantasma:** al saltarla en el celular, el click que sigue al toque cae en el botón de abajo. Cada juego debe ignorar clicks mientras `#era-splash` exista (ver el listener de `click` en captura en `crash-lab/src/main.js`).
  - Si un juego no la tiene todavía, pídesela a Emilio antes de dar el juego por entregado.
- Los juegos viven en su propia carpeta (por ejemplo `crash-lab/`). La app Business AI de la raíz no se toca al trabajar en un juego.
