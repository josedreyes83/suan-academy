-- SUAN Academy · Publicación semanal e inscripciones del alumno

insert into parametros (clave, valor, descripcion) values
  ('requiere_pago_para_inscribir','false','Exige vigencia activa (pago registrado) para seleccionar clases (true/false)')
on conflict (clave) do nothing;

-- Horas disponibles para la plantilla (por día de la semana, sin fecha): apertura menos franjas recurrentes
create or replace function public.horas_disponibles_dia(p_cancha int, p_dia smallint, p_duracion_min int default null)
returns table (hora_inicio time, hora_fin time) language sql stable as $$
  with dur as (select coalesce(p_duracion_min, coalesce(param('bloque_duracion_min'),'60')::int) as m),
  apertura as (
    select (date '2000-01-01' + h.hora_inicio) as abre, (date '2000-01-01' + h.hora_fin) as cierra
    from cancha_horarios h where h.cancha_id = p_cancha and h.dia_semana = p_dia
  ),
  inicios as (
    select a.abre + (g * interval '30 minutes') as ini, a.abre + (g * interval '30 minutes') + (dur.m * interval '1 minute') as fin
    from apertura a, dur, generate_series(0, 47) g
    where a.abre + (g * interval '30 minutes') + (dur.m * interval '1 minute') <= a.cierra
  )
  select i.ini::time, i.fin::time from inicios i
  where motivo_no_disponible(p_cancha, null, p_dia, i.ini::time, i.fin::time) is null
  order by i.ini
$$;

-- Publicar una semana a partir de la plantilla. p_lunes = lunes de la semana a publicar.
create or replace function public.publicar_semana(p_lunes date)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  r record; v_fecha date; v_creados int := 0; v_omitidos int := 0; v_errores jsonb := '[]'::jsonb;
begin
  if not es_admin() then raise exception 'Solo el administrador puede publicar.' using errcode = '42501'; end if;
  if extract(dow from p_lunes) <> 1 then raise exception 'La fecha debe ser un lunes.' using errcode = 'P0001'; end if;
  for r in select p.*, c.nombre as cancha from plantilla_bloques p join canchas c on c.id = p.cancha_id
           where p.activo and c.activa order by p.dia_semana, p.hora_inicio loop
    v_fecha := p_lunes + ((r.dia_semana + 6) % 7);
    if exists (select 1 from bloques b where b.plantilla_id = r.id and b.fecha = v_fecha) then
      v_omitidos := v_omitidos + 1; continue;
    end if;
    begin
      insert into bloques (fecha, cancha_id, hora_inicio, hora_fin, nivel_id, tipo, entrenador_id, cupo, plantilla_id)
      values (v_fecha, r.cancha_id, r.hora_inicio, r.hora_fin, r.nivel_id, r.tipo, r.entrenador_id, r.cupo, r.id);
      v_creados := v_creados + 1;
    exception when others then
      v_errores := v_errores || jsonb_build_object('fecha', v_fecha, 'cancha', r.cancha, 'hora', r.hora_inicio::text, 'motivo', sqlerrm);
    end;
  end loop;
  return jsonb_build_object('creados', v_creados, 'omitidos', v_omitidos, 'errores', v_errores);
end $$;

-- Alumno del usuario actual
create or replace function public.alumno_actual() returns uuid language sql stable security definer set search_path = public as $$
  select id from alumnos where perfil_id = auth.uid() and estado_registro = 'aprobado' limit 1
$$;

