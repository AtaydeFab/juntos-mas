-- Juntos+ · esquema de la base
-- Se pega tal cual en Supabase → SQL Editor → New query → Run.
-- Todo cuelga de un hogar, y la seguridad vive en la base: aunque alguien
-- manipule la app, no puede leer ni escribir en un hogar que no es suyo.

-- ---------------------------------------------------------------- tablas

create table if not exists hogar (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null default 'Nuestra casa',
  zona_horaria  text not null default 'America/Mexico_City',
  creado_en     timestamptz not null default now()
);

create type rol_miembro as enum ('adulto', 'hija');

create table if not exists miembro (
  id            uuid primary key default gen_random_uuid(),
  hogar_id      uuid not null references hogar(id) on delete cascade,
  usuario_id    uuid unique references auth.users(id) on delete set null,
  nombre        text not null,
  corto         text not null,
  rol           rol_miembro not null default 'adulto',
  color         text not null default 'fa',
  activo        boolean not null default true,
  creado_en     timestamptz not null default now()
);
create index if not exists miembro_hogar on miembro(hogar_id);

create table if not exists plantilla (
  id            uuid primary key default gen_random_uuid(),
  hogar_id      uuid not null references hogar(id) on delete cascade,
  titulo        text not null check (char_length(titulo) between 1 and 120),
  -- id de miembro, o las palabras 'ambos' / 'turno'
  responsable   text not null,
  turno_entre   uuid[] not null default '{}',
  -- 'diaria' | 'dias' | 'semanal'  (semanal = sin día fijo)
  frecuencia    text not null check (frecuencia in ('diaria', 'dias', 'semanal')),
  dias          smallint[] not null default '{}',  -- 1 = lunes … 7 = domingo
  activa        boolean not null default true,
  desde         date not null default current_date,
  hasta         date,
  actualizado_en timestamptz not null default now()
);
create index if not exists plantilla_hogar on plantilla(hogar_id);

create table if not exists tarea (
  id            uuid primary key,           -- lo genera el teléfono, para poder crear sin señal
  hogar_id      uuid not null references hogar(id) on delete cascade,
  plantilla_id  uuid references plantilla(id) on delete set null,
  titulo        text not null check (char_length(titulo) between 1 and 120),
  responsable   text not null,
  turno_entre   uuid[] not null default '{}',
  fecha         date,                        -- null en las semanales sin día fijo
  semana        date not null,               -- lunes de su semana
  hecha         boolean not null default false,
  hecha_por     uuid references miembro(id) on delete set null,
  hecha_en      timestamptz,
  asignada_por  uuid references miembro(id) on delete set null,
  suelta        boolean not null default false,
  borrado_en    timestamptz,
  actualizado_en timestamptz not null default now()
);
create index if not exists tarea_hogar_fecha on tarea(hogar_id, fecha);
create index if not exists tarea_hogar_semana on tarea(hogar_id, semana);

create table if not exists evento (
  id            uuid primary key,
  hogar_id      uuid not null references hogar(id) on delete cascade,
  titulo        text not null check (char_length(titulo) between 1 and 120),
  fecha         date not null,
  hora          time,
  anual         boolean not null default false,
  lugar         text,
  con_quien     uuid[] not null default '{}',
  avisar_dias_antes smallint not null default 2,
  borrado_en    timestamptz,
  actualizado_en timestamptz not null default now()
);
create index if not exists evento_hogar_fecha on evento(hogar_id, fecha);

create table if not exists recordatorio (
  id            uuid primary key,
  hogar_id      uuid not null references hogar(id) on delete cascade,
  texto         text not null check (char_length(texto) between 1 and 200),
  para          uuid not null references miembro(id) on delete cascade,
  propuesto_por uuid references miembro(id) on delete set null,
  -- Mientras no lo acepte quien lo recibe, no se le muestra.
  aceptado      boolean not null default true,
  permanente    boolean not null default true,
  hasta         date,
  borrado_en    timestamptz,
  actualizado_en timestamptz not null default now()
);
create index if not exists recordatorio_hogar on recordatorio(hogar_id);

create table if not exists invitacion (
  id            uuid primary key default gen_random_uuid(),
  hogar_id      uuid not null references hogar(id) on delete cascade,
  codigo        text not null unique,
  expira        timestamptz not null default (now() + interval '7 days'),
  usada_por     uuid references auth.users(id) on delete set null,
  usada_en      timestamptz
);

-- ------------------------------------------------- quién soy, para las reglas

create or replace function mi_miembro()
returns uuid language sql stable security definer set search_path = public as $$
  select id from miembro where usuario_id = auth.uid() and activo limit 1
