'use client';

import Link from 'next/link';
import { CheckCircle2, AlertTriangle, Plug } from 'lucide-react';
import { useMsGraph } from '@/src/hooks/useMsGraph';
import { cn } from '@/src/lib/utils';

/**
 * Badge compacto para el TopBar que muestra el estado de la conexión
 * Microsoft. Click → /profile (donde el usuario puede conectar / reconectar).
 */
export default function MicrosoftStatusBadge() {
  const { status } = useMsGraph();

  const config = {
    connected: {
      icon: CheckCircle2,
      label: 'Microsoft',
      title: 'Microsoft 365 conectado — Teams y Outlook listos',
      classes: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
      dotClass: 'bg-green-500',
    },
    expired: {
      icon: AlertTriangle,
      label: 'Reconectar',
      title: 'La sesión de Microsoft expiró. Click para reconectar.',
      classes: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
      dotClass: 'bg-amber-500',
    },
    disconnected: {
      icon: Plug,
      label: 'Conectar MS',
      title: 'Conecta tu cuenta de Microsoft para Teams y Outlook',
      classes: 'bg-app-bg text-text-muted border-border-subtle hover:bg-secondary',
      dotClass: 'bg-text-muted/50',
    },
  } as const;

  const { icon: Icon, label, title, classes, dotClass } = config[status];

  return (
    <Link
      href="/profile"
      title={title}
      className={cn(
        'flex items-center gap-1.5 h-9 px-3 rounded-xl border text-xs font-bold transition-all',
        classes,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', dotClass)} />
      <Icon className="w-3.5 h-3.5" />
      <span className="hidden md:inline">{label}</span>
    </Link>
  );
}
