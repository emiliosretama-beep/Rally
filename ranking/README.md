# Clasificación online de Born to Rally

El juego guarda los mejores tiempos de todos los jugadores en una base de datos gratuita de
[Supabase](https://supabase.com). Hay una tabla por tramo (TC1–TC11, de ida) y otra para el Rally completo, por temporada.
Cada jugador aparece una sola vez por tabla, con su mejor tiempo, el coche y las condiciones.

Mientras `LB_CFG` (en `index.html`) esté vacío, el juego funciona igual que antes: sin botón de
clasificación y sin conexiones a internet.

## Puesta en marcha (unos 10 minutos)

1. Entra en <https://supabase.com>, pulsa **Start your project** e inicia sesión con GitHub.
2. **New project**: nombre `born-to-rally`, genera una contraseña de base de datos (guárdala, aunque el
   juego no la usa), la región más cercana a tus jugadores y el plan **Free**.
3. Cuando el proyecto esté listo: **SQL Editor** → **New query** → pega todo `ranking/supabase.sql` →
   **Run**. Debe responder *Success*.
4. Pulsa **Connect** (arriba) o ve a **Project Settings → API Keys** y copia:
   - la **Project URL** (`https://xxxxxxxx.supabase.co`);
   - la clave pública: **publishable key** (`sb_publishable_…`) o, en proyectos antiguos, la **anon key**.

   Nunca uses la *secret key* ni la *service_role key*: esas dan acceso total.
5. Pon los dos valores en `index.html`:

   ```js
   const LB_CFG={url:'https://xxxxxxxx.supabase.co',key:'sb_publishable_…'};
   ```

6. Vuelve a subir el zip a itch.io (ver el README principal).

La clave pública puede ir dentro del juego: con ella solo se pueden llamar las tres funciones de
`supabase.sql`. Las tablas no se pueden leer ni modificar directamente.

## Temporada 2 (física nueva, noviembre de 2026)

Con la física nueva los tiempos ya no se comparan con los de antes, así que el juego manda sus tiempos a
tableros nuevos con el prefijo `s2:` (`s2:bosque`, …, `s2:riudecanyes` y `s2:rally`). **Para activarla:**

1. Supabase → **SQL Editor** → **New query** → pega todo `ranking/supabase.sql` → **Run** (*Success*).
   Sólo añade los tableros nuevos y actualiza `rally_submit`; no borra ni cambia ningún tiempo de la
   temporada 1, que se queda guardada en los tableros sin prefijo.
2. Hazlo **antes** de subir la versión nueva a itch.io. Si el juego nuevo sale antes, sus tiempos se
   rechazan (el servidor no conoce los tableros `s2:`) hasta que ejecutes el SQL.

Los límites de la temporada 2 se midieron igual que los de la 1 (bot más rápido × 0,72, en las 16
condiciones). El SQL se probó en un PostgreSQL 16 local: tiempo válido, tiempo imposible, tablero
desconocido, rally de la temporada 2 y rally de la temporada 1.

## Tramos del campeonato: TC7–TC11 (noviembre de 2026)

El juego manda también los tiempos de los cinco tramos del campeonato, desde el juego libre y desde el campeonato:
`s2:montecarlo` (TC7 Col des Lacets), `s2:suecia` (TC8 Tallsjön), `s2:portugal` (TC9 Serra das Fragas),
`s2:finlandia` (TC10 Harjuvaara) y `s2:vallserena` (TC11 Vallserena). El regreso de un tramo no tiene tabla (es otro
recorrido). **Para activarlo:**

1. Supabase → **SQL Editor** → **New query** → pega todo `ranking/supabase.sql` → **Run** (*Success*).
   Sólo añade las cinco tablas nuevas; no borra ni cambia ningún tiempo.
2. Mejor **antes** de subir la versión nueva a itch.io. Si el juego nuevo sale antes no pasa nada grave: en esos cinco
   tramos la tarjeta de meta no enseña el puesto (el servidor aún no conoce sus tablas) y la pestaña sale vacía, hasta
   que ejecutes el SQL. El resto de tramos funciona como siempre.

Límites medidos como los demás (bot más rápido de los 3 coches en todas sus condiciones × 0,72; Montecarlo y Suecia,
sólo invierno). El SQL se probó en un PostgreSQL 16 local encima de la base de antes: el tiempo que ya había se conserva,
los cinco tramos aceptan un tiempo válido, se rechazan un tiempo imposible, puntos de control de menos y un tablero
desconocido, el Rally clásico sigue funcionando y el SQL se puede ejecutar dos veces seguidas.

## Rally de los 5 países y tramos clásicos ocultos (noviembre de 2026)

El juego ya sólo enseña los tramos de los 5 países. Los tramos clásicos (TC1–TC6 de antes) y el Rally clásico (`s2:rally`)
se ocultaron: sus tablas se quedan en el servidor con sus tiempos, pero el juego ya no las usa. El rally que propone el juego
son los 5 países de ida (Col des Lacets, Tallsjön, Serra das Fragas, Harjuvaara y Vallserena) y va a la tabla nueva
`s2:rally2`. **Para activarla**, lo mismo de siempre: pega todo `ranking/supabase.sql` en el SQL Editor y pulsa **Run**.
Añade `s2:rally2` (mínimo: la suma de los mínimos de sus tramos) y enseña a `rally_submit` cuáles son sus 5 tramos; no
borra nada. Probado en PostgreSQL 16 encima de la base de antes: rally válido aceptado; tramo imposible, tiempos que no
suman y total imposible rechazados; el Rally clásico y sus tiempos, intactos.

## Qué comprueba el servidor

- **Tiempo mínimo por tramo**: el piloto automático más rápido (cualquier coche y condición) × 0,72.
  Por debajo de eso se rechaza.
- **Puntos de control**: el juego manda el tiempo de cada punto de control de 40 m. Tienen que estar
  todos, en orden y a una velocidad posible (menos de 240 km/h).
- **Rally**: los cinco tiempos tienen que ser creíbles y sumar el total.
- **Ritmo**: nadie termina dos tramos en menos de 40 s reales, ni dos rallies en menos de lo que dura uno.
- **Nombres**: de 2 a 14 letras, números, espacios o `_ . -`, con un filtro básico de groserías.

Esto frena casi todas las trampas fáciles. En un juego de navegador no se puede impedir al 100 %:
alguien con conocimientos podría fabricar una pasada creíble. Para esos casos queda el borrado a mano.

## Moderación (en el SQL Editor)

```sql
-- ver los 20 mejores de un tramo
select p.name, s.time_ms, s.car, s.cond, s.created_at from rally_scores s
  join rally_players p on p.id = s.player where s.board = 'bosque' order by s.time_ms limit 20;

-- borrar todos los tiempos de un jugador
delete from rally_scores where player in (select id from rally_players where name = 'Tramposo');

-- cambiar el nombre de un jugador
update rally_players set name = 'Piloto' where name = 'NombreFeo';
```

## Notas

- Si cambias la longitud de un tramo o la física de los coches, actualiza `min_ms` y `cp_count` de ese
  tramo en `rally_boards` (están al principio de `supabase.sql`; el número de puntos de control es la
  longitud del tramo en metros ÷ 40, sin decimales).
- Supabase pausa los proyectos gratuitos que pasan una semana sin actividad. Si eso ocurre, el juego
  muestra "Sin conexión con la clasificación" y todo lo demás sigue funcionando. Se reactiva desde el
  panel de Supabase.
- El identificador de cada jugador se guarda en su navegador. Si borra los datos del navegador o
  juega en otro dispositivo, aparece como un jugador nuevo.
