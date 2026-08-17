import { useMemo, useState } from 'react'
import { useEstado, borrarEvento } from '../store'
import { Avatar } from '../componentes'
import { desdeYmd, esMismoDia, faltan, hoy, lunesDe, mesCorto, nombreMes, proximaFecha, sumarDias, ymd } from '../dates'
import { MIEMBROS } from '../seed'

const DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export default function Calendario() {
  const estado = useEstado()
  const [mesOffset, setMesOffset] = useState(0)
  const [seleccion, setSeleccion] = useState<string | null>(null)

  const hoyD = hoy()
  const base = new Date(hoyD.getFullYear(), hoyD.getMonth() + mesOffset, 1)

  /** Todas las ocurrencias visibles del mes, resolviendo los anuales. */
  const porFecha = useMemo(() => {
    const mapa = new Map<string, typeof estado.eventos>()
    for (const ev of estado.eventos) {
      const fechas = ev.anual
        ? [ymd(new Date(base.getFullYear(), desdeYmd(ev.fecha).getMonth(), desdeYmd(ev.fecha).getDate()))]
        : [ev.fecha]
      for (const f of fechas) {
        if (!mapa.has(f)) mapa.set(f, [])
        mapa.get(f)!.push(ev)
      }
    }
    return mapa
  }, [estado.eventos, base.getFullYear()])

  const primerDia = lunesDe(base)
  const celdas = Array.from({ length: 42 }, (_, i) => sumarDias(primerDia, i))

  const proximos = useMemo(() => {
    return estado.eventos
      .map(e => ({ ...e, prox: proximaFecha(e) }))
      .sort((a, b) => a.prox.localeCompare(b.prox))
      .slice(0, 12)
  }, [estado.eventos])

  const delDiaSeleccionado = seleccion ? (porFecha.get(seleccion) ?? []) : []

  return (
    <>
      <header className="cab">
        <h1>Calendario</h1>
        <span className="sub">{nombreMes(base)} {base.getFullYear()}</span>
      </header>

      <div className="chips" style={{ marginBottom: 12 }}>
        <button className="chip" type="button" onClick={() => setMesOffset(m => m - 1)}>←</button>
        {mesOffset !== 0 && <button className="chip" type="button" onClick={() => setMesOffset(0)}>Este mes</button>}
        <button className="chip" type="button" onClick={() => setMesOffset(m => m + 1)}>→</button>
      </div>

      <div className="panel">
        <div className="mes">
          {DOW.map((d, i) => <span className="dow" key={i}>{d}</span>)}
          {celdas.map(d => {
            const clave = ymd(d)
            const tiene = porFecha.has(clave)
            const fuera = d.getMonth() !== base.getMonth()
            return (
              <button
                key={clave}
                type="button"
                className={`celda ${fuera ? 'fuera' : ''} ${esMismoDia(d, hoyD) ? 'hoy' : ''} ${seleccion === clave ? 'sel' : ''}`}
                onClick={() => setSeleccion(seleccion === clave ? null : clave)}
                aria-label={`${d.getDate()} de ${nombreMes(d)}${tiene ? ', con algo agendado' : ''}`}
              >
                {d.getDate()}
                {tiene && <span className="punto" />}
              </button>
            )
          })}
        </div>
      </div>

      {seleccion && (
        <>
          <div className="seccion"><span>{desdeYmd(seleccion).getDate()} de {nombreMes(desdeYmd(seleccion))}</span></div>
          {delDiaSeleccionado.length === 0
            ? <p className="vacio">Nada agendado ese día.</p>
            : delDiaSeleccionado.map(e => <Tarjeta key={e.id} ev={e} fecha={seleccion} />)}
        </>
      )}

      <div className="seccion"><span>Lo que viene</span></div>
      {proximos.length === 0 && (
        <p className="vacio">
          Aquí van los aniversarios y cumpleaños —que se repiten solos cada año— y los planes de una vez,
          como ir al beisbol. Toca el botón ＋ para agregar el primero.
        </p>
      )}
      {proximos.map(e => <Tarjeta key={e.id} ev={e} fecha={e.prox} />)}
    </>
  )
}

function Tarjeta({ ev, fecha }: { ev: { id: string; titulo: string; hora?: string; lugar?: string; anual: boolean; conQuien: string[] }; fecha: string }) {
  const d = desdeYmd(fecha)
  const dias = faltan(fecha)
  const quienes = MIEMBROS.filter(m => ev.conQuien.includes(m.id))
  return (
    <div className={`evento ${dias >= 0 && dias <= 2 ? 'pronto' : ''}`}>
      <span className="fecha"><b>{d.getDate()}</b>{mesCorto(d)}</span>
      <span className="txt">
        <b>{ev.titulo}</b>
        <small>
          {dias === 0 ? 'hoy' : dias === 1 ? 'mañana' : dias > 0 ? `en ${dias} días` : 'ya pasó'}
          {ev.hora ? ` · ${ev.hora}` : ''}{ev.lugar ? ` · ${ev.lugar}` : ''}
          {ev.anual ? ' · cada año' : ''}
        </small>
      </span>
      <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        {quienes.map(m => <Avatar key={m.id} quien={m.id} chico />)}
        <button className="caja" type="button" aria-label={`Quitar ${ev.titulo}`} onClick={() => borrarEvento(ev.id)}
          style={{ color: 'var(--muted)', width: 28, height: 28 }}>×</button>
      </span>
    </div>
  )
}
