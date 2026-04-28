'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Search, Plus, Bell, Building2, Users, Kanban,
  AlertTriangle, Clock, CalendarDays, X, ChevronRight,
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/src/store/authStore';
import { getInitials } from '@/src/lib/utils';
import { useGlobalSearch } from '@/src/hooks/useGlobalSearch';
import { mockLeads, mockOrganizations } from '@/src/lib/mockData';
import { getAlertLevel } from '@/src/lib/alertLevel';
import { cn } from '@/src/lib/utils';

export default function TopBar() {
  const { userName, userEmail } = useAuthStore();
  const router   = useRouter();
  const pathname = usePathname();
  const displayName = userName || userEmail || 'Usuario';
  const initials    = getInitials(displayName);

  const isDashboard = pathname === '/';
  const showSearch  = !isDashboard;

  // ── Global search ────────────────────────────────────────────────────────
  const [query, setQuery]   = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const results   = useGlobalSearch(query);
  const hasResults =
    results.organizations.length > 0 ||
    results.contacts.length > 0 ||
    results.leads.length > 0;

  // ── Notification bell ────────────────────────────────────────────────────
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const dismissOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // evitar navegar al pipeline al hacer clic en ✕
    setDismissed(prev => new Set(prev).add(id));
  };

  const dismissAll = () => {
    setDismissed(new Set(weekAlerts.map(l => l.id)));
  };

  // Leads with activity due this week (next 7 days + overdue)
  const weekAlerts = useMemo(() => {
    const now  = new Date();
    const end  = new Date(now);
    end.setDate(end.getDate() + 7);

    return mockLeads
      .filter(l => {
        if (!l.fechaProximaActividad) return false;
        const d = new Date(l.fechaProximaActividad);
        return d <= end; // overdue or within 7 days
      })
      .sort((a, b) => {
        const da = new Date(a.fechaProximaActividad!).getTime();
        const db = new Date(b.fechaProximaActividad!).getTime();
        return da - db;
      });
  }, []);

  // ── Click-outside handler for both dropdowns ─────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const go = (path: string) => {
    router.push(path);
    setSearchOpen(false);
    setBellOpen(false);
    setQuery('');
  };

  const dangerCount  = weekAlerts.filter(l => !dismissed.has(l.id) && getAlertLevel(l.fechaProximaActividad) === 'danger').length;
  const visibleAlerts = weekAlerts.filter(l => !dismissed.has(l.id));
  const totalAlerts   = visibleAlerts.length;

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-surface border-b border-border-subtle sticky top-0 z-20">

      {/* ── Left: Global Search (hidden on dashboard) ── */}
      {showSearch ? (
        <div className="flex-1 max-w-md relative group" ref={searchRef}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors z-10 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSearchOpen(true); }}
            onFocus={() => query.length >= 2 && setSearchOpen(true)}
            placeholder="Buscar por RUC, nombre o lead..."
            className="w-full pl-10 pr-4 py-2 bg-app-bg/50 border border-border-subtle rounded-xl text-sm outline-none focus:bg-surface focus:border-primary focus:ring-1 focus:ring-primary transition-all"
          />

          {searchOpen && hasResults && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-surface border border-border-subtle rounded-2xl shadow-premium z-50 overflow-hidden max-h-96 overflow-y-auto">

              {results.organizations.length > 0 && (
                <div>
                  <p className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase tracking-wider bg-app-bg/50 border-b border-border-subtle">
                    Organizaciones
                  </p>
                  {results.organizations.map(org => (
                    <button key={org.id} onClick={() => go('/organizations')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-app-bg text-left transition-colors">
                      <Building2 className="w-4 h-4 text-text-muted flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text truncate">{org.nombre}</p>
                        <p className="text-xs text-text-muted truncate">
                          {org.ruc || 'Sin RUC'}{org.sector ? ` · ${org.sector}` : ''}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.contacts.length > 0 && (
                <div className="border-t border-border-subtle">
                  <p className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase tracking-wider bg-app-bg/50 border-b border-border-subtle">
                    Contactos
                  </p>
                  {results.contacts.map(contact => (
                    <button key={contact.id} onClick={() => go('/contacts')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-app-bg text-left transition-colors">
                      <Users className="w-4 h-4 text-text-muted flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text truncate">{contact.nombres} {contact.apellidos}</p>
                        <p className="text-xs text-text-muted truncate">
                          {contact.correo1}{contact.cargo ? ` · ${contact.cargo}` : ''}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.leads.length > 0 && (
                <div className="border-t border-border-subtle">
                  <p className="px-4 py-2 text-[10px] font-bold text-text-muted uppercase tracking-wider bg-app-bg/50 border-b border-border-subtle">
                    Leads
                  </p>
                  {results.leads.map(lead => (
                    <button key={lead.id} onClick={() => go('/pipeline')}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-app-bg text-left transition-colors">
                      <Kanban className="w-4 h-4 text-text-muted flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text truncate">{lead.id}</p>
                        <p className="text-xs text-text-muted truncate">
                          {lead.servicioInteres}{lead.encargado ? ` · ${lead.encargado}` : ''}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Spacer so right section stays pushed right on dashboard */
        <div className="flex-1" />
      )}

      {/* ── Right: Actions & Profile ── */}
      <div className="flex items-center gap-3">

        {/* ── Bell / Notifications ── */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setBellOpen(prev => !prev)}
            className={cn(
              'relative w-10 h-10 rounded-xl flex items-center justify-center border transition-all',
              bellOpen
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-app-bg border-border-subtle text-primary hover:bg-secondary'
            )}
          >
            <Bell className="w-5 h-5" />
            {totalAlerts > 0 && (
              <span className={cn(
                'absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-[10px] font-black text-white flex items-center justify-center px-1',
                dangerCount > 0 ? 'bg-red-500' : 'bg-amber-400'
              )}>
                {totalAlerts}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {bellOpen && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-surface border border-border-subtle rounded-2xl shadow-premium z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-app-bg/50 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-text uppercase tracking-wider">Esta semana</span>
                </div>
                {totalAlerts > 0 && (
                  <span className="text-[10px] font-bold text-text-muted">
                    {totalAlerts} actividad{totalAlerts !== 1 ? 'es' : ''}
                  </span>
                )}
              </div>

              {/* Items */}
              <div className="max-h-72 overflow-y-auto divide-y divide-border-subtle">
                {visibleAlerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-text-muted">
                    <CalendarDays className="w-8 h-8 mb-2 opacity-30" />
                    <p className="text-xs font-medium">Sin actividades pendientes</p>
                  </div>
                ) : (
                  visibleAlerts.map(lead => {
                    const level = getAlertLevel(lead.fechaProximaActividad);
                    const org   = mockOrganizations.find(o => o.id === lead.organizacionId);
                    const fecha = lead.fechaProximaActividad
                      ? new Date(lead.fechaProximaActividad).toLocaleDateString('es-PE', {
                          weekday: 'short', day: 'numeric', month: 'short',
                        })
                      : '';

                    return (
                      <div key={lead.id} className="relative group">
                        <button
                          onClick={() => go('/pipeline')}
                          className="w-full flex items-start gap-3 px-4 py-3 hover:bg-app-bg text-left transition-colors pr-9"
                        >
                          {/* Alert icon */}
                          <div className={cn(
                            'mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0',
                            level === 'danger'  ? 'bg-red-50'   : 'bg-amber-50'
                          )}>
                            {level === 'danger'
                              ? <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                              : <Clock         className="w-3.5 h-3.5 text-amber-500" />}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-text truncate">{org?.nombre ?? lead.organizacionId}</p>
                            <p className="text-[10px] text-text-muted truncate mt-0.5">{lead.proximaActividad || 'Actividad pendiente'}</p>
                            <p className={cn(
                              'text-[10px] font-bold mt-1',
                              level === 'danger' ? 'text-red-500' : 'text-amber-500'
                            )}>
                              {level === 'danger' ? '⚠ Vencida · ' : ''}
                              {fecha}
                            </p>
                          </div>
                        </button>

                        {/* Botón descartar individual */}
                        <button
                          onClick={(e) => dismissOne(lead.id, e)}
                          title="Descartar notificación"
                          className="absolute top-2.5 right-2.5 w-5 h-5 rounded-md flex items-center justify-center text-text-muted hover:text-text hover:bg-app-bg opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              {visibleAlerts.length > 0 ? (
                <div className="px-4 py-3 border-t border-border-subtle bg-app-bg/30 flex items-center justify-between gap-2">
                  <button
                    onClick={dismissAll}
                    className="text-xs font-bold text-text-muted hover:text-text transition-colors"
                  >
                    Limpiar todas
                  </button>
                  <button
                    onClick={() => go('/pipeline')}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Ver pipeline →
                  </button>
                </div>
              ) : (
                <div className="px-4 py-3 border-t border-border-subtle bg-app-bg/30">
                  <button
                    onClick={() => go('/pipeline')}
                    className="text-xs font-bold text-primary hover:underline w-full text-center"
                  >
                    Ver pipeline completo →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── User profile ── */}
        <div className="flex items-center gap-2.5 pl-1 pr-1 py-1 rounded-xl border border-border-subtle bg-app-bg/30">
          <div className="flex flex-col items-end hidden lg:flex">
            <span className="text-sm font-bold text-text leading-tight">{displayName}</span>
            <span className="text-[10px] uppercase font-semibold text-text-muted tracking-wider">Bioactiva CRM</span>
          </div>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm text-white bg-primary shadow-sm">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
