# Campeonato de Born to Rally: dirección de diseño

Decidido con Emilio el 1 de noviembre de 2026.

## Formato
- 5 países, un tramo cada uno, en el orden del calendario real:
  **Montecarlo → Suecia → Portugal → Finlandia → España**.
- Rivales inventados con tiempos propios; puntos por país (25, 18, 15…) y tabla final con campeón.
- Los tramos actuales (TC1–TC6) quedan como **modo libre**, para divertirse.
- España = **Vallserena** (ya hecho).

## Estilo de los tramos: referencia Dirt Rally 2.0
Todos los tramos se hacen como Vallserena: con el **estilo y el carácter** con que Dirt Rally 2.0
representa cada país (tipo de carretera, ritmo, relieve, vegetación, casas, público, peligros).
El trazado, los nombres y los modelos son **nuestros**: se toma la inspiración, no se copian sus
tramos uno a uno (son diseño de otro estudio y el juego se publica en itch.io).

| País | Carácter a capturar |
|---|---|
| Montecarlo | Asfalto de montaña estilo Col de Turini: horquillas encadenadas, muros de piedra y pretiles, caídas al barranco, placas de hielo y nieve en la calzada, pueblos alpinos, de noche muy atmosférico. |
| Suecia | Nieve compacta y muy rápida, bancos de nieve a los lados en los que se puede apoyar el coche, bosque de pinos, lagos helados, casas rojas de madera. |
| Portugal | Grava dura y polvorienta entre eucaliptos y pinos, lomas, mucho público en las laderas, un gran salto con espectadores (tipo Fafe). Ojo: Dirt Rally 2.0 no tiene rally en Portugal (sólo rallycross); se usa el mismo estilo visual con el Rally de Portugal real como referencia (confirmado con Emilio). |
| Finlandia | Grava muy rápida y estrecha, rasantes ciegas y saltos enormes, bosque de pinos y abedules, lagos, granjas y casas rojas, campos abiertos. |
| España | Vallserena (hecho): pueblo de piedra, muros de piedra seca, congost, riera con puente. |

## Fase 2: modo Campeonato (hecho, 3 de noviembre de 2026)
- Menú *Campeonato*: calendario, clasificación general, empezar / continuar / nuevo campeonato.
- Rivales: 9 pilotos inventados (`RIVALS` en `index.html`). Ritmo = veces el tiempo del piloto automático
  (el oro es 1,03): de 1,015 a 1,27, con -0,02 en su superficie favorita, ruido de -1,2 % a +2,3 % y un 6 % de
  probabilidad de error (+5 % a +12 %). Para hacerlo más fácil o más difícil, sube o baja esos ritmos.
- Puntos 25-18-15-12-10-8-6-4-2-1. Progreso en `localStorage` (`champ:v1`).
- Ya no hay países provisionales: los 5 son tramos hechos a mano (el marcado *provisional* sigue en el código por si se añade otro).
- Pruebas: sección 6 de `test/rally.test.js` (campeonato completo con el piloto automático).

## Fase 3: los países
- **Montecarlo (hecho, 3 de noviembre de 2026)**: `montecarlo`, *Col des Lacets*, 2,1 km. `MC_LAYOUT` en `index.html`.
  Usa el sistema de tramos hechos a mano (el camino de Vallserena) con `flora:'alpes'` (abetos nevados, rocas, montículos de nieve)
  y el campo nuevo `ice` (placas de hielo: `[m inicio, m fin, intensidad]`, con `ICE_K` = 0,5 de agarre perdido).
  Zonas: pueblo (0), subida en horquillas (200), desfiladero (800), col (1140), bajada (1370).
  Del Montecarlo de Dirt Rally 2.0 se tomó lo que lo hace único: **superficie mezclada en un mismo tramo** (seco, mojado,
  nieve y hielo, también a mitad de curva), noche, postes de nieve, paneles de flechas en las horquillas y piedra gris.
  Campos: `snow` y `wet` (como `ice`); agarre perdido: `SNOW_K` 0,3 y `WET_K` 0,12. Estilo por tramo: `flora`, `stone`, `flag`.
- **Suecia (hecho, 3 de noviembre de 2026)**: `suecia`, *Tallsjön*, 2 km. `SE_LAYOUT`. Campos nuevos: `snowRoad` (carretera de
  nieve compacta), `banks` (bancos de nieve: barrera tipo 7, blanda: el coche se apoya), `kicks` (saltos `[m, altura, ancho]`),
  `lakeIce` (lago helado `[m inicio, m fin, radio]`), `farms` (granjas `[m, distancia]`), `wood` (colores de las casas de madera),
  `flora:'nordic'`. Zonas: bosque (0), granja (540), saltos (700), lago (1100), bosque (1520).
  Carretera angosta para que sea más difícil: `roadW:72` (5,8 m) y los bancos a 0,6 m del borde (`BOFF[7]`).
