import { useRef, useState } from 'react'
import { useEstado, cambiarYo, agregarRecordatorio, borrarRecordatorio, reiniciar, exportar, importar } from '../store'
import { Avatar, SelectorMiembro } from '../componentes'
import { useNube, olvidarNube, bajar, vaciarCola } from '../nube/sincronizacion'
import { salir } from '../nube/sesion'
import { dejarDeUsarSoloLocal, usarSoloLocal } from './Entrar'
import { hayNube } from '../nube/cliente'
import { comoInstalarAMano, instalar, useInstalacion } from '../instalar'
import { MIEMBROS, miembro } from '../seed'
import type { MiembroId, Responsable } from '../types'

export default function Mas() {
  const estado = useEstado()
  const [texto, setTexto] = useState('')
  const [para, setPara] = useState<MiembroId>(estado.yo)

  const agregar = () => {
    if (!texto.trim()) return
    agregarRecordatorio({ texto: texto.trim(), para, permanente: true })
    setTexto('')
  }

  return (
    <>
      <header className="cab">
        <h1>Más</h1>
        <span className="sub">Juntos+ · versión 0.1</span>
      </header>

      <LaNube />
      <Instalacion />

      <div className="panel">
        <span className="k">¿Quién está usando este teléfono?</span>
        <SelectorMiembro valor={estado.yo} onCambio={(v: Responsable) => { if (v !== 'ambos' && v !== 'turno') cambiarYo(v) }} />
        <p className="nota">
          Con la casa conectada, esto lo define tu cuenta y no se cambia a mano.
        </p>
      </div>

      <div className="seccion"><span>Recordatorios</span></div>
      {MIEMBROS.map(m => {
        const suyos = estado.recordatorios.filter(r => r.para === m.id)
        if (!suyos.length) return null
        return (
          <div className="panel" key={m.id}>
            <span className="k" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Avatar quien={m.id} chico /> {m.nombre}
            </span>
            {suyos.map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 15 }}>{r.texto}</span>
                <button className="caja" type="button" aria-label={`Quitar ${r.texto}`}
                  onClick={() => borrarRecordatorio(r.id)} style={{ color: 'var(--muted)', width: 28, height: 28 }}>×</button>
              </div>
            ))}
            {m.id === estado.yo && <p className="nota">Solo tú los ves en tu pantalla de inicio.</p>}
          </div>
        )
      })}

      <div className="panel">
        <span className="k">Agregar recordatorio</span>
        <input className="campo" value={texto} onChange={e => setTexto(e.target.value)}
          placeholder="Por ejemplo: no dejar los zapatos regados" />
        <span className="etiqueta-campo">¿Para quién?</span>
        <SelectorMiembro valor={para} onCambio={(v: Responsable) => { if (v !== 'ambos' && v !== 'turno') setPara(v) }} />
        <button className="btn" type="button" onClick={agregar} disabled={!texto.trim()}>
          {para === estado.yo ? 'Guardar el mío' : `Proponérselo a ${miembro(para)?.nombre}`}
        </button>
        {para !== estado.yo && (
          <p className="nota">
            Cuando estén conectadas las cuentas, esto le va a llegar para aceptar: mientras no lo acepte,
            no se le muestra.
          </p>
        )}
      </div>

      <div className="seccion"><span>Lo que sigue (interno)</span></div>
      <div className="panel">
        <p className="nota" style={{ fontSize: 14 }}>
          <b style={{ color: 'var(--ink)' }}>Ya está:</b> tareas, calendario, recordatorios y dinero.<br />
          <b style={{ color: 'var(--ink)' }}>Falta:</b> las cuentas de los cuatro, para que lo que uno palomee o
          registre le aparezca al otro al instante.
        </p>
      </div>

      <Respaldo />

      <div className="panel">
        <span className="k">Empezar de cero</span>
        <p className="nota">Borra lo palomeado y deja el machote como venía. Solo afecta este teléfono.</p>
        <button className="btn peligro" type="button"
          onClick={() => { if (confirm('¿Borrar todo lo de este teléfono y dejar el machote como venía?')) reiniciar() }}>
          Reiniciar
        </button>
      </div>
    </>
  )
}

