import { useMemo, useState } from 'react'
import {
  useEstado, planear, quitarComida, comidaLista, quienCocina, sugerirSemana, limpiarSemanaDeComida,
  receta as buscarReceta, todasLasRecetas, agregarAlSuper, alternarComprado, quitarDelSuper,
  limpiarComprados, surtirDeLaSemana, ingredientesAlSuper, guardarReceta, borrarReceta,
} from '../store'
import { Hoja, Avatar } from '../componentes'
import { MIEMBROS, miembro } from '../seed'
import { PASILLOS, TIEMPOS, nombreTiempo } from '../recetario'
import { desdeYmd, diaCorto, esMismoDia, fechaCorta, hoy, lunesDe, sumarDias, ymd } from '../dates'
import type { Pasillo, Receta, Tiempo } from '../types'

type Seccion = 'menu' | 'super' | 'recetas'

export default function Comida() {
  const estado = useEstado()
  const [seccion, setSeccion] = useState<Seccion>('menu')
  const porComprar = estado.super.filter(i => !i.comprado).length

  return (
    <>
      <header className="cab">
        <h1>Comida</h1>
        <span className="sub">Qué se come y qué falta</span>
      </header>

      <div className="chips" style={{ marginBottom: 12 }}>
        <button type="button" className={`chip ${seccion === 'menu' ? 'on' : ''}`} onClick={() => setSeccion('menu')}>
          Menú
        </button>
        <button type="button" className={`chip ${seccion === 'super' ? 'on' : ''}`} onClick={() => setSeccion('super')}>
          Súper{porComprar ? ` · ${porComprar}` : ''}
        </button>
        <button type="button" className={`chip ${seccion === 'recetas' ? 'on' : ''}`} onClick={() => setSeccion('recetas')}>
          Recetas
        </button>
      </div>

      {seccion === 'menu' && <Menu />}
      {seccion === 'super' && <Super />}
      {seccion === 'recetas' && <Recetas />}
    </>
  )
}

// -------------------------------------------------------------------- menú

function Menu() {
  const estado = useEstado()
  const [desplazamiento, setDesplazamiento] = useState(0)
  const [eligiendo, setEligiendo] = useState<{ fecha: string; tiempo: Tiempo } | null>(null)
  const [viendo, setViendo] = useState<Receta | null>(null)
  const [aviso, setAviso] = useState('')

  const lunes = sumarDias(lunesDe(hoy()), desplazamiento * 7)
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i))
  const delDia = (fecha: string, tiempo: Tiempo) =>
    estado.comidas.find(c => c.fecha === fecha && c.tiempo === tiempo)

  const puestas = estado.comidas.filter(c => dias.some(d => ymd(d) === c.fecha)).length

  return (
    <>
      <div className="chips" style={{ marginBottom: 12 }}>
        <button className="chip" type="button" onClick={() => setDesplazamiento(d => d - 1)}>← Anterior</button>
        {desplazamiento !== 0 && (
          <button className="chip" type="button" onClick={() => setDesplazamiento(0)}>Esta semana</button>
        )}
        <button className="chip" type="button" onClick={() => setDesplazamiento(d => d + 1)}>Siguiente →</button>
      </div>

      <div className="panel">
        <span className="k">Semana del {fechaCorta(lunes)} al {fechaCorta(sumarDias(lunes, 6))}</span>
        <p className="nota">
          {puestas === 0
            ? 'Todavía no hay nada puesto. La app puede proponer la semana entera y de ahí ustedes cambian lo que no les lata.'
            : puestas >= 21
              ? 'La semana está completa. Toca cualquier tiempo para cambiarlo por otra cosa.'
              : `${puestas} de 21 tiempos ya tienen algo. Toca cualquiera para cambiarlo.`}
        </p>
        {puestas < 21 && (
          <button className="btn" type="button" onClick={() => { sugerirSemana(lunes); setAviso('') }}>
            {puestas === 0 ? 'Proponer la semana' : 'Llenar lo que falta'}
          </button>
        )}
        <button className="btn fantasma" type="button"
          onClick={() => {
            const n = surtirDeLaSemana(lunes)
            setAviso(n === 0
              ? 'Ya estaba todo en la lista del súper.'
              : `Se agregaron ${n} cosas a la lista del súper.`)
          }}>
          Pasar los ingredientes al súper
        </button>
        {aviso && <p className="nota"><b>{aviso}</b></p>}
        {puestas > 0 && (
          <button className="btn peligro" type="button"
            onClick={() => { if (confirm('¿Borrar el menú de esta semana?')) limpiarSemanaDeComida(lunes) }}>
            Borrar el menú de la semana
          </button>
        )}
      </div>

      {dias.map(d => (
        <div className="dia-bloque" key={ymd(d)}>
          <div className={`dia-cab ${esMismoDia(d, hoy()) ? 'hoy' : ''}`}>
            <b>{diaCorto(d)} {d.getDate()}</b>
            <span>{esMismoDia(d, hoy()) ? 'hoy' : ''}</span>
          </div>
          {TIEMPOS.map(t => {
            const c = delDia(ymd(d), t.id)
            const r = buscarReceta(c?.recetaId)
            return (
              <div className={`comida-fila ${c?.listo ? 'lista' : ''}`} key={t.id}>
                <button className="cuerpo" type="button"
                  onClick={() => setEligiendo({ fecha: ymd(d), tiempo: t.id })}>
                  <span className="tiempo">{t.nombre}</span>
                  <span className="que">
                    {c ? c.titulo : <em>Sin poner</em>}
                    {c?.cocina && <small> · lo hace {miembro(c.cocina)?.nombre}</small>}
                  </span>
                </button>
                {r && (
                  <button className="ver" type="button" aria-label={`Ver la receta de ${r.titulo}`}
                    onClick={() => setViendo(r)}>Receta</button>
                )}
              </div>
            )
          })}
        </div>
      ))}

      {eligiendo && (
        <HojaElegir hueco={eligiendo} onCerrar={() => setEligiendo(null)}
          onVerReceta={r => { setEligiendo(null); setViendo(r) }} />
      )}
      {viendo && <HojaReceta receta={viendo} onCerrar={() => setViendo(null)} />}
    </>
  )
}

