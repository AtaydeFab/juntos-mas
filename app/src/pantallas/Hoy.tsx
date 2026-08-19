import { useMemo, useState } from 'react'
import { useEstado, palomear, cambiarVista } from '../store'
import { FilaTarea, responsableEfectivo } from '../componentes'
import { faltan, fechaLarga, hoy, proximaFecha, semanaDe, ymd, desdeYmd, mesCorto } from '../dates'
import { miembro } from '../seed'
import { ComidaDeHoy } from './Comida'
import type { Tarea, Vista } from '../types'

function detalleDe(t: Tarea): string {
  const partes: string[] = []
  if (!t.suelta) partes.push(t.fecha ? 'de siempre' : 'esta semana, sin día fijo')
  if (t.suelta && t.asignadaPor) partes.push(`te lo pasó ${miembro(t.asignadaPor)?.nombre}`)
  if (t.responsable === 'ambos') partes.push('de los dos')
  if (t.responsable === 'turno') partes.push('turno de esta semana')
  if (t.hecha && t.hechaPor) partes.push(`hecho por ${miembro(t.hechaPor)?.nombre}`)
  return partes.join(' · ')
}

const VISTAS: { id: Vista; nombre: string }[] = [
  { id: 'mias', nombre: 'Solo mías' },
  { id: 'mias_y_ambos', nombre: '+ de los dos' },
  { id: 'todas', nombre: 'Toda la casa' },
]

export default function Hoy() {
  const estado = useEstado()
  const hoyD = hoy()
  const claveHoy = ymd(hoyD)
  const semana = semanaDe(hoyD)

  const delDia = useMemo(() => estado.tareas.filter(t => t.fecha === claveHoy), [estado.tareas, claveHoy])
  const flexibles = useMemo(
    () => estado.tareas.filter(t => t.fecha === null && t.semana === semana),
    [estado.tareas, semana],
  )

  const visible = (t: Tarea) => {
    const r = responsableEfectivo(t)
    if (estado.vista === 'todas') return true
    if (r === 'ambos') return estado.vista === 'mias_y_ambos'
    return r === estado.yo
  }

  const lista = delDia.filter(visible)
  const flexiblesVisibles = flexibles.filter(visible)
  const ocultas = delDia.length - lista.length
  const hechas = lista.filter(t => t.hecha).length

  const recordatoriosMios = estado.recordatorios.filter(r => r.para === estado.yo)

  const proximos = useMemo(() => {
    return estado.eventos
      .map(e => ({ ...e, prox: proximaFecha(e) }))
      .filter(e => {
        const d = faltan(e.prox)
        return d >= 0 && d <= 10
      })
      .sort((a, b) => a.prox.localeCompare(b.prox))
  }, [estado.eventos])

  return (
    <>
      <header className="cab">
        <h1>Hoy</h1>
        <span className="sub">{fechaLarga(hoyD)}</span>
      </header>

      {recordatoriosMios.length > 0 && (
        <Recordatorio textos={recordatoriosMios.map(r => r.texto)} dia={hoyD.getDate()} />
      )}

      <ComidaDeHoy />

      {proximos.length > 0 && (
        <>
          <div className="seccion"><span>Lo que viene</span></div>
          {proximos.map(e => {
            const d = faltan(e.prox)
            const f = desdeYmd(e.prox)
            return (
              <div key={e.id} className={`evento ${d <= 2 ? 'pronto' : ''}`}>
                <span className="fecha"><b>{f.getDate()}</b>{mesCorto(f)}</span>
                <span className="txt">
                  <b>{e.titulo}</b>
                  <small>
                    {d === 0 ? 'hoy' : d === 1 ? 'mañana' : `en ${d} días`}
                    {e.hora ? ` · ${e.hora}` : ''}{e.lugar ? ` · ${e.lugar}` : ''}
                  </small>
                </span>
                {e.anual && <span className="etiqueta">cada año</span>}
              </div>
            )
          })}
        </>
      )}

      <div className="seccion">
        <span>Tareas de hoy</span>
        <span>{hechas} de {lista.length} hechas</span>
      </div>

      <div className="chips" style={{ marginBottom: 12 }}>
        {VISTAS.map(v => (
          <button key={v.id} type="button" className={`chip ${estado.vista === v.id ? 'on' : ''}`}
            onClick={() => cambiarVista(v.id)}>{v.nombre}</button>
        ))}
      </div>

      {lista.length === 0 && <p className="vacio">Nada pendiente aquí. Disfrútalo.</p>}
      {lista.map(t => (
        <FilaTarea key={t.id} tarea={t} detalle={detalleDe(t)} onPalomear={() => palomear(t.id, estado.yo)} />
      ))}

      {ocultas > 0 && (
        <p className="nota aviso-ocultas">
          Hay {ocultas} {ocultas === 1 ? 'tarea' : 'tareas'} de los demás sin mostrar.<br />
          <button type="button" className="enlace" onClick={() => cambiarVista('todas')}>Ver toda la casa</button>
        </p>
      )}

      {flexiblesVisibles.length > 0 && (
        <>
          <div className="seccion"><span>De esta semana, cuando puedan</span></div>
          {flexiblesVisibles.map(t => (
            <FilaTarea key={t.id} tarea={t} detalle="elige tú el día" onPalomear={() => palomear(t.id, estado.yo)} />
          ))}
        </>
      )}
    </>
  )
}

/** Uno a la vez: cambia solo cada día, y se puede pasar de uno a otro a mano. */
function Recordatorio({ textos, dia }: { textos: string[]; dia: number }) {
  const [desplazado, setDesplazado] = useState(0)
  const i = ((dia + desplazado) % textos.length + textos.length) % textos.length

  return (
    <div className="recordatorio">
      <div className="recordatorio-cab">
        <span className="k">Acuérdate</span>
        {textos.length > 1 && (
          <span className="pasar">
            <button type="button" aria-label="Recordatorio anterior" onClick={() => setDesplazado(d => d - 1)}>‹</button>
            <span className="k">{i + 1} de {textos.length}</span>
            <button type="button" aria-label="Siguiente recordatorio" onClick={() => setDesplazado(d => d + 1)}>›</button>
          </span>
        )}
      </div>
      <p>«{textos[i]}»</p>
      {textos.length > 1 && <span className="k" style={{ opacity: 0.75 }}>Cambia solo cada día</span>}
    </div>
  )
}
