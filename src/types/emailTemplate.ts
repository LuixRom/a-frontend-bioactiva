export type CategoriaPlantilla = 'reunion' | 'llamada' | 'email' | 'otro';
export type EstadoPlantilla = 'activa' | 'inactiva';
export type UsoPlantilla = 'recordatorio' | 'seguimiento' | 'ambos';

export interface EmailTemplate {
  id: string;
  nombre: string;
  asunto: string;
  cuerpo: string;
  categoria: CategoriaPlantilla;
  /** Para qué tipo de notificación aplica esta plantilla */
  uso: UsoPlantilla;
  estado: EstadoPlantilla;
  creadoPor: string;
  creadoEn: Date;
  actualizadoEn: Date;
  /** true = está referenciada en al menos una notificación → no se puede eliminar */
  enUso: boolean;
}
