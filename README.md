# Born to Rally

Juego de rally contra el crono en 3D que se juega en el navegador. Todo está en un solo
archivo, `index.html`: WebGL 2, Web Audio y voz del copiloto con la síntesis de voz del
sistema, sin librerías ni recursos externos (sólo las fuentes de Google Fonts).

- **6 tramos en modo libre**: Bosque de pinos (grava), Valle helado (nieve), Puerto de montaña (asfalto),
  Dunas rojas (arena), Colinas del norte (grava rápida con muchos saltos) y **Riudecanyes** (asfalto de
  Cataluña, hecho a mano).
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

**Dirección tocada, más suave y con aviso (DEV)**
- Antes, con cualquier golpe de lado el coche ya tiraba hacia ese lado (con un 10 % de daño se iba 0,75 m en 2 s) y no se
  sabía por qué. Ahora con un golpe leve va recto; sólo cuando un lado tiene más de un 20 % de daño que el otro el coche
  tira hacia el lado dañado (como una rueda torcida), cada vez más, y sale el aviso *Dirección tocada: el coche tira a la
  derecha* (o a la izquierda). Con los daños apagados en Opciones no pasa nunca.

**Podio en el campeonato (DEV)**
- Al terminar cada país sale el **podio** antes de la tarjeta de meta: la cámara se pone delante de tu coche y abajo aparece
  tu puesto (con copa de oro, plata o bronce si quedas entre los 3) y la tabla de los 3 primeros con su bandera, piloto,
  copiloto, tiempo (o la diferencia con el primero) y puntos. Si no estás entre los 3, tu fila sale debajo.
- Al acabar el campeonato sale un segundo podio con la **clasificación final** (tiempo total y puntos) y "¡Campeón!" si ganas.
- *Continuar* (o Enter, N, Esc, A o B del mando) pasa a la tarjeta de siempre. Los rivales tienen ahora copiloto (inventado).
- El coche se ve entero en el podio aunque conduzcas con la cámara de cabina o la de capó (antes sólo salían la cabina o nada).

**Finlandia: Harjuvaara (DEV, campeonato)** — con ella el campeonato tiene sus 5 países hechos a mano
- Cuarto país de la fase 3 (2 km, en verano), con el carácter de los tramos de Jämsä de Dirt Rally 2.0: **grava muy rápida
  y estrecha** (el piloto automático va a 122 km/h de media, el tramo más rápido del juego), rasantes ciegas y **3 saltos**
  (el grande, en los campos, con público).
- Bosque de pinos y abedules, la **orilla de un lago de verdad** (con agua; si acabas dentro, vuelves a la carretera con +5 s),
  una **granja roja** en un cruce cerrado a la derecha y **campos con pacas de silo** blancas y verdes.
- Oro con el Rally 2: 1:01.

**Portugal: Serra das Fragas (DEV, campeonato)**
- Tercer país de la fase 3 (2 km, en primavera). Dirt Rally 2.0 no tiene rally en Portugal (sólo el rallycross de Montalegre),
  así que se inspira en el **Rally de Portugal real** con el manejo en grava de Dirt Rally.
- **Grava suelta fuera de la trazada**: el centro está limpio y agarra; hacia el borde hay piedra suelta y se pierde hasta un 20 %
  de agarre. Piedras arrastradas al cortar las curvas lentas y mucho polvo.
- Sale de una **aldea de granito** (casas de piedra gris y encaladas con tejas naranjas), sube entre **eucaliptos** con una
  horquilla, cruza la cima entre tojo amarillo, bolos de granito y **molinos de viento** (las palas giran) y llega al
  **salto grande** (el copiloto avisa *¡Salto grande!*: más de un segundo en el aire) con la ladera llena de público.
  Baja rápido entre pinos con otra horquilla y acaba entre **muros de granito**, sin biondas.
- Oro con el Rally 2: 1:13,5.

**Suecia: Tallsjön (DEV, campeonato)**
- Segundo país de la fase 3 (2 km, sólo en invierno), con el carácter de los tramos de Värmland de Dirt Rally 2.0: **nieve
  compacta y muy rápida** (unos 100 km/h de media), bosque cerrado de pinos nevados y abedules sin hojas, sol muy bajo y dorado.
- **Carretera angosta** (5,8 m, la más estrecha del juego): hay poco margen entre los bancos y cuesta más trazar limpio.
- **Bancos de nieve** a los dos lados, de más de un metro: el coche se puede apoyar en ellos para sostener una curva; la nieve lo
  endereza y lo devuelve a la carretera sin rebote ni daño (sólo un golpe fortísimo cuenta como golpe).
- Una **granja de madera roja** (casas con esquinas blancas y tejados nevados) en un cruce en ángulo recto, **dos saltos**
  con público y el **cruce de un lago helado** (bancos más bajos, pinos pequeños marcando el camino y algo de hielo bajo la nieve).
- Oro con el Rally 2: 1:12.

