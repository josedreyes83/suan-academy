-- SUAN Academy · Versión 1 · Esquema base
-- Entidades: perfiles, roles, tipos de alumno, niveles, canchas, entrenadores, alumnos, acudientes,
-- productos, precios, parámetros, plantilla de bloques, bloques, pagos, inscripciones, sesiones, links de registro.

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- ---------- Enumerados ----------
create type rol_usuario as enum ('administrador','entrenador','profesional','acudiente','alumno');
create type tipo_clase as enum ('grupal','personalizada');
create type tipo_producto as enum ('mensualidad_grupal','paquete_personalizado','sesion_unica');
create type estado_bloque as enum ('publicado','cancelado');
create type estado_inscripcion as enum ('inscrito','en_espera','cancelado_alumno','cancelado_academia');
create type estado_registro as enum ('pendiente','aprobado','rechazado');
create type estado_asistencia as enum ('presente','ausente','justificado');
create type tipo_documento as enum ('CC','TI','RC','CE','PASAPORTE');

-- ---------- Perfiles y roles ----------
create table perfiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombres text not null default '',
  apellidos text not null default '',
  celular text,
  correo text,
  foto_url text,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table usuario_roles (
  perfil_id uuid not null references perfiles(id) on delete cascade,
  rol rol_usuario not null,
  primary key (perfil_id, rol)
);

-- Al crear un usuario en auth, se crea su perfil
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, nombres, apellidos, correo, celular)
  values (new.id,
          coalesce(new.raw_user_meta_data->>'nombres',''),
          coalesce(new.raw_user_meta_data->>'apellidos',''),
          new.email,
          new.raw_user_meta_data->>'celular')
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helpers de autorización
create or replace function public.tiene_rol(r rol_usuario) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from usuario_roles where perfil_id = auth.uid() and rol = r)
$$;
create or replace function public.es_admin() returns boolean
language sql stable as $$ select public.tiene_rol('administrador') $$;

-- ---------- Catálogos de configuración ----------
create table tipos_alumno (
  id serial primary key,
  codigo text not null unique,          -- normal, vip
  nombre text not null,
  beneficios text,
  activo boolean not null default true
);

create table niveles (
  id serial primary key,
  nombre text not null unique,
  orden int not null,
  descripcion text,
  edad_min int, edad_max int,
  activo boolean not null default true
);

create table canchas (
  id serial primary key,
  nombre text not null unique,
  activa boolean not null default true,
  observaciones text
);

create table cancha_horarios (
  id serial primary key,
  cancha_id int not null references canchas(id) on delete cascade,
  dia_semana smallint not null check (dia_semana between 0 and 6), -- 0 = domingo
  hora_inicio time not null,
  hora_fin time not null,
  check (hora_fin > hora_inicio),
  unique (cancha_id, dia_semana)
);

create table entrenadores (
  perfil_id uuid primary key references perfiles(id) on delete cascade,
  activo boolean not null default true,
  observaciones text
);
create table entrenador_niveles (
  entrenador_id uuid references entrenadores(perfil_id) on delete cascade,
  nivel_id int references niveles(id) on delete cascade,
  primary key (entrenador_id, nivel_id)
);
create table entrenador_canchas (
  entrenador_id uuid references entrenadores(perfil_id) on delete cascade,
  cancha_id int references canchas(id) on delete cascade,
  primary key (entrenador_id, cancha_id)
);

create table productos (
  id serial primary key,
  codigo text not null unique,
  nombre text not null,
  tipo tipo_producto not null,
  clase tipo_clase not null,
  activo boolean not null default true
);

create table precios (
  id serial primary key,
  producto_id int not null references productos(id),
  tipo_alumno_id int not null references tipos_alumno(id),
  nivel_id int references niveles(id),               -- null = aplica a todos los niveles
  valor numeric(12,0) not null check (valor >= 0),
  vigente_desde date not null default current_date,
  creado_por uuid references perfiles(id),
  creado_en timestamptz not null default now()
);
create index precios_busqueda on precios (producto_id, tipo_alumno_id, nivel_id, vigente_desde desc);

create table parametros (
  clave text primary key,
  valor text not null,
  descripcion text not null,
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references perfiles(id)
);
create or replace function public.param(k text) returns text
language sql stable as $$ select valor from parametros where clave = k $$;

