import type {
  CargoFijo, Comida, Evento, Ingrediente, ItemSuper, MetaIngreso, MiembroId, Movimiento, Pasillo,
  Plantilla, Receta, Recordatorio, Responsable, Tarea, Tiempo, Dia,
} from '../types'

/** Traduce entre los identificadores cortos de la app (fa, sa…) y los de la base. */
export interface MapaMiembros {
  aUuid: Record<string, string>
  aLocal: Record<string, MiembroId>
}

export function armarMapa(filas: { id: string; corto: string }[]): MapaMiembros {
  const aUuid: Record<string, string> = {}
  const aLocal: Record<string, MiembroId> = {}
  for (const f of filas) {
    const local = f.corto.toLowerCase() as MiembroId
    aUuid[local] = f.id
    aLocal[f.id] = local
  }
  return { aUuid, aLocal }
}

const respAUuid = (r: Responsable, m: MapaMiembros): string =>
  r === 'ambos' || r === 'turno' ? r : (m.aUuid[r] ?? r)

const respALocal = (r: string, m: MapaMiembros): Responsable =>
  r === 'ambos' || r === 'turno' ? r : (m.aLocal[r] ?? 'fa')

/** Las filas de la base, tal como viajan por la red. */
export type Fila = Record<string, unknown>

export const TABLAS = [
  'plantilla', 'tarea', 'evento', 'recordatorio', 'cargo_fijo', 'movimiento', 'meta_ingreso',
  'comida', 'receta', 'articulo_super',
] as const
export type Tabla = (typeof TABLAS)[number]

// ------------------------------------------------------------ hacia la base

export function plantillaAFila(p: Plantilla, hogar: string, m: MapaMiembros): Fila {
  return {
    id: p.id,
    hogar_id: hogar,
    titulo: p.titulo,
    responsable: respAUuid(p.responsable, m),
    turno_entre: (p.turnoEntre ?? []).map(x => m.aUuid[x] ?? x),
    frecuencia: p.frecuencia.tipo,
    dias: p.frecuencia.tipo === 'dias' ? p.frecuencia.dias : [],
    activa: p.activa,
  }
}

export function tareaAFila(t: Tarea, hogar: string, m: MapaMiembros): Fila {
  return {
    id: t.id,
    hogar_id: hogar,
    plantilla_id: t.plantillaId ?? null,
    titulo: t.titulo,
    responsable: respAUuid(t.responsable, m),
    turno_entre: (t.turnoEntre ?? []).map(x => m.aUuid[x] ?? x),
    fecha: t.fecha,
    semana: t.semana,
    hecha: t.hecha,
    hecha_por: t.hechaPor ? (m.aUuid[t.hechaPor] ?? null) : null,
    hecha_en: t.hechaEn ?? null,
    asignada_por: t.asignadaPor ? (m.aUuid[t.asignadaPor] ?? null) : null,
    suelta: t.suelta,
    borrado_en: null,
  }
}

export function eventoAFila(e: Evento, hogar: string, m: MapaMiembros): Fila {
  return {
    id: e.id,
    hogar_id: hogar,
    titulo: e.titulo,
    fecha: e.fecha,
    hora: e.hora || null,
    anual: e.anual,
    lugar: e.lugar || null,
    con_quien: e.conQuien.map(x => m.aUuid[x] ?? x),
    avisar_dias_antes: e.avisarDiasAntes,
    borrado_en: null,
  }
}

export function recordatorioAFila(r: Recordatorio, hogar: string, m: MapaMiembros, yo: MiembroId): Fila {
  return {
    id: r.id,
    hogar_id: hogar,
    texto: r.texto,
    para: m.aUuid[r.para] ?? r.para,
    propuesto_por: m.aUuid[yo] ?? null,
    aceptado: true,
    permanente: r.permanente,
    hasta: r.hasta ?? null,
    borrado_en: null,
  }
}