-- Inscribirse a un bloque (selección de clase)
create or replace function public.inscribir(p_bloque uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_alumno uuid := alumno_actual();
  b bloques%rowtype; a alumnos%rowtype;
  v_inscritos int; v_pago uuid; v_tope int; v_semana int; v_id uuid; v_requiere boolean;
begin
  if v_alumno is null then raise exception 'Tu cuenta no está vinculada a un alumno aprobado.' using errcode = 'P0001'; end if;
  select * into a from alumnos where id = v_alumno;
  select * into b from bloques where id = p_bloque;
  if not found or b.estado <> 'publicado' then raise exception 'Esta clase no está disponible.' using errcode = 'P0001'; end if;
  if (b.fecha + b.hora_inicio) < now() then raise exception 'Esta clase ya pasó.' using errcode = 'P0001'; end if;
  if b.nivel_id <> a.nivel_id then raise exception 'Esta clase no es de tu nivel.' using errcode = 'P0001'; end if;
  if exists (select 1 from inscripciones i where i.alumno_id = v_alumno and i.bloque_id = p_bloque and i.estado = 'inscrito') then
    raise exception 'Ya estás inscrito en esta clase.' using errcode = 'P0001';
  end if;
  select count(*) into v_inscritos from inscripciones i where i.bloque_id = p_bloque and i.estado = 'inscrito';
  if v_inscritos >= b.cupo then raise exception 'Esta clase ya no tiene cupo.' using errcode = 'P0001'; end if;

  v_requiere := coalesce(param('requiere_pago_para_inscribir'),'false') = 'true';
  -- Vigencia aplicable al tipo de clase
  select v.pago_id into v_pago from v_vigencias v
  where v.alumno_id = v_alumno and v.clase = b.tipo and v.estado in ('al_dia','por_vencer')
    and v.vigencia_inicio <= b.fecha and v.vigencia_fin >= b.fecha
  order by v.vigencia_fin limit 1;
  if v_requiere and v_pago is null then
    raise exception 'Activa tu plan para seleccionar clases: no tienes vigencia para clases %.', b.tipo using errcode = 'P0001';
  end if;

  if b.tipo = 'grupal' then
    v_tope := coalesce(param('tope_grupales_semana'),'0')::int;
    if v_tope > 0 then
      select count(*) into v_semana from inscripciones i join bloques x on x.id = i.bloque_id
      where i.alumno_id = v_alumno and i.estado = 'inscrito' and x.tipo = 'grupal'
        and date_trunc('week', x.fecha) = date_trunc('week', b.fecha);
      if v_semana >= v_tope then raise exception 'Ya tienes % clases grupales esta semana.', v_tope using errcode = 'P0001'; end if;
    end if;
  end if;

  insert into inscripciones (alumno_id, bloque_id, pago_id, sesion_descontada)
  values (v_alumno, p_bloque, v_pago, false) returning id into v_id;

  -- Paquete personalizado: descuenta una sesión
  if b.tipo = 'personalizada' and v_pago is not null then
    update pagos set sesiones_usadas = sesiones_usadas + 1 where id = v_pago and sesiones_totales is not null;
    update inscripciones set sesion_descontada = true where id = v_id and exists (select 1 from pagos where id = v_pago and sesiones_totales is not null);
  end if;
  return v_id;
end $$;

-- Cancelar una inscripción propia
create or replace function public.cancelar_inscripcion(p_insc uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_alumno uuid := alumno_actual(); i inscripciones%rowtype; b bloques%rowtype; v_horas int;
begin
  select * into i from inscripciones where id = p_insc and alumno_id = v_alumno and estado = 'inscrito';
  if not found then raise exception 'Inscripción no encontrada.' using errcode = 'P0001'; end if;
  select * into b from bloques where id = i.bloque_id;
  if (b.fecha + b.hora_inicio) < now() then raise exception 'Esta clase ya pasó; no se puede cancelar.' using errcode = 'P0001'; end if;
  v_horas := coalesce(param('cancelacion_horas'),'12')::int;
  update inscripciones set estado = 'cancelado_alumno', cancelado_en = now() where id = p_insc;
  if i.sesion_descontada and (b.fecha + b.hora_inicio) - now() >= (v_horas * interval '1 hour') then
    update pagos set sesiones_usadas = greatest(sesiones_usadas - 1, 0) where id = i.pago_id;
    update inscripciones set sesion_descontada = false, motivo = 'Sesión devuelta: canceló con anticipación' where id = p_insc;
  elsif i.sesion_descontada then
    update inscripciones set motivo = format('Sesión descontada: canceló con menos de %s horas', v_horas) where id = p_insc;
  end if;
end $$;

grant execute on function public.publicar_semana(date) to authenticated;
grant execute on function public.inscribir(uuid) to authenticated;
grant execute on function public.cancelar_inscripcion(uuid) to authenticated;
grant execute on function public.alumno_actual() to authenticated;
grant execute on function public.horas_disponibles_dia(int, smallint, int) to authenticated;
grant execute on function public.horas_disponibles(int, date, int) to authenticated;