-- ---------- Registro de alumnos ----------
create table links_registro (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default encode(gen_random_bytes(5),'hex'),
  nombre_origen text not null,
  nivel_id int references niveles(id),               -- null = general
  vence_en date,
  limite int,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  creado_por uuid references perfiles(id)
);

create table alumnos (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid unique references perfiles(id) on delete set null, -- se llena al aprobar
  nombres text not null,
  apellidos text not null,
  fecha_nacimiento date not null,
  tipo_documento tipo_documento not null,
  numero_documento text not null unique,
  celular text not null,
  correo text,
  nivel_id int references niveles(id),
  tipo_alumno_id int references tipos_alumno(id),
  link_id uuid references links_registro(id),
  estado_registro estado_registro not null default 'pendiente',
  motivo_rechazo text,
  acepta_datos boolean not null default false,
  creado_en timestamptz not null default now(),
  aprobado_en timestamptz,
  aprobado_por uuid references perfiles(id)
);

create table acudientes (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid unique references perfiles(id) on delete set null,
  nombres text not null,
  apellidos text not null,
  tipo_documento tipo_documento,
  numero_documento text,
  celular text not null,
  correo text,
  creado_en timestamptz not null default now()
);
create table alumno_acudientes (
  alumno_id uuid references alumnos(id) on delete cascade,
  acudiente_id uuid references acudientes(id) on delete cascade,
  parentesco text,
  primary key (alumno_id, acudiente_id)
);

-- ---------- Programación ----------
create table plantilla_bloques (
  id serial primary key,
  cancha_id int not null references canchas(id),
  dia_semana smallint not null check (dia_semana between 0 and 6),
  hora_inicio time not null,
  hora_fin time not null,
  nivel_id int not null references niveles(id),
  tipo tipo_clase not null default 'grupal',
  entrenador_id uuid not null references entrenadores(perfil_id),
  cupo int not null check (cupo > 0),
  activo boolean not null default true,
  check (hora_fin > hora_inicio)
);

create table bloques (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  cancha_id int not null references canchas(id),
  hora_inicio time not null,
  hora_fin time not null,
  nivel_id int not null references niveles(id),
  tipo tipo_clase not null default 'grupal',
  entrenador_id uuid not null references entrenadores(perfil_id),
  cupo int not null check (cupo > 0),
  estado estado_bloque not null default 'publicado',
  motivo_cancelacion text,
  plantilla_id int references plantilla_bloques(id) on delete set null,
  creado_en timestamptz not null default now(),
  check (hora_fin > hora_inicio),
  -- sin solapes por cancha ni por entrenador entre bloques publicados
  exclude using gist (cancha_id with =, tsrange((fecha + hora_inicio), (fecha + hora_fin)) with &&) where (estado = 'publicado'),
  exclude using gist (entrenador_id with =, tsrange((fecha + hora_inicio), (fecha + hora_fin)) with &&) where (estado = 'publicado')
);
create index bloques_fecha on bloques (fecha, nivel_id);

-- ---------- Pagos y vigencia ----------
create table pagos (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references alumnos(id),
  producto_id int not null references productos(id),
  tipo_alumno_id int not null references tipos_alumno(id),
  precio_lista numeric(12,0) not null,
  descuento numeric(12,0) not null default 0,
  motivo_descuento text,
  valor_pagado numeric(12,0) not null,
  medio_pago text not null,
  fecha_pago date not null default current_date,
  comprobante_url text,
  vigencia_inicio date not null default current_date,
  vigencia_fin date,
  sesiones_totales int,
  sesiones_usadas int not null default 0,
  extension_dias int not null default 0,
  motivo_extension text,
  registrado_por uuid references perfiles(id),
  creado_en timestamptz not null default now(),
  check (descuento = 0 or motivo_descuento is not null)
);
create index pagos_alumno on pagos (alumno_id, vigencia_fin desc);

