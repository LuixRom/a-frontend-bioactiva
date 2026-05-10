'use client';

import { useEffect, useState, useTransition } from 'react';
import { useAuthStore } from '@/src/store/authStore';
import { findUserByEmail } from '@/src/server/actions/users';
import { listNotifications, type PublicNotification } from '@/src/server/actions/notifications';
import NotificationsClient from './NotificationsClient';
import { Loader2, Bell } from 'lucide-react';

export default function NotificationsPage() {
  const { userEmail } = useAuthStore();
  const [userId, setUserId] = useState<string | null>(null);
  const [initialNotifications, setInitialNotifications] = useState<PublicNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userEmail) return;

    const init = async () => {
      try {
        // En mock usamos el email directamente como userId
        setUserId(userEmail);
        const notis = await listNotifications(userEmail);
        setInitialNotifications(notis);
      } catch (err) {
        console.error('Error initializing notifications:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [userEmail]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm font-bold text-text-muted animate-pulse">Cargando notificaciones...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3 text-center p-6">
        <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center">
          <Bell className="w-8 h-8 text-red-400 opacity-20" />
        </div>
        <h2 className="text-xl font-black text-text">Usuario no encontrado</h2>
        <p className="text-sm text-text-muted max-w-xs">No pudimos vincular tu sesión con un usuario válido para mostrarte las notificaciones.</p>
      </div>
    );
  }

  return <NotificationsClient userId={userId} initialNotifications={initialNotifications} />;
}
