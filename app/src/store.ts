import { useSyncExternalStore } from 'react'
import type { Estado, Evento, MiembroId, Movimiento, Nube, Plantilla, Recordatorio, Responsable, Tarea, Dia, Vista } from './types'
import { CARGOS_FIJOS, METAS, PLANTILLAS, RECORDATORIOS } from './seed'
import { dia, desdeYmd, hoy, indiceSemana, lunesDe, semanaDe, sumarDias, ymd } from './dates'

const LLAVE = 'juntos.v1'
const VERSION = 1

function inicial(): Estado {
  return {
    version: VERSION,
    yo: 'fa',
    vista: 'mias_y_ambos',
    plantillas: PLANTILLAS,
    tareas: [],
    eventos: [],
    recordatorios: RECORDATORIOS,
    cargosFijos: CARGOS_FIJOS,
    movimientos: [],
    metas: METAS,
  }
}

function leer(): Estado {
  try {
    const crudo = localStorage.getItem(LLAVE)
    if (!crudo) return inicial()
    const datos = JSON.parse(crudo) as Estado
    if (datos.version !== VERSION) return inicial()
    // Mezclado con los valores por defecto, para que un respaldo viejo no
    // se quede sin los campos que se agregaron después.
    return { ...inicial(), ...datos }
  } catch {
    return inicial()
  }
}

let estado: Estado = typeof localStorage === 'undefined' ? inicial() : leer()
const oyentes = new Set<() => void>()

/** La sincronización se engancha aquí para enterarse de cada cambio local. */
let observador: ((antes: Estado, despues: Estado) => void) | null = null
export function observarCambios(fn: (antes: Estado, despues: Estado) => void) {
  observador = fn
}

function guardar(nuevo: Estado, deLaNube = false) {
  const antes = estado
  estado = nuevo
  try {
    localStorage.setItem(LLAVE, JSON.stringify(nuevo))
  } catch {
    // Si no se puede guardar, la app sigue funcionando en memoria.
  }
  oyentes.forEach(fn => fn())
  if (!deLaNube) observador?.(antes, nuevo)
}

/** Aplica lo que llegó de la nube sin volver a mandarlo de regreso. */
export function aplicarDeLaNube(parcial: Partial<Estado>) {
  guardar({ ...estado, ...parcial }, true)
}

export function fijarNube(nube: Nube | undefined) {
  guardar({ ...estado, nube }, true)
}

export function estadoActual(): Estado {
  return estado
}

export function useEstado(): Estado {
  return useSyncExternalStore(
    (fn) => {
      oyentes.add(fn)
      return () => oyentes.delete(fn)
    },
    () => estado,
    () => estado,
  )
}

