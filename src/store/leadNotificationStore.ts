import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LeadNotification, TipoLeadNotificacion } from '@/src/types/leadNotification';

const hoy = new Date();
const enDias = (d: number) => new Date(hoy.getTime() + d * 86_400_000);
const fmt = (d: Date) => d.toLocaleDateString('es-PE');

const initialNotifications: LeadNotification[] = [
  // ── Karien Diaz — LEAD-2025-003 ─────────────────────────────────────────
  {
    id: 'LN-001',
    leadId: 'LEAD-2025-003',
    activityId: 'ACT-005',
    activityNota: 'Presentación de servicios ante Sub-Gerencia. Solicitan cotización detallada.',
    orgNombre: 'Municipalidad de Miraflores',
    contactoNombre: 'Roxana Salcedo',
    tipo: 'recordatorio',
    templateId: 'TPL-004',
    templateNombre: 'Recordatorio de actividad próxima',
    asuntoResuelto: `Recordatorio: Beneficios tributarios Ley 30309 — actividad el ${fmt(enDias(6))}`,
    cuerpoResuelto: `Tienes programada una actividad el ${fmt(enDias(6))} con Municipalidad de Miraflores.\n\nProyecto: Beneficios tributarios Ley 30309\nResponsable: Karien Diaz\n\nRecuerda revisar los acuerdos previos antes de la actividad.`,
    fechaProgramada: enDias(6),
    emailResponsable: 'karien@bioactiva.pe',
    nombreResponsable: 'Karien Diaz',
    creadoPor: 'Karien Diaz',
    creadoEn: enDias(-1),
    estadoBase: 'programada',
  },

  // ── Administración — LEAD-2025-008 ──────────────────────────────────────
  {
    id: 'LN-002',
    leadId: 'LEAD-2025-008',
    activityId: 'ACT-014',
    activityNota: 'Segunda visita técnica — revisión de procesos de tostado y empaque.',
    orgNombre: 'Altomayo',
    contactoNombre: 'Patricia Ccopa',
    tipo: 'recordatorio',
    templateId: 'TPL-001',
    templateNombre: 'Confirmación de reunión',
    asuntoResuelto: `Confirmación: Reunión con Altomayo — ${fmt(enDias(11))}`,
    cuerpoResuelto: `Estimado/a Patricia Ccopa,\n\nLe confirmamos la reunión programada para el ${fmt(enDias(11))}.\n\nEn esta sesión abordaremos los avances relacionados a Diagnóstico de innovación y hoja de ruta tecnológica.\n\nLe pedimos presentarse con 5 minutos de anticipación. Cualquier consulta, comuníquese con Administración.\n\nSaludos cordiales,\nEquipo BioActiva`,
    fechaProgramada: enDias(11),
    emailResponsable: 'admin@bioactiva.pe',
    nombreResponsable: 'Administración',
    creadoPor: 'Administración',
    creadoEn: enDias(-3),
    estadoBase: 'programada',
  },

  // ── Luis Torres — LEAD-2025-005 ──────────────────────────────────────────
  {
    id: 'LN-003',
    leadId: 'LEAD-2025-005',
    activityId: 'ACT-006',
    activityNota: 'Visita a planta para identificar proyectos de mejora tecnológica.',
    orgNombre: 'Inversiones Pisco S.A.',
    contactoNombre: 'Rafael Benavides',
    tipo: 'seguimiento',
    templateId: 'TPL-002',
    templateNombre: 'Seguimiento post-llamada',
    asuntoResuelto: 'Seguimiento a nuestra llamada — Inversiones Pisco S.A.',
    cuerpoResuelto: `Estimado/a Rafael Benavides,\n\nGracias por tomarse el tiempo para conversar con nosotros.\n\nComo acordamos, los próximos pasos para el servicio de Ley 30309 - Deducción I+D+i son:\n\n1. Revisión de la propuesta técnica que le enviaremos en los próximos días.\n2. Programación de reunión presencial de kick-off.\n\nEstaremos en contacto.\n\nAtentamente,\nLuis Torres\nBioActiva`,
    fechaProgramada: enDias(-8),
    emailResponsable: 'ltorres@bioactiva.pe',
    nombreResponsable: 'Luis Torres',
    emailCliente: 'rbenavides@invpisco.pe',
    creadoPor: 'Luis Torres',
    creadoEn: enDias(-15),
    estadoBase: 'enviada',
  },
];

interface LeadNotificationStore {
  notifications: LeadNotification[];
  create: (data: Omit<LeadNotification, 'id' | 'creadoEn' | 'estadoBase'>) => LeadNotification;
  cancel: (id: string) => void;
  markAsSent: (id: string) => void;
  getByLead: (leadId: string) => LeadNotification[];
  hasActiveForActivity: (leadId: string, activityId: string) => boolean;
}

export const useLeadNotificationStore = create<LeadNotificationStore>()(
  persist(
    (set, get) => ({
  notifications: initialNotifications,

  create: (data) => {
    const id = `LN-${String(get().notifications.length + 1).padStart(3, '0')}`;
    const newNotif: LeadNotification = {
      ...data,
      id,
      creadoEn: new Date(),
      estadoBase: 'programada',
    };
    set((s) => ({ notifications: [newNotif, ...s.notifications] }));
    return newNotif;
  },

  cancel: (id) => {
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, estadoBase: 'cancelada' } : n,
      ),
    }));
  },

  markAsSent: (id) => {
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, estadoBase: 'enviada' } : n,
      ),
    }));
  },

  getByLead: (leadId) => get().notifications.filter((n) => n.leadId === leadId),

  hasActiveForActivity: (leadId, activityId) =>
    get().notifications.some(
      (n) => n.leadId === leadId && n.activityId === activityId && n.estadoBase === 'programada',
    ),
    }),
    { name: 'bioactiva-lead-notifs-v1', version: 1 },
  ),
);
