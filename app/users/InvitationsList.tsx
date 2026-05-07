'use client';

import { Mail, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatDate, cn } from '@/src/lib/utils';
import type { UserInvitationPublic } from '@/src/server/actions/invitations';

interface InvitationsListProps {
  invitations: UserInvitationPublic[];
}

const STATUS_META: Record<UserInvitationPublic['status'], { icon: any, color: string, bg: string }> = {
  Enviada:  { icon: Mail,         color: '#2563eb', bg: 'bg-blue-50' },
  Expirada: { icon: Clock,        color: '#dc2626', bg: 'bg-red-50' },
  Activada: { icon: CheckCircle2, color: '#1C7E3C', bg: 'bg-green-50' },
};

export default function InvitationsList({ invitations }: InvitationsListProps) {
  if (invitations.length === 0) {
    return (
      <div className="text-center py-12 bg-surface rounded-2xl border border-border-subtle">
        <Mail className="w-12 h-12 text-text-muted mx-auto mb-3 opacity-20" />
        <p className="text-text-muted text-sm font-medium">No hay invitaciones pendientes</p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl border border-border-subtle overflow-hidden shadow-subtle animate-fade-in">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-app-bg/50 border-b border-border-subtle">
            <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">Correo Invitado</th>
            <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">Rol Asignado</th>
            <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">Fecha Envío</th>
            <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">Estado</th>
            <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest text-right">Vence</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {invitations.map((inv) => {
            const meta = STATUS_META[inv.status];
            const StatusIcon = meta.icon;

            return (
              <tr key={inv.id} className="hover:bg-app-bg/30 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", meta.bg)}>
                      <StatusIcon className="w-4 h-4" style={{ color: meta.color }} />
                    </div>
                    <span className="text-sm font-bold text-text">{inv.email}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded-lg bg-app-bg text-[10px] font-black text-text-muted uppercase tracking-wider border border-border-subtle">
                    {inv.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-text-muted">
                    {formatDate(inv.createdAt)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    <span 
                      className="w-1.5 h-1.5 rounded-full" 
                      style={{ backgroundColor: meta.color }} 
                    />
                    <span className="text-xs font-bold" style={{ color: meta.color }}>
                      {inv.status}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={cn(
                    "text-[10px] font-bold",
                    inv.status === 'Expirada' ? "text-red-500" : "text-text-muted"
                  )}>
                    {formatDate(inv.expiresAt)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
