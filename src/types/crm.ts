/**
 * Modelo de datos Bioactiva CRM — alineado al Excel real.
 *
 * Los enums viven en `src/lib/constants.ts` y este archivo los re-usa.
 * Cuando Prisma esté generado, también podremos importar los enums desde
 * `@prisma/client`; por ahora los tipos del frontend son la fuente.
 */

import type {
  EstadoLead,
  EstadoCotizacion,
  EstadoActividad,
  TipoActividad,
  Moneda,
} from '@/src/lib/constants';

// Organización
export interface Organization {
  id: string;                  // ID interno: "ORG-2025-001"
  ruc?: string;
  nombre: string;
  nombreCompleto?: string;
  area?: string;
  tipo?: string;               // catálogo abierto (TipoOrg + libre)
  tamano?: string;             // Grande / Mediana / Pequeña
  sector?: string;             // catálogo abierto (Sector + libre)
  ubicacion?: string;          // departamento del Perú
  linkedin?: string;
  alianzas?: string[];         // multi-valor (en el Excel viene coma-separado)
  actividades?: string;        // texto SUNAT
  contactoVigente?: boolean;   // del Excel "Contacto vigente": activo / buscar
  contactoVigenteId?: string;  // ID del contacto principal
  creadoEn: Date;
}

// Contacto
export interface Contact {
  id: string;                  // "CON-2025-001" (o "ID00001" del Excel)
  organizacionId: string;
  vocativo?: string | null;
  nombres: string;
  apellidos: string;
  correo1: string;
  correo2?: string;
  telefono?: string;
  cargo?: string;
  comentarios?: string;
  creadoEn: Date;
}

// Actividad dentro de un lead
export interface Activity {
  id: string;
  nombre?: string;
  tipo: TipoActividad;
  estado: EstadoActividad;
  nota: string;
  responsable: string;
  fecha: Date;
  fechaFin?: Date;
  fechaCompletada?: Date;
  linkReunion?: string;
}

// Lead
export interface Lead {
  id: string;                  // "LEAD-2025-001"
  /** Un lead puede crearse desde cero (sin contacto) y vincularse después. */
  contactoId?: string;
  organizacionId: string;
  anio?: number;
  servicioInteres?: string;
  comentarios?: string;
  canal?: string;
  encargado?: string;
  encargadoEmail?: string;
  estado: EstadoLead;
  desafioOportunidad?: string;
  proximaActividad?: string;
  fechaProximaActividad?: Date;
  alertaManual?: boolean;
  fechaCierre?: Date;
  historial?: string;          // resumen estructurado (post-migración)
  historialTexto?: string;     // texto crudo del Excel ("Mar-24: ...")
  actividades: Activity[];
  creadoEn: Date;
}

// Cotización
export interface Quote {
  id: string;                  // "COT-2025-001"
  leadId: string;
  anio: number;
  mes: string;                 // "Enero", "Setiembre"…
  dirigidoA: string;
  fechaCotizacion: Date;
  cliente: string;
  producto?: string;
  servicio: string;
  monto: number;
  moneda: Moneda;
  estado: EstadoCotizacion;
  remitente: string;
  observacion?: string;
  linkPropuesta?: string;
  creadoEn: Date;
}

// Notificación
export interface Notification {
  id: string;
  tipo:
    | 'actividad_vencida'
    | 'lead_asignado'
    | 'cotizacion_aceptada'
    | 'cotizacion_rechazada'
    | 'lead_cerrado'
    | 'alerta_admin'
    | 'general';
  titulo: string;
  mensaje: string;
  fecha: Date;
  leida: boolean;
  destinatario: {
    tipo: 'usuario' | 'rol' | 'global';
    userId?: string; // email del usuario específico
    rol?: 'Administrador' | 'Trabajador';
  };
  linkUrl?: string; // link a donde redirige al hacer click
}

// Re-export de enums para conveniencia del consumidor.
export type {
  EstadoLead,
  EstadoCotizacion,
  EstadoActividad,
  TipoActividad,
  Moneda,
};
