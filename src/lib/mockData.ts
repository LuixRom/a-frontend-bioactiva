/**
 * Mock Data — Bioactiva CRM (Fase 1)
 * Datos representativos basados en el modelo nuevo
 */

import { Organization, Contact, Lead, Quote, Notification } from '@/src/types/crm';

// ──────────────────────────────────────────────
// ORGANIZACIONES
// ──────────────────────────────────────────────
export const mockOrganizations: Organization[] = [
  {
    id: 'ORG-2025-001',
    ruc: '20601258529',
    nombre: 'Altomayo',
    nombreCompleto: 'Industrias Mayo S.A.C.',
    tipo: 'Empresa',
    sector: 'Agroindustria / Café',
    tamano: 'Grande',
    ubicacion: 'Lima, Perú',
    actividades: 'Producción y comercialización de café peruano de especialidad',
    creadoEn: new Date('2025-01-10'),
  },
  {
    id: 'ORG-2025-002',
    ruc: '20524967627',
    nombre: 'Cacao de Aroma',
    nombreCompleto: 'Cacao de Aroma S.A.C.',
    area: 'Área de Innovación y Proyectos',
    tipo: 'Empresa',
    sector: 'Agroindustria / Cacao',
    tamano: 'Mediana',
    ubicacion: 'San Martín, Perú',
    actividades: 'Producción de cacao fino de aroma para exportación',
    creadoEn: new Date('2025-01-15'),
  },
  {
    id: 'ORG-2025-003',
    ruc: '20524967627',
    nombre: 'Municipalidad de Miraflores',
    nombreCompleto: 'Municipalidad Distrital de Miraflores',
    area: 'Gerencia de Desarrollo Económico',
    tipo: 'Entidad Pública',
    sector: 'Gobierno Local',
    tamano: 'Grande',
    ubicacion: 'Miraflores, Lima',
    creadoEn: new Date('2025-02-01'),
  },
  {
    id: 'ORG-2025-004',
    nombre: 'AgroTech Innova',
    tipo: 'Startup',
    sector: 'Agtech / Tecnología Agrícola',
    tamano: 'Micro',
    ubicacion: 'Lima, Perú',
    actividades: 'Desarrollo de soluciones digitales para el agro peruano',
    creadoEn: new Date('2025-02-20'),
  },
];

// ──────────────────────────────────────────────
// CONTACTOS
// ──────────────────────────────────────────────
export const mockContacts: Contact[] = [
  {
    id: 'CON-2025-001',
    organizacionId: 'ORG-2025-001',
    vocativo: 'Sr.',
    nombres: 'Ricardo',
    apellidos: 'Perales Tuesta',
    correo1: 'rperales@altomayo.com.pe',
    telefono: '997 654 321',
    cargo: 'Gerente de Proyectos',
    creadoEn: new Date('2025-01-10'),
  },
  {
    id: 'CON-2025-002',
    organizacionId: 'ORG-2025-001',
    vocativo: 'Sra.',
    nombres: 'Lucía',
    apellidos: 'Huanca Ríos',
    correo1: 'lhuanca@altomayo.com.pe',
    telefono: '991 234 567',
    cargo: 'Jefa de Innovación',
    creadoEn: new Date('2025-01-12'),
  },
  {
    id: 'CON-2025-003',
    organizacionId: 'ORG-2025-002',
    vocativo: 'Sr.',
    nombres: 'Carlos',
    apellidos: 'Vargas Díaz',
    correo1: 'cvargas@cacaodearoma.pe',
    telefono: '942 111 222',
    cargo: 'Director Ejecutivo',
    comentarios: 'Contacto principal desde mayo 2024',
    creadoEn: new Date('2025-01-15'),
  },
  {
    id: 'CON-2025-004',
    organizacionId: 'ORG-2025-003',
    vocativo: 'Lic.',
    nombres: 'Roxana',
    apellidos: 'Salcedo Mora',
    correo1: 'rsalcedo@miraflores.gob.pe',
    telefono: '01 617-7272',
    cargo: 'Sub-Gerente de Desarrollo Económico',
    creadoEn: new Date('2025-02-01'),
  },
  {
    id: 'CON-2025-005',
    organizacionId: 'ORG-2025-003',
    vocativo: 'Sr.',
    nombres: 'Marco',
    apellidos: 'Quispe Benites',
    correo1: 'mquispe@miraflores.gob.pe',
    cargo: 'Asistente de Proyectos',
    creadoEn: new Date('2025-02-05'),
  },
  {
    id: 'CON-2025-006',
    organizacionId: 'ORG-2025-004',
    vocativo: 'Sr.',
    nombres: 'Andrés',
    apellidos: 'Flores Cárdenas',
    correo1: 'andres@agrotechinnova.pe',
    telefono: '987 000 111',
    cargo: 'CEO & Fundador',
    creadoEn: new Date('2025-02-20'),
  },
];

