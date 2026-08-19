-- Juntos+ · cuarto pedazo del esquema: la comida
-- El menú de la semana, el recetario de la casa y la lista del súper.
-- Se pega tal cual en Supabase → SQL Editor → Nueva consulta → Run.

-- Lo que toca comer un día a una hora. receta_id es texto, no llave: puede
-- apuntar a una receta de la casa o a una de las que trae la app.
create table if not exists comida (
  id            uuid primary key,
  hogar_id      uuid not null references hogar(id) on delete cascade,
  fecha         date not null,
  tiempo        text not null check (tiempo in ('almuerzo', 'comida', 'cena')),
  titulo        text not null,
  receta_id     text,
  cocina        uuid references miembro(id) on delete set null,
  listo         boolean not null default false,
  borrado_en    timestamptz,
  actualizado_en timestamptz not null default now()
);

-- Las recetas que escriben ustedes. Las que vienen con la app viven en el
-- código, iguales en todos los teléfonos, y no ocupan lugar aquí.
create table if not exists receta (
  id            uuid primary key,
  hogar_id      uuid not null references hogar(id) on delete cascade,
  titulo        text not null,
  tiempos       text[] not null default '{}',
  minutos       integer not null default 30,
  porciones     integer not null default 4,
  ingredientes  jsonb not null default '[]',
  pasos         text[] not null default '{}',
  nota          text,
  borrado_en    timestamptz,
  actualizado_en timestamptz not null default now()
);

create table if not exists articulo_super (
  id            uuid primary key,
  hogar_id      uuid not null references hogar(id) on delete cascade,
  que           text not null,
  cuanto        text,
  pasillo       text not null default 'otros',
  comprado      boolean not null default false,
  de_receta     text,
  borrado_en    timestamptz,
  actualizado_en timestamptz not null default now()
);

create index if not exists comida_hogar on comida(hogar_id, fecha);
create index if not exists receta_hogar on receta(hogar_id);
create index if not exists super_hogar on articulo_super(hogar_id);

alter table comida enable row level security;
alter table receta enable row level security;
alter table articulo_super enable row level security;

-- La comida la ven los cuatro: las niñas también quieren saber qué hay de comer.
create policy comida_leer   on comida for select using (hogar_id = mi_hogar());
create policy comida_crear  on comida for insert with check (hogar_id = mi_hogar() and soy_adulto());
create policy comida_editar on comida for update using (hogar_id = mi_hogar() and soy_adulto());
create policy comida_borrar on comida for delete using (hogar_id = mi_hogar() and soy_adulto());

create policy receta_leer   on receta for select using (hogar_id = mi_hogar());
create policy receta_crear  on receta for insert with check (hogar_id = mi_hogar() and soy_adulto());
create policy receta_editar on receta for update using (hogar_id = mi_hogar() and soy_adulto());
create policy receta_borrar on receta for delete using (hogar_id = mi_hogar() and soy_adulto());

-- La lista del súper sí la puede tocar cualquiera: si a una hija se le acaba
-- el shampoo, que lo anote ella y no ande cargándolo Saira en la cabeza.
create policy super_leer   on articulo_super for select using (hogar_id = mi_hogar());
create policy super_crear  on articulo_super for insert with check (hogar_id = mi_hogar());
create policy super_editar on articulo_super for update using (hogar_id = mi_hogar());
create policy super_borrar on articulo_super for delete using (hogar_id = mi_hogar());

create trigger t_comida before update on comida
  for each row execute function marcar_actualizado();
create trigger t_receta before update on receta
  for each row execute function marcar_actualizado();
create trigger t_super  before update on articulo_super
  for each row execute function marcar_actualizado();

-- Y la casa de prueba con la que se probó todo esto. Solo esa, por su código.
delete from hogar where codigo = 'HW3AUV';
