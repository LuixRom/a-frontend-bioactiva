'use client';

import { Bell, XCircle, Send, Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { useToast } from '@/src/components/ui/Toast';
import { useAuthStore } from '@/src/store/authStore';
import { useLeadNotificationStore } from '@/src/store/leadNotificationStore';
import { getEstadoNotificacion, type LeadNotification } from '@/src/types/leadNotification';

function NotifCard({ n, onCancel, showResponsable }: {
  n: LeadNotification;
  onCancel?: () => void;
  showResponsable?: boolean;
}) {
  const estado = getEstadoNotificacion(n);
  return (
    <div className={cn(
      'rounded-2xl border p-4 space-y-2',
      estado === 'vencida' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200',
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1 min-w-0">
          {/* Tipo badge */}
          <span className={cn(
            'inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase',
            n.tipo === 'recordatorio' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700',
          )}>
            {n.tipo === 'recordatorio' ? '🔔 Recordatorio' : '📤 Seguimiento'}
          </span>

          {/* Organización + Lead */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-black text-text">{n.orgNombre}</p>
            <span className="text-[10px] font-mono text-text-muted bg-black/5 px-1.5 py-0.5 rounded">
              {n.leadId}
            </span>
          </div>

          {/* Actividad */}
          <p className="text-xs text-text-muted">
            Actividad: <span className="font-semibold text-text">{n.activityNota}</span>
          </p>

          {/* Asunto */}
          <p className="text-sm text-text truncate">{n.asuntoResuelto}</p>

          {/* Fecha */}
          <p className="text-xs text-text-muted">
            📅 {new Date(n.fechaProgramada).toLocaleDateString('es-PE', {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>

          {/* Responsable (solo admin) */}
          {showResponsable && (
            <p className="text-[10px] text-text-muted">
              👤 <span className="font-semibold">{n.nombreResponsable}</span>
              {' · '}{n.emailResponsable}
            </p>
          )}

          {/* Email cliente si es seguimiento */}
          {n.emailCliente && (
            <p className="text-[10px] text-text-muted flex items-center gap-1">
              <Send className="w-3 h-3" /> {n.emailCliente}
            </p>
          )}
        </div>

        {/* Cancelar — solo en programadas */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="shrink-0 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100 transition-colors"
            title="Cancelar"
          >
            <XCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function NotificationsClient() {
  const { showToast } = useToast();
  const { role, userEmail } = useAuthStore();
  const isAdmin = role === 'Administrador';

  const { notifications: emailNotifs, cancel: cancelNotif } = useLeadNotificationStore();

  // Solo activas (no canceladas)
  const visible = emailNotifs.filter(n => n.estadoBase !== 'cancelada');

  // Admin ve todas; trabajador solo las suyas
  const mine = isAdmin
    ? visible
    : visible.filter(n => n.emailResponsable === userEmail);

  // Programadas = fecha futura aún no disparada
  const programadas = mine.filter(n => getEstadoNotificacion(n) === 'programada');
  // Vencidas = ya enviadas (auto o manual) o fecha pasada
  const vencidas = mine.filter(n =>
    getEstadoNotificacion(n) === 'vencida' || n.estadoBase === 'enviada',
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
          <Bell className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-text">Centro de Notificaciones</h1>
          <p className="text-sm text-text-muted">
            {programadas.length > 0
              ? `${programadas.length} programada${programadas.length > 1 ? 's' : ''} pendiente${programadas.length > 1 ? 's' : ''}`
              : 'Sin notificaciones pendientes'}
          </p>
        </div>
      </div>

      {/* ── Programadas ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-green-600" />
          <p className="text-xs font-black text-text-muted uppercase tracking-widest">
            Programadas <span className="text-green-600">({programadas.length})</span>
          </p>
        </div>

        {programadas.length === 0 ? (
          <div className="text-center py-8 bg-surface rounded-2xl border border-dashed border-border-subtle">
            <CheckCircle2 className="w-8 h-8 text-primary/20 mx-auto mb-2" />
            <p className="text-sm font-bold text-text-muted">Sin recordatorios programados</p>
          </div>
        ) : (
          <div className="space-y-2">
            {programadas.map(n => (
              <NotifCard
                key={n.id}
                n={n}
                showResponsable={isAdmin}
                onCancel={() => {
                  cancelNotif(n.id);
                  showToast('Recordatorio cancelado', 'success');
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Vencidas ── */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-red-500" />
          <p className="text-xs font-black text-text-muted uppercase tracking-widest">
            Vencidas / Enviadas <span className="text-red-500">({vencidas.length})</span>
          </p>
        </div>

        {vencidas.length === 0 ? (
          <div className="text-center py-8 bg-surface rounded-2xl border border-dashed border-border-subtle">
            <p className="text-sm font-bold text-text-muted">Sin recordatorios vencidos</p>
          </div>
        ) : (
          <div className="space-y-2">
            {vencidas.map(n => (
              <NotifCard
                key={n.id}
                n={n}
                showResponsable={isAdmin}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
