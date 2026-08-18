import type { CargoFijo, Estado, MiembroId, Movimiento } from './types'
import { desdeYmd, hoy, lunesDe, sumarDias, ymd } from './dates'

/** Una vez que un cargo fijo cae en el mes: cuándo, de cuánto y con qué clave. */
export interface Ocurrencia {
  cargo: CargoFijo
  /** Identifica esta caída en el tiempo, para no pedirla dos veces. */
  periodo: string
  fecha: string
}

const ultimoDia = (a: number, m: number) => new Date(a, m + 1, 0).getDate()

/** Todas las caídas de un cargo fijo dentro de un mes. */
export function ocurrenciasDelMes(c: CargoFijo, anio: number, mes: number): Ocurrencia[] {
  const mesClave = `${anio}-${`${mes + 1}`.padStart(2, '0')}`

  if (c.cada === 'mes') {
    const dia = Math.min(c.diaDelMes ?? 1, ultimoDia(anio, mes))
    return [{ cargo: c, periodo: mesClave, fecha: ymd(new Date(anio, mes, dia)) }]
  }

  if (c.cada === 'quincena') {
    return [
      { cargo: c, periodo: `${mesClave}-q1`, fecha: ymd(new Date(anio, mes, 15)) },
      { cargo: c, periodo: `${mesClave}-q2`, fecha: ymd(new Date(anio, mes, ultimoDia(anio, mes))) },
    ]
  }

  if (c.cada === 'dos-meses') {
    const ancla = c.anclaMes ?? 0
    // Cae en meses con la misma paridad que su mes de referencia.
    if ((mes - ancla) % 2 !== 0) return []
    const dia = Math.min(c.diaDelMes ?? 15, ultimoDia(anio, mes))
    return [{ cargo: c, periodo: mesClave, fecha: ymd(new Date(anio, mes, dia)) }]
  }

  // Semanal: una por cada lunes que cae dentro del mes.
  const ocurrencias: Ocurrencia[] = []
  let d = lunesDe(new Date(anio, mes, 1))
  if (d.getMonth() !== mes) d = sumarDias(d, 7)
  while (d.getMonth() === mes && d.getFullYear() === anio) {
    ocurrencias.push({ cargo: c, periodo: `sem-${ymd(d)}`, fecha: ymd(d) })
    d = sumarDias(d, 7)
  }
  return ocurrencias
}

/** Lo fijo del mes que todavía no se confirma, sin adelantarse a lo que aún no cae. */
export function pendientesDelMes(estado: Estado, anio: number, mes: number): Ocurrencia[] {
  const yaRegistradas = new Set(
    estado.movimientos.filter(m => m.cargoId && m.periodo).map(m => `${m.cargoId}|${m.periodo}`),
  )
  const limite = ymd(sumarDias(hoy(), 3))

  return estado.cargosFijos
    .filter(c => c.activo)
    .flatMap(c => ocurrenciasDelMes(c, anio, mes))
    .filter(o => !yaRegistradas.has(`${o.cargo.id}|${o.periodo}`))
    .filter(o => o.fecha <= limite)
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
}

export interface Resumen {
  entro: number
  salio: number
  queda: number
  porCategoria: { categoria: string; monto: number }[]
  porMiembro: { miembro: MiembroId; monto: number }[]
}

const delMes = (m: Movimiento, anio: number, mes: number) => {
  const f = desdeYmd(m.fecha)
  return f.getFullYear() === anio && f.getMonth() === mes
}

export function resumenDelMes(
  movimientos: Movimiento[], anio: number, mes: number, soloDe?: MiembroId,
): Resumen {
  const propios = movimientos.filter(m => delMes(m, anio, mes) && (!soloDe || m.miembro === soloDe))

  const entro = propios.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + m.monto, 0)
  const salio = propios.filter(m => m.tipo === 'gasto').reduce((s, m) => s + m.monto, 0)

  const catMap = new Map<string, number>()
  for (const m of propios.filter(m => m.tipo === 'gasto')) {
    catMap.set(m.categoria, (catMap.get(m.categoria) ?? 0) + m.monto)
  }

  const miembroMap = new Map<MiembroId, number>()
  for (const m of propios.filter(m => m.tipo === 'gasto')) {
    miembroMap.set(m.miembro, (miembroMap.get(m.miembro) ?? 0) + m.monto)
  }

  return {
    entro,
    salio,
    queda: entro - salio,
    porCategoria: [...catMap.entries()]
      .map(([categoria, monto]) => ({ categoria, monto }))
      .sort((a, b) => b.monto - a.monto),
    porMiembro: [...miembroMap.entries()]
      .map(([miembro, monto]) => ({ miembro, monto }))
      .sort((a, b) => b.monto - a.monto),
  }
}

/** Cuánto lleva alguien de su meta en la semana en curso. */
export function avanceDeLaSemana(movimientos: Movimiento[], miembro: MiembroId): number {
  const lunes = ymd(lunesDe(hoy()))
  const domingo = ymd(sumarDias(lunesDe(hoy()), 6))
  return movimientos
    .filter(m => m.tipo === 'ingreso' && m.miembro === miembro && m.fecha >= lunes && m.fecha <= domingo)
    .reduce((s, m) => s + m.monto, 0)
}
