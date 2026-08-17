# Conectar Juntos+ a la nube

La app funciona sin esto: guarda todo en el teléfono. Al agregar estas dos
variables, además sincroniza entre los teléfonos de la casa.

## 1. Crear el proyecto (gratis, sin tarjeta)

1. Entrar a supabase.com y crear cuenta (se puede con GitHub).
2. New project → nombre `juntos` → región la más cercana → guardar la
   contraseña que genera.
3. Cuando termine: Settings → API → copiar **Project URL** y la llave
   **anon public**.

## 2. Cargar el esquema

SQL Editor → New query → pegar todo `esquema.sql` → Run.

## 3. Conectar la app

Crear un archivo `.env.local` dentro de `app-src/`:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

Sin ese archivo la app corre igual, solo que en modo local.

La llave `anon` está pensada para vivir en el teléfono: no da acceso a nada
por sí sola, porque quien manda son las reglas de seguridad por fila del
esquema. La contraseña de la base y la llave `service_role` **no** se ponen
nunca en la app ni en el repositorio.
