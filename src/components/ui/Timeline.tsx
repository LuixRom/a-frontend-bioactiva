'use client';

import { cn } from '@/src/lib/utils';
import { getActivityStatus, type DerivedActivityStatus } from '@/src/lib/activityStatus';
import { Calendar, User, MessageSquare, Phone, Mail } from 'lucide-react';

interface TimelineItem {
  id: string;
  fecha: Date;
  tipo: 'reunion' | 'llamada' | 'email' | 'otro';
  nota: string;
  responsable: string;
  estado?: 'pendiente' | 'realizada';
}

interface TimelineProps {
  items: TimelineItem[];
}

const icons = {
  reunion: Calendar,
  llamada: Phone,
  email: Mail,
  otro: MessageSquare,
};

export default function Timeline({ items }: TimelineProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-muted opacity-60">
        <MessageSquare className="w-12 h-12 mb-3" />
        <p className="text-sm font-medium">Sin interacciones registradas</p>
      </div>
    );
  }

  // Sort items by date descending
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
              fechaInicio: item.fecha,
            })
          : null;
        const statusMeta: Record<DerivedActivityStatus, string> = {
          pendiente: 'bg-amber-100 text-amber-700',
          realizada: 'bg-green-100 text-green-700',
          vencida: 'bg-red-100 text-red-700',
        };
        
        return (
          <div key={item.id} className="relative flex items-start group animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
            <div className="absolute left-0 flex items-center justify-center w-10 h-10 rounded-full bg-surface border-2 border-secondary group-hover:border-primary transition-colors z-10">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            
            <div className="flex-1 ml-14 pt-1">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">
                    {item.tipo}
                  </span>
                  {status && (
                    <span className={cn('px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider', statusMeta[status])}>
                      {status}
                    </span>
                  )}
                </div>
                <span className="text-xs font-medium text-text-muted">
                  {new Date(item.fecha).toLocaleDateString('es-PE', { 
                    day: 'numeric', 
                    month: 'short', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
              
              <div className="bg-app-bg/40 p-4 rounded-2xl border border-border-subtle group-hover:border-secondary group-hover:bg-surface transition-all duration-300">
                <p className="text-sm text-text leading-relaxed">
                  {item.nota}
                </p>
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
