# Born to Rally: Costa Daurada

Spin-off de **Born to Rally** (ERAGAMES) dedicado al rally de asfalto de Cataluña, en la Costa
Daurada. Es el mismo juego —motor WebGL 2 propio, física, los tres coches (Rally 1, Rally 2 y
Lino 206) con sus decoraciones, copiloto con voz, coche fantasma, mando, teclado y pantalla
táctil, opciones y niveles de gráficos— pero con **un solo tramo**, hecho a mano y mucho más
detallado. Todo está en un único archivo, `index.html`, sin librerías ni recursos externos
(sólo las fuentes de Google Fonts).

## El tramo: Riudecanyes

En la edición de 2026 del rally de Cataluña (15–17 de octubre, todo asfalto, con base en Salou)
el viernes se corrieron **dos pasadas por Riudecanyes (14,90 km), de noche**. El sábado se
disputaron Savallà–Conesa, Querol–Les Pobles y El Montmell, y el tramo urbano de Salou en el
Passeig Jaume I.

Nuestro **TC1 Riudecanyes** recrea el carácter de ese tramo a la escala de Born to Rally
(**2,1 km de asfalto**, 6 rasantes, sin saltos):

1. **Salida junto al pantano de Riudecanyes**: carretera rápida por la orilla, con el agua a la
   izquierda, bionda sobre el talud, la presa al sur y pinos piñoneros.
2. **Subida en horquillas**: cuatro horquillas encadenadas por la ladera, con muros de piedra
   seca en los desmontes, bionda en los terraplenes, pinar de pino carrasco y público en la
   ladera.
3. **Meseta de viñas**: enlazadas rápidas entre viñas en hileras (que en otoño se vuelven
   amarillas, naranjas y rojas), olivares, almendros, una masía con cipreses y rasantes en las
   que el coche se aligera.
4. **El pueblo en lo alto**: una izquierda cerrada entre casas, con bordillos de piedra y la
   iglesia con su campanario de piedra.
5. **Bajada rápida a meta**.

Lo típico de Cataluña también está en el juego: asfalto liso y oscuro con líneas blancas en los
bordes, línea central gastada, parches y grietas selladas, y **la grava y la tierra roja que los
coches arrastran al asfalto por dentro de las curvas** al cortar. Si pisas esa grava, el coche
agarra menos (el copiloto avisa en las peores: «Izquierda 2 larga con grava»).

**Condiciones**: otoño por defecto (como en octubre), y también primavera (almendros en flor y
amapolas), verano y un invierno frío y sin nieve (en la costa llueve). Día o noche (como el viernes
del rally real) y seco o lluvia. Cada combinación cambia el agarre y el aspecto.

Los récords, fantasmas y opciones se guardan con su propio prefijo (`btr-costa:`), así que no se
mezclan con los de Born to Rally.

## Cómo jugar

Abre `index.html` en Chrome, Edge, Firefox o Safari recientes (hace falta WebGL 2).

| Acción | Teclado | Mando | Táctil |
|---|---|---|---|
| Girar | ← → / A D | Stick izquierdo o cruceta | Flechas abajo a la izquierda |
| Acelerar / frenar | ↑ / ↓, W / S | RT / LT (analógicos) | Gas / Freno |
| Freno de mano | Espacio | A o X | Freno de mano |
| Bajar / subir marcha (cambio manual) | Q / E | LB / RB | − / + |
| Volver a la pista (+5 s) | R | View | Botón que aparece al quedarte atascado |
| Cambiar cámara | C | Y | Icono de cámara |
| Pausa | P / Esc | Menu | Icono de pausa |
| Pantalla completa | F | — | Botón en la pantalla de inicio |
| En meta: repetir / menú | R / Esc | A, B | Botones |

En los menús se navega con las flechas o la cruceta; Enter o A acepta y Esc o B vuelve atrás.

## Publicar en itch.io

1. Comprime `index.html` en un zip (el archivo debe quedar en la raíz del zip):
   `zip -j Born_to_Rally_Costa_Daurada.zip index.html`
2. En itch.io: *Kind of project* → **HTML**, sube el zip y marca
   **This file will be played in the browser**.
3. Recomendado en *Embed options*: tamaño 1280 × 720, activar **Mobile friendly** (orientación
   automática o apaisada) y **Fullscreen button**.

Juego no oficial: no está asociado a la organización del rally ni a sus patrocinadores. Los
nombres de lugares son reales; el trazado es una recreación libre.
