/**
 * Modelo de datos Bioactiva CRM — Fase 1
 * Tipos centralizados para todo el sistema
 */

// Organización
export interface Organization {
  id: string;                  // ID interno auto: "ORG-2025-001"
  ruc?: string;                // Opcional — no toda org tiene RUC
  nombre: string;              // Nombre corto
  nombreCompleto?: string;
  area?: string;               // Departamento/área dentro de la org
  tipo?: string;               // Empresa, universidad, startup, etc.
  tamano?: string;
  sector?: string;
  ubicacion?: string;
  linkedin?: string;
  alianzas?: string;
  actividades?: string;
  contactoVigente?: string;    // ID del contacto principal
  creadoEn: Date;
}

// Contacto
export interface Contact {
  id: string;                  // Código individual: "CON-2025-001"
  organizacionId: string;      // FK a Organization.id
  vocativo?: string;
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
  tipo: 'reunion' | 'llamada' | 'email' | 'otro';
  estado: 'pendiente' | 'realizada';
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
  contactoId: string;          // FK a Contact.id
  organizacionId: string;      // FK a Organization.id
  servicioInteres?: string;
  comentarios?: string;        // Notas internas iniciales del lead
  canal?: string;
  encargado?: string;
  encargadoEmail?: string;     // Para alertas y notificaciones
  estado: 'en_prospecto' | 'ofertado' | 'cierre_con_venta' | 'cierre_sin_venta';
  desafioOportunidad?: string;
  proximaActividad?: string;
  fechaProximaActividad?: Date;
  fechaCierre?: Date;
  historial?: string;          // Resumen de contexto general
  actividades: Activity[];     // Registro cronológico
  creadoEn: Date;
}

// Cotización
export interface Quote {
  id: string;                  // "COT-2025-001"
  leadId: string;              // FK a Lead.id
  anio: number;
  mes: string;
  dirigidoA: string;
  fechaCotizacion: Date;
  cliente: string;
  producto?: string;
  servicio: string;
  monto: number;
  moneda: 'PEN' | 'USD';
  estado: 'enviada' | 'aceptada' | 'rechazada' | 'pendiente';
  remitente: string;
  observacion?: string;
  creadoEn: Date;
}

// Notificación
export interface Notification {
  id: string;
  tipo: 'actividad_vencida' | 'lead_asignado' | 'cotizacion_aceptada' | 
        'cotizacion_rechazada' | 'lead_cerrado' | 'alerta_admin' | 'general';
  titulo: string;
  mensaje: string;
  fecha: Date;
  leida: boolean;
  destinatario: {
    tipo: 'usuario' | 'rol' | 'global';
    userId?: string;        // email del usuario específico
    rol?: 'Administrador' | 'Trabajador';
  };
  linkUrl?: string;         // link a donde redirige al hacer click
}