- **Portugal (hecho, 3 de noviembre de 2026)**: `portugal`, *Serra das Fragas*, 2 km, primavera. `PT_LAYOUT`. Primer tramo
  hecho a mano de grava. Campos nuevos: `gravelRoad` (textura de grava), `loose` (grava suelta `[desde qué fracción del medio
  ancho, agarre perdido en el borde]`), `noArmco` (sin biondas), `turbines` (molinos `[m inicio, m fin, lado]`, en lo alto y
  a más de 105 m de la carretera), `stoneW`/`render`/`church` (colores de la aldea), `rockC` (granito), `flora:'luso'`
  (eucalipto nuevo, pino, roble, tojo), 4.º valor en `crowds` (hasta qué distancia de la carretera se pone el público).
  Un `kicks` de 1,8 m o más es un salto grande: el copiloto avisa con *¡Salto grande!*.
  Zonas: aldea (0), eucaliptos (160), cima (740), pinar (1110), campos (1580).
- **Finlandia (hecho, 3 de noviembre de 2026)**: `finlandia`, *Harjuvaara*, 2 km, verano. `FI_LAYOUT`. Campos nuevos: `lakeW`
  (lago de verdad `[m inicio, m fin, lado, altura del agua]`: el monte baja bajo el agua, se dibuja el agua y, si el coche
  acaba dentro, vuelve a la carretera con +5 s), `bales` (pacas de silo `[[m inicio, m fin]]`), `flora:'boreal'` (pinos y
  abedules de verano, campos segados). Granjas con `farms` y `wood` (como Suecia). Zonas: bosque (0), lago (520), granja (980),
  campos (1100), bosque (1420).
- La fase 3 está completa: los 5 países del campeonato.

## Fase 4: 10 tramos (hecho, 4 de noviembre de 2026)
- El calendario pasa a **10 tramos: 5 países x 2**, con los tramos que ya existían (hay 11; Dunas rojas queda fuera porque
  no hay rally en el desierto). Cada país corre su tramo propio y el clásico que más se le parece:

| Ronda | País | Tramo | Condiciones |
|---|---|---|---|
| 1 | Montecarlo | Col des Lacets (`montecarlo`) | invierno, de noche |
| 2 | Montecarlo | Puerto de montaña (`asfalto`) | invierno, de día |
| 3 | Suecia | Tallsjön (`suecia`) | invierno |
| 4 | Suecia | Valle helado (`nieve`) | invierno |
| 5 | Portugal | Serra das Fragas (`portugal`) | primavera |
| 6 | Portugal | Bosque de pinos (`bosque`) | primavera |
| 7 | Finlandia | Harjuvaara (`finlandia`) | verano |
| 8 | Finlandia | Colinas del norte (`colinas`) | verano |
| 9 | España | Vallserena (`vallserena`) | otoño |
| 10 | España | Riudecanyes (`riudecanyes`) | otoño |

- La lógica no cambia: puntos 25-18-15-12-10-8-6-4-2-1 **en cada tramo** (se reparten 1010), tiempos de los rivales con su
  ritmo y progreso guardado tras cada tramo. Clave nueva en `localStorage`: `champ:v2` (los campeonatos de 5 tramos a medias,
  `champ:v1`, no encajan con el calendario nuevo y no se continúan).
- Los botones dicen el país y el tramo de ese país: *Siguiente: Montecarlo 2/2*. El calendario tiene una fila por tramo,
  agrupadas por país; si no cabe (iPhone en horizontal) se desliza y se coloca en el tramo que toca.
- Los 10 tramos del calendario tienen tabla online (los cinco propios del campeonato desde el 4 de noviembre de 2026,
  tras ejecutar el SQL nuevo en Supabase): su tiempo se envía como en el juego libre. (Ver la fase 5: el calendario cambió.)

## Fase 5: cada país, su tramo de ida y de regreso (hecho, 4 de noviembre de 2026)
Pedido por Emilio: cada país corre **su tramo propio dos veces, de ida y de regreso** (como en los rallies de verdad, que
repiten tramos al revés). Los tramos clásicos salen del calendario (siguen en el juego libre).

| Ronda | País | Tramo | Condiciones |
|---|---|---|---|
| 1 | Montecarlo | Col des Lacets, ida | invierno, de noche |
| 2 | Montecarlo | Col des Lacets, regreso | invierno, de día |
| 3-4 | Suecia | Tallsjön, ida y regreso | invierno |
| 5-6 | Portugal | Serra das Fragas, ida y regreso | primavera |
| 7-8 | Finlandia | Harjuvaara, ida y regreso | verano |
| 9-10 | España | Vallserena, ida y regreso | otoño |

- Cada ronda de `CHAMP` lleva `rev` (`champCond` lo aplica y al salir vuelve lo que tenía elegido el jugador). Los tiempos
  de los rivales del regreso salen de las medallas del regreso.
- Misma lógica: puntos en cada tramo, progreso guardado. Clave nueva: `champ:v3` (un campeonato a medias de la versión
  anterior no se continúa).
- Las rondas de ida van a la tabla online de su tramo; las de regreso no (el regreso no tiene tabla).

## Pendiente antes de construir los países
- Que Emilio pruebe la física nueva en el iPhone (grava, nieve, asfalto y el Lino).
- Fase 3: un país por sesión con el sistema de tramos hechos a mano de Costa Daurada.
