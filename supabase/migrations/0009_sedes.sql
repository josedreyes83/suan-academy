-- SUAN Academy · Sedes: cada cancha pertenece a una sede
create table if not exists sedes (
  id serial primary key,
  nombre text not null unique,
  direccion text,
  activa boolean not null default true,
  creado_en timestamptz not null default now()
);
alter table sedes enable row level security;
create policy sedes_admin on sedes for all using (es_admin()) with check (es_admin());
create policy sedes_ver on sedes for select to authenticated using (true);

insert into sedes (nombre) values ('Calle 100') on conflict (nombre) do nothing;

alter table canchas add column if not exists sede_id int references sedes(id);
update canchas set sede_id = (select id from sedes where nombre = 'Calle 100') where sede_id is null;
alter table canchas alter column sede_id set not null;
create index if not exists canchas_sede_idx on canchas (sede_id);