-- Calcula vigencia_fin y sesiones_totales según producto y parámetros
create or replace function public.pagos_calcular_vigencia() returns trigger
language plpgsql as $$
declare p productos%rowtype;
begin
  select * into p from productos where id = new.producto_id;
  if p.tipo = 'mensualidad_grupal' then
    new.vigencia_fin := new.vigencia_inicio + coalesce(param('vigencia_mensualidad_dias'),'30')::int - 1;
    new.sesiones_totales := null;
  elsif p.tipo = 'paquete_personalizado' then
    new.vigencia_fin := new.vigencia_inicio + coalesce(param('paquete_vigencia_dias'),'45')::int - 1;
    new.sesiones_totales := coalesce(new.sesiones_totales, coalesce(param('paquete_sesiones'),'10')::int);
  elsif p.tipo = 'sesion_unica' then
    new.sesiones_totales := 1;
    new.vigencia_fin := coalesce(new.vigencia_fin, new.vigencia_inicio);
  end if;
  new.vigencia_fin := new.vigencia_fin + new.extension_dias;
  return new;
end $$;
create trigger pagos_vigencia before insert or update of vigencia_inicio, producto_id, extension_dias on pagos
  for each row execute procedure public.pagos_calcular_vigencia();

-- ---------- Inscripciones y sesiones ----------
create table inscripciones (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references alumnos(id),
  bloque_id uuid not null references bloques(id),
  estado estado_inscripcion not null default 'inscrito',
  pago_id uuid references pagos(id),
  sesion_descontada boolean not null default false,
  creado_en timestamptz not null default now(),
  cancelado_en timestamptz,
  motivo text,
  unique (alumno_id, bloque_id)
);

create table sesiones (
  id uuid primary key default gen_random_uuid(),
  bloque_id uuid not null unique references bloques(id),
  entrenador_id uuid not null references entrenadores(perfil_id),
  ejercicios text[] not null default '{}',
  nota text,
  registrado_en timestamptz not null default now()
);
create table asistencias (
  sesion_id uuid references sesiones(id) on delete cascade,
  alumno_id uuid references alumnos(id),
  estado estado_asistencia not null,
  primary key (sesion_id, alumno_id)
);

-- ---------- Vistas de apoyo ----------
create or replace view v_vigencias as
select p.alumno_id, p.id as pago_id, pr.tipo as tipo_producto, pr.clase,
       p.vigencia_inicio, p.vigencia_fin, p.sesiones_totales, p.sesiones_usadas,
       case
         when p.vigencia_fin < current_date then 'vencido'
         when p.sesiones_totales is not null and p.sesiones_usadas >= p.sesiones_totales then 'vencido'
         when p.vigencia_fin - current_date <= coalesce(param('aviso_por_vencer_dias'),'5')::int
           or (p.sesiones_totales is not null and p.sesiones_totales - p.sesiones_usadas <= coalesce(param('aviso_por_vencer_sesiones'),'2')::int)
           then 'por_vencer'
         else 'al_dia' end as estado
from pagos p join productos pr on pr.id = p.producto_id;

create or replace view v_bloques_cupo as
select b.*, (select count(*) from inscripciones i where i.bloque_id = b.id and i.estado = 'inscrito') as inscritos
from bloques b;

-- ---------- Seguridad (RLS) ----------
alter table perfiles enable row level security;
alter table usuario_roles enable row level security;
alter table tipos_alumno enable row level security;
alter table niveles enable row level security;
alter table canchas enable row level security;
alter table cancha_horarios enable row level security;
alter table entrenadores enable row level security;
alter table entrenador_niveles enable row level security;
alter table entrenador_canchas enable row level security;
alter table productos enable row level security;
alter table precios enable row level security;
alter table parametros enable row level security;
alter table links_registro enable row level security;
alter table alumnos enable row level security;
alter table acudientes enable row level security;
alter table alumno_acudientes enable row level security;
alter table plantilla_bloques enable row level security;
alter table bloques enable row level security;
alter table pagos enable row level security;
alter table inscripciones enable row level security;
alter table sesiones enable row level security;
alter table asistencias enable row level security;

-- Perfiles: cada quien ve y edita el suyo; el admin todo
create policy perfiles_propio on perfiles for select using (id = auth.uid() or es_admin() or tiene_rol('entrenador'));
create policy perfiles_editar on perfiles for update using (id = auth.uid() or es_admin());
create policy roles_ver on usuario_roles for select using (perfil_id = auth.uid() or es_admin());
create policy roles_admin on usuario_roles for all using (es_admin()) with check (es_admin());