function Respaldo() {
  const entrada = useRef<HTMLInputElement>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const bajar = () => {
    const blob = new Blob([exportar()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const f = new Date()
    a.href = url
    a.download = `juntos-respaldo-${f.getFullYear()}-${`${f.getMonth() + 1}`.padStart(2, '0')}-${`${f.getDate()}`.padStart(2, '0')}.json`
    a.click()
    URL.revokeObjectURL(url)
    setAviso('Respaldo guardado. Mándatelo por WhatsApp o correo para tenerlo a la mano.')
  }

  const subir = async (archivo: File | undefined) => {
    if (!archivo) return
    const resultado = importar(await archivo.text())
    setAviso(resultado.mensaje)
  }

  return (
    <div className="panel">
      <span className="k">Respaldo</span>
      <p className="nota">
        Todo vive en este teléfono. Si se borran los datos del navegador o cambias de aparato, se pierde —
        salvo que tengas un respaldo.
      </p>
      <button className="btn fantasma" type="button" onClick={bajar}>Guardar respaldo</button>
      <button className="btn fantasma" type="button" onClick={() => entrada.current?.click()}>Restaurar de un respaldo</button>
      <input ref={entrada} type="file" accept="application/json,.json" hidden
        onChange={e => { void subir(e.target.files?.[0]); e.target.value = '' }} />
      {aviso && <p className="nota" style={{ color: 'var(--good)' }}>{aviso}</p>}
    </div>
  )
}

/** Estado de la conexión, el código para invitar y la salida. */
function LaNube() {
  const estado = useEstado()
  const { conexion, pendientes } = useNube()
  const [copiado, setCopiado] = useState(false)

  if (!hayNube) return null

  if (!estado.nube) {
    return (
      <div className="panel">
        <span className="k">La casa</span>
        <p className="nota">
          Ahorita todo se queda en este teléfono. Si entras con tu cuenta, lo que hagas le llega
          también a los demás.
        </p>
        <button className="btn" type="button"
          onClick={() => { dejarDeUsarSoloLocal(); location.reload() }}>
          Conectar con la casa
        </button>
      </div>
    )
  }

  const dice: Record<string, string> = {
    listo: 'Al día',
    sincronizando: 'Poniéndose al día…',
    'sin-señal': 'Sin señal · se sube solo cuando vuelva',
    error: 'Algo falló',
    'sin-sesion': 'Se cerró la sesión',
    'sin-casa': 'Sin casa',
    'sin-nube': 'Solo en este teléfono',
  }

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(estado.nube!.codigo)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <div className="panel">
      <span className="k">La casa</span>
      <p style={{ margin: 0, fontSize: 15 }}>
        <b>{dice[conexion] ?? conexion}</b>
        {pendientes > 0 ? ` · ${pendientes} por subir` : ''}
      </p>
      <p className="nota">Entraste como {estado.nube.correo}</p>

      <div className="regla" />
      <span className="k">Código para invitar</span>
      <p className="codigo">{estado.nube.codigo}</p>
      <p className="nota">
        Con este código entran los demás desde su teléfono: escogen su nombre y ya.
      </p>
      <button className="btn fantasma" type="button" onClick={() => void copiar()}>
        {copiado ? 'Copiado' : 'Copiar el código'}
      </button>

      <div className="regla" />
      <button className="btn fantasma" type="button"
        onClick={() => void vaciarCola().then(() => bajar())}>
        Ponerse al día ahora
      </button>
      <button className="btn peligro" type="button"
        onClick={async () => {
          if (!confirm('¿Cerrar la sesión en este teléfono?')) return
          await salir()
          olvidarNube()
          usarSoloLocal()
          location.reload()
        }}>
        Cerrar sesión
      </button>
    </div>
  )
}

/** Ponerla en la pantalla de inicio, con botón si el navegador deja. */
function Instalacion() {
  const { instalada, sePuede } = useInstalacion()

  if (instalada) {
    return (
      <div className="panel">
        <span className="k">En tu pantalla</span>
        <p className="nota">Ya está instalada en este teléfono. Se abre como cualquier otra app.</p>
      </div>
    )
  }

  return (
    <div className="panel">
      <span className="k">Ponerla en tu pantalla</span>
      <p className="nota">
        Queda con su ícono junto a las demás apps y abre en pantalla completa, sin tener que
        acordarse de ninguna dirección.
      </p>
      {sePuede
        ? <button className="btn" type="button" onClick={() => void instalar()}>Ponerla en la pantalla</button>
        : <p className="nota">{comoInstalarAMano()}</p>}
    </div>
  )
}
