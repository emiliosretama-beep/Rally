-- Born to Rally · clasificación online (Supabase / PostgreSQL)
-- Pega todo este archivo en Supabase → SQL Editor → Run. Se puede volver a ejecutar sin perder datos.
--
-- El juego solo llama a tres funciones (rally_submit, rally_top, rally_rename). Las tablas no se pueden
-- leer ni escribir directamente con la clave pública: toda la validación se hace aquí, en el servidor.

create table if not exists public.rally_boards (
  board    text primary key,          -- id del tramo ('bosque', ...) o 'rally'
  min_ms   int  not null,             -- tiempo mínimo creíble (por debajo se rechaza)
  cp_count int                        -- puntos de control de 40 m que tiene el tramo (null en 'rally')
);

-- Límites medidos con el piloto automático del juego (el más rápido de todos los coches y condiciones,
-- ×0,72 de margen). Si cambias la longitud de un tramo, actualiza su fila.
insert into public.rally_boards (board, min_ms, cp_count) values
  ('bosque',   46600, 48),
  ('nieve',    54300, 50),
  ('asfalto',  51000, 53),
  ('desierto', 58700, 58),
  ('colinas',  47200, 52),
  ('rally',   257800, null)
on conflict (board) do update set min_ms = excluded.min_ms, cp_count = excluded.cp_count;

create table if not exists public.rally_players (
  id            uuid primary key,       -- secreto: solo lo conoce el navegador del jugador
  name          text not null,
  created_at    timestamptz not null default now(),
  last_stage_at timestamptz,
  last_rally_at timestamptz
);

create table if not exists public.rally_scores (
  board      text not null references public.rally_boards(board),
  player     uuid not null references public.rally_players(id) on delete cascade,
  time_ms    int  not null,
  car        text not null,
  cond       text not null,
  created_at timestamptz not null default now(),
  primary key (board, player)
);
create index if not exists rally_scores_rank on public.rally_scores (board, time_ms, created_at);

-- Sin políticas: con la clave pública nadie puede tocar las tablas directamente
alter table public.rally_boards  enable row level security;
alter table public.rally_players enable row level security;
alter table public.rally_scores  enable row level security;
revoke all on public.rally_boards, public.rally_players, public.rally_scores from anon, authenticated;

-- Nombre limpio o null si no es válido
create or replace function public.rally_clean_name(p_name text) returns text
language plpgsql immutable set search_path = public as $$
declare n text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
        l text;
begin
  if char_length(n) < 2 or char_length(n) > 14 then return null; end if;
  if n !~ '^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ _.\-]+$' then return null; end if;
  l := translate(lower(n), 'áéíóúü0134$5@ _.-', 'aeiouuoleassa');
  if l ~ '(puta|puto|pendej|verga|mierd|culer|marica|joto|chinga|cabron|polla|coño|zorra|nazi|hitler|fuck|shit|bitch|cunt|nigg|fag|dick|pussy|whore|rape|porn)'
    then return null; end if;
  return n;
end $$;

create or replace function public.rally_submit(
  p_player uuid, p_name text, p_board text, p_time_ms int, p_car text, p_cond text, p_cp int[]
) returns json
language plpgsql security definer set search_path = public as $$
declare b public.rally_boards; pl public.rally_players; n text; k int; prev int; improved boolean := false;
        best int; rk int; tot int;
