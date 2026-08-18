import { useSyncExternalStore } from 'react'
import { nube, hayNube } from './cliente'
import { miPerfil, type Perfil } from './sesion'
import { aplicarDeLaNube, cambiarYo, estadoActual, fijarNube, observarCambios, volverIdsUuid } from '../store'
import type { Estado } from '../types'
import {
  cargoAFila, eventoAFila, filaACargo, filaAEvento, filaAMovimiento, filaAPlantilla,
  filaARecordatorio, filaATarea, movimientoAFila, plantillaAFila, recordatorioAFila, tareaAFila,
  type Fila, type Tabla,
} from './mapas'

export type Conexion = 'sin-nube' | 'sin-sesion' | 'sin-casa' | 'sincronizando' | 'listo' | 'sin-señal' | 'error'

interface Operacion {
  clave: string
  tabla: Tabla
  fila: Fila
  borrar?: boolean
}

const LLAVE_COLA = 'juntos.cola'

const esUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

let perfil: Perfil | null = null
let conexion: Conexion = hayNube ? 'sin-sesion' : 'sin-nube'
let detalle = ''
let cola: Operacion[] = leerCola()

const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach(fn => fn())

function leerCola(): Operacion[] {
  try {
    return JSON.parse(localStorage.getItem(LLAVE_COLA) ?? '[]') as Operacion[]
  } catch {
    return []
  }
}

function guardarCola() {
  try {
    localStorage.setItem(LLAVE_COLA, JSON.stringify(cola))
  } catch {
    // Si el teléfono no deja guardar, la cola vive en memoria hasta cerrar.
  }
}

function fijar(nuevo: Conexion, texto = '') {
  conexion = nuevo
  detalle = texto
  avisar()
}

export interface VistaNube {
  conexion: Conexion
  detalle: string
  pendientes: number
  perfil: Perfil | null
}

let ultimaVista: VistaNube = { conexion, detalle, pendientes: cola.length, perfil }

export function useNube(): VistaNube {
  return useSyncExternalStore(
    fn => {
      oyentes.add(fn)
      return () => oyentes.delete(fn)
    },
    () => {
      if (
        ultimaVista.conexion !== conexion || ultimaVista.detalle !== detalle ||
        ultimaVista.pendientes !== cola.length || ultimaVista.perfil !== perfil
      ) {
        ultimaVista = { conexion, detalle, pendientes: cola.length, perfil }
      }
      return ultimaVista
    },
    () => ultimaVista,
  )
}

// --------------------------------------------------------------- diferencias

type Coleccion = 'plantillas' | 'tareas' | 'eventos' | 'recordatorios' | 'cargosFijos' | 'movimientos'

const TABLA_DE: Record<Coleccion, Tabla> = {
  plantillas: 'plantilla',
  tareas: 'tarea',
  eventos: 'evento',
  recordatorios: 'recordatorio',
  cargosFijos: 'cargo_fijo',
  movimientos: 'movimiento',
}

function aFila(coleccion: Coleccion, dato: unknown, p: Perfil, yo: Estado['yo']): Fila {
  switch (coleccion) {
    case 'plantillas': return plantillaAFila(dato as never, p.hogarId, p.mapa)
    case 'tareas': return tareaAFila(dato as never, p.hogarId, p.mapa)
    case 'eventos': return eventoAFila(dato as never, p.hogarId, p.mapa)
    case 'recordatorios': return recordatorioAFila(dato as never, p.hogarId, p.mapa, yo)
    case 'cargosFijos': return cargoAFila(dato as never, p.hogarId, p.mapa)
    case 'movimientos': return movimientoAFila(dato as never, p.hogarId, p.mapa)
  }
}

/** Compara el antes y el después para saber qué mandar a la nube. */
function diferencias(antes: Estado, despues: Estado, p: Perfil): Operacion[] {
  const ops: Operacion[] = []

  for (const coleccion of Object.keys(TABLA_DE) as Coleccion[]) {
    const viejos = new Map((antes[coleccion] as { id: string }[]).map(x => [x.id, x]))
    const nuevos = new Map((despues[coleccion] as { id: string }[]).map(x => [x.id, x]))

    for (const [id, dato] of nuevos) {
      const previo = viejos.get(id)
      if (previo && JSON.stringify(previo) === JSON.stringify(dato)) continue
      ops.push({
        clave: `${TABLA_DE[coleccion]}|${id}`,
        tabla: TABLA_DE[coleccion],
        fila: aFila(coleccion, dato, p, despues.yo),
      })
    }

    for (const [id] of viejos) {
      if (nuevos.has(id)) continue
      ops.push({
        clave: `${TABLA_DE[coleccion]}|${id}`,
        tabla: TABLA_DE[coleccion],
        fila: { id, borrado_en: new Date().toISOString() },
        borrar: true,
      })
    }
  }

  return ops
}

function encolar(nuevas: Operacion[]) {
  if (!nuevas.length) return
  // Si una fila cambia dos veces antes de enviarse, solo viaja la última.
  const porClave = new Map(cola.map(o => [o.clave, o]))
  for (const op of nuevas) porClave.set(op.clave, op)
  cola = [...porClave.values()]
  guardarCola()
  avisar()
  void vaciarCola()
}

let vaciando = false

