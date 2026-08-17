import { useEffect, useState } from 'react'
import { useEstado, palomear, materializarSemana, moverTarea, pasarTarea, borrarTarea } from '../store'
import { FilaTarea, Hoja, SelectorMiembro, responsableEfectivo, nombreResponsable } from '../componentes'
import { diaCorto, esMismoDia, fechaCorta, hoy, lunesDe, sumarDias, ymd } from '../dates'
import type { Responsable, Tarea } from '../types'

export default function Semana() {
  const estado = useEstado()
  const [desplazamiento, setDesplazamiento] = useState(0)
  const [abierta, setAbierta] = useState<Tarea | null>(null)

  const lunes = sumarDias(lunesDe(hoy()), desplazamiento * 7)
  const clave = ymd(lunes)
  useEffect(() => { materializarSemana(lunes) }, [clave])

  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i))
  const flexibles = estado.tareas.filter(t => t.fecha === null && t.semana === clave)

  const cambiarSemana = (n: number) => setDesplazamiento(d => d + n)

  return (
    <>
      <header className="cab">
        <h1>Semana</h1>
        <span className="sub">{fechaCorta(lunes)} – {fechaCorta(sumarDias(lunes, 6))}</span>
      </header>

      <div className="chips" style={{ marginBottom: 12 }}>
        <button className="chip" onClick={() => cambiarSemana(-1)} type="button">← Anterior</button>
        {desplazamiento !== 0 && <button className="chip" onClick={() => setDesplazamiento(0)} type="button">Esta semana</button>}
        <button className="chip" onClick={() => cambiarSemana(1)} type="button">Siguiente →</button>
      </div>

      {flexibles.length > 0 && (
        <div className="panel">
          <span className="k">De esta semana, sin día fijo</span>
          {flexibles.map(t => (
            <FilaTarea key={t.id} tarea={t} detalle={`${nombreResponsable(t)} · elige el día`}
              onPalomear={() => palomear(t.id, estado.yo)} onAbrir={() => setAbierta(t)} />
          ))}
        </div>
      )}

      {dias.map(d => {
        const delDia = estado.tareas.filter(t => t.fecha === ymd(d))
        const hechas = delDia.filter(t => t.hecha).length
        return (
          <div className="dia-bloque" key={ymd(d)}>
            <div className={`dia-cab ${esMismoDia(d, hoy()) ? 'hoy' : ''}`}>
              <b>{diaCorto(d)} {d.getDate()}</b>
              <span>{hechas} de {delDia.length}</span>
            </div>
            {delDia.map(t => (
              <FilaTarea key={t.id} tarea={t}
                detalle={`${nombreResponsable(t)}${t.suelta ? ' · solo esta vez' : ''}`}
                onPalomear={() => palomear(t.id, estado.yo)} onAbrir={() => setAbierta(t)} />
            ))}
            {delDia.length === 0 && <p className="nota" style={{ padding: '0 4px 6px' }}>Sin tareas.</p>}
          </div>
        )
      })}

      {abierta && (
        <Hoja titulo={abierta.titulo} onCerrar={() => setAbierta(null)}>
          <span className="etiqueta-campo">Pasársela a</span>
          <SelectorMiembro
            valor={responsableEfectivo(abierta)}
            conAmbos
            onCambio={(v: Responsable) => { pasarTarea(abierta.id, v); setAbierta(null) }}
          />

          <span className="etiqueta-campo">Moverla de día</span>
          <div className="chips">
            {dias.map(d => (
              <button key={ymd(d)} type="button"
                className={`chip ${abierta.fecha === ymd(d) ? 'on' : ''}`}
                onClick={() => { moverTarea(abierta.id, ymd(d)); setAbierta(null) }}>
                {diaCorto(d)} {d.getDate()}
              </button>
            ))}
          </div>

          <span className="etiqueta-campo">Quitarla</span>
          <div style={{ display: 'grid', gap: 8 }}>
            <button className="btn peligro" type="button"
              onClick={() => { borrarTarea(abierta.id, 'una'); setAbierta(null) }}>
              Solo esta vez
            </button>
            {!abierta.suelta && (
              <button className="btn peligro" type="button"
                onClick={() => { borrarTarea(abierta.id, 'serie'); setAbierta(null) }}>
                Quitarla del machote, de aquí en adelante
              </button>
            )}
            <p className="nota">Lo que ya se palomeó se queda como registro; no se borra hacia atrás.</p>
          </div>
        </Hoja>
      )}
    </>
  )
}