function HojaElegir({
  hueco, onCerrar, onVerReceta,
}: {
  hueco: { fecha: string; tiempo: Tiempo }
  onCerrar: () => void
  onVerReceta: (r: Receta) => void
}) {
  const estado = useEstado()
  const [busca, setBusca] = useState('')
  const [aMano, setAMano] = useState('')
  const ya = estado.comidas.find(c => c.fecha === hueco.fecha && c.tiempo === hueco.tiempo)

  const opciones = useMemo(() => {
    const texto = busca.trim().toLowerCase()
    return todasLasRecetas()
      .filter(r => (texto ? r.titulo.toLowerCase().includes(texto) : r.tiempos.includes(hueco.tiempo)))
      .slice(0, 30)
  }, [busca, hueco.tiempo, estado.recetas])

  const escoger = (r: Receta) => {
    planear(hueco.fecha, hueco.tiempo, { titulo: r.titulo, recetaId: r.id })
    onCerrar()
  }

  return (
    <Hoja titulo={`${nombreTiempo(hueco.tiempo)} · ${fechaCorta(desdeYmd(hueco.fecha))}`} onCerrar={onCerrar}>
      {ya && (
        <div className="panel" style={{ marginBottom: 14 }}>
          <span className="k">Ahorita está puesto</span>
          <p style={{ margin: 0, fontSize: 15 }}><b>{ya.titulo}</b></p>
          <span className="etiqueta-campo">¿Quién lo hace?</span>
          <div className="chips">
            {MIEMBROS.map(m => (
              <button key={m.id} type="button" className={`chip ${ya.cocina === m.id ? 'on' : ''}`}
                onClick={() => quienCocina(ya.id, ya.cocina === m.id ? undefined : m.id)}>
                <Avatar quien={m.id} chico /> {m.nombre}
              </button>
            ))}
          </div>
          <div className="regla" />
          <button className="btn fantasma" type="button" onClick={() => { comidaLista(ya.id); onCerrar() }}>
            {ya.listo ? 'Marcar como pendiente' : 'Ya se hizo'}
          </button>
          <button className="btn peligro" type="button" onClick={() => { quitarComida(ya.id); onCerrar() }}>
            Quitar del menú
          </button>
        </div>
      )}

      <span className="etiqueta-campo">Buscar o escoger</span>
      <input className="campo" value={busca} onChange={e => setBusca(e.target.value)}
        placeholder="Tinga, sopa, chilaquiles…" aria-label="Buscar platillo" />

      <div className="lista-recetas">
        {opciones.map(r => (
          <div className="receta-fila" key={r.id}>
            <button className="cuerpo" type="button" onClick={() => escoger(r)}>
              <b>{r.titulo}</b>
              <small>{r.minutos} min · {r.ingredientes.length} ingredientes{r.deLaCasa ? ' · de la casa' : ''}</small>
            </button>
            <button className="ver" type="button" onClick={() => onVerReceta(r)}
              aria-label={`Ver la receta de ${r.titulo}`}>Ver</button>
          </div>
        ))}
        {opciones.length === 0 && <p className="nota">No hay nada con ese nombre. Escríbelo a mano aquí abajo.</p>}
      </div>

      <span className="etiqueta-campo">O escríbelo a mano</span>
      <input className="campo" value={aMano} onChange={e => setAMano(e.target.value)}
        placeholder="Lo que sobró, salimos a cenar…" aria-label="Escribir a mano" />
      <button className="btn" type="button" disabled={!aMano.trim()}
        onClick={() => { planear(hueco.fecha, hueco.tiempo, { titulo: aMano.trim() }); onCerrar() }}>
        Poner eso
      </button>
    </Hoja>
  )
}