begin
  select * into b from public.rally_boards where board = p_board;
  if not found then return json_build_object('error', 'board'); end if;
  if p_player is null or p_time_ms is null or p_time_ms < b.min_ms or p_time_ms > 3600000 then
    return json_build_object('error', 'time'); end if;
  if p_car is null or p_car not in ('r1', 'r2', 'lino') then return json_build_object('error', 'car'); end if;
  if p_cond is null or p_cond !~ '^[a-z0-9:\-]{1,40}$' then return json_build_object('error', 'cond'); end if;
  n := public.rally_clean_name(p_name);
  if n is null then return json_build_object('error', 'name'); end if;

  -- Tramo: un tiempo por cada punto de control de 40 m, en orden, a velocidad posible (< 240 km/h)
  if b.cp_count is not null then
    if p_cp is null or abs(coalesce(array_length(p_cp, 1), 0) - b.cp_count) > 1 then
      return json_build_object('error', 'cp'); end if;
    prev := 0;
    for k in 1 .. array_length(p_cp, 1) loop
      if p_cp[k] is null or p_cp[k] - prev < 600 then return json_build_object('error', 'cp'); end if;
      prev := p_cp[k];
    end loop;
    if p_time_ms < prev then return json_build_object('error', 'cp'); end if;
  else
  -- Rally: los tiempos de cada tramo, cada uno creíble, y que sumen el total
    if p_cp is null or coalesce(array_length(p_cp, 1), 0) <> 5 then return json_build_object('error', 'cp'); end if;
    tot := 0;
    for k in 1 .. 5 loop
      if p_cp[k] is null or p_cp[k] < (select min_ms from public.rally_boards
          where board = (array['bosque','nieve','asfalto','desierto','colinas'])[k]) then
        return json_build_object('error', 'cp'); end if;
      tot := tot + p_cp[k];
    end loop;
    if abs(tot - p_time_ms) > 10 then return json_build_object('error', 'cp'); end if;
  end if;

  -- Ritmo: nadie termina dos tramos (o dos rallies) en menos tiempo del que dura uno
  -- (el tramo final y el total del rally llegan a la vez: el alta del jugador no debe chocar)
  insert into public.rally_players (id, name) values (p_player, n) on conflict (id) do nothing;
  select * into pl from public.rally_players where id = p_player for update;
  if b.cp_count is not null and pl.last_stage_at > now() - make_interval(secs => 40) then
    return json_build_object('error', 'rate'); end if;
  if b.cp_count is null and pl.last_rally_at > now() - make_interval(secs => b.min_ms / 1000 * 0.9) then
    return json_build_object('error', 'rate'); end if;
  update public.rally_players set name = n,
    last_stage_at = case when b.cp_count is not null then now() else last_stage_at end,
    last_rally_at = case when b.cp_count is null then now() else last_rally_at end
    where id = p_player;

  -- Solo se guarda el mejor tiempo de cada jugador en cada tabla
  select time_ms into best from public.rally_scores where board = p_board and player = p_player;
  if best is null or p_time_ms < best then
    insert into public.rally_scores (board, player, time_ms, car, cond) values (p_board, p_player, p_time_ms, p_car, p_cond)
    on conflict (board, player) do update set time_ms = excluded.time_ms, car = excluded.car, cond = excluded.cond, created_at = now();
    best := p_time_ms; improved := true;
  end if;

  select count(*) + 1 into rk from public.rally_scores s
    where s.board = p_board and (s.time_ms < best or (s.time_ms = best and s.created_at <
      (select created_at from public.rally_scores where board = p_board and player = p_player)));
  select count(*) into tot from public.rally_scores where board = p_board;
  return json_build_object('rank', rk, 'total', tot, 'best_ms', best, 'improved', improved, 'name', n);
end $$;

-- Top N de una tabla y la posición del jugador (sin exponer los id de los demás)
create or replace function public.rally_top(p_board text, p_player uuid, p_limit int default 10) returns json
language sql stable security definer set search_path = public as $$
  with r as (
    select row_number() over (order by s.time_ms, s.created_at) as rank, p.name, s.time_ms, s.car, s.cond, s.player = p_player as me
    from public.rally_scores s join public.rally_players p on p.id = s.player where s.board = p_board)
  select json_build_object(
    'top',   coalesce((select json_agg(json_build_object('rank', rank, 'name', name, 'time_ms', time_ms, 'car', car, 'cond', cond, 'me', me) order by rank)
                       from r where rank <= least(greatest(coalesce(p_limit, 10), 1), 50)), '[]'::json),
    'me',    (select json_build_object('rank', rank, 'name', name, 'time_ms', time_ms, 'car', car, 'cond', cond, 'me', true) from r where me),
    'total', (select count(*) from r));
$$;

create or replace function public.rally_rename(p_player uuid, p_name text) returns json
language plpgsql security definer set search_path = public as $$
declare n text := public.rally_clean_name(p_name);
begin
  if n is null then return json_build_object('error', 'name'); end if;
  update public.rally_players set name = n where id = p_player;
  return json_build_object('name', n);
end $$;

revoke all on function public.rally_submit(uuid, text, text, int, text, text, int[]) from public;
revoke all on function public.rally_top(text, uuid, int) from public;
revoke all on function public.rally_rename(uuid, text) from public;
revoke all on function public.rally_clean_name(text) from public;
grant execute on function public.rally_submit(uuid, text, text, int, text, text, int[]) to anon, authenticated;
grant execute on function public.rally_top(text, uuid, int) to anon, authenticated;
grant execute on function public.rally_rename(uuid, text) to anon, authenticated;
