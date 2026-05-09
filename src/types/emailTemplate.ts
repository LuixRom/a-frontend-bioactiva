export type CategoriaPlantilla = 'reunion' | 'llamada' | 'email' | 'otro';
export type EstadoPlantilla = 'activa' | 'inactiva';

export interface EmailTemplate {
  id: string;
  nombre: string;
  asunto: string;
  cuerpo: string;
  categoria: CategoriaPlantilla;
  estado: EstadoPlantilla;
  creadoPor: string;
  creadoEn: Date;
  actualizadoEn: Date;
  /** true = está referenciada en al menos una notificación → no se puede eliminar */
  enUso: boolean;
}