export function cargoAFila(c: CargoFijo, hogar: string, m: MapaMiembros): Fila {
  return {
    id: c.id,
    hogar_id: hogar,
    titulo: c.titulo,
    tipo: c.tipo,
    categoria: c.categoria,
    monto: c.monto,
    cada: c.cada,
    dia_del_mes: c.diaDelMes ?? null,
    ancla_mes: c.anclaMes ?? null,
    quien: m.aUuid[c.quien] ?? c.quien,
    aportaciones: (c.aportaciones ?? []).map(a => ({ miembro: m.aUuid[a.miembro] ?? a.miembro, monto: a.monto })),
    variable: c.variable ?? false,
    activo: c.activo,
    borrado_en: null,
  }
}

export function movimientoAFila(v: Movimiento, hogar: string, m: MapaMiembros): Fila {
  return {
    id: v.id,
    hogar_id: hogar,
    tipo: v.tipo,
    monto: v.monto,
    categoria: v.categoria,
    fecha: v.fecha,
    miembro_id: m.aUuid[v.miembro] ?? v.miembro,
    nota: v.nota ?? null,
    cargo_id: v.cargoId ?? null,
    periodo: v.periodo ?? null,
    borrado_en: null,
  }
}

export function metaAFila(m: MetaIngreso, hogar: string, mapa: MapaMiembros): Fila {
  return {
    id: m.id,
    hogar_id: hogar,
    miembro_id: mapa.aUuid[m.miembro] ?? m.miembro,
    monto: m.monto,
    periodo: m.periodo,
  }
}

export function comidaAFila(c: Comida, hogar: string, m: MapaMiembros): Fila {
  return {
    id: c.id,
    hogar_id: hogar,
    fecha: c.fecha,
    tiempo: c.tiempo,
    titulo: c.titulo,
    receta_id: c.recetaId ?? null,
    cocina: c.cocina ? (m.aUuid[c.cocina] ?? null) : null,
    listo: c.listo,
    borrado_en: null,
  }
}

export function recetaAFila(r: Receta, hogar: string): Fila {
  return {
    id: r.id,
    hogar_id: hogar,
    titulo: r.titulo,
    tiempos: r.tiempos,
    minutos: r.minutos,
    porciones: r.porciones,
    ingredientes: r.ingredientes,
    pasos: r.pasos,
    nota: r.nota ?? null,
    borrado_en: null,
  }
}

export function itemSuperAFila(i: ItemSuper, hogar: string): Fila {
  return {
    id: i.id,
    hogar_id: hogar,
    que: i.que,
    cuanto: i.cuanto ?? null,
    pasillo: i.pasillo,
    comprado: i.comprado,
    de_receta: i.deReceta ?? null,
    borrado_en: null,
  }
}

// ------------------------------------------------------------ desde la base

export function filaAPlantilla(f: Fila, m: MapaMiembros): Plantilla {
  const tipo = f.frecuencia as 'diaria' | 'dias' | 'semanal'
  return {
    id: f.id as string,
    titulo: f.titulo as string,
    responsable: respALocal(f.responsable as string, m),
    turnoEntre: ((f.turno_entre as string[]) ?? []).map(x => m.aLocal[x] ?? 'fa'),
    frecuencia: tipo === 'dias' ? { tipo, dias: ((f.dias as number[]) ?? []) as Dia[] } : { tipo },
    activa: f.activa as boolean,
  }
}

export function filaATarea(f: Fila, m: MapaMiembros): Tarea {
  return {
    id: f.id as string,
    titulo: f.titulo as string,
    plantillaId: (f.plantilla_id as string) ?? undefined,
    responsable: respALocal(f.responsable as string, m),
    turnoEntre: ((f.turno_entre as string[]) ?? []).map(x => m.aLocal[x] ?? 'fa'),
    fecha: (f.fecha as string) ?? null,
    semana: f.semana as string,
    hecha: f.hecha as boolean,
    hechaPor: f.hecha_por ? m.aLocal[f.hecha_por as string] : undefined,
    hechaEn: (f.hecha_en as string) ?? undefined,
    asignadaPor: f.asignada_por ? m.aLocal[f.asignada_por as string] : undefined,
    suelta: f.suelta as boolean,
  }
}

