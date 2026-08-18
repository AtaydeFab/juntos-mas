import { nube } from './cliente'
import { MIEMBROS } from '../seed'
import { armarMapa, type MapaMiembros } from './mapas'
import type { MiembroId } from '../types'

export interface Perfil {
  hogarId: string
  miembroId: string
  yo: MiembroId
  codigo: string
  mapa: MapaMiembros
}

/** Los mensajes de la base ya vienen en español; los de la red, no. */
function enEspanol(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e)
  if (/Invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.'
  if (/Email not confirmed/i.test(m)) return 'Esa cuenta todavía no está confirmada.'
  if (/Failed to fetch|NetworkError|network/i.test(m)) return 'Sin conexión. Lo intento de nuevo al rato.'
  return m
}

export async function entrar(correo: string, contrasena: string): Promise<void> {
  if (!nube) throw new Error('La app no tiene nube configurada.')
  const { error } = await nube.auth.signInWithPassword({ email: correo.trim(), password: contrasena })
  if (error) throw new Error(enEspanol(error))
}

export async function salir(): Promise<void> {
  await nube?.auth.signOut()
}

export async function haySesion(): Promise<boolean> {
  if (!nube) return false
  const { data } = await nube.auth.getSession()
  return Boolean(data.session)
}

export async function correoDeLaSesion(): Promise<string | null> {
  if (!nube) return null
  const { data } = await nube.auth.getUser()
  return data.user?.email ?? null
}

/** Busca a qué casa y a qué miembro corresponde la cuenta con la que se entró. */
export async function miPerfil(): Promise<Perfil | null> {
  if (!nube) return null
  const { data: sesion } = await nube.auth.getUser()
  if (!sesion.user) return null

  const { data: mio, error } = await nube
    .from('miembro')
    .select('id, corto, hogar_id')
    .eq('usuario_id', sesion.user.id)
    .maybeSingle()
  if (error) throw new Error(enEspanol(error))
  if (!mio) return null

  const [{ data: casa }, { data: todos }] = await Promise.all([
    nube.from('hogar').select('codigo').eq('id', mio.hogar_id).maybeSingle(),
    nube.from('miembro').select('id, corto').eq('hogar_id', mio.hogar_id),
  ])

  return {
    hogarId: mio.hogar_id as string,
    miembroId: mio.id as string,
    yo: (mio.corto as string).toLowerCase() as MiembroId,
    codigo: (casa?.codigo as string) ?? '',
    mapa: armarMapa((todos ?? []) as { id: string; corto: string }[]),
  }
}

const codigoNuevo = () => {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => letras[Math.floor(Math.random() * letras.length)]).join('')
}

/** Crea la casa con sus cuatro miembros y deja a quien la creó dentro. */
export async function crearCasa(nombre: string, yo: MiembroId): Promise<Perfil> {
  if (!nube) throw new Error('La app no tiene nube configurada.')
  const { error } = await nube.rpc('crear_hogar', {
    p_nombre: nombre,
    p_codigo: codigoNuevo(),
    p_miembros: MIEMBROS.map(m => ({ nombre: m.nombre, corto: m.corto, rol: m.rol, color: m.color })),
    p_yo: MIEMBROS.find(m => m.id === yo)?.corto,
  })
  if (error) throw new Error(enEspanol(error))

  const perfil = await miPerfil()
  if (!perfil) throw new Error('La casa se creó pero no pude entrar a ella.')
  return perfil
}

export async function miembrosDeLaCasa(codigo: string) {
  if (!nube) throw new Error('La app no tiene nube configurada.')
  const { data, error } = await nube.rpc('miembros_por_codigo', { p_codigo: codigo.trim() })
  if (error) throw new Error(enEspanol(error))
  return (data ?? []) as { corto: string; nombre: string; rol: string; tomado: boolean }[]
}

/** Toma un lugar libre en una casa que ya existe. */
export async function unirseACasa(codigo: string, corto: string): Promise<Perfil> {
  if (!nube) throw new Error('La app no tiene nube configurada.')
  const { error } = await nube.rpc('unirse_a_hogar', { p_codigo: codigo.trim(), p_corto: corto })
  if (error) throw new Error(enEspanol(error))

  const perfil = await miPerfil()
  if (!perfil) throw new Error('Entraste a la casa pero no pude leer tu perfil.')
  return perfil
}
