'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/src/lib/utils';
import { getActivityStatus, type DerivedActivityStatus } from '@/src/lib/activityStatus';
import { Calendar, User, MessageSquare, Phone, Mail, CheckCircle2, X } from 'lucide-react';

interface TimelineItem {
  id: string;
  nombre?: string;
  fecha: Date;
  tipo: 'reunion' | 'llamada' | 'email' | 'otro';
  nota: string;
  responsable: string;
  estado?: 'pendiente' | 'realizada';
}

interface TimelineProps {
  items: TimelineItem[];
  onComplete?: (id: string) => void;
  onNoteChange?: (id: string, nota: string) => void;
  onDelete?: (id: string) => void;
}

const icons = {
  reunion: Calendar,
  llamada: Phone,
  email: Mail,
  otro: MessageSquare,
};

const STATUS_LABEL: Record<DerivedActivityStatus, string> = {
  pendiente: 'pendiente',
  realizada: 'completada',
  vencida: 'vencida',
};

const STATUS_CLASS: Record<DerivedActivityStatus, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  realizada: 'bg-green-100 text-green-700',
  vencida: 'bg-red-100 text-red-700',
};

function NoteEditor({
  id,
  initial,
  onNoteChange,
}: {
  id: string;
  initial: string;
  onNoteChange: (id: string, nota: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const savedRef = useRef(initial);
  const hasChanges = value !== savedRef.current;

  useEffect(() => {
    if (initial !== savedRef.current) {
      setValue(initial);
      savedRef.current = initial;
    }
  }, [initial]);

  const save = () => {
    if (value !== savedRef.current) {
      savedRef.current = value;
      onNoteChange(id, value);
    }
  };

  return (
    <div className="relative">
      <textarea
        rows={2}
        value={value}
        onChange={e => setValue(e.target.value)}
        className="w-full text-sm text-text leading-relaxed bg-transparent outline-none resize-none placeholder:text-text-muted/50 focus:outline-none pr-20"
        placeholder="Agrega notas sobre esta actividad..."
      />
      {hasChanges && (
        <button
          onMouseDown={e => e.preventDefault()}
          onClick={save}
          className="absolute bottom-0 right-0 text-[11px] font-bold bg-primary text-white px-2.5 py-1 rounded-lg hover:bg-primary/90 transition-colors"
        >
          Guardar
        </button>
      )}
    </div>
  );
}

export default function Timeline({ items, onComplete, onNoteChange, onDelete }: TimelineProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-muted opacity-60">
        <MessageSquare className="w-12 h-12 mb-3" />
        <p className="text-sm font-medium">Sin interacciones registradas</p>
      </div>
    );
  }

  const sortedItems = [...items].sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

  return (
    <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-secondary before:opacity-50">
      {sortedItems.map((item, index) => {
        const Icon = icons[item.tipo] || MessageSquare;
        const status = item.estado
          ? getActivityStatus({
              id: item.id,
              tipo: item.tipo,
              estado: item.estado,
              nota: item.nota,
              responsable: item.responsable,
              fecha: item.fecha,
            })
          : null;

        const isCompleted = status === 'realizada';

        return (
          <div key={item.id} className="relative flex items-start group animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
            <div className="absolute left-0 flex items-center justify-center w-10 h-10 rounded-full bg-surface border-2 border-secondary group-hover:border-primary transition-colors z-10">
              <Icon className="w-4 h-4 text-primary" />
            </div>

            <div className="flex-1 ml-14 pt-1">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">
                    {item.tipo}
                  </span>
                  {status && (
                    <span className={cn('px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider', STATUS_CLASS[status])}>
                      {STATUS_LABEL[status]}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {onComplete && status && !isCompleted && (
                    <button
                      onClick={() => onComplete(item.id)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Marcar como completada
                    </button>
                  )}
                  <span className="text-xs font-medium text-text-muted">
                    {new Date(item.fecha).toLocaleDateString('es-PE', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {onDelete && !isCompleted && (
                    <button
                      onClick={() => onDelete(item.id)}
                      className="p-1 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Eliminar actividad"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {item.nombre && (
                <p className="text-sm font-bold text-text mb-1.5">{item.nombre}</p>
              )}

              <div className={cn(
                'bg-app-bg/40 p-4 rounded-2xl border group-hover:border-secondary group-hover:bg-surface transition-all duration-300',
                isCompleted ? 'border-border-subtle' : 'border-primary/20',
              )}>
                {!isCompleted && onNoteChange ? (
                  <NoteEditor id={item.id} initial={item.nota} onNoteChange={onNoteChange} />
                ) : (
                  <p className="text-sm text-text leading-relaxed">
                    {item.nota || <span className="text-text-muted/50 italic">Sin notas</span>}
                  </p>
                )}
                <div className="mt-3 pt-3 border-t border-border-subtle flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                    <User className="w-3 h-3 text-primary" />
                  </div>
                  <span className="text-xs font-bold text-text-muted">
                    {item.responsable}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
