# Born to Rally

Juego de rally contra el crono en 3D que se juega en el navegador. Todo está en un solo
archivo, `index.html`: WebGL 2, Web Audio y voz del copiloto con la síntesis de voz del
sistema, sin librerías ni recursos externos (sólo las fuentes de Google Fonts).

- **5 tramos**: Bosque de pinos (grava), Valle helado (nieve), Puerto de montaña (asfalto),
  Dunas rojas (arena) y **Colinas del norte** (grava rápida con muchos saltos, nuevo).
- **Condiciones**: 4 estaciones, día o noche, seco o lluvia/nieve. Cada combinación cambia
  el agarre y el aspecto del tramo.
- **3 coches** (Rally 1, Rally 2 y Lino 206) y 4 decoraciones.
- **Modos**: tramo suelto o **Rally completo** (todos los tramos seguidos, nuevo).
- Copiloto con notas de ritmo en pantalla y por voz, coche fantasma, daños, medallas.

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
| En meta: repetir / siguiente / menú | R / N / Esc | A, B | Botones |

En los menús se navega con las flechas o la cruceta; Enter o A acepta y Esc o B vuelve atrás.

## Novedades de esta versión

**Contenido**
- Tramo 5, *Colinas del norte*: grava muy rápida entre abedules, con lomas y saltos. Modelo
  nuevo de abedul y aspecto propio en las cuatro estaciones.
- Modo *Rally completo*: los cinco tramos seguidos con el mismo coche y condiciones, sin
  repetir. Clasificación en cada parada, tiempo total, medallas de rally y récord guardado
  por estación, hora, clima y coche.

**Final de tramo como en un rally de verdad**
- 100 m antes de la meta, carteles amarillos con reloj; en la meta lanzada, el rojo con
  reloj y el de cuadros a los dos lados. La carretera sigue 240 m más y el coche rueda solo,
  frenando suave, hasta el **control STOP** 200 m después: cartel rojo de STOP, carpa azul de
  cronometraje (mesa, portátil, silla y banderín) en el lado más llano y dos comisarios con
  chaleco, uno que hace señas para que frenes y otro con la carpeta que se gira hacia el coche.
- Cambia con el tramo: nieve sobre la lona en invierno y en el Valle helado, sacos de arena
  en las patas en las Dunas rojas; de noche la carpa se ilumina por dentro y los carteles
  reflejan. Carpa, postes y comisarios son sólidos.
- La tarjeta de meta sale cuando el coche se ha parado en el STOP (unos 9 s). El tramo
  cronometrado, el decorado y los tiempos no cambian, así que los tiempos de la
  clasificación online siguen siendo comparables.

**Controles**
- Soporte de mando (Xbox, PlayStation y compatibles): dirección y pedales analógicos,
  vibración en golpes y aterrizajes y navegación completa por los menús.
- Cambio manual opcional (Q/E, LB/RB o botones táctiles).
- Navegación con flechas por todos los menús y las tarjetas de pausa y meta, con el foco
  bien visible; atajos en la meta.
- Los controles táctiles sólo aparecen en pantallas táctiles.

**Interfaz de carrera**
- Minimapa que gira con el coche: carretera por delante, parciales, saltos, meta y fantasma.
- Barra de revoluciones que parpadea en el corte de encendido.
- Diferencia en vivo con tu mejor tiempo, cada 40 m.
- Cartel de presentación del tramo durante la cuenta atrás.
- En la meta: tiempos por sector comparados con tu mejor pasada, y velocidad media y máxima.
  La tarjeta usa dos columnas en pantallas apaisadas para que todo quepa.

**Coches rediseñados**
- Carrocerías con forma de verdad (por secciones) en lugar de cajas, pasos de rueda con
  aletas ensanchadas, cristales oscuros con pilares negros, retrovisores y llantas de radios.
- **Rally 1** (estilo WRC actual): muy ancho, alerón alto con soportes de cuello de cisne,
  splitter con aletas, rejillas en capó y aletas, toma de techo y difusor; llantas doradas.
- **Rally 2**: hatchback con aletas ensanchadas, alerón de techo y ala en el portón, barra de
  cuatro faros, faldillas y llantas blancas.
- **Lino 206** (inspirado en el Peugeot 206): compacto y redondeado, capó inclinado, faros
  grandes que suben por la aleta, boca de rejilla ancha, pilotos verticales y alerón pequeño.

**Gráficos**
- Sombras reales del sol: árboles, público, pórticos y coche proyectan sombra sobre la
  carretera (mapa de sombras con filtrado suave que sigue al coche).
- Posprocesado: resplandor en faros, pilotos, sol y relámpagos; viñeta; gradación de color
  según estación, hora y clima; antialiasing MSAA.
- Nubes que se mueven (cielo cubierto con lluvia, despejado en el desierto) y luz del sol
  dispersa en la niebla al mirar hacia él.
- Pintura del coche con brillo y reflejo del cielo; árboles que se mecen con el viento (más
  fuerte con lluvia).
- Opción **Gráficos: Baja / Media / Alta / Ultra** (Media por defecto en móviles, Alta en ordenador).
- Sombras sin dientes ni manchas: filtrado suave propio que se ve igual en cualquier GPU (también
  en tabletas y móviles que no suavizan el mapa de sombras), sombras algo más claras y sin rayas
  sobre el coche.
- En calidad Baja las sombras de árboles y rocas siguen el terreno, tienen borde difuso, salen
  desde el tronco según el sol de cada estación y se aclaran con lluvia o de noche.
- El asfalto en otoño ya no tiene óvalos negros que parecían sombras: ahora son corros de hojas
  mojadas.
- Corregido: las sombras lejanas salían en sitios sin nada (los árboles se proyectaban con la
  posición del coche) y los árboles a media distancia se quedaban sin sombra.

**Sonido**
- Motor nuevo (armónicos de 4 cilindros, saturación y filtro resonante), turbo y válvula de
  descarga, corte al cambiar de marcha, petardeo con llamaradas en el escape, piedras bajo
  las ruedas, viento y chirrido de neumáticos en asfalto.
- Volumen general y volumen de la voz del copiloto; sonidos suaves en los menús.

**Correcciones y rendimiento**
- Los récords ya no se pierden cuando el almacenamiento del navegador se llena: se borran
  los fantasmas más antiguos y se conservan todos los tiempos.
- Mantener pulsada la R ya no suma +5 s en cada repetición de la tecla.
- Menos trabajo por fotograma (partículas y HUD) y resolución dinámica que también vuelve a
  subir cuando el equipo va sobrado.
- La cámara de persecución se abre un poco en los derrapes para que se vea el ángulo del coche.
- Botón y tecla de pantalla completa, icono y metadatos para móvil, menú principal ajustado
  a móviles en horizontal.

## Publicar en itch.io

1. Comprime `index.html` en un zip (el archivo debe quedar en la raíz del zip):
   `zip -j Born_to_Rally_itch.zip index.html`
2. En itch.io: *Kind of project* → **HTML**, sube el zip y marca
   **This file will be played in the browser**.
3. Recomendado en *Embed options*: tamaño 1280 × 720, activar **Mobile friendly** (orientación
   automática o apaisada) y **Fullscreen button**.

Los récords y las opciones se guardan en el `localStorage` del navegador de cada jugador.
