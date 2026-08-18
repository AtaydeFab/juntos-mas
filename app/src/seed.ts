import type { CargoFijo, MetaIngreso, Miembro, Plantilla, Recordatorio } from './types'

export const MIEMBROS: Miembro[] = [
  { id: 'fa', nombre: 'Fabián', corto: 'Fa', rol: 'adulto', color: 'fa' },
  { id: 'sa', nombre: 'Saira', corto: 'Sa', rol: 'adulto', color: 'sa' },
  { id: 'vi', nombre: 'Victoria', corto: 'Vi', rol: 'hija', color: 'ni' },
  { id: 'so', nombre: 'Sofía', corto: 'So', rol: 'hija', color: 'ni' },
]

export const miembro = (id: string) => MIEMBROS.find(m => m.id === id)

/** El machote de la casa, tal como lo pasó Fabián. */
export const PLANTILLAS: Plantilla[] = [
  { id: 'p01', titulo: 'Hacer el almuerzo', responsable: 'sa', frecuencia: { tipo: 'diaria' }, activa: true },
  { id: 'p02', titulo: 'Hacer la comida', responsable: 'sa', frecuencia: { tipo: 'diaria' }, activa: true },
  { id: 'p03', titulo: 'Hacer la cena', responsable: 'sa', frecuencia: { tipo: 'diaria' }, activa: true },
  { id: 'p04', titulo: 'Trapear', responsable: 'sa', frecuencia: { tipo: 'diaria' }, activa: true },
  { id: 'p05', titulo: 'Sacar al perro en la mañana', responsable: 'sa', frecuencia: { tipo: 'diaria' }, activa: true },
  { id: 'p06', titulo: 'Lavar trastes del almuerzo', responsable: 'fa', frecuencia: { tipo: 'diaria' }, activa: true },
  { id: 'p07', titulo: 'Lavar trastes de la comida', responsable: 'fa', frecuencia: { tipo: 'diaria' }, activa: true },
  { id: 'p08', titulo: 'Lavar trastes de la cena', responsable: 'fa', frecuencia: { tipo: 'diaria' }, activa: true },
  { id: 'p09', titulo: 'Alzar la cama', responsable: 'fa', frecuencia: { tipo: 'diaria' }, activa: true },
  { id: 'p10', titulo: 'Recoger cosas y aspirar', responsable: 'fa', frecuencia: { tipo: 'diaria' }, activa: true },
  { id: 'p11', titulo: 'Sacar la basura', responsable: 'fa', frecuencia: { tipo: 'diaria' }, activa: true },
  { id: 'p12', titulo: 'Sacar al perro en la tarde', responsable: 'ambos', frecuencia: { tipo: 'diaria' }, activa: true },
  { id: 'p13', titulo: 'Darle de comer al perro', responsable: 'turno', turnoEntre: ['fa', 'sa'], frecuencia: { tipo: 'diaria' }, activa: true },
  { id: 'p14', titulo: 'Lavar la ropa', responsable: 'fa', frecuencia: { tipo: 'semanal' }, activa: true },
  { id: 'p15', titulo: 'Lavar el baño', responsable: 'sa', frecuencia: { tipo: 'semanal' }, activa: true },
]

export const RECORDATORIOS: Recordatorio[] = [
  { id: 'r1', texto: 'No dejar pelos en el jabón', para: 'fa', permanente: true },
  { id: 'r2', texto: 'Dejar bien tapada la pasta', para: 'fa', permanente: true },
  { id: 'r3', texto: 'No dejar la ropa sucia en el baño', para: 'sa', permanente: true },
  { id: 'r4', texto: 'No dejar los zapatos regados', para: 'sa', permanente: true },
]

// ------------------------------------------------------------------ dinero

export const CATEGORIAS_GASTO = [
  'Renta', 'Ahorro', 'Pensión', 'Servicios', 'Súper',
  'Comidas fuera', 'Entretenimiento', 'Perro', 'Niñas', 'Otros',
]

export const CATEGORIAS_INGRESO = ['Sueldo', 'Tarot', 'Otros ingresos']

/** Lo fijo de la casa, tal como lo pasó Fabián. Entra solo y solo se confirma. */
export const CARGOS_FIJOS: CargoFijo[] = [
  {
    id: 'c1', titulo: 'Sueldo de Fabián', tipo: 'ingreso', categoria: 'Sueldo',
    monto: 12300, cada: 'quincena', quien: 'fa', activo: true,
  },
  {
    id: 'c2', titulo: 'Ahorro', tipo: 'gasto', categoria: 'Ahorro',
    monto: 4000, cada: 'quincena', quien: 'fa', activo: true,
    aportaciones: [{ miembro: 'fa', monto: 2000 }, { miembro: 'sa', monto: 2000 }],
  },
  {
    id: 'c3', titulo: 'Pensión de las niñas', tipo: 'gasto', categoria: 'Pensión',
    monto: 3000, cada: 'quincena', quien: 'fa', activo: true,
  },
  {
    id: 'c4', titulo: 'Renta', tipo: 'gasto', categoria: 'Renta',
    monto: 4500, cada: 'mes', diaDelMes: 6, quien: 'fa', activo: true,
    aportaciones: [{ miembro: 'fa', monto: 2500 }, { miembro: 'sa', monto: 2000 }],
  },
  {
    id: 'c5', titulo: 'Internet', tipo: 'gasto', categoria: 'Servicios',
    monto: 450, cada: 'mes', diaDelMes: 10, quien: 'sa', activo: true, variable: true,
  },
  {
    id: 'c6', titulo: 'Luz', tipo: 'gasto', categoria: 'Servicios',
    monto: 600, cada: 'dos-meses', anclaMes: 7, quien: 'fa', activo: true, variable: true,
  },
  {
    id: 'c7', titulo: 'Súper de la semana', tipo: 'gasto', categoria: 'Súper',
    monto: 1000, cada: 'semana', quien: 'fa', activo: true, variable: true,
  },
]

/** El ingreso de Saira es variable: la meta es referencia, nunca un dato dado por hecho. */
export const METAS: MetaIngreso[] = [
  { id: 'm1', miembro: 'sa', monto: 4500, periodo: 'semanal' },
]

export const pesos = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
