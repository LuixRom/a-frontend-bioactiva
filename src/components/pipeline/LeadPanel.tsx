'use client';

import { useState } from 'react';
import { ExternalLink, AlertTriangle, Calendar, Phone, Mail, MessageSquare, User } from 'lucide-react';
import type { Lead } from '@/src/types/crm';
import Drawer from '@/src/components/ui/Drawer';
import { cn, formatDate } from '@/src/lib/utils';
import { getEstadoLeadLabel, getEstadoLeadColor } from '@/src/lib/constants';
import { useLeadNotificationStore } from '@/src/store/leadNotificationStore';
import { useLeadStore } from '@/src/store/leadStore';
import { useToast } from '@/src/components/ui/Toast';
import { getActivityStatus } from '@/src/lib/activityStatus';

interface LeadPanelProps {
  lead: Lead | null;
  orgNombre: string;
  contactoNombre: string;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
}

const TIPO_ICON: Record<string, React.ElementType> = {
  reunion: Calendar,
  llamada: Phone,
  email: Mail,
  otro: MessageSquare,
};

const STATUS_CLASS = {
  pendiente: 'bg-amber-100 text-amber-700',
  realizada: 'bg-green-100 text-green-700',
  vencida:   'bg-red-100 text-red-700',
};

const STATUS_LABEL = {
  pendiente: 'pendiente',
  realizada: 'completada',
  vencida:   'vencida',
};

export default function LeadPanel({ lead, orgNombre, contactoNombre, isOpen, onClose, onEdit }: LeadPanelProps) {
  const { notifications, cancel } = useLeadNotificationStore();
  const { updateLead } = useLeadStore();
  const { showToast } = useToast();
  const [confirmState, setConfirmState] = useState<{ activityId: string; activityNota: string } | null>(null);
  const [confirmText, setConfirmText] = useState('');

  if (!lead) return null;

  const estadoColor = getEstadoLeadColor(lead.estado);
  const estadoLabel = getEstadoLeadLabel(lead.estado);

  const sorted = [...lead.actividades].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
  );

  const confirmPhrase = confirmState ? `eliminar actividad ${confirmState.activityNota}` : '';
  const confirmMatch  = confirmText.trim().toLowerCase() === confirmPhrase.toLowerCase();

  const openConfirm  = (activityId: string, activityNota: string) => {
    setConfirmState({ activityId, activityNota });
    setConfirmText('');
  };
  const closeConfirm = () => { setConfirmState(null); setConfirmText(''); };

  const handleDelete = () => {
    if (!confirmMatch || !confirmState) return;
    // Cancelar notificaciones activas de esa actividad
    notifications
      .filter(n => n.leadId === lead.id && n.activityId === confirmState.activityId && n.estadoBase === 'programada')
      .forEach(n => cancel(n.id));
    // Eliminar actividad del lead
    updateLead({ ...lead, actividades: lead.actividades.filter(a => a.id !== confirmState.activityId) });
    showToast('Actividad eliminada y sus notificaciones canceladas', 'success');
    closeConfirm();
  };

  const Field = ({ label, value }: { label: string; value?: string | null }) => (
    <div>
      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{label}</p>
      <p className="text-sm text-text mt-0.5">{value || '—'}</p>
    </div>
  );

  return (
    <>
      <Drawer isOpen={isOpen} onClose={onClose} title={`Lead — ${orgNombre}`} width="w-[38%]">
        <div className="space-y-5 pb-8">

          {/* ID + estado */}
          <div className="flex items-center justify-between bg-app-bg/40 rounded-2xl p-4 border border-border-subtle">
            <div>
              <p className="text-[10px] font-mono text-text-muted">{lead.id}</p>
              <p className="text-xs text-text-muted mt-0.5">{contactoNombre}</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider text-white"
              style={{ backgroundColor: estadoColor }}>
              {estadoLabel}
            </span>
          </div>

          {/* Campos */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Servicio de interés" value={lead.servicioInteres} />
            <Field label="Canal" value={lead.canal} />
            <Field label="Encargado" value={lead.encargado} />
            <Field label="Fecha cierre estimada" value={lead.fechaCierre ? formatDate(lead.fechaCierre) : null} />
          </div>
          {lead.desafioOportunidad && <Field label="Desafío u oportunidad" value={lead.desafioOportunidad} />}
          {lead.historial && <Field label="Notas de contacto" value={lead.historial} />}

          {/* Actividades */}
          <div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-3">
              Actividades ({lead.actividades.length})
            </p>

            {sorted.length === 0 ? (
              <p className="text-sm text-text-muted italic">Sin actividades registradas.</p>
            ) : (
              <div className="space-y-3">
                {sorted.map(a => {
                  const Icon   = TIPO_ICON[a.tipo] ?? MessageSquare;
                  const status = getActivityStatus(a);
                  return (
                    <div key={a.id} className="bg-app-bg/40 border border-border-subtle rounded-2xl p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <span className="text-xs font-bold text-primary uppercase tracking-wider">{a.tipo}</span>
                          <span className={cn('px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider', STATUS_CLASS[status])}>
                            {STATUS_LABEL[status]}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-text-muted">
                            {new Date(a.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                          </span>
                          <button
                            onClick={() => openConfirm(a.id, a.nota)}
                            className="p-1 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Eliminar actividad"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-text leading-relaxed pl-9">{a.nota}</p>
                      <div className="flex items-center gap-1.5 pl-9">
                        <User className="w-3 h-3 text-text-muted" />
                        <span className="text-xs text-text-muted font-bold">{a.responsable}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button onClick={() => { onClose(); onEdit(); }} className="btn-primary w-full">
            <ExternalLink className="w-4 h-4" /> Gestionar lead
          </button>
        </div>
      </Drawer>

      {/* Modal de confirmación */}
      {confirmState && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeConfirm} />
          <div className="relative bg-surface rounded-2xl border border-border-subtle shadow-2xl p-6 w-full max-w-md space-y-4 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-text">Eliminar actividad</h3>
                <p className="text-xs text-text-muted mt-1">
                  Se eliminarán también sus notificaciones activas. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>

            <div className="bg-app-bg/60 rounded-xl p-3 border border-border-subtle">
              <p className="text-xs text-text-muted">Para confirmar, escribe exactamente:</p>
              <p className="text-sm font-bold text-text mt-1 font-mono break-all">
                eliminar actividad {confirmState.activityNota}
              </p>
            </div>

            <input
              type="text"
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && confirmMatch && handleDelete()}
              placeholder="Escribe la frase de confirmación..."
              className="w-full px-3 py-2.5 bg-app-bg/40 border border-border-subtle rounded-xl text-sm outline-none focus:border-red-400 transition-all"
              autoFocus
            />

            <div className="flex gap-3">
              <button onClick={closeConfirm} className="btn-secondary flex-1">Cancelar</button>
              <button
                onClick={handleDelete}
                disabled={!confirmMatch}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Confirmar eliminación
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