const id = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`

const esUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

/**
 * Lo que se creó antes de conectar la nube trae identificadores cortos y la
 * base pide UUID. Esto los renombra respetando las referencias entre filas.
 */
export function volverIdsUuid() {
  const nuevo = new Map<string, string>()
  const traducir = (v: string) => {
    if (esUuid(v)) return v
    if (!nuevo.has(v)) nuevo.set(v, id())
    return nuevo.get(v)!
  }

  guardar({
    ...estado,
    plantillas: estado.plantillas.map(p => ({ ...p, id: traducir(p.id) })),
    tareas: estado.tareas.map(t => ({
      ...t,
      id: traducir(t.id),
      plantillaId: t.plantillaId ? traducir(t.plantillaId) : undefined,
    })),
    eventos: estado.eventos.map(e => ({ ...e, id: traducir(e.id) })),
    recordatorios: estado.recordatorios.map(r => ({ ...r, id: traducir(r.id) })),
    cargosFijos: estado.cargosFijos.map(c => ({ ...c, id: traducir(c.id) })),
    movimientos: estado.movimientos.map(v => ({
      ...v,
      id: traducir(v.id),
      cargoId: v.cargoId ? traducir(v.cargoId) : undefined,
    })),
  }, true)
}

/** A quién le toca esta semana una tarea de turno rotativo. */
export function turnoDeLaSemana(entre: MiembroId[], fecha: Date): MiembroId {
  return entre[indiceSemana(fecha) % entre.length]
}

function aplica(p: Plantilla, fecha: Date): boolean {
  if (p.frecuencia.tipo === 'diaria') return true
  if (p.frecuencia.tipo === 'dias') return p.frecuencia.dias.includes(dia(fecha))
  return false
}

/**
 * Crea las tareas de una semana a partir del machote, si todavía no existen.
 * Es idempotente: llamarla dos veces no duplica nada.
 */
export function materializarSemana(lunes: Date) {
  const clave = ymd(lunes)
  const existentes = new Set(
    estado.tareas.filter(t => t.semana === clave && t.plantillaId).map(t => `${t.plantillaId}|${t.fecha ?? 'semana'}`),
  )
  const nuevas: Tarea[] = []

  for (const p of estado.plantillas) {
    if (!p.activa) continue

    if (p.frecuencia.tipo === 'semanal') {
      if (!existentes.has(`${p.id}|semana`)) {
        nuevas.push({
          id: id(), titulo: p.titulo, plantillaId: p.id, responsable: p.responsable,
          turnoEntre: p.turnoEntre, fecha: null, semana: clave, hecha: false, suelta: false,
        })
      }
      continue
    }

    for (let i = 0; i < 7; i++) {
      const f = sumarDias(lunes, i)
      if (!aplica(p, f)) continue
      const k = `${p.id}|${ymd(f)}`
      if (existentes.has(k)) continue
      nuevas.push({
        id: id(), titulo: p.titulo, plantillaId: p.id, responsable: p.responsable,
        turnoEntre: p.turnoEntre, fecha: ymd(f), semana: clave, hecha: false, suelta: false,
      })
    }
  }

  if (nuevas.length) guardar({ ...estado, tareas: [...estado.tareas, ...nuevas] })
}

export function palomear(tareaId: string, quien: MiembroId) {
  guardar({
    ...estado,
    tareas: estado.tareas.map(t => {
      if (t.id !== tareaId) return t
      if (t.hecha) return { ...t, hecha: false, hechaPor: undefined, hechaEn: undefined }
      return { ...t, hecha: true, hechaPor: quien, hechaEn: new Date().toISOString(), fecha: t.fecha ?? ymd(hoy()) }
    }),
  })
}

export function moverTarea(tareaId: string, fecha: string) {
  guardar({
    ...estado,
    tareas: estado.tareas.map(t => (t.id === tareaId ? { ...t, fecha, semana: semanaDe(desdeYmd(fecha)) } : t)),
  })
}

export function pasarTarea(tareaId: string, a: Responsable) {
  guardar({ ...estado, tareas: estado.tareas.map(t => (t.id === tareaId ? { ...t, responsable: a } : t)) })
}

export function borrarTarea(tareaId: string, alcance: 'una' | 'serie') {
  const tarea = estado.tareas.find(t => t.id === tareaId)
  if (!tarea) return
  if (alcance === 'una' || !tarea.plantillaId) {
    guardar({ ...estado, tareas: estado.tareas.filter(t => t.id !== tareaId) })
    return
  }
  guardar({
    ...estado,
    plantillas: estado.plantillas.map(p => (p.id === tarea.plantillaId ? { ...p, activa: false } : p)),
    tareas: estado.tareas.filter(t => t.plantillaId !== tarea.plantillaId || (t.hecha && t.fecha)),
  })
}

export interface NuevaTarea {
  titulo: string
  responsable: Responsable
  fecha: string | null
  repite: boolean
  /** Solo si repite: días de la semana. Vacío = diaria. */
  dias?: Dia[]
  /** Solo si repite y no tiene día fijo. */
  semanalFlexible?: boolean
  asignadaPor?: MiembroId
}

export function agregarTarea(n: NuevaTarea) {
  if (n.repite) {
    const plantilla: Plantilla = {
      id: id(),
      titulo: n.titulo,
      responsable: n.responsable,
      frecuencia: n.semanalFlexible
        ? { tipo: 'semanal' }
        : n.dias && n.dias.length
          ? { tipo: 'dias', dias: n.dias }
          : { tipo: 'diaria' },
      activa: true,
    }
    guardar({ ...estado, plantillas: [...estado.plantillas, plantilla] })
    materializarSemana(lunesDe(hoy()))
    return
  }

  const fecha = n.fecha ?? ymd(hoy())
  const tarea: Tarea = {
    id: id(), titulo: n.titulo, responsable: n.responsable, fecha,
    semana: semanaDe(desdeYmd(fecha)), hecha: false, suelta: true, asignadaPor: n.asignadaPor,
  }
  guardar({ ...estado, tareas: [...estado.tareas, tarea] })
}

export function agregarEvento(ev: Omit<Evento, 'id'>) {
  guardar({ ...estado, eventos: [...estado.eventos, { ...ev, id: id() }] })
}

export function borrarEvento(eventoId: string) {
  guardar({ ...estado, eventos: estado.eventos.filter(e => e.id !== eventoId) })
}

export function agregarRecordatorio(r: Omit<Recordatorio, 'id'>) {
  guardar({ ...estado, recordatorios: [...estado.recordatorios, { ...r, id: id() }] })
}

export function borrarRecordatorio(recordatorioId: string) {
  guardar({ ...estado, recordatorios: estado.recordatorios.filter(r => r.id !== recordatorioId) })
}

export function cambiarYo(yo: MiembroId) {
  guardar({ ...estado, yo })
}

export function agregarMovimiento(m: Omit<Movimiento, 'id'>) {
  guardar({ ...estado, movimientos: [...estado.movimientos, { ...m, id: id() }] })
}

/** Confirma un cargo fijo: si se reparte, deja un movimiento por persona. */
export function confirmarCargo(cargoId: string, periodo: string, fecha: string, montoReal?: number) {
  const cargo = estado.cargosFijos.find(c => c.id === cargoId)
  if (!cargo) return
  const total = montoReal ?? cargo.monto
  const base = { tipo: cargo.tipo, categoria: cargo.categoria, fecha, cargoId, periodo, nota: cargo.titulo }

  const nuevos: Movimiento[] = cargo.aportaciones?.length
    ? cargo.aportaciones.map(a => ({
        ...base,
        id: id(),
        miembro: a.miembro,
        // Si el monto real cambió, se reparte en la misma proporción acordada.
        monto: Math.round(total * (a.monto / cargo.monto)),
      }))
    : [{ ...base, id: id(), miembro: cargo.quien, monto: total }]

  guardar({ ...estado, movimientos: [...estado.movimientos, ...nuevos] })
}

export function borrarMovimiento(movimientoId: string) {
  guardar({ ...estado, movimientos: estado.movimientos.filter(m => m.id !== movimientoId) })
}

export function cambiarVista(vista: Vista) {
  guardar({ ...estado, vista })
}

export function reiniciar() {
  guardar(inicial())
}

/** Todo lo de este teléfono en un archivo, para no depender de que el navegador no se limpie. */
export function exportar(): string {
  return JSON.stringify({ ...estado, exportadoEn: new Date().toISOString() }, null, 2)
}

export function importar(texto: string): { ok: boolean; mensaje: string } {
  let datos: Partial<Estado>
  try {
    datos = JSON.parse(texto) as Partial<Estado>
  } catch {
    return { ok: false, mensaje: 'Ese archivo no se pudo leer. ¿Es el respaldo que bajó la app?' }
  }
  if (datos.version !== VERSION || !Array.isArray(datos.tareas) || !Array.isArray(datos.plantillas)) {
    return { ok: false, mensaje: 'El archivo no es un respaldo de Juntos+ o es de otra versión.' }
  }
  guardar({
    version: VERSION,
    yo: datos.yo ?? 'fa',
    vista: datos.vista ?? 'mias_y_ambos',
    plantillas: datos.plantillas,
    tareas: datos.tareas,
    eventos: datos.eventos ?? [],
    recordatorios: datos.recordatorios ?? [],
    cargosFijos: datos.cargosFijos ?? CARGOS_FIJOS,
    movimientos: datos.movimientos ?? [],
    metas: datos.metas ?? METAS,
  })
  return { ok: true, mensaje: 'Listo, se restauró el respaldo.' }
}
