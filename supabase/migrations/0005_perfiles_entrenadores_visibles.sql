-- Los alumnos y acudientes ven el nombre de los entrenadores (para mostrar quién dicta cada clase)
create policy perfiles_entrenadores_visibles on perfiles for select to authenticated
  using (exists (select 1 from entrenadores e where e.perfil_id = perfiles.id));
