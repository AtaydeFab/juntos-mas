import { useMemo, useState } from 'react'
import { useEstado, confirmarCargo, borrarMovimiento } from '../store'
import { miembro, pesos } from '../seed'
import { avanceDeLaSemana, pendientesDelMes, resumenDelMes, type Ocurrencia } from '../dinero'
import { desdeYmd, fechaCorta, hoy, nombreMes } from '../dates'
import type { Movimiento } from '../types'

type Ambito = 'mio' | 'nuestro'

export default function Dinero({ onCapturar }: { onCapturar: (o?: Ocurrencia) => void }) {
  const estado = useEstado()
  const [ambito, setAmbito] = useState<Ambito>('nuestro')
  const [mesOffset, setMesOffset] = useState(0)

  const base = new Date(hoy().getFullYear(), hoy().getMonth() + mesOffset, 1)
  const anio = base.getFullYear()
  const mes = base.getMonth()

  const resumen = useMemo(
    () => resumenDelMes(estado.movimientos, anio, mes, ambito === 'mio' ? estado.yo : undefined),
    [estado.movimientos, anio, mes, ambito, estado.yo],
  )

  const pendientes = useMemo(() => pendientesDelMes(estado, anio, mes), [estado, anio, mes])
  const mios = ambito === 'mio'
  const pendientesVisibles = mios
    ? pendientes.filter(o => o.cargo.quien === estado.yo || o.cargo.aportaciones?.some(a => a.miembro === estado.yo))
    : pendientes

  const miMeta = estado.metas.find(m => m.miembro === (mios ? estado.yo : 'sa'))
  const avance = miMeta ? avanceDeLaSemana(estado.movimientos, miMeta.miembro) : 0

  const ultimos = useMemo(() => {
    return estado.movimientos
      .filter(m => (!mios || m.miembro === estado.yo))
      .filter(m => {
        const f = desdeYmd(m.fecha)
        return f.getFullYear() === anio && f.getMonth() === mes
      })
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .slice(0, 12)
  }, [estado.movimientos, mios, estado.yo, anio, mes])

  const mayor = resumen.porCategoria[0]?.monto ?? 1
  const totalPagado = resumen.porMiembro.reduce((s, p) => s + p.monto, 0)

  return (
    <>
      <header className="cab">
        <h1>{mios ? 'Mi dinero' : 'Nuestro dinero'}</h1>
        <span className="sub">{nombreMes(base)}</span>
      </header>

      <div className="chips" style={{ marginBottom: 12 }}>
        <button type="button" className={`chip ${mios ? 'on' : ''}`} onClick={() => setAmbito('mio')}>Mío</button>
        <button type="button" className={`chip ${!mios ? 'on' : ''}`} onClick={() => setAmbito('nuestro')}>Nuestro</button>
        <button type="button" className="chip" onClick={() => setMesOffset(m => m - 1)} aria-label="Mes anterior">←</button>
        {mesOffset !== 0 && <button type="button" className="chip" onClick={() => setMesOffset(0)}>Este mes</button>}
        {mesOffset < 0 && <button type="button" className="chip" onClick={() => setMesOffset(m => m + 1)} aria-label="Mes siguiente">→</button>}
      </div>

      <div className="panel">
        <span className="k">{mios ? 'Me queda del mes' : 'Nos queda del mes'}</span>
        <span className="hero-num" style={{ color: resumen.queda >= 0 ? 'var(--good)' : 'var(--sa)' }}>
          {pesos(resumen.queda)}
        </span>
        <div className="resumen">
          <div><span className="v">{pesos(resumen.entro)}</span><span className="l">Entró</span></div>
          <div><span className="v">{pesos(resumen.salio)}</span><span className="l">Salió</span></div>
        </div>
        {resumen.entro === 0 && resumen.salio === 0 && (
          <p className="nota">Todavía no hay movimientos este mes. Confirma los fijos de abajo y en dos semanas ya se ve el patrón.</p>
        )}
      </div>

      {pendientesVisibles.length > 0 && (
        <>
          <div className="seccion">
            <span>Fijos por confirmar</span>
            <span>{pendientesVisibles.length}</span>
          </div>
          {pendientesVisibles.map(o => (
            <FilaCargo key={`${o.cargo.id}|${o.periodo}`} o={o} onCapturar={onCapturar} />
          ))}
          <p className="nota" style={{ padding: '0 4px 8px' }}>
            Entran solos en su fecha. Solo hay que confirmarlos — los de monto variable piden la cantidad real.
          </p>
        </>
      )}

      {miMeta && (
        <div className="panel">
          <span className="k">Meta de la semana · {miembro(miMeta.miembro)?.nombre}</span>
          <div className="track" style={{ height: 12 }}>
            <span className="fill sa" style={{ width: `${Math.min(100, (avance / miMeta.monto) * 100)}%` }} />
          </div>
          <p style={{ margin: 0, fontSize: 14 }}>
            <b>{pesos(avance)}</b> de {pesos(miMeta.monto)}
          </p>
          <p className="nota">
            Es una meta, no un dato dado por hecho: la app solo cuenta lo que de verdad entró.
          </p>
        </div>
      )}

      {resumen.porCategoria.length > 0 && (
        <div className="panel">
          <span className="k">En qué se fue</span>
          <div className="barlist">
            {resumen.porCategoria.map(c => (
              <div className="row" key={c.categoria}>
                <div className="top"><span>{c.categoria}</span><span className="amt">{pesos(c.monto)}</span></div>
                <div className="track"><span className="fill n" style={{ width: `${(c.monto / mayor) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!mios && resumen.porMiembro.length > 0 && (
        <div className="panel">
          <span className="k">Quién ha pagado qué</span>
          <div className="stackbar" role="img"
            aria-label={resumen.porMiembro.map(p => `${miembro(p.miembro)?.nombre} ${pesos(p.monto)}`).join(', ')}>
            {resumen.porMiembro.map(p => (
              <span key={p.miembro} style={{
                width: `${(p.monto / totalPagado) * 100}%`,
                background: p.miembro === 'sa' ? 'var(--sa)' : p.miembro === 'fa' ? 'var(--fa)' : 'var(--ni)',
              }} />
            ))}
          </div>
          <div className="legend">
            {resumen.porMiembro.map(p => (
              <span key={p.miembro}>
                <i style={{ background: p.miembro === 'sa' ? 'var(--sa)' : p.miembro === 'fa' ? 'var(--fa)' : 'var(--ni)' }} />
                {miembro(p.miembro)?.nombre} {pesos(p.monto)}
              </span>
            ))}
          </div>
          <p className="nota">Sin deudas ni cobros: es nada más la foto de cómo salió el mes.</p>
        </div>
      )}

      {ultimos.length > 0 && (
        <>
          <div className="seccion"><span>Movimientos</span></div>
          {ultimos.map(m => <FilaMovimiento key={m.id} m={m} />)}
        </>
      )}
    </>
  )
}

function FilaCargo({ o, onCapturar }: { o: Ocurrencia; onCapturar: (o: Ocurrencia) => void }) {
  const { cargo } = o
  const reparto = cargo.aportaciones
  return (
    <div className="evento">
      <span className="fecha"><b>{desdeYmd(o.fecha).getDate()}</b>{fechaCorta(desdeYmd(o.fecha)).split(' ')[1]}</span>
      <span className="txt">
        <b>{cargo.titulo}</b>
        <small>
          {cargo.variable ? 'monto variable' : pesos(cargo.monto)}
          {reparto ? ` · ${reparto.map(a => `${miembro(a.miembro)?.corto} ${pesos(a.monto)}`).join(' + ')}` : ''}
          {cargo.tipo === 'ingreso' ? ' · entra' : ''}
        </small>
      </span>
      <button className="btn confirmar" type="button"
        onClick={() => (cargo.variable ? onCapturar(o) : confirmarCargo(cargo.id, o.periodo, o.fecha))}>
        {cargo.variable ? 'Capturar' : 'Confirmar'}
      </button>
    </div>
  )
}

function FilaMovimiento({ m }: { m: Movimiento }) {
  const [confirmando, setConfirmando] = useState(false)
  return (
    <div className="evento">
      <span className="fecha"><b>{desdeYmd(m.fecha).getDate()}</b>{fechaCorta(desdeYmd(m.fecha)).split(' ')[1]}</span>
      <span className="txt">
        <b>{m.nota || m.categoria}</b>
        <small>{m.nota ? `${m.categoria} · ` : ''}{miembro(m.miembro)?.nombre}</small>
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="monto" style={{ color: m.tipo === 'ingreso' ? 'var(--good)' : 'var(--ink)' }}>
          {m.tipo === 'ingreso' ? '+' : '−'}{pesos(m.monto)}
        </span>
        {confirmando ? (
          <button className="caja" type="button" aria-label="Confirmar borrado"
            onClick={() => borrarMovimiento(m.id)} style={{ color: 'var(--sa)', width: 28, height: 28 }}>✓</button>
        ) : (
          <button className="caja" type="button" aria-label={`Borrar ${m.categoria}`}
            onClick={() => setConfirmando(true)} style={{ color: 'var(--muted)', width: 28, height: 28 }}>×</button>
        )}
      </span>
    </div>
  )
}
