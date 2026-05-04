'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';
import type { Lead } from '@/src/types/crm';
import { cn } from '@/src/lib/utils';

interface CloseLeadDialogProps {
  isOpen: boolean;
  lead: Lead | null;
  /** Estado destino al que se está moviendo (cerrado_ganado / cerrado_perdido). */
  targetEstado: 'cerrado_ganado' | 'cerrado_perdido' | null;
  onConfirm: (fechaCierre: Date) => void;
  onCancel: () => void;
}

const META = {
  cerrado_ganado: {
    label: 'Cerrado ganado',
    description: 'El cliente aceptó la propuesta. Se registrará la fecha de cierre.',
    accent: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    icon: CheckCircle2,
  },
  cerrado_perdido: {
    label: 'Cerrado perdido',
    description: 'El lead no prosperó. Se registrará la fecha de cierre.',
    accent: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-100',
    icon: XCircle,
  },
} as const;

export default function CloseLeadDialog({
  isOpen,
  lead,
  targetEstado,
  onConfirm,
  onCancel,
}: CloseLeadDialogProps) {
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (isOpen) setFecha(new Date().toISOString().slice(0, 10));
  }, [isOpen]);

  if (!isOpen || !lead || !targetEstado) return null;

  const meta = META[targetEstado];
  const Icon = meta.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />

      <div className="relative w-full max-w-md bg-surface rounded-2xl shadow-premium border border-border-subtle overflow-hidden">
        <div className={cn('p-5 flex items-start gap-3 border-b', meta.bg, meta.border)}>
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center bg-surface',
              meta.accent,
            )}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className={cn('text-base font-black', meta.accent)}>
              ¿Confirmar cierre como {meta.label}?
            </h3>
            <p className="text-xs text-text-muted mt-0.5">{meta.description}</p>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-surface text-text-muted hover:text-text"
            aria-label="Cancelar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
              Lead
            </p>
            <p className="text-sm font-bold text-text">
              {lead.id} · {lead.servicioInteres ?? '—'}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Fecha de cierre
            </label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
            />
            <p className="text-[10px] text-text-muted">
              Por defecto se usa la fecha de hoy. Puedes cambiarla si la negociación cerró antes.
            </p>
          </div>
        </div>

        <div className="p-5 bg-app-bg/30 border-t border-border-subtle flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(new Date(fecha))}
            className={cn(
              'flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-all',
              targetEstado === 'cerrado_ganado'
                ? 'bg-primary text-white hover:brightness-110'
                : 'bg-red-500 text-white hover:bg-red-600',
            )}
          >
            Confirmar cierre
          </button>
        </div>
      </div>
    </div>
  );
}
