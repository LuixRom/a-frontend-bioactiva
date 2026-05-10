'use server';

import type { NotificationType } from '@/src/lib/constants';

export type PublicNotification = {
  id: string;
  userId: string;
  leadId: string | null;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: Date;
  encargadoEmail: string;
  encargadoNombre: string;
  lead?: {
    id: string;
    codigo: string;
    organizacion: {
      nombre: string;
    };
  } | null;
};

const MOCK_NOTIFICATIONS: PublicNotification[] = [
  {
    id: 'noti-1',
    userId: 'karien@bioactiva.pe',
    leadId: 'LEAD-2025-003',
    type: 'ACTIVIDAD_VENCIDA',
    message: 'Actividad vencida en LEAD-2025-003 (Beneficios tributarios Ley 30309)',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
    encargadoEmail: 'karien@bioactiva.pe',
    encargadoNombre: 'Karien Diaz',
    lead: { id: 'LEAD-2025-003', codigo: 'LEAD-2025-003', organizacion: { nombre: 'Municipalidad de Miraflores' } },
  },
  {
    id: 'noti-2',
    userId: 'admin@bioactiva.pe',
    leadId: 'LEAD-2025-008',
    type: 'ACTIVIDAD_VENCIDA',
    message: 'Actividad vencida en LEAD-2025-008 (Diagnóstico de innovación)',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 1),
    encargadoEmail: 'admin@bioactiva.pe',
    encargadoNombre: 'Administración',
    lead: { id: 'LEAD-2025-008', codigo: 'LEAD-2025-008', organizacion: { nombre: 'Altomayo' } },
  },
  {
    id: 'noti-3',
    userId: 'ltorres@bioactiva.pe',
    leadId: 'LEAD-2025-005',
    type: 'ACTIVIDAD_VENCIDA',
    message: 'Actividad vencida en LEAD-2025-005 (Ley 30309 - Deducción I+D+i)',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8),
    encargadoEmail: 'ltorres@bioactiva.pe',
    encargadoNombre: 'Luis Torres',
    lead: { id: 'LEAD-2025-005', codigo: 'LEAD-2025-005', organizacion: { nombre: 'Inversiones Pisco S.A.' } },
  },
];

export async function listNotifications(userId: string, filter: 'mis-leads' | 'todos' = 'todos'): Promise<PublicNotification[]> {
  console.info('[MOCK] listNotifications called for', userId, filter);
  // userId en mock = email del usuario
  const isAdmin = userId === 'admin@bioactiva.pe';
  if (isAdmin && filter === 'todos') return MOCK_NOTIFICATIONS;
  if (isAdmin && filter === 'mis-leads') return MOCK_NOTIFICATIONS.filter(n => n.encargadoEmail === userId);
  // Trabajador: solo sus leads
  return MOCK_NOTIFICATIONS.filter(n => n.encargadoEmail === userId);
}

export async function markNotificationAsRead(id: string) {
  console.info('[MOCK] markNotificationAsRead', id);
  return { success: true };
}

export async function getUnreadCount(_userId: string): Promise<number> {
  return MOCK_NOTIFICATIONS.filter(n => !n.read).length;
}

export async function generateNotifications(): Promise<{ success: boolean; createdCount: number; error?: string }> {
  return { success: true, createdCount: 0 };
}