function HojaReceta({ receta, onCerrar }: { receta: Receta; onCerrar: () => void }) {
  const [aviso, setAviso] = useState('')
  return (
    <Hoja titulo={receta.titulo} onCerrar={onCerrar}>
      <p className="nota">
        {receta.minutos} minutos · alcanza para {receta.porciones}
        {receta.deLaCasa ? ' · receta de la casa' : ''}
      </p>

      <span className="etiqueta-campo">Lo que se necesita</span>
      <ul className="ingredientes">
        {receta.ingredientes.map((i, n) => (
          <li key={n}><b>{i.que}</b>{i.cuanto ? <span>{i.cuanto}</span> : null}</li>
        ))}
      </ul>

      <span className="etiqueta-campo">Cómo se hace</span>
      <ol className="pasos">
        {receta.pasos.map((p, n) => <li key={n}>{p}</li>)}
      </ol>

      {receta.nota && <p className="nota" style={{ marginTop: 10 }}>{receta.nota}</p>}

      <div style={{ marginTop: 16 }}>
        <button className="btn" type="button"
          onClick={() => {
            const n = ingredientesAlSuper(receta.id)
            setAviso(n === 0 ? 'Ya estaba todo en la lista.' : `${n} cosas agregadas al súper.`)
          }}>
          Agregar los ingredientes al súper
        </button>
        {aviso && <p className="nota"><b>{aviso}</b></p>}
      </div>
    </Hoja>
  )
}

// ------------------------------------------------------------------- súper

