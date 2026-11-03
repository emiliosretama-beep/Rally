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
| Portugal | Grava dura y polvorienta entre eucaliptos y pinos, lomas, mucho público en las laderas, un gran salto con espectadores (tipo Fafe). Ojo: Dirt Rally 2.0 no tiene rally en Portugal (sólo rallycross); se usa el mismo estilo visual con el Rally de Portugal real como referencia. Confirmar con Emilio. |
| Finlandia | Grava muy rápida y estrecha, rasantes ciegas y saltos enormes, bosque de pinos y abedules, lagos, granjas y casas rojas, campos abiertos. |
| España | Vallserena (hecho): pueblo de piedra, muros de piedra seca, congost, riera con puente. |

## Fase 2: modo Campeonato (hecho, 3 de noviembre de 2026)
- Menú *Campeonato*: calendario, clasificación general, empezar / continuar / nuevo campeonato.
- Rivales: 9 pilotos inventados (`RIVALS` en `index.html`). Ritmo = veces el tiempo del piloto automático
  (el oro es 1,03): de 1,015 a 1,27, con -0,02 en su superficie favorita, ruido de -1,2 % a +2,3 % y un 6 % de
  probabilidad de error (+5 % a +12 %). Para hacerlo más fácil o más difícil, sube o baja esos ritmos.
- Puntos 25-18-15-12-10-8-6-4-2-1. Progreso en `localStorage` (`champ:v1`).
- Países provisionales (cambiar `CHAMP` cuando estén hechos): Montecarlo = Puerto de montaña en invierno de
  noche; Suecia = Valle helado; Portugal = Bosque de pinos en primavera; Finlandia = Colinas del norte en verano.
- Pruebas: sección 6 de `test/rally.test.js` (campeonato completo con el piloto automático).

## Pendiente antes de construir los países
- Que Emilio pruebe la física nueva en el iPhone (grava, nieve, asfalto y el Lino).
- Fase 3: un país por sesión con el sistema de tramos hechos a mano de Costa Daurada.
