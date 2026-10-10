-- SUAN Academy · Franjas horarias bloqueadas
-- Una franja bloqueada impide programar bloques en ese rango. Puede ser recurrente (día de la semana)
-- o puntual (una fecha), y aplicar a todas las canchas o a una sola.

create table franjas_bloqueadas (
  id serial primary key,
  cancha_id int references canchas(id) on delete cascade,  -- null = todas las canchas
  dia_semana smallint check (dia_semana between 0 and 6),  -- recurrente; null si es por fecha
  fecha date,                                              -- puntual; null si es recurrente
  hora_inicio time not null,
  hora_fin time not null,
  motivo text not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  creado_por uuid references perfiles(id),
  check (hora_fin > hora_inicio),
  check ((dia_semana is not null and fecha is null) or (dia_semana is null and fecha is not null))
);
create index franjas_busqueda on franjas_bloqueadas (activo, cancha_id, dia_semana, fecha);

alter table franjas_bloqueadas enable row level security;
create policy franjas_admin on franjas_bloqueadas for all using (es_admin()) with check (es_admin());
create policy franjas_ver on franjas_bloqueadas for select to authenticated using (true);

-- ¿Está disponible una cancha en un rango? Verifica horario de apertura y franjas bloqueadas.
-- Devuelve null si está disponible, o el motivo por el que no.
create or replace function public.motivo_no_disponible(p_cancha int, p_fecha date, p_dia smallint, p_inicio time, p_fin time)
returns text language plpgsql stable as $$
declare
  v_dia smallint := coalesce(p_dia, extract(dow from p_fecha)::smallint);
  v_motivo text;
begin
  -- Horario de apertura de la cancha ese día
  if not exists (
    select 1 from cancha_horarios h
    where h.cancha_id = p_cancha and h.dia_semana = v_dia
      and h.hora_inicio <= p_inicio and h.hora_fin >= p_fin
  ) then
    return 'La cancha no abre en ese horario';
  end if;

  -- Franjas bloqueadas (recurrentes por día o puntuales por fecha)
  select f.motivo into v_motivo
  from franjas_bloqueadas f
  where f.activo
    and (f.cancha_id is null or f.cancha_id = p_cancha)
    and ((f.dia_semana is not null and f.dia_semana = v_dia)
         or (f.fecha is not null and p_fecha is not null and f.fecha = p_fecha))
    and f.hora_inicio < p_fin and f.hora_fin > p_inicio
  limit 1;
  if v_motivo is not null then
    return 'Franja bloqueada: ' || v_motivo;
  end if;
  return null;
end $$;

-- Validación al crear o mover bloques (plantilla y publicados)
create or replace function public.validar_plantilla_bloque() returns trigger language plpgsql as $$
declare m text;
begin
  m := motivo_no_disponible(new.cancha_id, null, new.dia_semana, new.hora_inicio, new.hora_fin);
  if m is not null then raise exception '%', m using errcode = 'check_violation'; end if;
  return new;
end $$;
create trigger plantilla_bloques_disponible before insert or update of cancha_id, dia_semana, hora_inicio, hora_fin on plantilla_bloques
  for each row execute procedure public.validar_plantilla_bloque();

create or replace function public.validar_bloque() returns trigger language plpgsql as $$
declare m text;
begin
  if new.estado = 'publicado' then
    m := motivo_no_disponible(new.cancha_id, new.fecha, null, new.hora_inicio, new.hora_fin);
    if m is not null then raise exception '%', m using errcode = 'check_violation'; end if;
  end if;
  return new;
end $$;
create trigger bloques_disponible before insert or update of cancha_id, fecha, hora_inicio, hora_fin, estado on bloques
  for each row execute procedure public.validar_bloque();

-- Franjas libres de una cancha en una fecha: apertura menos bloqueos, en tramos de N minutos.
-- Es lo que usa el selector de horas: solo ofrece inicios que caben completos.
create or replace function public.horas_disponibles(p_cancha int, p_fecha date, p_duracion_min int default null)
returns table (hora_inicio time, hora_fin time) language sql stable as $$
  with dur as (select coalesce(p_duracion_min, coalesce(param('bloque_duracion_min'),'60')::int) as m),
  apertura as (
    select h.hora_inicio, h.hora_fin from cancha_horarios h
    where h.cancha_id = p_cancha and h.dia_semana = extract(dow from p_fecha)
  ),
  inicios as (
    select (a.hora_inicio + (g * interval '30 minutes'))::time as ini, a.hora_fin
    from apertura a, dur, generate_series(0, 48) g
    where a.hora_inicio + (g * interval '30 minutes') + (dur.m * interval '1 minute') <= a.hora_fin
  )
  select i.ini, (i.ini + (dur.m * interval '1 minute'))::time
  from inicios i, dur
  where motivo_no_disponible(p_cancha, p_fecha, null, i.ini, (i.ini + (dur.m * interval '1 minute'))::time) is null
  order by i.ini
$$;