// ──────────────────────────────────────────────
// LEADS
// ──────────────────────────────────────────────
export const mockLeads: Lead[] = [
  {
    id: 'LEAD-2025-001',
    organizacionId: 'ORG-2025-001',
    contactoId: 'CON-2025-001',
    servicioInteres: 'Formulación de proyecto CONCYTEC',
    canal: 'Referido',
    encargado: 'Karien Diaz',
    encargadoEmail: 'karien@bioactiva.pe',
    estado: 'cierre_con_venta',
    desafioOportunidad: 'Postular a fondo concursable para innovación en procesamiento de café',
    proximaActividad: 'Cierre de expediente final',
    fechaProximaActividad: new Date('2025-05-15'),
    historial: 'Cliente con proyecto aprobado en convocatoria CONCYTEC 2024. Satisfecho con el servicio.',
    actividades: [
      {
        id: 'ACT-001',
        tipo: 'reunion',
        estado: 'realizada',
        nota: 'Reunión inicial. Cliente interesado en fondos concursables para I+D en café.',
        responsable: 'Karien Diaz',
        fechaInicio: new Date('2025-01-12'),
        fechaCompletada: new Date('2025-01-12'),
      },
      {
        id: 'ACT-002',
        tipo: 'email',
        estado: 'realizada',
        nota: 'Envío de propuesta técnica y cotización (COT-2025-001).',
        responsable: 'Karien Diaz',
        fechaInicio: new Date('2025-01-20'),
        fechaCompletada: new Date('2025-01-20'),
      },
    ],
    creadoEn: new Date('2025-01-10'),
  },
  {
    id: 'LEAD-2025-002',
    organizacionId: 'ORG-2025-002',
    contactoId: 'CON-2025-003',
    servicioInteres: 'Formulación de proyecto cadena de valor cacao fino',
    canal: 'Evento sectorial',
    encargado: 'Administración',
    estado: 'ofertado',
    desafioOportunidad: 'Acceder a financiamiento para mejorar cadena productiva y exportar a mercados premium',
    proximaActividad: 'Seguimiento a propuesta enviada',
    fechaProximaActividad: new Date('2025-05-10'),
    historial: 'Incluye diagnóstico de cadena y perfil de proyecto. En evaluación.',
    actividades: [
      {
        id: 'ACT-003',
        tipo: 'llamada',
        estado: 'realizada',
        nota: 'Llamada de presentación de servicios. Interés confirmado.',
        responsable: 'Administración',
        fechaInicio: new Date('2025-01-18'),
        fechaCompletada: new Date('2025-01-18'),
      },
      {
        id: 'ACT-004',
        tipo: 'email',
        estado: 'pendiente',
        nota: 'Envío de propuesta (COT-2025-002). Pendiente respuesta.',
        responsable: 'Administración',
        fechaInicio: new Date('2025-02-05'),
      },
    ],
    creadoEn: new Date('2025-01-15'),
  },
  {
    id: 'LEAD-2025-003',
    organizacionId: 'ORG-2025-003',
    contactoId: 'CON-2025-004',
    servicioInteres: 'Beneficios tributarios Ley 30309',
    canal: 'Web / Redes sociales',
    encargado: 'Karien Diaz',
    encargadoEmail: 'karien@bioactiva.pe',
    estado: 'en_prospecto',
    desafioOportunidad: 'Levantamiento de gastos en I+D de proyectos municipales para deducción tributaria',
    proximaActividad: 'Reunión con Sub-Gerencia de Finanzas',
    fechaProximaActividad: new Date('2025-05-08'),
    historial: 'Incluye levantamiento de gastos en I+D y elaboración de expediente técnico Ley 30309.',
    actividades: [
      {
        id: 'ACT-005',
        tipo: 'reunion',
        estado: 'pendiente',
        nota: 'Presentación de servicios ante Sub-Gerencia. Solicitan cotización detallada.',
        responsable: 'Karien Diaz',
        fechaInicio: new Date('2025-03-10'),
      },
    ],
    creadoEn: new Date('2025-02-01'),
  },
  {
    id: 'LEAD-2025-004',
    organizacionId: 'ORG-2025-004',
    contactoId: 'CON-2025-006',
    servicioInteres: 'Consultoría en formulación de proyectos de innovación',
    canal: 'LinkedIn',
    encargado: 'Karien Diaz',
    encargadoEmail: 'karien@bioactiva.pe',
    estado: 'en_prospecto',
    desafioOportunidad: 'Startup busca estructurar sus proyectos de I+D para postular a STARTUP PERÚ',
    historial: 'Contacto inicial vía LinkedIn. Pendiente primera reunión.',
    actividades: [],
    creadoEn: new Date('2025-04-01'),
  },
];

