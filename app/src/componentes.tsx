import type { ReactNode } from 'react'
import type { MiembroId, Responsable, Tarea } from './types'
import { MIEMBROS, miembro } from './seed'
import { turnoDeLaSemana } from './store'
import { desdeYmd } from './dates'

export function Palomita() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12.5l5.5 5.5L20 6.5" />
    </svg>
  )
}

export function Avatar({ quien, chico }: { quien: Responsable; chico?: boolean }) {
  const clase = chico ? 'av chico' : 'av'
  if (quien === 'ambos' || quien === 'turno') return <span className={`${clase} jt`}>2</span>
  const m = miembro(quien)
  return <span className={`${clase} ${m?.color ?? 'jt'}`}>{m?.corto ?? '?'}</span>
}

/** Quién es responsable hoy de una tarea, resolviendo turnos rotativos. */
export function responsableEfectivo(t: Tarea): Responsable {
  if (t.responsable === 'turno' && t.turnoEntre?.length) {
    return turnoDeLaSemana(t.turnoEntre, desdeYmd(t.semana))
  }
  return t.responsable
}

export function nombreResponsable(t: Tarea): string {
  const r = responsableEfectivo(t)
  if (r === 'ambos') return 'De los dos'
  if (r === 'turno') return 'Por turnos'
  return miembro(r)?.nombre ?? ''
}

function colorDe(r: Responsable): string {
  if (r === 'ambos' || r === 'turno') return 'jt'
  return miembro(r)?.color ?? 'jt'
}

export function FilaTarea({
  tarea, onPalomear, onAbrir, detalle,
}: {
  tarea: Tarea
  onPalomear: () => void
  onAbrir?: () => void
  detalle?: ReactNode
}) {
  const r = responsableEfectivo(tarea)
  return (
    <div className={`tarea c-${colorDe(r)} ${tarea.hecha ? 'hecha' : ''}`}>
      <Avatar quien={r} />
      <button className="cuerpo" onClick={onAbrir} type="button" aria-label={`Opciones de ${tarea.titulo}`}>
        <span className="txt">
          <b>{tarea.titulo}</b>
          <small>{detalle}</small>
        </span>
      </button>
      <button
        className="caja"
        type="button"
        aria-label={tarea.hecha ? `Quitar palomita de ${tarea.titulo}` : `Palomear ${tarea.titulo}`}
        aria-pressed={tarea.hecha}
        onClick={onPalomear}
      >
        <Palomita />
      </button>
    </div>
  )
}

export function SelectorMiembro({
  valor, onCambio, conAmbos,
}: {
  valor: Responsable
  onCambio: (v: Responsable) => void
  conAmbos?: boolean
}) {
  const opciones: { id: Responsable; nombre: string }[] = [
    ...MIEMBROS.map(m => ({ id: m.id as Responsable, nombre: m.nombre })),
    ...(conAmbos ? [{ id: 'ambos' as Responsable, nombre: 'De los dos' }] : []),
  ]
  return (
    <div className="chips">
      {opciones.map(o => (
        <button key={o.id} className={`chip ${valor === o.id ? 'on' : ''}`} onClick={() => onCambio(o.id)} type="button">
          <Avatar quien={o.id} chico />
          {o.nombre}
        </button>
      ))}
    </div>
  )
}

export function Hoja({ titulo, children, onCerrar }: { titulo: string; children: ReactNode; onCerrar: () => void }) {
  return (
    <div className="fondo" onClick={onCerrar} role="presentation">
      <div className="hoja" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="agarre" />
        <h2>{titulo}</h2>
        {children}
      </div>
    </div>
  )
}

export function Interruptor({ activo, onCambio, etiqueta }: { activo: boolean; onCambio: (v: boolean) => void; etiqueta: string }) {
  return (
    <button type="button" className={`sw ${activo ? 'on' : ''}`} role="switch" aria-checked={activo} aria-label={etiqueta}
      onClick={() => onCambio(!activo)} />
  )
}

export const ID_MIEMBROS: MiembroId[] = ['fa', 'sa', 'vi', 'so']
