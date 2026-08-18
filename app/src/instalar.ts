import { useSyncExternalStore } from 'react'

interface EventoInstalacion extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const LLAVE_ESCONDIDO = 'juntos.instalar-no'

let invitacion: EventoInstalacion | null = null
let instalada = false
const oyentes = new Set<() => void>()
const avisar = () => oyentes.forEach(fn => fn())

if (typeof window !== 'undefined') {
  instalada =
    window.matchMedia('(display-mode: standalone)').matches ||
    // Safari en iPhone lo marca aparte.
    (window.navigator as { standalone?: boolean }).standalone === true

  // El navegador avisa cuando la app se puede poner en la pantalla de inicio.
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()
    invitacion = e as EventoInstalacion
    avisar()
  })

  window.addEventListener('appinstalled', () => {
    invitacion = null
    instalada = true
    avisar()
  })
}

export interface EstadoInstalacion {
  /** Ya está en la pantalla de inicio. */
  instalada: boolean
  /** El navegador deja instalarla con un botón. */
  sePuede: boolean
  /** El usuario dijo que no por ahora. */
  escondido: boolean
}

let ultimo: EstadoInstalacion = { instalada, sePuede: false, escondido: false }

export function useInstalacion(): EstadoInstalacion {
  return useSyncExternalStore(
    fn => {
      oyentes.add(fn)
      return () => oyentes.delete(fn)
    },
    () => {
      const escondido = localStorage.getItem(LLAVE_ESCONDIDO) === '1'
      const sePuede = Boolean(invitacion)
      if (ultimo.instalada !== instalada || ultimo.sePuede !== sePuede || ultimo.escondido !== escondido) {
        ultimo = { instalada, sePuede, escondido }
      }
      return ultimo
    },
    () => ultimo,
  )
}

/** Abre el cuadro del navegador para ponerla en la pantalla de inicio. */
export async function instalar(): Promise<boolean> {
  if (!invitacion) return false
  await invitacion.prompt()
  const { outcome } = await invitacion.userChoice
  if (outcome === 'accepted') {
    invitacion = null
    instalada = true
  }
  avisar()
  return outcome === 'accepted'
}

export function esconderInvitacion() {
  localStorage.setItem(LLAVE_ESCONDIDO, '1')
  avisar()
}

/** Cuando el navegador no ofrece el botón, hay que explicarlo a mano. */
export function comoInstalarAMano(): string {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) {
    return 'Dale al botón de Compartir (el cuadrito con la flecha) y luego a "Agregar a inicio".'
  }
  if (/Firefox/i.test(ua)) {
    return 'Abre el menú de los tres puntos y elige "Instalar" o "Agregar a la pantalla de inicio".'
  }
  return 'Abre el menú de los tres puntos, arriba a la derecha, y elige "Agregar a la pantalla de inicio" o "Instalar app".'
}
