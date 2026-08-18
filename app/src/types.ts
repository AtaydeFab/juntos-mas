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

// ------------------------------------------------------------------ dinero

export type TipoMovimiento = 'ingreso' | 'gasto'

/** Cada cuánto vuelve un cargo fijo. */
export type Periodicidad = 'quincena' | 'mes' | 'semana' | 'dos-meses'

export interface CargoFijo {
  id: string
  titulo: string
  tipo: TipoMovimiento
  categoria: string
  monto: number
  cada: Periodicidad
  /** Solo en los mensuales: qué día del mes cae. */
  diaDelMes?: number
  /** Solo en los de cada dos meses: mes de referencia (0 = enero). */
  anclaMes?: number
  /** Quién lo paga o lo cobra. Si se reparte, va en aportaciones. */
  quien: MiembroId
  /** Cuando lo pagan entre los dos, con montos distintos. */
  aportaciones?: { miembro: MiembroId; monto: number }[]
  /** El monto cambia cada vez: al confirmarlo se captura el real. */
  variable?: boolean
  activo: boolean
}

export interface Movimiento {
  id: string
  tipo: TipoMovimiento
  monto: number
  categoria: string
  fecha: string
  /** Quién pagó o a quién le entró. */
  miembro: MiembroId
  nota?: string
  /** Si vino de un cargo fijo, para no volverlo a pedir. */
  cargoId?: string
  /** Qué ocurrencia del cargo fijo cubre: '2026-08', '2026-08-q2', '2026-W34'. */
  periodo?: string
}

export interface MetaIngreso {
  miembro: MiembroId
  monto: number
  periodo: 'semanal'
}

/** Qué tanto de la casa se ve en la pantalla de Hoy. */
export type Vista = 'mias' | 'mias_y_ambos' | 'todas'

export interface Estado {
  version: number
  yo: MiembroId
  vista: Vista
  plantillas: Plantilla[]
  tareas: Tarea[]
  eventos: Evento[]
  recordatorios: Recordatorio[]
  cargosFijos: CargoFijo[]
  movimientos: Movimiento[]
  metas: MetaIngreso[]
}
