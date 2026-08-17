import { useSyncExternalStore } from 'react'
import type { Estado, Evento, MiembroId, Plantilla, Recordatorio, Responsable, Tarea, Dia } from './types'
import { PLANTILLAS, RECORDATORIOS } from './seed'
import { dia, desdeYmd, hoy, indiceSemana, lunesDe, semanaDe, sumarDias, ymd } from './dates'

const LLAVE = 'juntos.v1'
const VERSION = 1

function inicial(): Estado {
  return {
    version: VERSION,
    yo: 'fa',
    plantillas: PLANTILLAS,
    tareas: [],
    eventos: [],
    recordatorios: RECORDATORIOS,
  }
}

function leer(): Estado {
  try {
    const crudo = localStorage.getItem(LLAVE)
    if (!crudo) return inicial()
    const datos = JSON.parse(crudo) as Estado
    if (datos.version !== VERSION) return inicial()
    return datos
  } catch {
    return inicial()
  }
}

let estado: Estado = typeof localStorage === 'undefined' ? inicial() : leer()
const oyentes = new Set<() => void>()

function guardar(nuevo: Estado) {
  estado = nuevo
  try {
    localStorage.setItem(LLAVE, JSON.stringify(nuevo))
  } catch {
    // Si no se puede guardar, la app sigue funcionando en memoria.
  }
  oyentes.forEach(fn => fn())
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

const id = () => Math.random().toString(36).slice(2, 10)

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
    plantillas: datos.plantillas,
    tareas: datos.tareas,
    eventos: datos.eventos ?? [],
    recordatorios: datos.recordatorios ?? [],
  })
  return { ok: true, mensaje: 'Listo, se restauró el respaldo.' }
}
