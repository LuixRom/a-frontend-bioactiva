'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Bell,
  AlertTriangle, Clock, CalendarDays, Menu,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/src/store/authStore';
import { useSidebarStore } from '@/src/store/sidebarStore';
import { getInitials, cn, relativeTime } from '@/src/lib/utils';
import MicrosoftStatusBadge from '@/src/components/MicrosoftStatusBadge';
import { findUserByEmail } from '@/src/server/actions/users';
import { listNotifications, getUnreadCount, markNotificationAsRead } from '@/src/server/actions/notifications';

export default function TopBar() {
  const { userName, userEmail } = useAuthStore();
  const toggleSidebar = useSidebarStore((s) => s.toggle);
  const router   = useRouter();
  const displayName = userName || userEmail || 'Usuario';
  const initials    = getInitials(displayName);

  // ── Notification bell (Real data) ───────────────────────────────────────
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const [realNotifications, setRealNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userEmail) return;

    const fetchNotis = async () => {
      try {
        const user = await findUserByEmail(userEmail);
        if (user) {
          const count = await getUnreadCount(user.id);
          setUnreadCount(count);
          
          if (bellOpen) {
            const list = await listNotifications(user.id, 'todos');
            setRealNotifications(list.slice(0, 5)); // Solo las 5 más recientes en el dropdown
          }
        }
      } catch (err) {
        console.error('Error fetching TopBar notifications:', err);
      }
    };

    fetchNotis();
    // Poll cada 2 minutos o al abrir el bell
    const interval = setInterval(fetchNotis, 120000);
    return () => clearInterval(interval);
  }, [userEmail, bellOpen]);

  const totalAlerts = unreadCount;

  const handleNotificationClick = async (noti: any) => {
    if (!noti.read) {
      await markNotificationAsRead(noti.id);
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    setBellOpen(false);
    if (noti.leadId) router.push(`/pipeline?leadId=${noti.leadId}`);
    else router.push('/notifications');
  };

  // ── Click-outside handler ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const go = (path: string) => {
    router.push(path);
    setBellOpen(false);
  };

  return (
    <header className="h-16 flex items-center gap-3 px-6 bg-surface border-b border-border-subtle sticky top-0 z-20">

      {/* ── Hamburger ── */}
      <button
        onClick={toggleSidebar}
        className="w-9 h-9 flex items-center justify-center rounded-xl text-text-muted hover:text-primary hover:bg-app-bg transition-colors shrink-0"
        aria-label="Toggle sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* ── Right: Actions & Profile ── */}
      <div className="flex items-center gap-3">

        {/* ── Microsoft connection status ── */}
        <MicrosoftStatusBadge />

        {/* ── Bell / Notifications ── */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setBellOpen(prev => !prev)}
            className={cn(
              'relative w-10 h-10 rounded-xl flex items-center justify-center border transition-all',
              bellOpen
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-app-bg border-border-subtle text-primary hover:bg-secondary'
            )}
          >
            <Bell className="w-5 h-5" />
            {totalAlerts > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-[10px] font-black text-white flex items-center justify-center px-1 bg-red-500 animate-pulse">
                {totalAlerts}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {bellOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-surface border border-border-subtle rounded-2xl shadow-premium z-50 overflow-hidden select-none">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-app-bg/50 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-text uppercase tracking-wider">Notificaciones</span>
                </div>
                {totalAlerts > 0 && (
                  <span className="text-[10px] font-bold text-text-muted">
                    {totalAlerts} por leer
                  </span>
                )}
              </div>

              {/* Items */}
              <div className="max-h-72 overflow-y-auto divide-y divide-border-subtle">
                {realNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-text-muted">
                    <CalendarDays className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-xs font-medium">No hay notificaciones</p>
                  </div>
                ) : (
                  <>
                    {/* Sección "Sin leer" */}
                    {realNotifications.filter(n => !n.read).length > 0 && (
                      <div>
                        <p className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase tracking-wider bg-app-bg/30 border-b border-border-subtle flex items-center justify-between">
                          <span>Sin leer</span>
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        </p>
                        {realNotifications.filter(n => !n.read).map(n => (
                          <button
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-app-bg text-left transition-colors"
                          >
                            <div className="mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-50">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-text truncate">{n.message}</p>
                              <p className="text-[9px] font-semibold mt-1 text-primary">
                                {relativeTime(n.createdAt)}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Sección "Leídas" */}
                    {realNotifications.filter(n => n.read).length > 0 && (
                      <div className="bg-app-bg/10">
                        <p className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase tracking-wider bg-app-bg/30 border-b border-border-subtle">
                          Leídas
                        </p>
                        {realNotifications.filter(n => n.read).map(n => (
                          <button
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-app-bg text-left transition-colors opacity-70"
                          >
                            <div className="mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-50">
                              <Clock className="w-3.5 h-3.5 text-gray-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-text truncate">{n.message}</p>
                              <p className="text-[9px] font-normal mt-1 text-text-muted">
                                {relativeTime(n.createdAt)}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-border-subtle bg-app-bg/30 flex items-center justify-between gap-2">
                <button
                  onClick={() => go('/notifications')}
                  className="text-xs font-bold text-text-muted hover:text-text transition-colors"
                >
                  Ver todas
                </button>
                <button
                  onClick={() => go('/pipeline')}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Ver pipeline →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── User profile ── */}
        <Link href="/profile" className="flex items-center gap-2.5 pl-1 pr-1 py-1 rounded-xl border border-border-subtle bg-app-bg/30 hover:bg-app-bg transition-colors cursor-pointer">
          <div className="flex flex-col items-end hidden lg:flex">
            <span className="text-sm font-bold text-text leading-tight">{displayName}</span>
            <span className="text-[10px] uppercase font-semibold text-text-muted tracking-wider">Bioactiva CRM</span>
          </div>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm text-white bg-primary shadow-sm">
            {initials}
          </div>
        </Link>
      </div>
    </header>
  );
}
