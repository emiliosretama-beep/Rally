# Clasificación online de Born to Rally

El juego guarda los mejores tiempos de todos los jugadores en una base de datos gratuita de
[Supabase](https://supabase.com). Hay una tabla por tramo (TC1–TC5) y otra para el Rally completo.
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
