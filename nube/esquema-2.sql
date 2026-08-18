-- Juntos+ · segunda parte del esquema
-- Tablas de dinero + las funciones para crear la casa y unirse a ella.
-- Se pega igual que el primero: SQL Editor → New query → Run.
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

-- ---------------------------------------------- entrar a la casa

-- Código corto de la casa: lo teclea la segunda persona para unirse.
alter table hogar add column if not exists codigo text unique;

-- Crear la casa con sus miembros. Va como función porque la seguridad por
-- fila, con razón, no deja crear un hogar al que todavía no perteneces.
create or replace function crear_hogar(p_nombre text, p_codigo text, p_miembros jsonb, p_yo text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_hogar uuid;
  m jsonb;
  v_id uuid;
  v_yo uuid;
begin
  if auth.uid() is null then raise exception 'Hay que entrar primero.'; end if;
  if exists (select 1 from miembro where usuario_id = auth.uid()) then
    raise exception 'Esta cuenta ya pertenece a una casa.';
  end if;

  insert into hogar (nombre, codigo)
  values (coalesce(nullif(p_nombre, ''), 'Nuestra casa'), upper(p_codigo))
  returning id into v_hogar;

  for m in select * from jsonb_array_elements(p_miembros) loop
    insert into miembro (hogar_id, nombre, corto, rol, color)
    values (v_hogar, m->>'nombre', m->>'corto',
            coalesce((m->>'rol')::rol_miembro, 'adulto'), coalesce(m->>'color', 'fa'))
    returning id into v_id;

    if (m->>'corto') = p_yo then
      v_yo := v_id;
      update miembro set usuario_id = auth.uid() where id = v_id;
    end if;
  end loop;

  if v_yo is null then raise exception 'No encontré a quién eres dentro de la lista.'; end if;
  return jsonb_build_object('hogar_id', v_hogar, 'miembro_id', v_yo, 'codigo', upper(p_codigo));
end $$;

-- Ver quiénes viven en esa casa y cuáles ya tienen dueño, para poder elegir.
create or replace function miembros_por_codigo(p_codigo text)
returns table (corto text, nombre text, rol rol_miembro, tomado boolean)
language sql security definer set search_path = public as $$
  select m.corto, m.nombre, m.rol, m.usuario_id is not null
  from miembro m join hogar h on h.id = m.hogar_id
  where h.codigo = upper(p_codigo) and m.activo
  order by m.creado_en
$$;

-- Unirse a una casa que ya existe, tomando el lugar que nadie ha reclamado.
create or replace function unirse_a_hogar(p_codigo text, p_corto text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_hogar uuid;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Hay que entrar primero.'; end if;
  if exists (select 1 from miembro where usuario_id = auth.uid()) then
    raise exception 'Esta cuenta ya pertenece a una casa.';
  end if;

  select id into v_hogar from hogar where codigo = upper(p_codigo);
  if v_hogar is null then raise exception 'Ese código no existe. Revísalo con quien creó la casa.'; end if;

  select id into v_id from miembro
  where hogar_id = v_hogar and corto = p_corto and usuario_id is null and activo;
  if v_id is null then raise exception 'Ese lugar ya lo tomó alguien más.'; end if;

  update miembro set usuario_id = auth.uid() where id = v_id;
  return jsonb_build_object('hogar_id', v_hogar, 'miembro_id', v_id);
end $$;

grant execute on function crear_hogar(text, text, jsonb, text) to authenticated;
grant execute on function miembros_por_codigo(text) to authenticated;
grant execute on function unirse_a_hogar(text, text) to authenticated;
