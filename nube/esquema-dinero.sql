-- Juntos+ · tablas de dinero (entrega 2)
-- Se pega igual que el otro: SQL Editor → New query → Run.
-- Requiere que ya se haya corrido esquema.sql.

create table if not exists cargo_fijo (
  id            uuid primary key,
  hogar_id      uuid not null references hogar(id) on delete cascade,
  titulo        text not null check (char_length(titulo) between 1 and 120),
  tipo          text not null check (tipo in ('ingreso', 'gasto')),
  categoria     text not null,
  monto         numeric(12,2) not null check (monto >= 0),
  -- 'quincena' | 'mes' | 'semana' | 'dos-meses'
  cada          text not null check (cada in ('quincena', 'mes', 'semana', 'dos-meses')),
  dia_del_mes   smallint check (dia_del_mes between 1 and 31),
  ancla_mes     smallint check (ancla_mes between 0 and 11),
  quien         uuid not null references miembro(id) on delete cascade,
  -- Cuando se paga entre los dos con montos distintos: [{"miembro":"uuid","monto":2500}]
  aportaciones  jsonb not null default '[]',
  variable      boolean not null default false,
  activo        boolean not null default true,
  borrado_en    timestamptz,
  actualizado_en timestamptz not null default now()
);
create index if not exists cargo_hogar on cargo_fijo(hogar_id);

create table if not exists movimiento (
  id            uuid primary key,
  hogar_id      uuid not null references hogar(id) on delete cascade,
  tipo          text not null check (tipo in ('ingreso', 'gasto')),
  monto         numeric(12,2) not null check (monto > 0 and monto < 1000000),
  categoria     text not null,
  fecha         date not null,
  miembro_id    uuid not null references miembro(id) on delete cascade,
  nota          text,
  cargo_id      uuid references cargo_fijo(id) on delete set null,
  -- Qué ocurrencia del cargo fijo cubre, para no pedirla dos veces.
  periodo       text,
  borrado_en    timestamptz,
  actualizado_en timestamptz not null default now()
);
create index if not exists movimiento_hogar_fecha on movimiento(hogar_id, fecha);
-- Un cargo fijo no se puede confirmar dos veces en el mismo periodo por persona.
create unique index if not exists movimiento_cargo_periodo
  on movimiento(cargo_id, periodo, miembro_id) where cargo_id is not null;

create table if not exists meta_ingreso (
  id            uuid primary key,
  hogar_id      uuid not null references hogar(id) on delete cascade,
  miembro_id    uuid not null references miembro(id) on delete cascade,
  monto         numeric(12,2) not null check (monto > 0),
  periodo       text not null default 'semanal',
  actualizado_en timestamptz not null default now()
);

-- ------------------------------------------------------ seguridad por fila
-- El dinero es abierto entre los dos adultos y cerrado para las hijas.

alter table cargo_fijo   enable row level security;
alter table movimiento   enable row level security;
alter table meta_ingreso enable row level security;

create policy cargo_leer   on cargo_fijo for select using (hogar_id = mi_hogar() and soy_adulto());
create policy cargo_crear  on cargo_fijo for insert with check (hogar_id = mi_hogar() and soy_adulto());
create policy cargo_editar on cargo_fijo for update using (hogar_id = mi_hogar() and soy_adulto());
create policy cargo_borrar on cargo_fijo for delete using (hogar_id = mi_hogar() and soy_adulto());

create policy movimiento_leer   on movimiento for select using (hogar_id = mi_hogar() and soy_adulto());
create policy movimiento_crear  on movimiento for insert with check (hogar_id = mi_hogar() and soy_adulto());
create policy movimiento_editar on movimiento for update using (hogar_id = mi_hogar() and soy_adulto());
create policy movimiento_borrar on movimiento for delete using (hogar_id = mi_hogar() and soy_adulto());

create policy meta_leer   on meta_ingreso for select using (hogar_id = mi_hogar() and soy_adulto());
create policy meta_crear  on meta_ingreso for insert with check (hogar_id = mi_hogar() and soy_adulto());
create policy meta_editar on meta_ingreso for update using (hogar_id = mi_hogar() and soy_adulto());

create trigger t_cargo      before update on cargo_fijo   for each row execute function marcar_actualizado();
create trigger t_movimiento before update on movimiento   for each row execute function marcar_actualizado();
create trigger t_meta       before update on meta_ingreso for each row execute function marcar_actualizado();
