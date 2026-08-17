export type MiembroId = 'fa' | 'sa' | 'vi' | 'so'
export type Responsable = MiembroId | 'ambos' | 'turno'
export type ColorId = 'fa' | 'sa' | 'ni'

export interface Miembro {
  id: MiembroId
  nombre: string
  corto: string
  rol: 'adulto' | 'hija'
  color: ColorId
}

/** 1 = lunes … 7 = domingo */
export type Dia = 1 | 2 | 3 | 4 | 5 | 6 | 7

export type Frecuencia =
  | { tipo: 'diaria' }
  | { tipo: 'dias'; dias: Dia[] }
  /** Se hace una vez por semana, sin día fijo: quien la tiene elige cuándo. */
  | { tipo: 'semanal' }

export interface Plantilla {
  id: string
  titulo: string
  responsable: Responsable
  /** Solo cuando responsable === 'turno': entre quiénes rota, cambiando cada lunes. */
  turnoEntre?: MiembroId[]
  frecuencia: Frecuencia
  activa: boolean
}

export interface Tarea {
  id: string
  titulo: string
  plantillaId?: string
  responsable: Responsable
  turnoEntre?: MiembroId[]
  /** Fecha concreta (YYYY-MM-DD). Null en las semanales sin día fijo. */
  fecha: string | null
  /** Lunes de la semana a la que pertenece (YYYY-MM-DD). */
  semana: string
  hecha: boolean
  hechaPor?: MiembroId
  hechaEn?: string
  /** Quién se la pasó, cuando no es de las de siempre. */
  asignadaPor?: MiembroId
  suelta: boolean
}

export interface Evento {
  id: string
  titulo: string
  fecha: string
  hora?: string
  /** Se repite cada año: aniversarios, cumpleaños. */
  anual: boolean
  lugar?: string
  conQuien: MiembroId[]
  avisarDiasAntes: number
}

export interface Recordatorio {
  id: string
  texto: string
  para: MiembroId
  /** Falso = solo por esta semana; se va solo al terminar. */
  permanente: boolean
  hasta?: string
}

export interface Estado {
  version: number
  yo: MiembroId
  plantillas: Plantilla[]
  tareas: Tarea[]
  eventos: Evento[]
  recordatorios: Recordatorio[]
}
