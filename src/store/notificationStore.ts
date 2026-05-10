import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Notification } from '@/src/types/crm';
import { mockNotifications } from '@/src/lib/mockData';

type NotificationState = {
  notifications: Notification[];
  addNotification: (notif: Omit<Notification, 'id' | 'fecha' | 'leida'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  getMyNotifications: (userEmail: string | null, userRole: string | null) => Notification[];
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: mockNotifications,
      addNotification: (notif) => {
        const newNotif: Notification = {
          ...notif,
          id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          fecha: new Date(),
          leida: false,
        };
        set((state) => ({ notifications: [newNotif, ...state.notifications] }));
      },
      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, leida: true } : n
          ),
        }));
      },
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, leida: true })),
        }));
      },
      getMyNotifications: (userEmail, userRole) => {
        const all = get().notifications;
        return all.filter((n) => {
          const { tipo, userId, rol } = n.destinatario;
          if (tipo === 'global') return true;
          if (tipo === 'usuario' && userId && userEmail && userId.toLowerCase() === userEmail.toLowerCase()) return true;
          if (tipo === 'rol' && rol && userRole && rol === userRole) return true;
          return false;
        });
      }
    }),
    { name: 'notification-store-v2' }
  )
);
