-- SUAN Academy · Registro de alumnos: PAR-Q, autorización de datos y RPC pública

alter table alumnos
  add column parq jsonb,                                   -- {"q1":false,...,"q7":false}
  add column parq_alerta boolean generated always as (
    coalesce((parq->>'q1')::boolean,false) or coalesce((parq->>'q2')::boolean,false) or
    coalesce((parq->>'q3')::boolean,false) or coalesce((parq->>'q4')::boolean,false) or
    coalesce((parq->>'q5')::boolean,false) or coalesce((parq->>'q6')::boolean,false) or
    coalesce((parq->>'q7')::boolean,false)) stored,
  add column parq_observaciones text,
  add column acepta_datos_en timestamptz,
  add column acepta_datos_version text;

insert into parametros (clave, valor, descripcion) values
  ('registro_habilitado','true','Permite el registro de alumnos nuevos desde el formulario público (true/false)')
on conflict (clave) do nothing;

-- Link general por defecto
insert into links_registro (codigo, nombre_origen) values ('general', 'Link general')
on conflict (codigo) do nothing;

-- Lectura pública del indicador de registro (solo esa clave)
create policy param_publico on parametros for select to anon using (clave = 'registro_habilitado');

-- Registro público: valida y crea alumno (+ acudiente si es menor) saltando RLS de forma controlada
create or replace function public.registro_publico(
  p_codigo_link text,
  p_nombres text, p_apellidos text, p_fecha_nacimiento date,
  p_tipo_documento tipo_documento, p_numero_documento text,
  p_celular text, p_correo text, p_nivel_id int,
  p_parq jsonb, p_parq_observaciones text,
  p_acudiente jsonb,          -- {nombres, apellidos, tipo_documento, numero_documento, celular, correo, parentesco} o null
  p_acepta_datos boolean, p_version_politica text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_link links_registro%rowtype;
  v_edad int;
  v_alumno uuid;
  v_acudiente uuid;
  v_recibidos int;
begin
  if coalesce(param('registro_habilitado'),'false') <> 'true' then
    raise exception 'El registro de alumnos nuevos está cerrado por el momento.' using errcode = 'P0001';
  end if;
  select * into v_link from links_registro where codigo = p_codigo_link and activo
    and (vence_en is null or vence_en >= current_date);
  if not found then
    raise exception 'Este link de registro no está disponible.' using errcode = 'P0001';
  end if;
  if v_link.limite is not null then
    select count(*) into v_recibidos from alumnos where link_id = v_link.id;
    if v_recibidos >= v_link.limite then
      raise exception 'Este link ya alcanzó el número máximo de registros.' using errcode = 'P0001';
    end if;
  end if;
  if not p_acepta_datos then
    raise exception 'Debes autorizar el tratamiento de datos personales.' using errcode = 'P0001';
  end if;
  if exists (select 1 from alumnos where numero_documento = p_numero_documento) then
    raise exception 'Ya existe un registro con ese número de documento. Si ya eres alumno, inicia sesión.' using errcode = 'P0001';
  end if;
  v_edad := date_part('year', age(current_date, p_fecha_nacimiento));
  if v_edad < 18 and (p_acudiente is null or coalesce(p_acudiente->>'celular','') = '') then
    raise exception 'Para menores de 18 años se requieren los datos del acudiente.' using errcode = 'P0001';
  end if;

  insert into alumnos (nombres, apellidos, fecha_nacimiento, tipo_documento, numero_documento, celular, correo,
                       nivel_id, link_id, estado_registro, parq, parq_observaciones, acepta_datos, acepta_datos_en, acepta_datos_version)
  values (p_nombres, p_apellidos, p_fecha_nacimiento, p_tipo_documento, p_numero_documento, p_celular, nullif(p_correo,''),
          coalesce(v_link.nivel_id, p_nivel_id), v_link.id, 'pendiente', p_parq, nullif(p_parq_observaciones,''), true, now(), p_version_politica)
  returning id into v_alumno;

  if v_edad < 18 then
    insert into acudientes (nombres, apellidos, tipo_documento, numero_documento, celular, correo)
    values (p_acudiente->>'nombres', p_acudiente->>'apellidos',
            nullif(p_acudiente->>'tipo_documento','')::tipo_documento, nullif(p_acudiente->>'numero_documento',''),
            p_acudiente->>'celular', nullif(p_acudiente->>'correo',''))
    returning id into v_acudiente;
    insert into alumno_acudientes (alumno_id, acudiente_id, parentesco) values (v_alumno, v_acudiente, p_acudiente->>'parentesco');
  end if;
  return v_alumno;
end $$;
grant execute on function public.registro_publico(text,text,text,date,tipo_documento,text,text,text,int,jsonb,text,jsonb,boolean,text) to anon, authenticated;

-- Conteo de registros por link (para la pantalla del administrador)
create or replace view v_links_registro as
select l.*, (select count(*) from alumnos a where a.link_id = l.id) as registros_recibidos
from links_registro l;
