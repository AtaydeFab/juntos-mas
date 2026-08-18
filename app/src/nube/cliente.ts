import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const llave = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * La app funciona sin nube: si no hay llaves, todo se queda en el teléfono.
 * Con llaves, además sincroniza entre los teléfonos de la casa.
 */
export const hayNube = Boolean(url && llave)

export const nube: SupabaseClient | null = hayNube
  ? createClient(url!, llave!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Sin señal, la sesión guardada basta para seguir usando la app.
        detectSessionInUrl: false,
        // La librería serializa sus llamadas con un candado del navegador que
        // en algunos navegadores nunca se suelta y deja el "Entrando…" colgado.
        // Aquí solo hay una pestaña y una sesión, así que no hace falta.
        lock: async (_nombre, _espera, tarea) => tarea(),
      },
    })
  : null
