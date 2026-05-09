'use client';

import { ExternalLink } from 'lucide-react';
import type { Lead } from '@/src/types/crm';
import Drawer from '@/src/components/ui/Drawer';
import Timeline from '@/src/components/ui/Timeline';
import { cn, formatDate } from '@/src/lib/utils';
import { getEstadoLeadLabel, getEstadoLeadColor } from '@/src/lib/constants';

interface LeadPanelProps {
  lead: Lead | null;
  orgNombre: string;
  contactoNombre: string;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export default function LeadPanel({
  lead,
  orgNombre,
  contactoNombre,
  isOpen,
  onClose,
  onEdit,
}: LeadPanelProps) {
  if (!lead) return null;

  const estadoColor = getEstadoLeadColor(lead.estado);
  const estadoLabel = getEstadoLeadLabel(lead.estado);

  const Field = ({ label, value }: { label: string; value?: string | null }) => (
    <div>
      <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{label}</p>
      <p className="text-sm text-text mt-0.5">{value || '—'}</p>
    </div>
  );

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Lead — ${orgNombre}`}
      width="w-[38%]"
    >
      <div className="space-y-5 pb-8">
        {/* ID + estado */}
        <div className="flex items-center justify-between bg-app-bg/40 rounded-2xl p-4 border border-border-subtle">
          <div>
            <p className="text-[10px] font-mono text-text-muted">{lead.id}</p>
            <p className="text-xs text-text-muted mt-0.5">{contactoNombre}</p>
          </div>
          <span
            className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider text-white"
            style={{ backgroundColor: estadoColor }}
          >
            {estadoLabel}
          </span>
        </div>

        {/* Campos principales */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Servicio de interés" value={lead.servicioInteres} />
          <Field label="Canal" value={lead.canal} />
          <Field label="Encargado" value={lead.encargado} />
          <Field label="Fecha cierre estimada" value={lead.fechaCierre ? formatDate(lead.fechaCierre) : null} />
        </div>

        {lead.desafioOportunidad && (
          <Field label="Desafío u oportunidad" value={lead.desafioOportunidad} />
        )}

        {lead.historial && (
          <Field label="Notas de contacto" value={lead.historial} />
        )}

        {/* Actividades */}
        <div>
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-3">
            Actividades ({lead.actividades.length})
          </p>
          {lead.actividades.length === 0 ? (
            <p className="text-sm text-text-muted italic">Sin actividades registradas.</p>
          ) : (
            <Timeline
              items={lead.actividades.map(a => ({
                id: a.id,
                fecha: a.fecha instanceof Date ? a.fecha : new Date(a.fecha),
                tipo: a.tipo,
                estado: a.estado,
                nota: a.nota,
                responsable: a.responsable,
              }))}
            />
          )}
        </div>

        {/* Botón gestionar */}
        <button
          onClick={() => { onClose(); onEdit(); }}
          className="btn-primary w-full"
        >
          <ExternalLink className="w-4 h-4" /> Gestionar lead
        </button>
      </div>
    </Drawer>
  );
}