-- Catálogos: lectura para autenticados (y anónimos en niveles, para el link), escritura solo admin
create policy niveles_ver on niveles for select using (true);
create policy niveles_admin on niveles for all using (es_admin()) with check (es_admin());
create policy tipos_ver on tipos_alumno for select to authenticated using (true);
create policy tipos_admin on tipos_alumno for all using (es_admin()) with check (es_admin());
create policy canchas_ver on canchas for select to authenticated using (true);
create policy canchas_admin on canchas for all using (es_admin()) with check (es_admin());
create policy cancha_h_ver on cancha_horarios for select to authenticated using (true);
create policy cancha_h_admin on cancha_horarios for all using (es_admin()) with check (es_admin());
create policy entren_ver on entrenadores for select to authenticated using (true);
create policy entren_admin on entrenadores for all using (es_admin()) with check (es_admin());
create policy entren_n_ver on entrenador_niveles for select to authenticated using (true);
create policy entren_n_admin on entrenador_niveles for all using (es_admin()) with check (es_admin());
create policy entren_c_ver on entrenador_canchas for select to authenticated using (true);
create policy entren_c_admin on entrenador_canchas for all using (es_admin()) with check (es_admin());
create policy productos_ver on productos for select to authenticated using (true);
create policy productos_admin on productos for all using (es_admin()) with check (es_admin());
create policy precios_ver on precios for select to authenticated using (true);
create policy precios_admin on precios for all using (es_admin()) with check (es_admin());
create policy param_ver on parametros for select to authenticated using (true);
create policy param_admin on parametros for all using (es_admin()) with check (es_admin());

-- Links: el admin administra; el público puede leer un link activo por código (para el formulario)
create policy links_admin on links_registro for all using (es_admin()) with check (es_admin());
create policy links_publico on links_registro for select to anon using (activo and (vence_en is null or vence_en >= current_date));

-- Alumnos: registro público por link; el alumno y su acudiente ven lo suyo; entrenador ve aprobados; admin todo
create policy alumnos_registro_publico on alumnos for insert to anon
  with check (estado_registro = 'pendiente' and link_id is not null
              and exists (select 1 from links_registro l where l.id = link_id and l.activo and (l.vence_en is null or l.vence_en >= current_date)));
create policy alumnos_admin on alumnos for all using (es_admin()) with check (es_admin());
create policy alumnos_propio on alumnos for select using (perfil_id = auth.uid());
create policy alumnos_acudiente on alumnos for select using (
  exists (select 1 from alumno_acudientes aa join acudientes a on a.id = aa.acudiente_id where aa.alumno_id = alumnos.id and a.perfil_id = auth.uid()));
create policy alumnos_entrenador on alumnos for select using (tiene_rol('entrenador') and estado_registro = 'aprobado');

create policy acud_registro_publico on acudientes for insert to anon with check (true);
create policy acud_admin on acudientes for all using (es_admin()) with check (es_admin());
create policy acud_propio on acudientes for select using (perfil_id = auth.uid());
create policy aa_registro_publico on alumno_acudientes for insert to anon with check (true);
create policy aa_admin on alumno_acudientes for all using (es_admin()) with check (es_admin());
create policy aa_ver on alumno_acudientes for select to authenticated using (true);

-- Programación: admin administra; autenticados ven bloques publicados
create policy plantilla_admin on plantilla_bloques for all using (es_admin()) with check (es_admin());
create policy plantilla_ver on plantilla_bloques for select to authenticated using (true);
create policy bloques_admin on bloques for all using (es_admin()) with check (es_admin());
create policy bloques_ver on bloques for select to authenticated using (true);

-- Pagos: admin; el alumno/acudiente ve los suyos
create policy pagos_admin on pagos for all using (es_admin()) with check (es_admin());
create policy pagos_propio on pagos for select using (
  exists (select 1 from alumnos a where a.id = pagos.alumno_id and (a.perfil_id = auth.uid()
          or exists (select 1 from alumno_acudientes aa join acudientes ac on ac.id = aa.acudiente_id where aa.alumno_id = a.id and ac.perfil_id = auth.uid()))));

