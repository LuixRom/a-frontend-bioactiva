'use client';

import { Bell, AlertTriangle, CheckCircle2, Clock, X } from 'lucide-react';
import { useState } from 'react';
import { relativeTime } from '@/src/lib/utils';

type NotiType = 'warning' | 'success' | 'reminder';

const initialNotifications = [
  { id: 1, type: 'warning' as NotiType,  title: 'Leads sin actividad',          body: '5 leads llevan más de 7 días sin seguimiento', read: false, date: new Date(Date.now() - 10 * 60 * 1000) },
  { id: 2, type: 'reminder' as NotiType, title: 'Llamada pendiente',             body: 'Hoy a las 14:00 con Agrofértil del Norte',        read: false, date: new Date(Date.now() - 30 * 60 * 1000) },
  { id: 3, type: 'warning' as NotiType,  title: 'Cotizaciones próximas a vencer', body: '3 cotizaciones vencen esta semana',              read: false, date: new Date(Date.now() - 2 * 3600 * 1000) },
  { id: 4, type: 'success' as NotiType,  title: 'Lead cerrado',                   body: 'Corporación La Joya aceptó la propuesta',         read: true,  date: new Date(Date.now() - 24 * 3600 * 1000) },
  { id: 5, type: 'reminder' as NotiType, title: 'Reunión mañana',                 body: 'Demo con EcoAgroPerú a las 16:30',                read: true,  date: new Date(Date.now() - 2 * 24 * 3600 * 1000) },
];

const TYPE_META: Record<NotiType, { icon: React.ElementType; color: string; bg: string }> = {
  warning:  { icon: AlertTriangle,  color: '#d97706', bg: '#fffbeb' },
  success:  { icon: CheckCircle2,   color: '#1C7E3C', bg: '#F1FFEC' },
  reminder: { icon: Clock,          color: '#2563eb', bg: '#eff6ff' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(initialNotifications);

  const markRead = (id: number) =>
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));

  const dismiss = (id: number) =>
    setNotifications((prev) => prev.filter((n) => n.id !== id));

  const markAll = () =>
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold" style={{ color: '#0f2d1a' }}>Notificaciones</h1>
          {unread > 0 && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white"
                  style={{ background: '#1C7E3C' }}>{unread}</span>
          )}
        </div>
        {unread > 0 && (
          <button onClick={markAll} className="text-sm font-medium transition-colors hover:underline"
                  style={{ color: '#1C7E3C' }}>
            Marcar todas como leídas
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-12 h-12 mx-auto mb-4" style={{ color: '#BCF7B3' }} />
          <p className="font-bold" style={{ color: '#0f2d1a' }}>Todo al día</p>
          <p className="text-sm" style={{ color: '#9dbfa8' }}>No tienes notificaciones pendientes</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const meta = TYPE_META[n.type];
            const Icon = meta.icon;
            return (
              <div
                key={n.id}
                onClick={() => markRead(n.id)}
                className="flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition-all hover:-translate-y-0.5"
                style={{
                  background: n.read ? '#fff' : meta.bg,
                  border: `1.5px solid ${n.read ? '#edfce8' : meta.color + '44'}`,
                  boxShadow: n.read ? 'none' : `0 2px 8px ${meta.color}18`,
                }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: meta.bg, border: `1px solid ${meta.color}33` }}>
                  <Icon className="w-5 h-5" style={{ color: meta.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold" style={{ color: '#0f2d1a' }}>{n.title}</p>
                    {!n.read && <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: meta.color }} />}
                  </div>
                  <p className="text-sm mt-0.5" style={{ color: '#4a7c5e' }}>{n.body}</p>
                  <p className="text-xs mt-1" style={{ color: '#9dbfa8' }}>{relativeTime(n.date)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                  className="text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
