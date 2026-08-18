-- Juntos+ · tercer pedazo del esquema
-- Solo faltaba esto: poder quitar una meta de ingreso.
-- Se pega tal cual en Supabase → SQL Editor → Nueva consulta → Run.

create policy meta_borrar on meta_ingreso for delete
  using (hogar_id = mi_hogar() and soy_adulto());

-- Y de paso, tirar la casa de prueba que quedó de las pruebas del 18 de agosto.
-- Se lleva con ella sus tareas, cargos y movimientos. La casa de verdad no se
-- toca: aquí solo se nombra ese código.
delete from hogar where codigo = 'J8B4QW';
