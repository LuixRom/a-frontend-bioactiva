'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, AlertTriangle, Clock, CheckCircle2, X, Filter, Loader2, RefreshCw } from 'lucide-react';
import { relativeTime, cn } from '@/src/lib/utils';
import { 
  listNotifications, 
  markNotificationAsRead, 
  generateNotifications,
  type PublicNotification 
} from '@/src/server/actions/notifications';
import { useToast } from '@/src/components/ui/Toast';

interface NotificationsClientProps {
  userId: string;
  initialNotifications: PublicNotification[];
}

const TYPE_META: Record<string, { icon: any; color: string; bg: string }> = {
  ACTIVIDAD_VENCIDA: { icon: AlertTriangle, color: '#dc2626', bg: 'bg-red-50' },
  ACTIVIDAD_PROXIMA: { icon: Clock,         color: '#d97706', bg: 'bg-amber-50' },
  GENERAL:           { icon: Bell,          color: '#2563eb', bg: 'bg-blue-50' },
};

export default function NotificationsClient({ userId, initialNotifications }: NotificationsClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<'mis-leads' | 'todos'>('todos');
  const [notifications, setNotifications] = useState<PublicNotification[]>(initialNotifications);

  // Recargar notificaciones cuando cambie el filtro
  useEffect(() => {
    startTransition(async () => {
      const data = await listNotifications(userId, filter);
      setNotifications(data);
    });
  }, [filter, userId]);

  const handleMarkAsRead = async (noti: PublicNotification) => {
    if (noti.read) {
      if (noti.leadId) router.push(`/pipeline?leadId=${noti.leadId}`);
      return;
    }

    try {
      await markNotificationAsRead(noti.id);
      // Actualizar localmente
      setNotifications(prev => prev.map(n => n.id === noti.id ? { ...n, read: true } : n));
      
      if (noti.leadId) {
        router.push(`/pipeline?leadId=${noti.leadId}`);
      }
    } catch (err) {
      showToast('Error al actualizar notificación', 'error');
    }
  };

  const handleSync = () => {
    startTransition(async () => {
      const res = await generateNotifications();
      if (res.success) {
        showToast(`Sincronización completada. ${res.createdCount} nuevas alertas.`, 'success');
        const updated = await listNotifications(userId, filter);
        setNotifications(updated);
      } else {
        showToast('Error en la sincronización automática', 'error');
      }
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Bell className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-text">Centro de Notificaciones</h1>
            <p className="text-sm text-text-muted">
              {unreadCount} pendientes de revisión
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSync}
            disabled={isPending}
            className="btn-secondary flex items-center gap-2 px-4"
            title="Buscar nuevas actividades próximas o vencidas"
          >
            <RefreshCw className={cn("w-4 h-4", isPending && "animate-spin")} />
            Sincronizar
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 bg-surface p-1.5 rounded-2xl border border-border-subtle w-fit">
        <button
          onClick={() => setFilter('todos')}
          className={cn(
            "px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
            filter === 'todos' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-text-muted hover:bg-app-bg"
          )}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter('mis-leads')}
          className={cn(
            "px-4 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all",
            filter === 'mis-leads' ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-text-muted hover:bg-app-bg"
          )}
        >
          Mis Leads
        </button>
      </div>

      {/* List */}
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-20 bg-surface rounded-3xl border border-dashed border-border-subtle">
            <CheckCircle2 className="w-12 h-12 text-primary/20 mx-auto mb-4" />
            <p className="text-lg font-bold text-text-muted">¡Estás al día!</p>
            <p className="text-sm text-text-muted/60">No hay notificaciones que requieran tu atención inmediata.</p>
          </div>
        ) : (
          notifications.map((noti) => {
            const meta = TYPE_META[noti.type] || TYPE_META.GENERAL;
            const Icon = meta.icon;
            
            return (
              <div
                key={noti.id}
                onClick={() => handleMarkAsRead(noti)}
                className={cn(
                  "group relative flex items-start gap-4 p-5 rounded-2xl border transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]",
                  noti.read 
                    ? "bg-surface border-border-subtle opacity-75" 
                    : cn(meta.bg, "border-transparent shadow-sm hover:shadow-md")
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                  noti.read ? "bg-app-bg" : "bg-white shadow-sm"
                )}>
                  <Icon className="w-6 h-6" style={{ color: meta.color }} />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn(
                      "text-sm font-black",
                      noti.read ? "text-text-muted" : "text-text"
                    )}>
                      {noti.message}
                    </p>
                    {!noti.read && (
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: meta.color }} />
                    )}
                  </div>
                  
                  {noti.lead && (
                    <div className="flex items-center gap-2 text-xs font-bold text-text-muted">
                      <span className="px-1.5 py-0.5 rounded bg-black/5 uppercase tracking-tighter">
                        {noti.lead.codigo}
                      </span>
                      <span className="truncate">{noti.lead.organizacion.nombre}</span>
                    </div>
                  )}

                  <p className="text-[10px] font-bold text-text-muted/60 uppercase tracking-widest pt-1">
                    {relativeTime(noti.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
