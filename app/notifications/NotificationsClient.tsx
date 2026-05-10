'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell, AlertTriangle, Clock, CheckCircle2, RefreshCw,
  ChevronDown, ChevronRight, XCircle, Send,
} from 'lucide-react';
import { relativeTime, cn } from '@/src/lib/utils';
import {
  listNotifications,
  markNotificationAsRead,
  generateNotifications,
  type PublicNotification,
} from '@/src/server/actions/notifications';
import { useToast } from '@/src/components/ui/Toast';
import { useAuthStore } from '@/src/store/authStore';
import { useUsersStore } from '@/src/store/usersStore';
import { useLeadNotificationStore } from '@/src/store/leadNotificationStore';
import { getEstadoNotificacion } from '@/src/types/leadNotification';

interface NotificationsClientProps {
  userId: string;
  initialNotifications: PublicNotification[];
}

const TYPE_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  ACTIVIDAD_VENCIDA: { icon: AlertTriangle, color: '#dc2626', bg: 'bg-red-50' },
  ACTIVIDAD_PROXIMA: { icon: Clock,         color: '#d97706', bg: 'bg-amber-50' },
  GENERAL:           { icon: Bell,          color: '#2563eb', bg: 'bg-blue-50' },
};

export default function NotificationsClient({ userId, initialNotifications }: NotificationsClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<'mis-leads' | 'todos'>('todos');
  const [sysNotifs, setSysNotifs] = useState<PublicNotification[]>(initialNotifications);
  const { role, userEmail, userName } = useAuthStore();
  // Auto-expandir el propio usuario en el acordeón admin
  const [openUser, setOpenUser] = useState<string | null>(userName ?? null);
  const isAdmin = role === 'Administrador';
  const { users } = useUsersStore();
  // Incluye todos — admin también puede tener leads con notificaciones
  const workers = users.filter(u => u.active !== false);

  const { notifications: emailNotifs, cancel: cancelNotif } = useLeadNotificationStore();
  const activeEmailNotifs = emailNotifs.filter(n => n.estadoBase !== 'cancelada');

  // Para trabajador: sus propias notifs de email
  const myEmailNotifs = activeEmailNotifs.filter(n => n.emailResponsable === userEmail);
  const myProgramadas = myEmailNotifs.filter(n => getEstadoNotificacion(n) === 'programada');
  const myVencidas    = myEmailNotifs.filter(n => getEstadoNotificacion(n) === 'vencida');
  const myEnviadas    = myEmailNotifs.filter(n => getEstadoNotificacion(n) === 'enviada');

  // Para admin: agrupar por trabajador
  const notifsForWorker = (workerName: string) =>
    activeEmailNotifs.filter(n => n.nombreResponsable === workerName);

  useEffect(() => {
    startTransition(async () => {
      // userId en mock = email; admin ve todos o solo sus leads según filter
      const data = await listNotifications(userEmail ?? userId, filter);
      setSysNotifs(data);
    });
  }, [filter, userId, userEmail]);

  const handleMarkAsRead = async (noti: PublicNotification) => {
    if (noti.read) { if (noti.leadId) router.push(`/pipeline?leadId=${noti.leadId}`); return; }
    try {
      await markNotificationAsRead(noti.id);
      setSysNotifs(prev => prev.map(n => n.id === noti.id ? { ...n, read: true } : n));
      if (noti.leadId) router.push(`/pipeline?leadId=${noti.leadId}`);
    } catch { showToast('Error al actualizar notificación', 'error'); }
  };

  const handleSync = () => {
    startTransition(async () => {
      const res = await generateNotifications();
      if (res.success) {
        showToast(`Sincronización completada. ${res.createdCount} nuevas alertas.`, 'success');
        const updated = await listNotifications(userId, filter);
        setSysNotifs(updated);
      } else {
        showToast('Error en la sincronización automática', 'error');
      }
    });
  };

  const unreadCount = sysNotifs.filter(n => !n.read).length;
  const totalEmailPending = isAdmin
    ? activeEmailNotifs.filter(n => getEstadoNotificacion(n) === 'programada').length
    : myProgramadas.length;

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Bell className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-text">Centro de Notificaciones</h1>
            <p className="text-sm text-text-muted">
              {unreadCount + totalEmailPending} pendientes de revisión
            </p>
          </div>
        </div>
        <button
          onClick={handleSync}
          disabled={isPending}
          className="btn-secondary flex items-center gap-2 px-4"
        >
          <RefreshCw className={cn('w-4 h-4', isPending && 'animate-spin')} />
          Sincronizar
        </button>
      </div>

      {/* ══ SECCIÓN 1: Sistema ══ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-black text-text-muted uppercase tracking-widest">Actividades del sistema</p>
          <div className="flex gap-1 bg-surface p-1 rounded-xl border border-border-subtle">
            {(['todos', 'mis-leads'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'px-3 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all',
                  filter === f ? 'bg-primary text-white shadow' : 'text-text-muted hover:bg-app-bg',
                )}
              >
                {f === 'todos' ? 'Todas' : 'Mis Leads'}
              </button>
            ))}
          </div>
        </div>

        {sysNotifs.length === 0 ? (
          <div className="text-center py-10 bg-surface rounded-2xl border border-dashed border-border-subtle">
            <CheckCircle2 className="w-10 h-10 text-primary/20 mx-auto mb-3" />
            <p className="text-sm font-bold text-text-muted">¡Estás al día!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sysNotifs.map((noti) => {
              const meta = TYPE_META[noti.type] || TYPE_META.GENERAL;
              const Icon = meta.icon;
              return (
                <div
                  key={noti.id}
                  onClick={() => handleMarkAsRead(noti)}
                  className={cn(
                    'flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer hover:scale-[1.005]',
                    noti.read ? 'bg-surface border-border-subtle opacity-70' : cn(meta.bg, 'border-transparent shadow-sm'),
                  )}
                >
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', noti.read ? 'bg-app-bg' : 'bg-white shadow-sm')}>
                    <Icon className="w-5 h-5" style={{ color: meta.color }} />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn('text-sm font-bold', noti.read ? 'text-text-muted' : 'text-text')}>{noti.message}</p>
                      {!noti.read && <span className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: meta.color }} />}
                    </div>
                    {noti.lead && (
                      <div className="flex items-center gap-2 text-xs font-bold text-text-muted">
                        <span className="px-1.5 py-0.5 rounded bg-black/5 uppercase tracking-tighter">{noti.lead.codigo}</span>
                        <span className="truncate">{noti.lead.organizacion.nombre}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <p className="text-[10px] font-bold text-text-muted/60 uppercase tracking-widest">{relativeTime(noti.createdAt)}</p>
                      {noti.encargadoNombre && (
                        <p className="text-[10px] font-bold text-text-muted/60 uppercase tracking-widest">
                          Encargado: <span className="text-text-muted">{noti.encargadoNombre}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ══ SECCIÓN 2: Recordatorios y Seguimientos ══ */}
      <section className="space-y-4">
        <p className="text-xs font-black text-text-muted uppercase tracking-widest">Recordatorios y seguimientos</p>

        {/* ── Vista Admin: acordeón por trabajador ── */}
        {isAdmin && (
          <div className="space-y-2">
            {workers.map(worker => {
              const notifs = notifsForWorker(worker.name);
              const programadas = notifs.filter(n => getEstadoNotificacion(n) === 'programada');
              const vencidas    = notifs.filter(n => getEstadoNotificacion(n) === 'vencida');
              const enviadas    = notifs.filter(n => getEstadoNotificacion(n) === 'enviada');
              const isOpen = openUser === worker.name;

              return (
                <div key={worker.id} className="bg-surface border border-border-subtle rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setOpenUser(isOpen ? null : worker.name)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-app-bg/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-black text-primary">{worker.name.charAt(0)}</span>
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-text">{worker.name}</p>
                        <p className="text-xs text-text-muted">{worker.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {programadas.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-green-100 text-green-700">
                          {programadas.length} programada{programadas.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {vencidas.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700">
                          {vencidas.length} vencida{vencidas.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {enviadas.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-700">
                          {enviadas.length} enviada{enviadas.length > 1 ? 's' : ''}
                        </span>
                      )}
                      {notifs.length === 0 && (
                        <span className="text-xs text-text-muted">Sin notificaciones</span>
                      )}
                      {isOpen ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-border-subtle divide-y divide-border-subtle">
                      {notifs.length === 0 ? (
                        <p className="px-5 py-4 text-sm text-text-muted italic">Sin notificaciones de email registradas.</p>
                      ) : (
                        notifs.map(n => {
                          const estado = getEstadoNotificacion(n);
                          return (
                            <div key={n.id} className="px-5 py-4 flex items-start justify-between gap-4">
                              <div className="space-y-1 flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={cn(
                                    'px-2 py-0.5 rounded-full text-[10px] font-black uppercase',
                                    n.tipo === 'recordatorio' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700',
                                  )}>
                                    {n.tipo === 'recordatorio' ? '🔔 Recordatorio' : '📤 Seguimiento'}
                                  </span>
                                  <span className={cn(
                                    'px-2 py-0.5 rounded-full text-[10px] font-black uppercase',
                                    estado === 'vencida' ? 'bg-red-100 text-red-700'
                                    : estado === 'enviada' ? 'bg-purple-100 text-purple-700'
                                    : 'bg-green-100 text-green-700',
                                  )}>
                                    {estado}
                                  </span>
                                </div>
                                <p className="text-sm font-bold text-text truncate">{n.asuntoResuelto}</p>
                                <p className="text-xs text-text-muted">
                                  {n.orgNombre} · {new Date(n.fechaProgramada).toLocaleDateString('es-PE')}
                                </p>
                                {n.emailCliente && (
                                  <p className="text-[10px] text-text-muted flex items-center gap-1">
                                    <Send className="w-3 h-3" /> {n.emailCliente}
                                  </p>
                                )}
                              </div>
                              {estado !== 'enviada' && (
                                <button
                                  onClick={() => { cancelNotif(n.id); showToast('Notificación cancelada', 'success'); }}
                                  className="shrink-0 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                  title="Cancelar"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Vista Trabajador: solo las suyas ── */}
        {!isAdmin && (
          <div className="space-y-4">
            {myEmailNotifs.length === 0 ? (
              <div className="text-center py-10 bg-surface rounded-2xl border border-dashed border-border-subtle">
                <Send className="w-10 h-10 text-primary/20 mx-auto mb-3" />
                <p className="text-sm font-bold text-text-muted">Sin notificaciones de email</p>
                <p className="text-xs text-text-muted mt-1">Crea una desde la gestión de un lead.</p>
              </div>
            ) : (
              <>
                {myProgramadas.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Programadas</p>
                    {myProgramadas.map(n => (
                      <div key={n.id} className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-black uppercase', n.tipo === 'recordatorio' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}>
                              {n.tipo === 'recordatorio' ? '🔔 Recordatorio' : '📤 Seguimiento'}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-text truncate">{n.asuntoResuelto}</p>
                          <p className="text-xs text-text-muted">{n.orgNombre} · {new Date(n.fechaProgramada).toLocaleDateString('es-PE')}</p>
                          {n.emailCliente && <p className="text-[10px] text-text-muted flex items-center gap-1"><Send className="w-3 h-3" /> {n.emailCliente}</p>}
                        </div>
                        <button onClick={() => { cancelNotif(n.id); showToast('Notificación cancelada', 'success'); }} className="shrink-0 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Cancelar">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {myVencidas.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Vencidas</p>
                    {myVencidas.map(n => (
                      <div key={n.id} className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start justify-between gap-4">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-black uppercase', n.tipo === 'recordatorio' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700')}>
                              {n.tipo === 'recordatorio' ? '🔔 Recordatorio' : '📤 Seguimiento'}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-700">Vencida</span>
                          </div>
                          <p className="text-sm font-bold text-text truncate">{n.asuntoResuelto}</p>
                          <p className="text-xs text-text-muted">{n.orgNombre} · {new Date(n.fechaProgramada).toLocaleDateString('es-PE')}</p>
                        </div>
                        <button onClick={() => { cancelNotif(n.id); showToast('Notificación cancelada', 'success'); }} className="shrink-0 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Cancelar">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {myEnviadas.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Historial de enviados</p>
                    {myEnviadas.map(n => (
                      <div key={n.id} className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-700">
                              📤 Seguimiento
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-700">
                              Enviada
                            </span>
                          </div>
                          <p className="text-sm font-bold text-text truncate">{n.asuntoResuelto}</p>
                          <p className="text-xs text-text-muted">{n.orgNombre} · {new Date(n.fechaProgramada).toLocaleDateString('es-PE')}</p>
                          {n.emailCliente && (
                            <p className="text-[10px] text-text-muted flex items-center gap-1">
                              <Send className="w-3 h-3" /> {n.emailCliente}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
