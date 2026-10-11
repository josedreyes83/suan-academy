-- SUAN Academy · El correo del alumno es obligatorio (es su usuario de acceso)
-- y nivel/tipo son obligatorios al aprobar.

-- Registros nuevos: correo con formato válido
alter table alumnos drop constraint if exists alumnos_correo_valido;
alter table alumnos add constraint alumnos_correo_valido
  check (correo is null or correo ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');

-- Un alumno aprobado debe tener correo, nivel y tipo
alter table alumnos drop constraint if exists alumnos_aprobado_completo;
alter table alumnos add constraint alumnos_aprobado_completo
  check (estado_registro <> 'aprobado' or (correo is not null and nivel_id is not null and tipo_alumno_id is not null))
  not valid;
alter table alumnos validate constraint alumnos_aprobado_completo;

-- registro_publico exige correo
create or replace function public.registro_publico_valida_correo() returns trigger
language plpgsql as $$
begin
  if new.estado_registro = 'pendiente' and nullif(trim(new.correo), '') is null then
    raise exception 'El correo es obligatorio: será tu usuario para entrar a la app.' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists alumnos_correo_obligatorio on alumnos;
create trigger alumnos_correo_obligatorio before insert on alumnos
  for each row execute function public.registro_publico_valida_correo();
