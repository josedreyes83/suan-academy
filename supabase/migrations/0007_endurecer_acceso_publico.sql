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

-- 2) Anónimo: sin lectura ni inserción directa (registro_publico es security definer y hace el trabajo).
--    Se usa ALTER POLICY (no destructivo); las políticas quedan con condición false.
alter policy links_publico on links_registro using (false);
alter policy param_publico on parametros using (false);
alter policy alumnos_registro_publico on alumnos with check (false);
alter policy acud_registro_publico on acudientes with check (false);
alter policy aa_registro_publico on alumno_acudientes with check (false);

-- 3) Niveles: solo usuarios con sesión (el formulario público ya no los muestra)
alter policy niveles_ver on niveles to authenticated;

-- 4) Relación alumno–acudiente: solo admin, entrenador o los propios involucrados
alter policy aa_ver on alumno_acudientes using (
  es_admin() or tiene_rol('entrenador')
  or exists (select 1 from alumnos a where a.id = alumno_acudientes.alumno_id and a.perfil_id = auth.uid())
  or exists (select 1 from acudientes ac where ac.id = alumno_acudientes.acudiente_id and ac.perfil_id = auth.uid())
);

-- 5) Asistencias: cada alumno (o su acudiente) ve solo las suyas; admin y entrenador conservan sus políticas
alter policy asis_ver on asistencias using (
  exists (
    select 1 from alumnos a where a.id = asistencias.alumno_id and (
      a.perfil_id = auth.uid()
      or exists (select 1 from alumno_acudientes aa join acudientes ac on ac.id = aa.acudiente_id where aa.alumno_id = a.id and ac.perfil_id = auth.uid())
    )
  )
);

-- Verificado (rol anon): 0 filas visibles en links_registro/parametros/niveles/alumnos; insert directo → RLS;
-- link_registro_estado('general') → {valido:true}; registro_publico(...) → uuid.
