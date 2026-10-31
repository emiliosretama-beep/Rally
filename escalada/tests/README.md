# Pruebas de Born to Climb

Se corren desde la carpeta `escalada/` con Node (las de navegador necesitan Playwright).

- `bash tests/todo.sh`: todo lo de abajo que no usa navegador, con un resumen.
- `node tests/bot.js volcano` / `node tests/bot.js k2`: bot honesto en cada desafío. No rellena la resistencia; descansa
  junto a los ganchos como lo haría un jugador. Todo debe salir `OK`.
  Un solo desafío con detalle: `node tests/bot.js volcano 5 v`. Con frío y cansado: `node tests/bot.js k2 - - 1 0.5`.
- `node tests/cuerdas.js`: cada ladera con cuerda fija del Gigante Blanco, desde abajo, con frío 0, 0.5 y 1 (15 subidas).
- `node tests/atajos.js volcano`: que no se pueda hacer trampa caminando por fuera de la ruta.
- `node tests/viento.js`: cada paso con viento (escaleras, aristas y la cornisa del volcán) con tres jugadores: uno que
  solo camina adelante, uno que corrige sin sujetarse y uno que mantiene AGARRAR desde el aviso. Las ráfagas deben tirar
  a los dos primeros casi siempre y el que se sujeta debe llegar en los 6 arranques.
- `node tests/partida.js`: partida en el navegador (menú, Gigante Blanco, cumbre, tramos, récords, volcán). Capturas en `tests/out/`.

`SRC=/otra/copia/src node tests/bot.js volcano` prueba otra copia del código (sirve para comparar antes y después).