export async function vaciarCola(): Promise<void> {
  if (!nube || !perfil || vaciando || !cola.length) return
  vaciando = true

  try {
    while (cola.length) {
      const op = cola[0]
      const { error } = op.borrar
        ? await nube.from(op.tabla).update({ borrado_en: op.fila.borrado_en }).eq('id', op.fila.id as string)
        : await nube.from(op.tabla).upsert(op.fila)

      if (error) {
        // Permiso denegado o duplicado: esa fila no va a entrar nunca, se descarta
        // para que no atore a las demás. Lo de red sí se reintenta después.
        const codigo = (error as { code?: string }).code ?? ''
        if (codigo === '42501' || codigo === '23505' || codigo === '23503' || codigo === '22P02') {
          cola = cola.slice(1)
          guardarCola()
          continue
        }
        fijar('sin-señal', 'Guardado en el teléfono. Se sube cuando vuelva la señal.')
        return
      }

      cola = cola.slice(1)
      guardarCola()
      avisar()
    }
    if (conexion !== 'listo') fijar('listo')
  } finally {
    vaciando = false
  }
}

// ------------------------------------------------------------------- bajar

export async function bajar(): Promise<void> {
  if (!nube || !perfil) return
  const p = perfil
  const conexionNube = nube

  const tablas: Tabla[] = ['plantilla', 'tarea', 'evento', 'recordatorio', 'cargo_fijo', 'movimiento']
  const resultados = await Promise.all(
    tablas.map(t => {
      const consulta = conexionNube.from(t).select('*').eq('hogar_id', p.hogarId)
      // El machote no se borra, se desactiva; las demás sí llevan marca de borrado.
      return t === 'plantilla' ? consulta : consulta.is('borrado_en', null)
    }),
  )

  const conError = resultados.find(r => r.error)
  if (conError?.error) {
    fijar('sin-señal', 'No pude bajar los cambios. Lo intento otra vez al rato.')
    return
  }

  const [plantillas, tareas, eventos, recordatorios, cargos, movimientos] = resultados.map(r => (r.data ?? []) as Fila[])

  aplicarDeLaNube({
    plantillas: plantillas.map(f => filaAPlantilla(f, p.mapa)),
    tareas: tareas.map(f => filaATarea(f, p.mapa)),
    eventos: eventos.map(f => filaAEvento(f, p.mapa)),
    recordatorios: recordatorios.map(f => filaARecordatorio(f, p.mapa)),
    cargosFijos: cargos.map(f => filaACargo(f, p.mapa)),
    movimientos: movimientos.map(f => filaAMovimiento(f, p.mapa)),
  })
  fijar('listo')
}

let bajadaPendiente: ReturnType<typeof setTimeout> | null = null
function bajarPronto() {
  if (bajadaPendiente) clearTimeout(bajadaPendiente)
  bajadaPendiente = setTimeout(() => { void bajar() }, 400)
}

let repaso: ReturnType<typeof setInterval> | null = null

function escuchar() {
  if (!nube || !perfil) return

  // En vivo, cuando la base lo permite.
  nube
    .channel('casa')
    .on('postgres_changes', { event: '*', schema: 'public' }, () => bajarPronto())
    .subscribe()

  // Y de todos modos, un repaso cada rato y al volver a la app: así los dos
  // teléfonos se ponen de acuerdo aunque el aviso en vivo no llegue.
  if (repaso) clearInterval(repaso)
  repaso = setInterval(() => { void vaciarCola().then(() => bajar()) }, 25000)

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void vaciarCola().then(() => bajar())
  })
}

// ------------------------------------------------------------------ arranque

/** Sube por primera vez lo que ya existía en el teléfono. */
export async function subirLoDeAqui(): Promise<void> {
  if (!perfil) return
  volverIdsUuid()
  const vacio: Estado = {
    ...estadoActual(),
    plantillas: [], tareas: [], eventos: [], recordatorios: [], cargosFijos: [], movimientos: [],
  }
  encolar(diferencias(vacio, estadoActual(), perfil))
  await vaciarCola()
}

export async function arrancarNube(): Promise<Conexion> {
  if (!hayNube || !nube) { fijar('sin-nube'); return conexion }

  const { data } = await nube.auth.getSession()
  if (!data.session) { fijar('sin-sesion'); return conexion }

  fijar('sincronizando')
  try {
    perfil = await miPerfil()
  } catch (e) {
    fijar('error', e instanceof Error ? e.message : 'No pude leer tu perfil.')
    return conexion
  }

  if (!perfil) {
    fijarNube(undefined)
    fijar('sin-casa')
    return conexion
  }

  fijarNube({
    hogarId: perfil.hogarId,
    miembroId: perfil.miembroId,
    codigo: perfil.codigo,
    correo: data.session.user.email ?? '',
  })
  cambiarYo(perfil.yo)

  // Lo que quedó encolado antes de tener casa trae identificadores viejos.
  cola = cola.filter(o => esUuid(String(o.fila.id ?? '')))
  guardarCola()

  await bajar()
  await vaciarCola()
  escuchar()
  return conexion
}

export function olvidarNube() {
  perfil = null
  cola = []
  guardarCola()
  fijarNube(undefined)
  fijar('sin-sesion')
}

// Cada cambio local se convierte en algo que mandar.
observarCambios((antes, despues) => {
  if (!perfil) return
  encolar(diferencias(antes, despues, perfil))
})

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { void vaciarCola().then(() => bajar()) })
}