function Super() {
  const estado = useEstado()
  const [que, setQue] = useState('')
  const [pasillo, setPasillo] = useState<Pasillo>('abarrotes')

  const pendientes = estado.super.filter(i => !i.comprado)
  const comprados = estado.super.filter(i => i.comprado)

  const agregar = () => {
    if (!que.trim()) return
    agregarAlSuper({ que: que.trim(), pasillo })
    setQue('')
  }

  return (
    <>
      <div className="panel">
        <span className="k">Agregar a la lista</span>
        <input className="campo" value={que} onChange={e => setQue(e.target.value)}
          placeholder="Se acabó el shampoo…" aria-label="Qué falta"
          onKeyDown={e => { if (e.key === 'Enter') agregar() }} />
        <div className="chips">
          {PASILLOS.map(p => (
            <button key={p.id} type="button" className={`chip ${pasillo === p.id ? 'on' : ''}`}
              onClick={() => setPasillo(p.id)}>{p.nombre}</button>
          ))}
        </div>
        <button className="btn" type="button" disabled={!que.trim()} onClick={agregar}>Agregar</button>
      </div>

      {pendientes.length === 0 && comprados.length === 0 && (
        <div className="panel">
          <span className="k">La lista está vacía</span>
          <p className="nota">
            Ponle el menú de la semana y luego dale a «Pasar los ingredientes al súper»: la lista se
            hace sola con todo lo que hace falta.
          </p>
        </div>
      )}

      {PASILLOS.map(p => {
        const cosas = pendientes.filter(i => i.pasillo === p.id)
        if (!cosas.length) return null
        return (
          <div className="panel" key={p.id}>
            <span className="k">{p.nombre}</span>
            {cosas.map(i => (
              <div className="super-fila" key={i.id}>
                <button className="caja" type="button" aria-label={`Ya compré ${i.que}`}
                  onClick={() => alternarComprado(i.id)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2"
                    strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5.5 5.5L20 6.5" /></svg>
                </button>
                <span className="txt">
                  <b>{i.que}</b>
                  <small>{[i.cuanto, i.deReceta].filter(Boolean).join(' · ')}</small>
                </span>
                <button className="quitar" type="button" aria-label={`Quitar ${i.que}`}
                  onClick={() => quitarDelSuper(i.id)}>×</button>
              </div>
            ))}
          </div>
        )
      })}

      {comprados.length > 0 && (
        <div className="panel">
          <span className="k">Ya en el carrito · {comprados.length}</span>
          {comprados.map(i => (
            <div className="super-fila comprada" key={i.id}>
              <button className="caja on" type="button" aria-label={`Regresar ${i.que} a la lista`}
                onClick={() => alternarComprado(i.id)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2"
                  strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5.5 5.5L20 6.5" /></svg>
              </button>
              <span className="txt"><b>{i.que}</b></span>
            </div>
          ))}
          <button className="btn fantasma" type="button" onClick={limpiarComprados}>
            Quitar lo que ya está comprado
          </button>
        </div>
      )}
    </>
  )
}

// ----------------------------------------------------------------- recetas

function Recetas() {
  const estado = useEstado()
  const [busca, setBusca] = useState('')
  const [viendo, setViendo] = useState<Receta | null>(null)
  const [escribiendo, setEscribiendo] = useState<Receta | 'nueva' | null>(null)

  const texto = busca.trim().toLowerCase()
  const lista = useMemo(
    () => todasLasRecetas().filter(r => !texto || r.titulo.toLowerCase().includes(texto)),
    [texto, estado.recetas],
  )

  return (
    <>
      <div className="panel">
        <span className="k">Recetario</span>
        <input className="campo" value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar platillo" aria-label="Buscar receta" />
        <button className="btn" type="button" onClick={() => setEscribiendo('nueva')}>
          Escribir una receta nuestra
        </button>
        <p className="nota">
          Las que vienen con la app están escritas paso a paso, para que cualquiera las pueda sacar.
          Las de ustedes se guardan aquí y le llegan al otro teléfono.
        </p>
      </div>

      <div className="panel">
        {lista.map(r => (
          <div className="receta-fila" key={r.id}>
            <button className="cuerpo" type="button" onClick={() => setViendo(r)}>
              <b>{r.titulo}</b>
              <small>
                {r.tiempos.map(nombreTiempo).join(' · ')} · {r.minutos} min
                {r.deLaCasa ? ' · de la casa' : ''}
              </small>
            </button>
            {r.deLaCasa && (
              <button className="ver" type="button" onClick={() => setEscribiendo(r)}>Editar</button>
            )}
          </div>
        ))}
        {lista.length === 0 && <p className="nota">No hay nada con ese nombre.</p>}
      </div>

      {viendo && <HojaReceta receta={viendo} onCerrar={() => setViendo(null)} />}
      {escribiendo && (
        <HojaEscribirReceta receta={escribiendo === 'nueva' ? undefined : escribiendo}
          onCerrar={() => setEscribiendo(null)} />
      )}
    </>
  )
}

function HojaEscribirReceta({ receta, onCerrar }: { receta?: Receta; onCerrar: () => void }) {
  const [titulo, setTitulo] = useState(receta?.titulo ?? '')
  const [minutos, setMinutos] = useState(String(receta?.minutos ?? 30))
  const [tiempos, setTiempos] = useState<Tiempo[]>(receta?.tiempos ?? ['comida'])
  const [ingredientes, setIngredientes] = useState(
    (receta?.ingredientes ?? []).map(i => [i.que, i.cuanto].filter(Boolean).join(' · ')).join('\n'),
  )
  const [pasos, setPasos] = useState((receta?.pasos ?? []).join('\n'))

  const alternar = (t: Tiempo) =>
    setTiempos(ts => (ts.includes(t) ? ts.filter(x => x !== t) : [...ts, t]))

  const guardar = () => {
    const lineas = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean)
    guardarReceta({
      id: receta?.id,
      titulo: titulo.trim(),
      minutos: Number(minutos.replace(/\D/g, '')) || 30,
      porciones: receta?.porciones ?? 4,
      tiempos: tiempos.length ? tiempos : ['comida'],
      ingredientes: lineas(ingredientes).map(linea => {
        const [que, cuanto] = linea.split('·').map(x => x.trim())
        return { que, cuanto: cuanto || undefined, pasillo: 'otros' as Pasillo }
      }),
      pasos: lineas(pasos),
    })
    onCerrar()
  }

  return (
    <Hoja titulo={receta ? 'Editar la receta' : 'Nuestra receta'} onCerrar={onCerrar}>
      <span className="etiqueta-campo">¿Cómo se llama?</span>
      <input className="campo" autoFocus value={titulo} onChange={e => setTitulo(e.target.value)}
        placeholder="El mole de mi mamá" aria-label="Nombre del platillo" />

      <span className="etiqueta-campo">¿Para qué tiempo?</span>
      <div className="chips">
        {TIEMPOS.map(t => (
          <button key={t.id} type="button" className={`chip ${tiempos.includes(t.id) ? 'on' : ''}`}
            onClick={() => alternar(t.id)}>{t.nombre}</button>
        ))}
      </div>

      <span className="etiqueta-campo">¿Cuántos minutos lleva?</span>
      <input className="campo" inputMode="numeric" value={minutos} onChange={e => setMinutos(e.target.value)}
        aria-label="Minutos" style={{ maxWidth: 120 }} />

      <span className="etiqueta-campo">Ingredientes · uno por renglón</span>
      <textarea className="campo area" value={ingredientes} onChange={e => setIngredientes(e.target.value)}
        rows={6} aria-label="Ingredientes"
        placeholder={'Pollo · 1 kilo\nJitomate · 5\nCebolla · 1'} />

      <span className="etiqueta-campo">Pasos · uno por renglón</span>
      <textarea className="campo area" value={pasos} onChange={e => setPasos(e.target.value)}
        rows={7} aria-label="Pasos"
        placeholder={'Pon a hervir el pollo con sal.\nLicua el jitomate con la cebolla.'} />

      <div style={{ marginTop: 16 }}>
        <button className="btn" type="button" disabled={!titulo.trim()} onClick={guardar}>Guardar</button>
        {receta && (
          <button className="btn peligro" type="button"
            onClick={() => { if (confirm(`¿Borrar "${receta.titulo}"?`)) { borrarReceta(receta.id); onCerrar() } }}>
            Borrar la receta
          </button>
        )}
      </div>
    </Hoja>
  )
}

/** Lo de hoy, para la pantalla de Hoy. */
export function ComidaDeHoy() {
  const estado = useEstado()
  const [viendo, setViendo] = useState<Receta | null>(null)
  const fecha = ymd(hoy())
  const deHoy = TIEMPOS.map(t => ({
    tiempo: t,
    comida: estado.comidas.find(c => c.fecha === fecha && c.tiempo === t.id),
  }))
  if (!deHoy.some(x => x.comida)) return null

  return (
    <div className="panel">
      <span className="k">Hoy se come</span>
      {deHoy.map(({ tiempo, comida }) => (
        <div className="comida-fila chica" key={tiempo.id}>
          <span className="cuerpo">
            <span className="tiempo">{tiempo.nombre}</span>
            <span className="que">
              {comida ? comida.titulo : <em>Sin poner</em>}
              {comida?.cocina && <small> · lo hace {miembro(comida.cocina)?.nombre}</small>}
            </span>
          </span>
          {comida?.recetaId && buscarReceta(comida.recetaId) && (
            <button className="ver" type="button"
              onClick={() => setViendo(buscarReceta(comida.recetaId)!)}>Receta</button>
          )}
        </div>
      ))}
      {viendo && <HojaReceta receta={viendo} onCerrar={() => setViendo(null)} />}
    </div>
  )
}