// ──────────────────────────────────────────────
// COTIZACIONES
// ──────────────────────────────────────────────
export const mockQuotes: Quote[] = [
  {
    id: 'COT-2025-001',
    leadId: 'LEAD-2025-001',
    anio: 2025,
    mes: 'Enero',
    dirigidoA: 'Ricardo Perales Tuesta',
    fechaCotizacion: new Date('2025-01-20'),
    cliente: 'Industrias Mayo S.A.C. (Altomayo)',
    producto: 'Innovasuys',
    servicio: 'Formulación de proyecto para fondo concursable CONCYTEC — I+D en café',
    monto: 12500,
    moneda: 'PEN',
    estado: 'aceptada',
    remitente: 'Karien Diaz',
    observacion: 'Proyecto aprobado. Cliente muy satisfecho. Referencia para futuras propuestas.',
    linkPropuesta: 'https://drive.google.com/propuesta-altomayo-2025',
    creadoEn: new Date('2025-01-20'),
  },
  {
    id: 'COT-2025-002',
    leadId: 'LEAD-2025-002',
    anio: 2025,
    mes: 'Febrero',
    dirigidoA: 'Carlos Vargas Díaz',
    fechaCotizacion: new Date('2025-02-05'),
    cliente: 'Cacao de Aroma S.A.C.',
    producto: 'Innovasuys',
    servicio: 'Formulación de proyecto para cadena de valor cacao fino de aroma',
    monto: 9800,
    moneda: 'PEN',
    estado: 'enviada',
    remitente: 'Administración',
    observacion: 'Incluye diagnóstico de cadena y perfil de proyecto para financiamiento sectorial.',
    linkPropuesta: 'https://drive.google.com/propuesta-cacaodearoma-2025',
    creadoEn: new Date('2025-02-05'),
  },
  {
    id: 'COT-2025-003',
    leadId: 'LEAD-2025-003',
    anio: 2025,
    mes: 'Marzo',
    dirigidoA: 'Roxana Salcedo Mora',
    fechaCotizacion: new Date('2025-03-15'),
    cliente: 'Municipalidad Distrital de Miraflores',
    producto: 'Consultoría Tributaria',
    servicio: 'Formulación de proyecto para beneficios tributarios Ley 30309 — Gastos en I+D',
    monto: 15000,
    moneda: 'PEN',
    estado: 'pendiente',
    remitente: 'Karien Diaz',
    observacion: 'Incluye levantamiento de gastos en I+D y expediente técnico completo.',
    creadoEn: new Date('2025-03-15'),
  },
];


// ──────────────────────────────────────────────
// USUARIOS (ROLES)
// ──────────────────────────────────────────────
export type CRMUser = {
  id: number;
  name: string;
  email: string;
  active: boolean;
  lastLogin: string;
  rol: 'Administrador' | 'Trabajador';
};

export const mockUsers: CRMUser[] = [
  { id: 1, name: 'Karien Diaz',     email: 'karien@bioactiva.pe',    active: true,  lastLogin: 'Hoy 09:15',   rol: 'Trabajador' },
  { id: 2, name: 'Administración',  email: 'admin@bioactiva.pe',     active: true,  lastLogin: 'Hoy 08:40',   rol: 'Administrador' },
  { id: 3, name: 'Ana Rojas',       email: 'arojas@bioactiva.pe',    active: true,  lastLogin: 'Ayer 17:30',  rol: 'Trabajador' },
  { id: 4, name: 'Luis Torres',     email: 'ltorres@bioactiva.pe',   active: true,  lastLogin: 'Hoy 10:00',   rol: 'Trabajador' },
  { id: 5, name: 'María Quispe',    email: 'mquispe@bioactiva.pe',   active: true,  lastLogin: 'Hace 2 días', rol: 'Trabajador' },
  { id: 6, name: 'Carlos Mamani',   email: 'cmamani@bioactiva.pe',   active: true,  lastLogin: 'Hoy 07:55',   rol: 'Trabajador' },
  { id: 7, name: 'Rosa Condori',    email: 'rcondori@bioactiva.pe',  active: false, lastLogin: 'Hace 1 sem.', rol: 'Trabajador' },
];

export const mockNotifications: Notification[] = [
  {
    id: 'notif-001',
    tipo: 'lead_asignado',
    titulo: 'Nuevo lead asignado',
    mensaje: 'Se te ha asignado el lead de Altomayo.',
    fecha: new Date('2026-05-01'),
    leida: false,
    destinatario: { tipo: 'usuario', userId: 'karien@bioactiva.pe' },
    linkUrl: '/pipeline'
  },
  {
    id: 'notif-002',
    tipo: 'alerta_admin',
    titulo: 'Revisión de metas del mes',
    mensaje: 'Por favor revisar el reporte de ventas mensual.',
    fecha: new Date('2026-05-02'),
    leida: false,
    destinatario: { tipo: 'rol', rol: 'Administrador' },
    linkUrl: '/profile'
  },
  {
    id: 'notif-003',
    tipo: 'general',
    titulo: 'Nuevo CRM habilitado',
    mensaje: 'El nuevo sistema CRM de Bioactiva ya está activo.',
    fecha: new Date('2026-05-03'),
    leida: true,
    destinatario: { tipo: 'global' },
    linkUrl: '/'
  }
];