$$;

create or replace function mi_hogar()
returns uuid language sql stable security definer set search_path = public as $$
  select hogar_id from miembro where usuario_id = auth.uid() and activo limit 1
$$;

create or replace function soy_adulto()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select rol = 'adulto' from miembro where usuario_id = auth.uid() and activo limit 1), false)
$$;

-- ------------------------------------------------------ seguridad por fila

alter table hogar        enable row level security;
alter table miembro      enable row level security;
alter table plantilla    enable row level security;
alter table tarea        enable row level security;
alter table evento       enable row level security;
alter table recordatorio enable row level security;
alter table invitacion   enable row level security;

-- El hogar: se ve el propio; solo los adultos lo modifican.
create policy hogar_leer   on hogar for select using (id = mi_hogar());
create policy hogar_editar on hogar for update using (id = mi_hogar() and soy_adulto());

-- Miembros: todos ven a todos dentro de la casa; solo adultos dan de alta o cambian.
create policy miembro_leer   on miembro for select using (hogar_id = mi_hogar());
create policy miembro_crear  on miembro for insert with check (hogar_id = mi_hogar() and soy_adulto());
create policy miembro_editar on miembro for update using (hogar_id = mi_hogar() and soy_adulto());

-- El machote: lo ven todos, lo cambian los adultos.
create policy plantilla_leer   on plantilla for select using (hogar_id = mi_hogar());
create policy plantilla_crear  on plantilla for insert with check (hogar_id = mi_hogar() and soy_adulto());
create policy plantilla_editar on plantilla for update using (hogar_id = mi_hogar() and soy_adulto());
create policy plantilla_borrar on plantilla for delete using (hogar_id = mi_hogar() and soy_adulto());

-- Tareas: todos las ven. Los adultos hacen lo que sea; las hijas solo pueden
-- palomear las suyas, no crear, mover ni reasignar nada.
create policy tarea_leer   on tarea for select using (hogar_id = mi_hogar());
create policy tarea_crear  on tarea for insert with check (hogar_id = mi_hogar() and soy_adulto());
create policy tarea_editar on tarea for update
  using (
    hogar_id = mi_hogar()
    and (soy_adulto() or responsable = mi_miembro()::text or responsable = 'ambos')
  );
create policy tarea_borrar on tarea for delete using (hogar_id = mi_hogar() and soy_adulto());

-- Calendario: todos lo ven, los adultos lo llenan.
create policy evento_leer   on evento for select using (hogar_id = mi_hogar());
create policy evento_crear  on evento for insert with check (hogar_id = mi_hogar() and soy_adulto());
create policy evento_editar on evento for update using (hogar_id = mi_hogar() and soy_adulto());
create policy evento_borrar on evento for delete using (hogar_id = mi_hogar() and soy_adulto());

-- Recordatorios: cada quien ve SOLO los suyos y los que él mismo propuso.
-- Esta es la regla que evita que la app se vuelva un tablero de quejas.
create policy recordatorio_leer on recordatorio for select
  using (hogar_id = mi_hogar() and (para = mi_miembro() or propuesto_por = mi_miembro()));
create policy recordatorio_crear on recordatorio for insert
  with check (hogar_id = mi_hogar() and propuesto_por = mi_miembro());
-- Aceptar o quitar: solo la persona a la que le toca.
create policy recordatorio_editar on recordatorio for update
  using (hogar_id = mi_hogar() and para = mi_miembro());
create policy recordatorio_borrar on recordatorio for delete
  using (hogar_id = mi_hogar() and (para = mi_miembro() or propuesto_por = mi_miembro()));

-- Invitaciones: solo los adultos de la casa las generan y las ven.
create policy invitacion_leer  on invitacion for select using (hogar_id = mi_hogar() and soy_adulto());
create policy invitacion_crear on invitacion for insert with check (hogar_id = mi_hogar() and soy_adulto());

-- --------------------------------------------- marca de tiempo para sincronizar

create or replace function marcar_actualizado()
returns trigger language plpgsql as $$
begin
  new.actualizado_en = now();
  return new;
end $$;

create trigger t_plantilla    before update on plantilla    for each row execute function marcar_actualizado();
create trigger t_tarea        before update on tarea        for each row execute function marcar_actualizado();
create trigger t_evento       before update on evento       for each row execute function marcar_actualizado();
create trigger t_recordatorio before update on recordatorio for each row execute function marcar_actualizado();

-- Las tablas de dinero se agregan en la entrega 2, cuando las tareas ya se estén usando.
