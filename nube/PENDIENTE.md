# La sincronización, terminada

Probada de punta a punta contra la base real el 18 de agosto de 2026.

## Cómo funciona

- **Entrar**: correo y contraseña. Las cuentas se crean desde Supabase
  (Autenticación → Usuarios), con "Auto Confirm User" palomeado; así nadie
  recibe correos de activación.
- **La casa**: el primero que entra la crea, con los cuatro miembros, y sube lo
  que ya tenía en su teléfono. La app le da un **código de seis letras**, que
  aparece en *Más*. Los demás entran con ese código y escogen su nombre.
- **Sincronizar**: cada cambio local se compara con el anterior, se encola y se
  manda. Si no hay señal, se queda guardado y sube solo al volver. Al abrir la
  app, al volver a ella y cada 25 segundos se baja lo que hayan hecho los otros.
- **Conflictos**: gana quien escribió al último, fila por fila.
- **Las hijas** no ven la pestaña de Dinero, y la base tampoco se los permite.

## Lo que quedó probado

- Crear la casa: 15 plantillas, 93 tareas y 7 cargos fijos subidos.
- Saira se une con el código y baja todo.
- Ella palomea y al otro teléfono le aparece **sin recargar**.
- Un evento del calendario viaja de un teléfono al otro.
- Confirmar la renta crea los dos movimientos con su reparto (2,500 y 2,000).
- Cero errores de red y cero errores en pantalla.

## Detalles que costaron

- `signInWithPassword` se colgaba por el candado interno de la librería; se
  reemplazó por uno que no bloquea, porque aquí solo hay una sesión por teléfono.
- El machote no tiene marca de borrado —se desactiva—, así que se consulta
  distinto que las demás tablas.
- Lo creado antes de conectar la nube traía identificadores cortos y la base
  pide UUID: se renombran respetando las referencias, y lo que igual no entre se
  descarta en vez de atorar la cola.

## Lo único que falta

Las metas de ingreso todavía no viajan a la nube: viven igual en los dos
teléfonos porque vienen de fábrica. Cuando haya pantalla para cambiarlas, se
agregan a la sincronización.
