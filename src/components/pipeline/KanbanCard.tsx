'use client';

import { memo, useCallback } from 'react';
import { AlertTriangle, Clock, Building2, User, Briefcase } from 'lucide-react';
import { Draggable } from '@hello-pangea/dnd';
import type { Lead } from '@/src/types/crm';
import { getAlertLevel } from '@/src/lib/alertLevel';
import { cn } from '@/src/lib/utils';

interface KanbanCardProps {
  lead: Lead;
  orgNombre: string;
  contactoNombre: string;
  index: number;
  /**
   * Recibe el lead en lugar de un closure para que el padre pueda pasar
   * una referencia ESTABLE (sin closures inline). Esto es crítico para
   * que `memo` no re-renderice las cards durante un drag — si re-renderizan,
   * @hello-pangea/dnd aborta el drop.
   */
  onSelect: (lead: Lead) => void;
}

function KanbanCardComponent({
  lead,
  orgNombre,
  contactoNombre,
  index,
  onSelect,
}: KanbanCardProps) {
  const alertLevel = getAlertLevel(lead.fechaProximaActividad);

  const handleClick = useCallback(() => onSelect(lead), [lead, onSelect]);

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={handleClick}
          className={cn(
            'group bg-surface rounded-xl p-4 cursor-pointer transition-all duration-200',
            'border-l-4 shadow-subtle hover:shadow-premium hover:-translate-y-0.5',
            snapshot.isDragging && 'rotate-1 scale-105 shadow-2xl',
            alertLevel === 'danger'  && 'border-l-red-500',
            alertLevel === 'warning' && 'border-l-amber-400',
            alertLevel === 'none'    && 'border-l-transparent hover:border-l-primary',
          )}
          style={provided.draggableProps.style}
        >
          {alertLevel !== 'none' && (
            <div className={cn(
              'flex items-center gap-1.5 text-[10px] font-bold uppercase mb-2 px-2 py-0.5 rounded-full w-fit',
              alertLevel === 'danger'  ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'
            )}>
              {alertLevel === 'danger'
                ? <AlertTriangle className="w-3 h-3" />
                : <Clock className="w-3 h-3" />}
              {alertLevel === 'danger' ? 'Actividad vencida' : 'Actividad próxima'}
            </div>
          )}

          <p className="text-[10px] font-mono text-text-muted mb-2">{lead.id}</p>

          <div className="flex items-center gap-1.5 mb-1">
            <Building2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <p className="text-sm font-bold text-text truncate">{orgNombre}</p>
          </div>

          <div className="flex items-center gap-1.5 mb-1">
            <User className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
            <p className="text-xs text-text-muted truncate">{contactoNombre}</p>
          </div>

          {lead.servicioInteres && (
            <div className="flex items-center gap-1.5 mt-2">
              <Briefcase className="w-3 h-3 text-text-muted flex-shrink-0" />
              <p className="text-xs text-text-muted truncate">{lead.servicioInteres}</p>
            </div>
          )}

          {lead.encargado && (
            <div className="mt-3 pt-2 border-t border-border-subtle">
              <span className="text-[10px] font-semibold px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                {lead.encargado}
              </span>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

export const KanbanCard = memo(KanbanCardComponent);
