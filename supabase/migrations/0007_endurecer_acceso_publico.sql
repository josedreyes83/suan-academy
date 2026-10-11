-- SUAN Academy · Endurecer el acceso anónimo y entre usuarios
-- Principio: el rol anónimo no lee ni escribe tablas; solo llama funciones que validan y devuelven lo mínimo.

-- 1) El link de registro se resuelve por función: responde solo para el código exacto y sin exponer otros links
create or replace function public.link_registro_estado(p_codigo text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'registro_habilitado', coalesce((select valor = 'true' from parametros where clave = 'registro_habilitado'), false),
    'valido', exists (
      select 1 from links_registro l
      where l.codigo = p_codigo and l.activo
        and (l.vence_en is null or l.vence_en >= current_date)
        and (l.limite is null or (select count(*) from alumnos a where a.link_id = l.id) < l.limite)
    )
  )
$$;
revoke all on function public.link_registro_estado(text) from public;
grant execute on function public.link_registro_estado(text) to anon, authenticated;

-- 2) Anónimo: fuera las políticas de lectura/inserción directa (registro_publico es security definer y hace el trabajo)
drop policy if exists links_publico on links_registro;
drop policy if exists param_publico on parametros;
drop policy if exists alumnos_registro_publico on alumnos;
drop policy if exists acud_registro_publico on acudientes;
drop policy if exists aa_registro_publico on alumno_acudientes;
revoke all on table links_registro, parametros, alumnos, acudientes, alumno_acudientes, niveles from anon;

-- 3) Niveles: solo usuarios con sesión (el formulario público ya no los muestra)
drop policy if exists niveles_ver on niveles;
create policy niveles_ver on niveles for select to authenticated using (true);

-- 4) Relación alumno–acudiente: solo admin, entrenador o los propios involucrados
drop policy if exists aa_ver on alumno_acudientes;
create policy aa_ver on alumno_acudientes for select to authenticated using (
  es_admin() or tiene_rol('entrenador')
  or exists (select 1 from alumnos a where a.id = alumno_acudientes.alumno_id and a.perfil_id = auth.uid())
  or exists (select 1 from acudientes ac where ac.id = alumno_acudientes.acudiente_id and ac.perfil_id = auth.uid())
);

-- 5) Asistencias: cada alumno ve solo las suyas (admin y entrenador conservan sus políticas)
drop policy if exists asis_ver on asistencias;
create policy asis_ver on asistencias for select to authenticated using (
  exists (
    select 1 from alumnos a where a.id = asistencias.alumno_id and (
      a.perfil_id = auth.uid()
      or exists (select 1 from alumno_acudientes aa join acudientes ac on ac.id = aa.acudiente_id where aa.alumno_id = a.id and ac.perfil_id = auth.uid())
    )
  )
);