-- Inscripciones: admin todo; alumno/acudiente crea y ve las suyas; entrenador ve las de sus bloques
create policy insc_admin on inscripciones for all using (es_admin()) with check (es_admin());
create policy insc_propio on inscripciones for all using (
  exists (select 1 from alumnos a where a.id = inscripciones.alumno_id and (a.perfil_id = auth.uid()
          or exists (select 1 from alumno_acudientes aa join acudientes ac on ac.id = aa.acudiente_id where aa.alumno_id = a.id and ac.perfil_id = auth.uid()))))
  with check (
  exists (select 1 from alumnos a where a.id = inscripciones.alumno_id and (a.perfil_id = auth.uid()
          or exists (select 1 from alumno_acudientes aa join acudientes ac on ac.id = aa.acudiente_id where aa.alumno_id = a.id and ac.perfil_id = auth.uid()))));
create policy insc_entrenador on inscripciones for select using (
  exists (select 1 from bloques b where b.id = inscripciones.bloque_id and b.entrenador_id = auth.uid()));

-- Sesiones y asistencia: el entrenador del bloque registra; admin todo; alumno/acudiente ven
create policy ses_admin on sesiones for all using (es_admin()) with check (es_admin());
create policy ses_entrenador on sesiones for all using (entrenador_id = auth.uid()) with check (entrenador_id = auth.uid());
create policy ses_ver on sesiones for select to authenticated using (true);
create policy asis_admin on asistencias for all using (es_admin()) with check (es_admin());
create policy asis_entrenador on asistencias for all using (
  exists (select 1 from sesiones s where s.id = asistencias.sesion_id and s.entrenador_id = auth.uid()))
  with check (exists (select 1 from sesiones s where s.id = asistencias.sesion_id and s.entrenador_id = auth.uid()));
create policy asis_ver on asistencias for select to authenticated using (true);

-- ---------- Datos iniciales ----------
insert into tipos_alumno (codigo, nombre, beneficios) values
  ('normal','Normal','Tarifa estándar'),
  ('vip','VIP','Tarifa preferencial; beneficios por definir');

insert into niveles (nombre, orden, descripcion) values
  ('Iniciación',1,'Primer contacto con el squash: reglas, empuñadura y golpes básicos'),
  ('Básico',2,'Golpes fundamentales con control; juego de pared y desplazamiento'),
  ('Intermedio',3,'Consistencia en juego real; variedad de golpes y táctica básica'),
  ('Avanzado',4,'Juego competitivo; presión, ritmo y lectura del rival'),
  ('Competencia',5,'Preparación para torneos; planificación física y mental');

insert into productos (codigo, nombre, tipo, clase) values
  ('mensualidad_grupal','Mensualidad grupal','mensualidad_grupal','grupal'),
  ('paquete_x10','Paquete personalizado x10','paquete_personalizado','personalizada'),
  ('sesion_unica','Clase personalizada única','sesion_unica','personalizada');

insert into parametros (clave, valor, descripcion) values
  ('bloque_duracion_min','60','Duración por defecto de un bloque en minutos (30 a 120)'),
  ('cupo_grupal','4','Cupo por defecto de una clase grupal'),
  ('personalizada_alumnos','1','Alumnos permitidos en una clase personalizada (1 o 2)'),
  ('publicacion_dia','4','Día de la semana para publicar la semana siguiente (0 domingo … 6 sábado)'),
  ('publicacion_hora','18:00','Hora del recordatorio de publicación'),
  ('vigencia_mensualidad_dias','30','Días de vigencia de la mensualidad grupal'),
  ('tope_grupales_semana','0','Tope de clases grupales por semana (0 = sin tope)'),
  ('paquete_sesiones','10','Sesiones del paquete personalizado'),
  ('paquete_vigencia_dias','45','Días de vigencia del paquete personalizado'),
  ('paquete_inicio','pago','Inicio de vigencia del paquete: pago | primera_clase'),
  ('cancelacion_horas','12','Horas de anticipación para cancelar sin perder sesión'),
  ('aviso_por_vencer_dias','5','Días antes del vencimiento para pasar a Por vencer'),
  ('aviso_por_vencer_sesiones','2','Sesiones restantes para pasar a Por vencer'),
  ('dias_gracia','0','Días después del vencimiento en que aún puede inscribirse'),
  ('extension_maxima_dias','15','Extensión máxima manual de un paquete'),
  ('lista_espera_horas','2','Horas para confirmar un cupo liberado'),
  ('bloques_multinivel','false','Permite bloques con dos niveles contiguos');
