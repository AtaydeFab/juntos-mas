import type { Dia } from './types'

/** El día corta a las 4 am: lo que se palomea a la 1 am cuenta para el día anterior. */
const HORA_CORTE = 4

export function hoy(): Date {
  const d = new Date()
  if (d.getHours() < HORA_CORTE) d.setDate(d.getDate() - 1)
  d.setHours(0, 0, 0, 0)
  return d
}

export function ymd(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function desdeYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function sumarDias(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

/** 1 = lunes … 7 = domingo */
export function dia(d: Date): Dia {
  return ((d.getDay() + 6) % 7 + 1) as Dia
}

export function lunesDe(d: Date): Date {
  return sumarDias(d, -(dia(d) - 1))
}

export function semanaDe(d: Date): string {
  return ymd(lunesDe(d))
}

/** Semanas completas desde un lunes de referencia: sirve para alternar turnos. */
export function indiceSemana(d: Date): number {
  const base = new Date(2024, 0, 1) // lunes
  const ms = lunesDe(d).getTime() - base.getTime()
  return Math.round(ms / (7 * 24 * 60 * 60 * 1000))
}

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export const nombreDia = (d: Date) => DIAS[dia(d) - 1]
export const diaCorto = (d: Date) => DIAS_CORTOS[dia(d) - 1]
export const nombreMes = (d: Date) => MESES[d.getMonth()]
export const mesCorto = (d: Date) => MESES_CORTOS[d.getMonth()]

export function fechaLarga(d: Date): string {
  return `${nombreDia(d)} ${d.getDate()} de ${nombreMes(d)}`
}

export function fechaCorta(d: Date): string {
  return `${d.getDate()} ${mesCorto(d)}`
}

export function esMismoDia(a: Date, b: Date): boolean {
  return ymd(a) === ymd(b)
}

/** Días que faltan para una fecha, contando desde hoy. */
export function faltan(fecha: string): number {
  const ms = desdeYmd(fecha).getTime() - hoy().getTime()
  return Math.round(ms / (24 * 60 * 60 * 1000))
}

/** La próxima ocurrencia de un evento anual, respetando el mes y el día. */
export function proximaFecha(ev: { fecha: string; anual: boolean }): string {
  if (!ev.anual) return ev.fecha
  const base = desdeYmd(ev.fecha)
  const h = hoy()
  const candidata = new Date(h.getFullYear(), base.getMonth(), base.getDate())
  if (candidata < h) candidata.setFullYear(candidata.getFullYear() + 1)
  return ymd(candidata)
}
