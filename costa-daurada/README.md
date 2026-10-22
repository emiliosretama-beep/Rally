# Born to Rally: Costa Daurada

Spin-off de **Born to Rally** (ERAGAMES) dedicado al rally de asfalto de Cataluña, en la Costa
Daurada y su interior. Es el mismo juego —motor WebGL 2 propio, física, los tres coches (Rally 1,
Rally 2 y Lino 206) con sus decoraciones, copiloto con voz, coche fantasma, mando, teclado y
pantalla táctil, opciones y niveles de gráficos— pero con **dos tramos de asfalto** hechos a mano
y mucho más detallados (se pueden correr sueltos o seguidos como rally completo). Todo está en un
único archivo, `index.html`, sin librerías ni recursos externos (sólo las fuentes de Google Fonts).

## TC1 Riudecanyes

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

## TC2 Vallserena

Vallserena es un pueblo inventado de la sierra caliza del interior. El tramo (**2,2 km**, 4
rasantes) busca el sabor de los tramos de asfalto de montaña de Cataluña: carretera estrecha y
lisa, muros de piedra, bancales y mucho sol.

1. **Salida en la plaza del pueblo**: la calle mayor, estrecha, entre casas de piedra adosadas con
   balcones de hierro, persianas, macetas con flores y faroles; la iglesia con su campanario, la
   fuente y los plátanos de la plaza, banderines cruzando la calle y vecinos en los portales, en
   los balcones y en la acera.
2. **Bajada entre muros de piedra seca**: curvas encadenadas y una horquilla, con muros de piedra
   seca a los dos lados (con público sentado encima), bancales de olivos, almendros y viña.
3. **El congost**: una pared de roca caliza con peñascos a un lado y el barranco al otro, cerrado
   por un pretil de piedra; enlazadas lentas y técnicas.
4. **El puente de la riera**: un puente de piedra con su arco sobre el cauce seco, con chopos,
   adelfas y cañas en las orillas.
5. **Final rápido y fluido** entre bancales, olivos, almendros y pinos piñoneros, con rasantes y una
   masía con cipreses.

Lo típico de Cataluña también está en los dos tramos: asfalto liso y oscuro con líneas blancas en
los bordes, línea central gastada, parches y grietas selladas, una berma de grava clara que separa
el asfalto del monte, y **una fina capa de grava que los coches arrastran al asfalto por dentro de
algunas curvas lentas** al cortar (sólo en el vértice). Si pisas esa grava, el coche agarra un poco
menos (el copiloto avisa en las peores: «Derecha 2 con grava»).

**Condiciones**: otoño por defecto (como en octubre), y también primavera (almendros en flor y
amapolas), verano y un invierno frío y sin nieve (llueve). Día o noche (como el viernes del rally
real; de noche se encienden las ventanas y los faroles del pueblo) y seco o lluvia. Cada
combinación cambia el agarre y el aspecto.

Los récords, fantasmas y opciones se guardan con su propio prefijo (`btr-costa:`), así que no se
mezclan con los de Born to Rally.

## Conducción

- **Agarre de asfalto**: al principio el coche tenía ~5 g de agarre lateral y giraba "sobre
  raíles" (las horquillas se pasaban a 65-75 km/h sin tocar el freno de mano). Ahora, en seco, el
  Rally 2 gira a ~2,1 g, el Rally 1 a ~2,4 g y el Lino 206 a ~1,75 g (con lluvia, bastante menos)
  y frena a ~2,5 g. Si entras pasado, el morro se va hacia fuera: hay que frenar antes, en recta.
- **Dirección según la velocidad**: con teclado o pantalla táctil el volante entra rápido (a fondo
  en ~0,27 s parado y ~0,4 s a 120 km/h) y a alta velocidad tiene algo menos de ángulo: a fondo,
  el Rally 2 cierra un radio de ~6 m a 40 km/h, ~23 m a 80 km/h y ~51 m a 120 km/h, y un toque de
  flecha a 130 km/h corrige sin bandazos.
