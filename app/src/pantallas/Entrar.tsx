import { useState } from 'react'
import { crearCasa, entrar, miembrosDeLaCasa, unirseACasa } from '../nube/sesion'
import { arrancarNube, bajar, subirLoDeAqui, useNube } from '../nube/sincronizacion'
import { MIEMBROS } from '../seed'
import { Avatar } from '../componentes'
import type { MiembroId } from '../types'

const LLAVE_LOCAL = 'juntos.solo-local'
export const quiereSoloLocal = () => localStorage.getItem(LLAVE_LOCAL) === '1'
export const usarSoloLocal = () => localStorage.setItem(LLAVE_LOCAL, '1')
export const dejarDeUsarSoloLocal = () => localStorage.removeItem(LLAVE_LOCAL)

export default function Entrar({ onListo }: { onListo: () => void }) {
  const { conexion } = useNube()
  return (
    <div className="app entrada">
      <header className="cab-entrada">
        <svg width="34" height="34" viewBox="0 0 30 30" aria-hidden="true">
          <circle cx="15" cy="15" r="14" fill="none" stroke="currentColor" strokeOpacity=".22" />
          <path d="M8 15.5l4.6 4.6L22 10.5" fill="none" stroke="currentColor" strokeWidth="2.4"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h1>Juntos+</h1>
        <p>La casa de los cuatro, en un solo lugar.</p>
      </header>

      {conexion === 'sin-casa' ? <ElegirCasa onListo={onListo} /> : <Acceso onListo={onListo} />}

      <button className="btn fantasma" type="button" style={{ marginTop: 22 }}
        onClick={() => { usarSoloLocal(); onListo() }}>
        Usarla solo en este teléfono
      </button>
      <p className="nota" style={{ textAlign: 'center', marginTop: 8 }}>
        Sin cuenta funciona igual, pero lo que hagas no le llega a nadie más.
      </p>
    </div>
  )
}

function Acceso({ onListo }: { onListo: () => void }) {
  const [correo, setCorreo] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const enviar = async () => {
    setError('')
    setCargando(true)
    try {
      await entrar(correo, contrasena)
      // Si todavía no hay casa, la pantalla se queda para elegirla.
      if (await arrancarNube() === 'listo') onListo()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude entrar.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="panel">
      <span className="k">Entrar</span>
      <input className="campo" type="email" inputMode="email" autoComplete="email" placeholder="Tu correo"
        value={correo} onChange={e => setCorreo(e.target.value)} aria-label="Correo" />
      <input className="campo" type="password" autoComplete="current-password" placeholder="Tu contraseña"
        value={contrasena} onChange={e => setContrasena(e.target.value)} aria-label="Contraseña"
        onKeyDown={e => { if (e.key === 'Enter') void enviar() }} />
      {error && <p className="error">{error}</p>}
      <button className="btn" type="button" disabled={cargando || !correo || !contrasena} onClick={() => void enviar()}>
        {cargando ? 'Entrando…' : 'Entrar'}
      </button>
    </div>
  )
}

function ElegirCasa({ onListo }: { onListo: () => void }) {
  const [modo, setModo] = useState<'elegir' | 'crear' | 'unirse'>('elegir')
  const [yo, setYo] = useState<MiembroId>('fa')
  const [codigo, setCodigo] = useState('')
  const [libres, setLibres] = useState<{ corto: string; nombre: string; tomado: boolean }[] | null>(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const crear = async () => {
    setError(''); setCargando(true)
    try {
      await crearCasa('Nuestra casa', yo)
      // Primero se sube lo de este teléfono; bajar antes dejaría la casa vacía.
      await arrancarNube(false)
      await subirLoDeAqui()
      await bajar()
      onListo()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude crear la casa.')
    } finally { setCargando(false) }
  }

  const buscar = async () => {
    setError(''); setCargando(true)
    try {
      const gente = await miembrosDeLaCasa(codigo)
      if (!gente.length) setError('Ese código no existe. Revísalo con quien creó la casa.')
      setLibres(gente)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude buscar la casa.')
    } finally { setCargando(false) }
  }

  const unirse = async (corto: string) => {
    setError(''); setCargando(true)
    try {
      await unirseACasa(codigo, corto)
      await arrancarNube()
      onListo()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pude entrar a la casa.')
    } finally { setCargando(false) }
  }

  if (modo === 'elegir') {
    return (
      <div className="panel">
        <span className="k">Ya entraste. Ahora, la casa</span>
        <p className="nota">Si eres el primero, créala. Si alguien ya la creó, únete con su código.</p>
        <button className="btn" type="button" onClick={() => setModo('crear')}>Crear nuestra casa</button>
        <button className="btn fantasma" type="button" onClick={() => setModo('unirse')}>Tengo un código</button>
      </div>
    )
  }

  if (modo === 'crear') {
    return (
      <div className="panel">
        <span className="k">¿Quién eres?</span>
        <div className="chips">
          {MIEMBROS.map(m => (
            <button key={m.id} type="button" className={`chip ${yo === m.id ? 'on' : ''}`} onClick={() => setYo(m.id)}>
              <Avatar quien={m.id} chico /> {m.nombre}
            </button>
          ))}
        </div>
        <p className="nota">
          Se crea la casa con los cuatro y se sube lo que ya tienes en este teléfono. Después le pasas el
          código a los demás para que entren.
        </p>
        {error && <p className="error">{error}</p>}
        <button className="btn" type="button" disabled={cargando} onClick={() => void crear()}>
          {cargando ? 'Creando…' : 'Crear la casa'}
        </button>
        <button className="btn fantasma" type="button" onClick={() => setModo('elegir')}>Regresar</button>
      </div>
    )
  }

  return (
    <div className="panel">
      <span className="k">Código de la casa</span>
      <input className="campo" placeholder="Por ejemplo: K7M2QP" value={codigo}
        onChange={e => setCodigo(e.target.value.toUpperCase())} aria-label="Código de la casa"
        autoCapitalize="characters" />
      {error && <p className="error">{error}</p>}

      {!libres && (
        <button className="btn" type="button" disabled={cargando || codigo.length < 4} onClick={() => void buscar()}>
          {cargando ? 'Buscando…' : 'Buscar la casa'}
        </button>
      )}

      {libres && libres.length > 0 && (
        <>
          <span className="k">¿Quién eres?</span>
          <div className="chips">
            {libres.map(m => (
              <button key={m.corto} type="button" className="chip" disabled={m.tomado || cargando}
                onClick={() => void unirse(m.corto)}>
                {m.nombre}{m.tomado ? ' · ya está' : ''}
              </button>
            ))}
          </div>
        </>
      )}

      <button className="btn fantasma" type="button" onClick={() => { setModo('elegir'); setLibres(null) }}>
        Regresar
      </button>
    </div>
  )
}
