import { useSyncExternalStore } from 'react'
import type {
  Comida, Estado, Evento, ItemSuper, MiembroId, Movimiento, Nube, Plantilla, Receta, Recordatorio,
  Responsable, Tarea, Dia, Tiempo, Vista,
} from './types'
import { CARGOS_FIJOS, METAS, PLANTILLAS, RECORDATORIOS } from './seed'
import { RECETARIO } from './recetario'
import { dia, desdeYmd, hoy, indiceSemana, lunesDe, semanaDe, sumarDias, ymd } from './dates'

const LLAVE = 'juntos.v1'
const VERSION = 1

const id = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`

/**
 * Lo que viene de fábrica nace con identificadores de verdad (UUID), no con
 * nombres cortos: así la base los acepta tal cual cuando se suben a la casa.
 */
function inicial(): Estado {
  return {
    version: VERSION,
    yo: 'fa',
    vista: 'mias_y_ambos',
    plantillas: PLANTILLAS.map(p => ({ ...p, id: id() })),
    tareas: [],
    eventos: [],
    recordatorios: RECORDATORIOS.map(r => ({ ...r, id: id() })),
    cargosFijos: CARGOS_FIJOS.map(c => ({ ...c, id: id() })),
    movimientos: [],
    metas: METAS.map(m => ({ ...m, id: id() })),
    comidas: [],
    recetas: [],
    super: [],
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
    metas: estado.metas.map(m => ({ ...m, id: traducir(m.id) })),
    comidas: estado.comidas.map(c => ({ ...c, id: traducir(c.id) })),
    recetas: estado.recetas.map(r => ({ ...r, id: traducir(r.id) })),
    super: estado.super.map(i => ({ ...i, id: traducir(i.id) })),
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

/** Cambia la meta de ingreso de alguien, o la crea si no tenía. */
export function fijarMeta(miembro: MiembroId, monto: number) {
  const existe = estado.metas.some(m => m.miembro === miembro)
  guardar({
    ...estado,
    metas: existe
      ? estado.metas.map(m => (m.miembro === miembro ? { ...m, monto } : m))
      : [...estado.metas, { id: id(), miembro, monto, periodo: 'semanal' }],
  })
}

export function quitarMeta(miembro: MiembroId) {
  guardar({ ...estado, metas: estado.metas.filter(m => m.miembro !== miembro) })
}

export function cambiarVista(vista: Vista) {
  guardar({ ...estado, vista })
}

// ------------------------------------------------------------------ comida

/** Busca un platillo, primero entre los de la casa y luego en el recetario. */
export function receta(recetaId?: string): Receta | undefined {
  if (!recetaId) return undefined
  return estado.recetas.find(r => r.id === recetaId) ?? RECETARIO.find(r => r.id === recetaId)
}

/** Todas las que se pueden escoger: las de la casa primero. */
export function todasLasRecetas(): Receta[] {
  return [...estado.recetas, ...RECETARIO]
}

/** Pone (o cambia) lo que toca comer un día a una hora. */
export function planear(fecha: string, tiempo: Tiempo, que: { titulo: string; recetaId?: string; cocina?: MiembroId }) {
  const previa = estado.comidas.find(c => c.fecha === fecha && c.tiempo === tiempo)
  const comida: Comida = {
    id: previa?.id ?? id(),
    fecha,
    tiempo,
    titulo: que.titulo,
    recetaId: que.recetaId,
    cocina: que.cocina ?? previa?.cocina,
    listo: false,
  }
  guardar({
    ...estado,
    comidas: previa
      ? estado.comidas.map(c => (c.id === previa.id ? comida : c))
      : [...estado.comidas, comida],
  })
}

export function quitarComida(comidaId: string) {
  guardar({ ...estado, comidas: estado.comidas.filter(c => c.id !== comidaId) })
}

export function comidaLista(comidaId: string) {
  guardar({
    ...estado,
    comidas: estado.comidas.map(c => (c.id === comidaId ? { ...c, listo: !c.listo } : c)),
  })
}

export function quienCocina(comidaId: string, quien?: MiembroId) {
  guardar({
    ...estado,
    comidas: estado.comidas.map(c => (c.id === comidaId ? { ...c, cocina: quien } : c)),
  })
}

/**
 * Llena los huecos de la semana con platillos variados: no repite el mismo dos
 * veces, ni deja dos días seguidos con lo mismo. Lo ya planeado no se toca.
 */
export function sugerirSemana(lunes: Date) {
  const dias = Array.from({ length: 7 }, (_, i) => ymd(sumarDias(lunes, i)))
  const puestos = new Set(
    estado.comidas.filter(c => dias.includes(c.fecha)).map(c => `${c.fecha}|${c.tiempo}`),
  )
  // Lo que ya se comió estas semanas pesa: se deja para el final de la fila.
  const recientes = new Set(estado.comidas.map(c => c.recetaId).filter(Boolean) as string[])
  const nuevas: Comida[] = []
  const usadas = new Set<string>()

  for (const tiempo of ['almuerzo', 'comida', 'cena'] as Tiempo[]) {
    const fila = todasLasRecetas()
      .filter(r => r.tiempos.includes(tiempo))
      .sort((x, y) => Number(recientes.has(x.id)) - Number(recientes.has(y.id)))

    for (const fecha of dias) {
      if (puestos.has(`${fecha}|${tiempo}`)) continue
      const escogida = fila.find(r => !usadas.has(r.id)) ?? fila[0]
      if (!escogida) break
      usadas.add(escogida.id)
      nuevas.push({
        id: id(), fecha, tiempo, titulo: escogida.titulo, recetaId: escogida.id, listo: false,
      })
    }
  }

  if (!nuevas.length) return
  guardar({ ...estado, comidas: [...estado.comidas, ...nuevas] })
}

/** Borra el menú de esa semana, para empezarla de nuevo. */
export function limpiarSemanaDeComida(lunes: Date) {
  const dias = new Set(Array.from({ length: 7 }, (_, i) => ymd(sumarDias(lunes, i))))
  guardar({ ...estado, comidas: estado.comidas.filter(c => !dias.has(c.fecha)) })
}

// ------------------------------------------------------------------- súper

/** "Jitomate" y "jitomates" no, pero "Jitomate" y "jitomate" sí son lo mismo. */
const pelado = (s: string) => s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const mismaCosa = (a: string, b: string) => pelado(a) === pelado(b)

export function agregarAlSuper(nuevo: Omit<ItemSuper, 'id' | 'comprado'>) {
  if (estado.super.some(i => !i.comprado && mismaCosa(i.que, nuevo.que))) return
  guardar({ ...estado, super: [...estado.super, { ...nuevo, id: id(), comprado: false }] })
}

export function alternarComprado(itemId: string) {
  guardar({
    ...estado,
    super: estado.super.map(i => (i.id === itemId ? { ...i, comprado: !i.comprado } : i)),
  })
}

export function quitarDelSuper(itemId: string) {
  guardar({ ...estado, super: estado.super.filter(i => i.id !== itemId) })
}

export function limpiarComprados() {
  guardar({ ...estado, super: estado.super.filter(i => !i.comprado) })
}

/**
 * Junta los ingredientes de todo lo planeado en la semana y los pone en la
 * lista, sin repetir lo que ya estaba pendiente. Devuelve cuántos se agregaron.
 */
/**
 * Junta cantidades del mismo ingrediente: "1/2" y "1/2" y "2" de cebolla salen
 * como "3", y "250 g" con "200 g" como "450 g". Lo que no trae número —"al
 * gusto", "un manojo"— se queda tal cual, porque no hay nada que sumar.
 */
const INVARIABLES = new Set(['g', 'gr', 'kg', 'ml', 'l'])
const PESOS = new Set(['g', 'gr', 'gramo', 'kilo', 'kg', 'ml', 'litro', 'l'])

function sumarCantidades(cuantos: string[]): string | undefined {
  if (!cuantos.length) return undefined
  const porUnidad = new Map<string, { suma: number; texto: string }>()
  const sinNumero: string[] = []

  for (const bruto of cuantos) {
    const m = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*(.*)$/.exec(bruto.trim())
    if (!m) { sinNumero.push(bruto.trim()); continue }
    const [entero, fraccion] = m[1].split(/\s+/)
    const aNumero = (x: string) => {
      const [a, b] = x.split('/').map(Number)
      return b ? a / b : a
    }
    const valor = aNumero(entero) + (fraccion ? aNumero(fraccion) : 0)
    // "diente" y "dientes" son la misma unidad: se guardan juntas en singular.
    const unidad = m[2].trim().toLowerCase()
    const base = INVARIABLES.has(unidad) ? unidad : unidad.replace(/s$/, '')
    const previo = porUnidad.get(base) ?? { suma: 0, texto: base }
    previo.suma += valor
    porUnidad.set(base, previo)
  }

  if (!porUnidad.size) return sinNumero[0]

  const partes = [...porUnidad.values()].map(({ suma, texto }) => {
    const cantidad = PESOS.has(texto) ? Math.round(suma) : Math.ceil(suma)
    if (!texto) return `${cantidad}`
    const unidad = cantidad === 1 || INVARIABLES.has(texto) ? texto : `${texto}s`
    return `${cantidad} ${unidad}`
  })
  return partes.join(' + ')
}

export function surtirDeLaSemana(lunes: Date): number {
  const dias = new Set(Array.from({ length: 7 }, (_, i) => ymd(sumarDias(lunes, i))))
  const pendientes = estado.super.filter(i => !i.comprado)
  // Lo mismo puede salir en varios platillos: se junta en un renglón, con las
  // cantidades sumadas a la vista y de dónde viene cada una.
  const junta = new Map<string, { que: string; pasillo: ItemSuper['pasillo']; cuantos: string[]; platillos: string[] }>()

  for (const c of estado.comidas) {
    if (!dias.has(c.fecha)) continue
    const r = receta(c.recetaId)
    if (!r) continue
    for (const ing of r.ingredientes) {
      if (pendientes.some(i => mismaCosa(i.que, ing.que))) continue
      const llave = pelado(ing.que)
      const previo = junta.get(llave) ?? { que: ing.que, pasillo: ing.pasillo, cuantos: [], platillos: [] }
      if (ing.cuanto) previo.cuantos.push(ing.cuanto)
      if (!previo.platillos.includes(r.titulo)) previo.platillos.push(r.titulo)
      junta.set(llave, previo)
    }
  }

  if (!junta.size) return 0
  const agregados: ItemSuper[] = [...junta.values()].map(x => ({
    id: id(),
    que: x.que,
    cuanto: sumarCantidades(x.cuantos),
    pasillo: x.pasillo,
    comprado: false,
    deReceta: x.platillos.length > 2
      ? `para ${x.platillos.length} platillos`
      : x.platillos.join(' y '),
  }))
  guardar({ ...estado, super: [...estado.super, ...agregados] })
  return agregados.length
}

/** Manda los ingredientes de un solo platillo a la lista. */
export function ingredientesAlSuper(recetaId: string): number {
  const r = receta(recetaId)
  if (!r) return 0
  const antes = estado.super.length
  for (const ing of r.ingredientes) {
    agregarAlSuper({ que: ing.que, cuanto: ing.cuanto, pasillo: ing.pasillo, deReceta: r.titulo })
  }
  return estado.super.length - antes
}

// ----------------------------------------------------------------- recetas

export function guardarReceta(r: Omit<Receta, 'id' | 'deLaCasa'> & { id?: string }) {
  const nueva: Receta = { ...r, id: r.id ?? id(), deLaCasa: true }
  guardar({
    ...estado,
    recetas: estado.recetas.some(x => x.id === nueva.id)
      ? estado.recetas.map(x => (x.id === nueva.id ? nueva : x))
      : [...estado.recetas, nueva],
  })
}

export function borrarReceta(recetaId: string) {
  guardar({ ...estado, recetas: estado.recetas.filter(r => r.id !== recetaId) })
}

/**
 * Deja el machote como venía. Se conserva quién eres y la casa a la que estás
 * conectado, para no quedarte fuera por hacer borrón y cuenta nueva; y como
 * todo nace de nuevo, se sube a la casa igual que cualquier otro cambio.
 */
export function reiniciar() {
  guardar({ ...inicial(), yo: estado.yo, vista: estado.vista, nube: estado.nube })
  materializarSemana(lunesDe(hoy()))
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
    comidas: datos.comidas ?? [],
    recetas: datos.recetas ?? [],
    super: datos.super ?? [],
  })
  return { ok: true, mensaje: 'Listo, se restauró el respaldo.' }
}
