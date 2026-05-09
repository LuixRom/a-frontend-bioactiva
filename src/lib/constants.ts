/**
 * Catálogos del dominio — alineados al Excel real de BioActiva.
 *
 * Fuente: `CRM BIACTIVA.xlsx` (hojas Organizaciones, Contactos, Leads, Cotizaciones).
 * Cualquier cambio aquí debe propagarse al schema de Prisma y a los seeds.
 */

// ─── Estados del lead (hoja Leads · columna "Estado") ──────────────
export type EstadoLead = 'nuevo' | 'en_proceso' | 'cerrado_ganado' | 'cerrado_perdido';

export const ESTADOS_LEAD: ReadonlyArray<{
  id: EstadoLead;
  label: string;
  color: string; // tailwind-friendly hex
}> = [
  { id: 'nuevo',            label: 'En prospecto',     color: '#6B7280' },
  { id: 'en_proceso',       label: 'Ofertado',         color: '#F59E0B' },
  { id: 'cerrado_ganado',   label: 'Cierre con venta', color: '#10B981' },
  { id: 'cerrado_perdido',  label: 'Cierre sin venta', color: '#EF4444' },
] as const;

/** Mapa de los labels exactos del Excel a los IDs internos. */
export const ESTADO_LEAD_FROM_EXCEL: Record<string, EstadoLead> = {
  'En prospecto':     'nuevo',
  'Ofertado':         'en_proceso',
  'Cierre con venta': 'cerrado_ganado',
  'Cierre sin venta': 'cerrado_perdido',
};

// ─── Vocativos (hoja Contactos · columna "Vocativo") ───────────────
export const VOCATIVOS = ['Sr.', 'Sra.', 'Srta.', 'Dr.', 'Dra.'] as const;
export type Vocativo = (typeof VOCATIVOS)[number];

// ─── Tamaño de organización (hoja Organizaciones · "Tamaño") ───────
// Femenino, igual que el Excel. "Micro" no aparece en el archivo real.
export const TAMANOS_ORG = ['Grande', 'Mediana', 'Pequeña'] as const;
export type TamanoOrg = (typeof TAMANOS_ORG)[number];

// ─── Tipos de organización (hoja Organizaciones · "Tipo de organización") ──
export const TIPOS_ORG = [
  'Asociación civil',
  'Cooperativa',
  'Empresa nacional',
  'Empresa pública',
  'Entidad pública',
  'Gremio',
  'Multinacional',
  'Universidad pública',
] as const;
export type TipoOrg = (typeof TIPOS_ORG)[number];

// ─── Sectores (hoja Organizaciones · "Sector") ─────────────────────
// Catálogo real del Excel. Pensado como abierto: la app permitirá agregar
// nuevos sectores sin tocar este array.
export const SECTORES = [
  'Agrícola',
  'Alimentos',
  'Bebidas',
  'Comercio',
  'Comercio exterior',
  'Consultoría',
  'Educación',
  'Financiero',
  'Inmobiliario',
  'Innovación',
  'Inversiones',
  'Legal',
  'Medio ambiente',
  'Sanidad agraria',
] as const;
export type Sector = (typeof SECTORES)[number];

// ─── Departamentos del Perú (hoja Organizaciones · "Departamento") ─
export const DEPARTAMENTOS = [
  'Amazonas',
  'Áncash',
  'Apurímac',
  'Arequipa',
  'Ayacucho',
  'Cajamarca',
  'Callao',
  'Cusco',
  'Huancavelica',
  'Huánuco',
  'Ica',
  'Junín',
  'La Libertad',
  'Lambayeque',
  'Lima',
  'Loreto',
  'Madre de Dios',
  'Moquegua',
  'Pasco',
  'Piura',
  'Puno',
  'San Martín',
  'Tacna',
  'Tumbes',
  'Ucayali',
] as const;
export type Departamento = (typeof DEPARTAMENTOS)[number];

// ─── Canales de captación (hoja Leads · "Canal de captación") ──────
export const CANALES = [
  'Referido',
  'Evento presencial',
  'Prospección directa',
  'Red profesional',
  'LinkedIn',
  'Web',
  'Otro',
] as const;
export type Canal = (typeof CANALES)[number];

// ─── Encargados (hoja Leads · "Encargado") ─────────────────────────
// Valores observados en el archivo. Post-MVP esto se reemplaza por la
// tabla `User` con email + rol.
export const ENCARGADOS_INICIALES = ['Karien Díaz', 'Administración'] as const;
export type Encargado = (typeof ENCARGADOS_INICIALES)[number];

// ─── Estado de cotización (hoja Cotizaciones · "Estado del proceso") ──
export type EstadoCotizacion = 'pendiente' | 'enviada' | 'aceptada' | 'rechazada';

export const ESTADOS_COTIZACION: ReadonlyArray<{
  id: EstadoCotizacion;
  label: string;
  color: string;
}> = [
  { id: 'pendiente', label: 'Pendiente', color: '#6B7280' },
  { id: 'enviada',   label: 'Enviada',   color: '#3B82F6' },
  { id: 'aceptada',  label: 'Aceptada',  color: '#10B981' },
  { id: 'rechazada', label: 'Rechazada', color: '#EF4444' },
] as const;

/** Mapa de labels del Excel a IDs internos para cotizaciones. */
export const ESTADO_COTIZACION_FROM_EXCEL: Record<string, EstadoCotizacion> = {
  'Aceptada':  'aceptada',
  'Rechazada': 'rechazada',
  'Enviada':   'enviada',
  'Pendiente': 'pendiente',
};

// ─── Monedas (hoja Cotizaciones · "Moneda") ────────────────────────
export const MONEDAS = ['PEN', 'USD'] as const;
export type Moneda = (typeof MONEDAS)[number];

// ─── Meses en español (hoja Cotizaciones · "Mes") ──────────────────
// El Excel usa "Setiembre" (no "Septiembre"). Mantener fidelidad.
export const MESES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Setiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;
export type MesEs = (typeof MESES_ES)[number];

// ─── Tipos / estado de actividades (Lead.actividades) ──────────────
export type TipoActividad = 'reunion' | 'llamada' | 'email' | 'otro';
export type EstadoActividad = 'pendiente' | 'realizada';

// ─── Roles de Usuario (para Auth/Invitaciones) ────────────────────
export type UserRole = 'Administrador' | 'Trabajador';

// ─── Tipos de Notificación ────────────────────────────────────────
export type NotificationType = 
  | 'ACTIVIDAD_VENCIDA' 
  | 'ACTIVIDAD_PROXIMA' 
  | 'LEAD_ASIGNADO' 
  | 'COTIZACION_ACEPTADA' 
  | 'COTIZACION_RECHAZADA';

export const TIPOS_ACTIVIDAD: ReadonlyArray<{ id: TipoActividad; label: string }> = [
  { id: 'reunion', label: 'Reunión' },
  { id: 'llamada', label: 'Llamada' },
  { id: 'email',   label: 'Email'   },
  { id: 'otro',    label: 'Otro'    },
] as const;

// ─── Helpers ───────────────────────────────────────────────────────
export const getEstadoLeadLabel = (id: EstadoLead): string =>
  ESTADOS_LEAD.find((e) => e.id === id)?.label ?? id;

export const getEstadoLeadColor = (id: EstadoLead): string =>
  ESTADOS_LEAD.find((e) => e.id === id)?.color ?? '#6B7280';

export const getEstadoCotizacionLabel = (id: EstadoCotizacion): string =>
  ESTADOS_COTIZACION.find((e) => e.id === id)?.label ?? id;
