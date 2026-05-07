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
    userId: 'mock-user',
    leadId: 'lead-1',
    type: 'ACTIVIDAD_VENCIDA',
    message: 'Actividad vencida en LEAD-2025-001 (Consultoría)',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // hace 2h
    lead: { id: 'l1', codigo: 'LEAD-2025-001', organizacion: { nombre: 'Agro Export S.A.' } }
  },
  {
    id: 'noti-2',
    userId: 'mock-user',
    leadId: 'lead-2',
    type: 'ACTIVIDAD_PROXIMA',
    message: 'Actividad próxima en LEAD-2025-042',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30), // hace 30m
    lead: { id: 'l2', codigo: 'LEAD-2025-042', organizacion: { nombre: 'Minería del Sur' } }
  }
];

export async function listNotifications(userId: string, filter: 'mis-leads' | 'todos' = 'todos'): Promise<PublicNotification[]> {
  console.info('[MOCK] listNotifications called for', userId);
  return MOCK_NOTIFICATIONS;
}

export async function markNotificationAsRead(id: string) {
  console.info('[MOCK] markNotificationAsRead', id);
  return { success: true };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return MOCK_NOTIFICATIONS.filter(n => !n.read).length;
}

export async function generateNotifications(): Promise<{ success: boolean; createdCount: number; error?: string }> {
  return { success: true, createdCount: 0 };
}
