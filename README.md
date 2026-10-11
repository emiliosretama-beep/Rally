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

**Gráficos**
- Sombras reales del sol: árboles, público, pórticos y coche proyectan sombra sobre la
  carretera (mapa de sombras con filtrado suave que sigue al coche).
- Posprocesado: resplandor en faros, pilotos, sol y relámpagos; viñeta; gradación de color
  según estación, hora y clima; antialiasing MSAA.
- Nubes que se mueven (cielo cubierto con lluvia, despejado en el desierto) y luz del sol
  dispersa en la niebla al mirar hacia él.
- Pintura del coche con brillo y reflejo del cielo; árboles que se mecen con el viento (más
  fuerte con lluvia).
- Opción **Gráficos: Baja / Media / Alta** (Media por defecto en móviles, Alta en ordenador).

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
