import { useEffect, useState } from 'react'
import './app.css'
import Hoy from './pantallas/Hoy'
import Semana from './pantallas/Semana'
import Calendario from './pantallas/Calendario'
import Dinero from './pantallas/Dinero'
import Mas from './pantallas/Mas'
import Entrar, { quiereSoloLocal } from './pantallas/Entrar'
import { arrancarNube, useNube } from './nube/sincronizacion'
import { Hoja, Interruptor, SelectorMiembro } from './componentes'
import { agregarEvento, agregarMovimiento, agregarTarea, confirmarCargo, materializarSemana, useEstado } from './store'
import { CATEGORIAS_GASTO, CATEGORIAS_INGRESO, pesos } from './seed'
import type { Ocurrencia } from './dinero'
import { diaCorto, hoy, lunesDe, sumarDias, ymd } from './dates'
import type { MiembroId, Responsable, TipoMovimiento } from './types'
import { MIEMBROS } from './seed'

type Pestana = 'hoy' | 'semana' | 'calendario' | 'dinero' | 'mas'

const ICONOS: Record<Pestana, string> = {
  hoy: 'M4 12.5l5.5 5.5L20 6.5',
  semana: 'M3 8h18M3 14h18M8 4v16M16 4v16',
  calendario: 'M4 6h16v14H4zM4 10h16M9 3v4M15 3v4',
  dinero: 'M12 4v16M8 8h6a2 2 0 010 4H10a2 2 0 000 4h6',
  mas: 'M5 12h.01M12 12h.01M19 12h.01',
}

const NOMBRES: Record<Pestana, string> = {
  hoy: 'Hoy', semana: 'Semana', calendario: 'Calendario', dinero: 'Dinero', mas: 'Más',
}