export function filaAEvento(f: Fila, m: MapaMiembros): Evento {
  return {
    id: f.id as string,
    titulo: f.titulo as string,
    fecha: f.fecha as string,
    hora: ((f.hora as string) ?? undefined)?.slice(0, 5),
    anual: f.anual as boolean,
    lugar: (f.lugar as string) ?? undefined,
    conQuien: ((f.con_quien as string[]) ?? []).map(x => m.aLocal[x]).filter(Boolean),
    avisarDiasAntes: (f.avisar_dias_antes as number) ?? 2,
  }
}

export function filaARecordatorio(f: Fila, m: MapaMiembros): Recordatorio {
  return {
    id: f.id as string,
    texto: f.texto as string,
    para: m.aLocal[f.para as string] ?? 'fa',
    permanente: f.permanente as boolean,
    hasta: (f.hasta as string) ?? undefined,
  }
}

export function filaACargo(f: Fila, m: MapaMiembros): CargoFijo {
  const aportaciones = (f.aportaciones as { miembro: string; monto: number }[]) ?? []
  return {
    id: f.id as string,
    titulo: f.titulo as string,
    tipo: f.tipo as CargoFijo['tipo'],
    categoria: f.categoria as string,
    monto: Number(f.monto),
    cada: f.cada as CargoFijo['cada'],
    diaDelMes: (f.dia_del_mes as number) ?? undefined,
    anclaMes: (f.ancla_mes as number) ?? undefined,
    quien: m.aLocal[f.quien as string] ?? 'fa',
    aportaciones: aportaciones.length
      ? aportaciones.map(a => ({ miembro: m.aLocal[a.miembro] ?? 'fa', monto: Number(a.monto) }))
      : undefined,
    variable: (f.variable as boolean) ?? false,
    activo: f.activo as boolean,
  }
}

export function filaAMovimiento(f: Fila, m: MapaMiembros): Movimiento {
  return {
    id: f.id as string,
    tipo: f.tipo as Movimiento['tipo'],
    monto: Number(f.monto),
    categoria: f.categoria as string,
    fecha: f.fecha as string,
    miembro: m.aLocal[f.miembro_id as string] ?? 'fa',
    nota: (f.nota as string) ?? undefined,
    cargoId: (f.cargo_id as string) ?? undefined,
    periodo: (f.periodo as string) ?? undefined,
  }
}

export function filaAMeta(f: Fila, m: MapaMiembros): MetaIngreso {
  return {
    id: f.id as string,
    miembro: m.aLocal[f.miembro_id as string] ?? 'sa',
    monto: Number(f.monto),
    periodo: (f.periodo as MetaIngreso['periodo']) ?? 'semanal',
  }
}

export function filaAComida(f: Fila, m: MapaMiembros): Comida {
  return {
    id: f.id as string,
    fecha: f.fecha as string,
    tiempo: f.tiempo as Tiempo,
    titulo: f.titulo as string,
    recetaId: (f.receta_id as string) ?? undefined,
    cocina: f.cocina ? m.aLocal[f.cocina as string] : undefined,
    listo: Boolean(f.listo),
  }
}

export function filaAReceta(f: Fila): Receta {
  return {
    id: f.id as string,
    titulo: f.titulo as string,
    tiempos: ((f.tiempos as string[]) ?? ['comida']) as Tiempo[],
    minutos: Number(f.minutos) || 30,
    porciones: Number(f.porciones) || 4,
    ingredientes: ((f.ingredientes as Ingrediente[]) ?? []),
    pasos: ((f.pasos as string[]) ?? []),
    nota: (f.nota as string) ?? undefined,
    deLaCasa: true,
  }
}

export function filaAItemSuper(f: Fila): ItemSuper {
  return {
    id: f.id as string,
    que: f.que as string,
    cuanto: (f.cuanto as string) ?? undefined,
    pasillo: (f.pasillo as Pasillo) ?? 'otros',
    comprado: Boolean(f.comprado),
    deReceta: (f.de_receta as string) ?? undefined,
  }
}