- **Opción Dirección**: *Suave* perdona más (algo más de agarre y de ángulo, el volante entra un
  poco más despacio y el coche se recoge solo en los derrapes); *Normal* es la de referencia;
  *Rápida* es más directa (volante más rápido, menos ayuda al contravolante y freno de mano de
  golpe).
- **Transferencia de peso**: frenar carga el morro y ayuda a entrar en la curva (se puede frenar
  girando); con gas a fondo el coche subvira (sobre todo el Lino 206, que es de tracción
  delantera); soltar el gas a media curva lo ayuda a cerrar. El Rally 1 es el que más agarra; el
  Lino 206, ligero y nervioso, el que menos.
- **Freno de mano**: bloquea las ruedas traseras, que deslizan y casi no sujetan de lado, así que
  el coche gira sobre el morro. Es la herramienta de las horquillas: sin él, las de Riudecanyes se
  pasan limpias a ~50 km/h con el Rally 2; con él se puede entrar a 75-85 km/h y, bien hecho, se
  gana más de medio segundo en cada una. *Frena, gira, tira del freno de mano un momento, suéltalo
  y acelera.* Mientras está tirado el motor apenas empuja (como si pisaras el embrague), así que
  funciona igual con el acelerador automático; en la pantalla táctil basta con deslizar el pulgar
  del botón del freno de mano al de gas.
- El piloto automático (la demo del menú y los tiempos de medalla) frena según el agarre real y
  usa el freno de mano en las horquillas.
- **Choques**: los golpes contra biondas, muros, pretiles, muros de piedra seca, fachadas y casas
  ya no hacen volar el coche: rebota o roza, pierde velocidad, salta alguna chispa y se abolla.
  Los taludes y laderas empinadas fuera de la carretera hacen de pared (antes, al meterse en un
  talud a 120 km/h el coche podía salir despedido a más de 30 m de altura; ahora no pasa de unos
  30 cm).
- **Nada se atraviesa**: todas las casas de los dos pueblos (también los laterales y la parte de
  atrás de las de la calle de Vallserena, las de la plaza y la iglesia), las masías, los muros de
  piedra de las viñas, los bancales, la fuente y los bancos de la plaza, la presa y los peñascos
  del congost tienen su planta real como obstáculo (antes las casas eran un círculo o sólo la
  fachada). Las biondas y los muros saben de qué lado viene el coche: si se rodea el final de una
  barrera por el monte, la barrera le para por fuera en vez de "tragárselo" hacia la carretera, y
  el morro ya no se mete en el muro. Se comprobó con más de 100 000 choques (cada 5 m de barrera y
  cada casa, de 30 a 180 km/h, de frente, de lado, marcha atrás y derrapando): ninguno atraviesa
  nada ni se queda metido dentro.
- **Récords**: con la conducción nueva los tiempos son otros, así que récords y fantasmas empiezan
  de cero (los anteriores no se comparan): un tramo con el Rally 2 lleva ahora alrededor de 1:26
  (antes 1:13), y las medallas se recalculan solas (oro ~1:30 en los dos tramos, en seco).

### Notas técnicas

- **Asfalto limpio**: el monte se dibuja con una malla de 6 m y, en los desmontes, sus triángulos
  asomaban por encima de la carretera (manchas de tierra en la calzada). Ahora una franja fina de
  terreno acompaña a la carretera hasta 22 m del eje y la malla general se hunde bajo ella; se
  comprueba cada medio metro del tramo que el terreno queda siempre por debajo del asfalto.
- **Asfalto sin escalones**: en Vallserena, al salir de la calle del pueblo (a 250 m) la carretera
  tenía un escalón de 16 cm que hacía saltar el coche; ahora la transición es suave.
- **Rendimiento (iPad)**: árboles, matas y viñas lejos de la carretera usan modelos más sencillos.
  Riudecanyes bajó de ~447 000 a ~255 000 triángulos de decorado y Vallserena tiene ~237 000; por
  fotograma se dibujan de media ~200 000 y ~165 000 triángulos con unas 185 llamadas de dibujo.

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

Juego no oficial: no está asociado a la organización del rally ni a sus patrocinadores.
Riudecanyes es un lugar real (el trazado es una recreación libre); Vallserena es un pueblo
inventado y su tramo es original.
