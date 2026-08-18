# Dónde va la sincronización

Estado al día de hoy, para retomar sin volver a explicar todo.

## Lo que ya está hecho

- **La app completa funcionando en local**: tareas con el machote de la casa,
  calendario, recordatorios y dinero. Publicada en
  `https://ataydefab.github.io/juntos-mas/` desde la carpeta `docs/`.
- **La base creada en Supabase** (proyecto `Juntos`, cuenta
  `fabianatayde2@gmail.com`), con `esquema.sql` ya corrido: 7 tablas,
  seguridad por fila y disparadores de marca de tiempo.
- **`esquema-dinero.sql` escrito pero todavía sin correr** en Supabase.
- **Cliente instalado** (`@supabase/supabase-js`) y `src/nube/cliente.ts`, que
  solo se activa si hay llaves. Las llaves viven en `app/.env`; la `anon`
  es pública por diseño y quien protege es la seguridad por fila.

## Lo que falta

1. Correr `nube/esquema-dinero.sql` en el SQL Editor de Supabase.
2. **Entrar y hogar**: registro con correo y contraseña, crear el hogar con los
   cuatro miembros, y código de invitación de un solo uso para que Saira entre
   al mismo hogar.
3. **Subir lo que ya existe** en el teléfono la primera vez, regenerando los
   identificadores como UUID (hoy son cadenas cortas, la base pide UUID).
4. **Sincronizar**: al abrir, bajar todo el hogar; en cada cambio, escribir
   local y encolar el envío; al reconectar, vaciar la cola. Suscripción en
   tiempo real para refrescar cuando el otro teléfono cambia algo.
5. Conflictos: gana la marca de tiempo más reciente por fila (`actualizado_en`).

## El estorbo

El entorno donde corre Claude tiene **bloqueada la salida a `supabase.co`**
(el proxy responde 403 al CONNECT). Llega a GitHub y a npm, pero no a la base,
así que la sincronización no se puede probar de punta a punta desde ahí.

Para desbloquearlo: en la configuración de Claude Code en la web, en el
entorno de esta sesión, permitir `*.supabase.co` en el acceso de red.
Documentación: https://code.claude.com/docs/en/claude-code-on-the-web

Si el cambio solo aplica a sesiones nuevas, basta con abrir una sesión nueva
sobre este repositorio y seguir desde aquí.
