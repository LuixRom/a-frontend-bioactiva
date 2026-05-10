export type TipoLeadNotificacion = 'recordatorio' | 'seguimiento';
export type EstadoLeadNotificacion = 'programada' | 'vencida' | 'cancelada' | 'enviada';

export interface LeadNotification {
  id: string;
  leadId: string;
  activityId: string;
  activityNota: string;
  orgNombre: string;
  contactoNombre: string;
  tipo: TipoLeadNotificacion;
  templateId: string;
  templateNombre: string;
  asuntoResuelto: string;
  cuerpoResuelto: string;
  fechaProgramada: Date;
  emailResponsable: string;
  nombreResponsable: string;
  /** Solo para seguimiento — primer correo (al responsable) */
  emailCliente?: string;
  /** Solo para seguimiento — segundo correo (al cliente) */
  templateClienteId?: string;
  templateClienteNombre?: string;
  asuntoClienteResuelto?: string;
  cuerpoClienteResuelto?: string;
  fechaCliente?: Date;
  creadoPor: string;
  creadoEn: Date;
  /** 'programada' | 'cancelada' | 'enviada' — 'vencida' se computa en runtime solo para recordatorios */
  estadoBase: 'programada' | 'cancelada' | 'enviada';
}

/** Calcula el estado real comparando fecha con hoy */
export function getEstadoNotificacion(n: LeadNotification): EstadoLeadNotificacion {
  if (n.estadoBase === 'cancelada') return 'cancelada';
  if (n.estadoBase === 'enviada') return 'enviada';
  if (new Date(n.fechaProgramada) < new Date()) return 'vencida';
  return 'programada';
}
