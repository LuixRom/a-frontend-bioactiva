import { create } from 'zustand';
import type { LeadNotification, TipoLeadNotificacion } from '@/src/types/leadNotification';

// Sin datos mock iniciales — cada sesión arranca limpia
const initialNotifications: LeadNotification[] = [];

interface LeadNotificationStore {
  notifications: LeadNotification[];
  create: (data: Omit<LeadNotification, 'id' | 'creadoEn' | 'estadoBase'>) => LeadNotification;
  cancel: (id: string) => void;
  markAsSent: (id: string) => void;
  getByLead: (leadId: string) => LeadNotification[];
  hasActiveForActivity: (leadId: string, activityId: string) => boolean;
}

export const useLeadNotificationStore = create<LeadNotificationStore>()((set, get) => ({
  notifications: initialNotifications,

  create: (data) => {
    const id = `LN-${Date.now()}`;
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
      (n) =>
        n.leadId === leadId &&
        n.activityId === activityId &&
        (n.estadoBase === 'programada' || n.estadoBase === 'enviada'),
    ),
}));
