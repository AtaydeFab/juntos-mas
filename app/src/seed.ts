import type { Miembro, Plantilla, Recordatorio } from './types'

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
