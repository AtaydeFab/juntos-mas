import { useMemo } from 'react'
import { useEstado, palomear } from '../store'
import { FilaTarea, responsableEfectivo } from '../componentes'
import { faltan, fechaLarga, hoy, proximaFecha, semanaDe, ymd, desdeYmd, fechaCorta } from '../dates'
import { miembro } from '../seed'
import type { Tarea } from '../types'

function detalleDe(t: Tarea): string {
  const partes: string[] = []
  if (!t.suelta) partes.push(t.fecha ? 'de siempre' : 'esta semana, sin día fijo')
  if (t.suelta && t.asignadaPor) partes.push(`te lo pasó ${miembro(t.asignadaPor)?.nombre}`)
  if (t.responsable === 'ambos') partes.push('de los dos')
  if (t.responsable === 'turno') partes.push('turno de esta semana')
  if (t.hecha && t.hechaPor) partes.push(`hecho por ${miembro(t.hechaPor)?.nombre}`)
  return partes.join(' · ')
}

export default function Hoy() {
  const estado = useEstado()
  const hoyD = hoy()
  const claveHoy = ymd(hoyD)
  const semana = semanaDe(hoyD)

  const delDia = useMemo(
    () => estado.tareas.filter(t => t.fecha === claveHoy),
    [estado.tareas, claveHoy],
  )
  const flexibles = useMemo(
    () => estado.tareas.filter(t => t.fecha === null && t.semana === semana),
    [estado.tareas, semana],
  )

  const mias = delDia.filter(t => {
    const r = responsableEfectivo(t)
    return r === estado.yo || r === 'ambos'
  })
  const delOtro = delDia.filter(t => !mias.includes(t))

  const hechas = delDia.filter(t => t.hecha).length

  const recordatoriosMios = estado.recordatorios.filter(r => r.para === estado.yo)
  const recordatorioDeHoy = recordatoriosMios.length
    ? recordatoriosMios[hoyD.getDate() % recordatoriosMios.length]
    : null

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

      {recordatorioDeHoy && (
        <div className="recordatorio">
          <span className="k">Acuérdate</span>
          <p>«{recordatorioDeHoy.texto}»</p>
        </div>
      )}

      {proximos.length > 0 && (
        <>
          <div className="seccion"><span>Lo que viene</span></div>
          {proximos.map(e => {
            const d = faltan(e.prox)
            return (
              <div key={e.id} className={`evento ${d <= 2 ? 'pronto' : ''}`}>
                <span className="fecha"><b>{desdeYmd(e.prox).getDate()}</b>{fechaCorta(desdeYmd(e.prox)).split(' ')[1]}</span>
                <span className="txt">
                  <b>{e.titulo}</b>
                  <small>{d === 0 ? 'hoy' : d === 1 ? 'mañana' : `en ${d} días`}{e.hora ? ` · ${e.hora}` : ''}{e.lugar ? ` · ${e.lugar}` : ''}</small>
                </span>
                {e.anual && <span className="etiqueta">cada año</span>}
              </div>
            )
          })}
        </>
      )}

      <div className="seccion">
        <span>Lo mío</span>
        <span>{hechas} de {delDia.length} hechas hoy</span>
      </div>
      {mias.length === 0 && <p className="vacio">Hoy no tienes nada. Disfrútalo.</p>}
      {mias.map(t => (
        <FilaTarea key={t.id} tarea={t} detalle={detalleDe(t)} onPalomear={() => palomear(t.id, estado.yo)} />
      ))}

      {flexibles.length > 0 && (
        <>
          <div className="seccion"><span>De esta semana, cuando puedan</span></div>
          {flexibles.map(t => (
            <FilaTarea key={t.id} tarea={t} detalle="elige tú el día" onPalomear={() => palomear(t.id, estado.yo)} />
          ))}
        </>
      )}

      {delOtro.length > 0 && (
        <>
          <div className="seccion"><span>De los demás</span></div>
          {delOtro.map(t => (
            <FilaTarea key={t.id} tarea={t} detalle={detalleDe(t)} onPalomear={() => palomear(t.id, estado.yo)} />
          ))}
        </>
      )}
    </>
  )
}