export default function App() {
  const estado = useEstado()
  const { conexion, pendientes } = useNube()
  const [pestana, setPestana] = useState<Pestana>('hoy')
  const [saltarEntrada, setSaltarEntrada] = useState(quiereSoloLocal())
  const [hojaAbierta, setHojaAbierta] = useState<'tarea' | 'evento' | 'movimiento' | null>(null)
  const [cargoPorCapturar, setCargoPorCapturar] = useState<Ocurrencia | null>(null)

  const capturarCargo = (o?: Ocurrencia) => {
    setCargoPorCapturar(o ?? null)
    setHojaAbierta('movimiento')
  }

  useEffect(() => { materializarSemana(lunesDe(hoy())) }, [])
  useEffect(() => { void arrancarNube() }, [])

  const pideEntrar = (conexion === 'sin-sesion' || conexion === 'sin-casa') && !saltarEntrada
  if (pideEntrar) return <Entrar onListo={() => setSaltarEntrada(true)} />

  const esHija = estado.yo === 'vi' || estado.yo === 'so'

  return (
    <div className="app">
      {(conexion === 'sin-señal' || pendientes > 0) && (
        <div className="cinta">
          Sin señal · {pendientes} {pendientes === 1 ? 'cambio guardado aquí' : 'cambios guardados aquí'}
        </div>
      )}
      {pestana === 'hoy' && <Hoy />}
      {pestana === 'semana' && <Semana />}
      {pestana === 'calendario' && <Calendario />}
      {pestana === 'dinero' && !esHija && <Dinero onCapturar={capturarCargo} />}
      {pestana === 'mas' && <Mas />}

      {pestana !== 'mas' && (
        <button className="fab" type="button"
          aria-label={
            pestana === 'calendario' ? 'Agendar algo'
              : pestana === 'dinero' ? 'Registrar movimiento'
                : 'Agregar tarea o pendiente'
          }
          onClick={() => setHojaAbierta(
            pestana === 'calendario' ? 'evento' : pestana === 'dinero' ? 'movimiento' : 'tarea',
          )}>＋</button>
      )}

      {hojaAbierta === 'tarea' && <HojaTarea yo={estado.yo} onCerrar={() => setHojaAbierta(null)} />}
      {hojaAbierta === 'evento' && <HojaEvento onCerrar={() => setHojaAbierta(null)} />}
      {hojaAbierta === 'movimiento' && (
        <HojaMovimiento yo={estado.yo} cargo={cargoPorCapturar}
          onCerrar={() => { setHojaAbierta(null); setCargoPorCapturar(null) }} />
      )}

      <nav className="nav">
        {(Object.keys(NOMBRES) as Pestana[]).filter(p => !(esHija && p === 'dinero')).map(p => (
          <button key={p} type="button" className={pestana === p ? 'on' : ''}
            aria-current={pestana === p ? 'page' : undefined} onClick={() => setPestana(p)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d={ICONOS[p]} />
            </svg>
            {NOMBRES[p]}
          </button>
        ))}
      </nav>
    </div>
  )
}

function HojaTarea({ yo, onCerrar }: { yo: MiembroId; onCerrar: () => void }) {
  const [titulo, setTitulo] = useState('')
  const [para, setPara] = useState<Responsable>(yo)
  const [repite, setRepite] = useState(false)
  const [sinDiaFijo, setSinDiaFijo] = useState(false)
  const [fecha, setFecha] = useState(ymd(hoy()))

  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunesDe(hoy()), i))

  const guardar = () => {
    if (!titulo.trim()) return
    agregarTarea({
      titulo: titulo.trim(),
      responsable: para,
      fecha: repite && sinDiaFijo ? null : fecha,
      repite,
      semanalFlexible: repite && sinDiaFijo,
      asignadaPor: para !== yo ? yo : undefined,
    })
    onCerrar()
  }

  return (
    <Hoja titulo="Agregar" onCerrar={onCerrar}>
      <input className="campo" autoFocus value={titulo} onChange={e => setTitulo(e.target.value)}
        placeholder="Por ejemplo: cambiar la bombilla del pasillo" />

      <span className="etiqueta-campo">¿Para quién?</span>
      <SelectorMiembro valor={para} onCambio={setPara} conAmbos />

      {!(repite && sinDiaFijo) && (
        <>
          <span className="etiqueta-campo">¿Qué día?</span>
          <div className="chips">
            {dias.map(d => (
              <button key={ymd(d)} type="button" className={`chip ${fecha === ymd(d) ? 'on' : ''}`}
                onClick={() => setFecha(ymd(d))}>{diaCorto(d)} {d.getDate()}</button>
            ))}
          </div>
        </>
      )}

      <div className="fila" style={{ marginTop: 16 }}>
        <span className="lbl">Se repite cada semana
          <small>{repite ? 'Va a volver sola y no se borra' : 'Es solo por esta vez: se hace y se va'}</small>
        </span>
        <Interruptor activo={repite} onCambio={setRepite} etiqueta="Se repite cada semana" />
      </div>

      {repite && (
        <div className="fila">
          <span className="lbl">Sin día fijo
            <small>Se hace en la semana, cuando se pueda — como lavar la ropa</small>
          </span>
          <Interruptor activo={sinDiaFijo} onCambio={setSinDiaFijo} etiqueta="Sin día fijo" />
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <button className="btn" type="button" onClick={guardar} disabled={!titulo.trim()}>
          {para !== yo && para !== 'ambos' ? `Pasárselo a ${MIEMBROS.find(m => m.id === para)?.nombre}` : 'Guardar'}
        </button>
      </div>
    </Hoja>
  )
}

function HojaEvento({ onCerrar }: { onCerrar: () => void }) {
  const [titulo, setTitulo] = useState('')
  const [fecha, setFecha] = useState(ymd(hoy()))
  const [hora, setHora] = useState('')
  const [lugar, setLugar] = useState('')
  const [anual, setAnual] = useState(false)
  const [conQuien, setConQuien] = useState<MiembroId[]>(['fa', 'sa'])

  const alternar = (id: MiembroId) =>
    setConQuien(c => (c.includes(id) ? c.filter(x => x !== id) : [...c, id]))

  const guardar = () => {
    if (!titulo.trim()) return
    agregarEvento({
      titulo: titulo.trim(), fecha, hora: hora || undefined, lugar: lugar || undefined,
      anual, conQuien, avisarDiasAntes: anual ? 5 : 2,
    })
    onCerrar()
  }

  return (
    <Hoja titulo="Agendar" onCerrar={onCerrar}>
      <input className="campo" autoFocus value={titulo} onChange={e => setTitulo(e.target.value)}
        placeholder="Por ejemplo: ir al beisbol" />

      <span className="etiqueta-campo">¿Cuándo?</span>
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="campo" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
        <input className="campo" type="time" value={hora} onChange={e => setHora(e.target.value)} style={{ maxWidth: 140 }} />
      </div>

      <span className="etiqueta-campo">¿Dónde? (opcional)</span>
      <input className="campo" value={lugar} onChange={e => setLugar(e.target.value)} placeholder="Estadio, casa de mi mamá…" />

      <span className="etiqueta-campo">¿Quiénes van?</span>
      <div className="chips">
        {MIEMBROS.map(m => (
          <button key={m.id} type="button" className={`chip ${conQuien.includes(m.id) ? 'on' : ''}`}
            onClick={() => alternar(m.id)}>{m.nombre}</button>
        ))}
      </div>

      <div className="fila" style={{ marginTop: 16 }}>
        <span className="lbl">Se repite cada año
          <small>{anual ? 'Aniversarios y cumpleaños: vuelve solo cada año' : 'Un plan de una vez: pasa y se va'}</small>
        </span>
        <Interruptor activo={anual} onCambio={setAnual} etiqueta="Se repite cada año" />
      </div>

      <p className="nota" style={{ marginTop: 10 }}>
        {anual ? 'Les va a avisar 5 días antes, cuando todavía se puede hacer algo.'
          : 'Queda pendiente para los dos y les avisa 2 días antes.'}
      </p>

      <div style={{ marginTop: 18 }}>
        <button className="btn" type="button" onClick={guardar} disabled={!titulo.trim()}>Agendar</button>
      </div>
    </Hoja>
  )
}

function HojaMovimiento({ yo, cargo, onCerrar }: { yo: MiembroId; cargo: Ocurrencia | null; onCerrar: () => void }) {
  const [tipo, setTipo] = useState<TipoMovimiento>(cargo?.cargo.tipo ?? 'gasto')
  const [monto, setMonto] = useState('')
  const [categoria, setCategoria] = useState(cargo?.cargo.categoria ?? 'Súper')
  const [quien, setQuien] = useState<MiembroId>(cargo?.cargo.quien ?? yo)
  const [fecha, setFecha] = useState(cargo?.fecha ?? ymd(hoy()))
  const [nota, setNota] = useState(cargo?.cargo.titulo ?? '')

  const cantidad = Number(monto.replace(/[^0-9.]/g, ''))
  const valido = cantidad > 0 && cantidad < 1000000

  const guardar = () => {
    if (!valido) return
    if (cargo) {
      confirmarCargo(cargo.cargo.id, cargo.periodo, fecha, cantidad)
    } else {
      agregarMovimiento({ tipo, monto: cantidad, categoria, fecha, miembro: quien, nota: nota.trim() || undefined })
    }
    onCerrar()
  }

  const categorias = tipo === 'ingreso' ? CATEGORIAS_INGRESO : CATEGORIAS_GASTO

  return (
    <Hoja titulo={cargo ? cargo.cargo.titulo : 'Registrar movimiento'} onCerrar={onCerrar}>
      {!cargo && (
        <div className="chips" style={{ marginBottom: 14 }}>
          <button type="button" className={`chip ${tipo === 'gasto' ? 'on' : ''}`}
            onClick={() => { setTipo('gasto'); setCategoria('Súper') }}>Gasté</button>
          <button type="button" className={`chip ${tipo === 'ingreso' ? 'on' : ''}`}
            onClick={() => { setTipo('ingreso'); setCategoria('Tarot') }}>Me pagaron</button>
        </div>
      )}

      <input className="campo monto-campo" autoFocus inputMode="decimal" value={monto}
        onChange={e => setMonto(e.target.value)} placeholder="$0" aria-label="Monto" />
      {cargo && !cargo.cargo.variable && <p className="nota">Normalmente son {pesos(cargo.cargo.monto)}.</p>}
      {cargo?.cargo.aportaciones && (
        <p className="nota">Se reparte igual que siempre: {cargo.cargo.aportaciones
          .map(a => `${MIEMBROS.find(m => m.id === a.miembro)?.nombre} ${pesos(a.monto)}`).join(' y ')}.</p>
      )}

      {!cargo && (
        <>
          <span className="etiqueta-campo">¿De qué fue?</span>
          <div className="chips">
            {categorias.map(c => (
              <button key={c} type="button" className={`chip ${categoria === c ? 'on' : ''}`}
                onClick={() => setCategoria(c)}>{c}</button>
            ))}
          </div>

          <span className="etiqueta-campo">¿Quién {tipo === 'ingreso' ? 'lo recibió' : 'pagó'}?</span>
          <div className="chips">
            {MIEMBROS.filter(m => m.rol === 'adulto').map(m => (
              <button key={m.id} type="button" className={`chip ${quien === m.id ? 'on' : ''}`}
                onClick={() => setQuien(m.id)}>{m.nombre}</button>
            ))}
          </div>

          <span className="etiqueta-campo">Nota (opcional)</span>
          <input className="campo" value={nota} onChange={e => setNota(e.target.value)}
            placeholder="Súper de la semana, gasolina…" />
        </>
      )}

      <span className="etiqueta-campo">¿Cuándo?</span>
      <input className="campo" type="date" value={fecha} onChange={e => setFecha(e.target.value)} />

      <div style={{ marginTop: 18 }}>
        <button className="btn" type="button" onClick={guardar} disabled={!valido}>
          {cargo ? 'Confirmar' : tipo === 'ingreso' ? 'Registrar ingreso' : 'Registrar gasto'}
        </button>
      </div>
    </Hoja>
  )
}