**Montecarlo: Col des Lacets (DEV, campeonato)**
- Primer país construido de la fase 3 (2,1 km, sólo en invierno, de noche en el campeonato). Trazado propio con el carácter
  del Col de Turini: salida en un pueblo de piedra de los Alpes Marítimos (tejados con nieve), **seis horquillas**
  (cinco encadenadas en la subida por la ladera), pretiles de piedra sobre el barranco, un desfiladero en sombra con
  peñascos de caliza, el col nevado con mucho público y una bajada rápida entre abetos.
- **Placas de hielo**: cinco, en la sombra del desfiladero, en el col y antes de la horquilla de la bajada. Sobre el hielo el
  coche agarra la mitad (frenada, tracción y de lado). Se ven brillar sobre el asfalto (de noche, con los faros) y el
  copiloto las avisa: «¡Ojo! Izquierda 2 con hielo». El piloto automático levanta el pie antes, así que las medallas las tienen
  en cuenta.
- **Superficie mezclada, como el Montecarlo de Dirt Rally 2.0**: en el mismo tramo hay asfalto seco, **asfalto mojado** por el agua
  de la nieve (agarra un 12 % menos), **placas de nieve** con roderas (un 30 % menos; el copiloto canta «con nieve») y el hielo.
- Postes de nieve rojos y blancos en los arcenes, paneles de flechas rojas por fuera de las horquillas y las curvas lentas,
  pretiles y muros de piedra gris, nieve apartada en los arcenes, rocas con nieve, montañas nevadas al fondo y la bandera de
  Mónaco en el control STOP. Oro con el Rally 2: 1:36.

**Modo Campeonato (DEV, fase 2)**
- Nuevo botón *Campeonato* en el menú: 5 países en el orden del calendario real (Montecarlo → Suecia →
  Portugal → Finlandia → España), un tramo cada uno con condiciones fijas, sin repetir.
- 9 rivales inventados con su ritmo y su superficie favorita (a veces se equivocan). Sus tiempos salen del
  mismo cálculo que las medallas, con el coche elegido: con un tiempo de oro se pelea el primer puesto.
- Puntos 25-18-15-12-10-8-6-4-2-1 por país, clasificación general y campeón al final.
- Se guarda al terminar cada país: puedes salir (*Guardar y salir*) y seguir otro día. Si abandonas a
  mitad de un tramo, al volver se corre otra vez ese país.
- Las condiciones de cada país no tocan las que tienes elegidas en el modo libre.
- Los 5 países son definitivos: Montecarlo (Col des Lacets), Suecia (Tallsjön), Portugal (Serra das Fragas), Finlandia
  (Harjuvaara) y España (Vallserena).
- Los tramos del campeonato no tienen tabla en la clasificación online, así que sus tiempos no se envían.
- Arreglo: el botón *Rally completo* del menú no hacía nada desde que se unió Costa Daurada. Las pruebas
  automáticas ahora tocan los botones del menú de verdad.

**Un solo motor: Born to Rally + Costa Daurada (DEV)**
- El juego incluye ahora todo lo de *Born to Rally: Costa Daurada*: tramos hechos a mano con perfil de
  alturas, pueblos, muros, viñas, olivos, el pantano, la riera con su puente y colisiones con todo lo sólido.
- **TC6 Riudecanyes** (asfalto, 2,1 km) se suma al modo libre. **Vallserena** queda reservado para el
  campeonato (España), que llega en la siguiente fase.
- **Física nueva en todos los tramos** (la de Costa Daurada): frenada, dirección y freno de mano más
  realistas, Rally 1 y Rally 2 4x4 y Lino de tracción delantera. Ajustada también para tierra, nieve y arena:
  allí se frena casi con el mismo agarre con el que se gira y el volante tiene más ángulo a alta velocidad.
  Los récords locales empiezan de cero (`best:v3`) y la clasificación abre la **Temporada 2**
  (ver `ranking/README.md`: hay que ejecutar el SQL nuevo en Supabase).
- El piloto automático levanta el gas al derrapar o al subvirar, como un piloto: las medallas de cada coche
  salen de una conducción coherente en todas las superficies.

**Estabilidad y equilibrio (DEV)**
- Medallas por coche: los tiempos de oro, plata y bronce se calculan con el coche elegido
  (antes siempre con el Rally 2, así que el Rally 1 sacaba oro sobrado y el Lino casi nunca).
- Si el iPhone o el iPad liberan la GPU, el juego ya no se congela: avisa, se recarga solo al
  volver el 3D (con botón *Recargar* si tarda) y conserva ajustes y récords.
- Sólo el mundo del tramo actual vive en la GPU (antes se quedaban los 5 cargados).
- Pruebas automáticas: `node test/rally.test.js` (ver más abajo).


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

## Pruebas automáticas

`node test/rally.test.js` abre el juego en Chromium sin pantalla (Playwright) y comprueba:
arranque sin errores, medallas ordenadas por coche, que el piloto automático termina los
5 tramos con los 3 coches dentro del bronce (cuenta atrás, meta lanzada y tarjeta de meta
incluidas), que sólo hay un mundo en la GPU, una carrera dibujada y la recuperación tras
perder el contexto 3D. Bloquea Supabase, así que no toca la clasificación real. Las capturas
quedan en `test/shots/`.
