'use client';

import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import {
  Kanban, Bell, FileText, TrendingUp, AlertTriangle, Clock,
  Building2, User, ChevronRight,
} from 'lucide-react';
import { mockLeads, mockOrganizations, mockContacts, mockQuotes } from '@/src/lib/mockData';
import { getAlertLevel } from '@/src/lib/alertLevel';
import Timeline from '@/src/components/ui/Timeline';
import LeadPanel from '@/src/components/pipeline/LeadPanel';
import type { Lead } from '@/src/types/crm';
import { cn } from '@/src/lib/utils';

const COLUMNAS = [
  { id: 'en_prospecto',     label: 'En prospecto',     color: '#6B7280' },
  { id: 'ofertado',         label: 'Ofertado',         color: '#F59E0B' },
  { id: 'cierre_con_venta', label: 'Cierre con venta', color: '#10B981' },
  { id: 'cierre_sin_venta', label: 'Cierre sin venta', color: '#EF4444' },
] as const;

const thisMonth = new Date().getMonth();
const thisYear  = new Date().getFullYear();

function MetricCard({
  label, value, icon: Icon, color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: 'blue' | 'red' | 'green' | 'amber';
}) {
  const colorMap = {
    blue:  'bg-blue-50  text-blue-600  border-blue-100',
    red:   'bg-red-50   text-red-500   border-red-100',
    green: 'bg-primary/10 text-primary border-primary/10',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
  };
  return (
    <div className="bg-surface rounded-2xl p-5 border border-border-subtle shadow-subtle flex items-center gap-4">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center border', colorMap[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-black text-text">{value}</p>
        <p className="text-xs font-semibold text-text-muted">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leads, setLeads] = useState(mockLeads);

  const metrics = useMemo(() => {
    const active     = leads.filter(l => !['cierre_con_venta', 'cierre_sin_venta'].includes(l.estado));
    const withAlert  = leads.filter(l => getAlertLevel(l.fechaProximaActividad) !== 'none');
    const ganados    = leads.filter(l => l.estado === 'cierre_con_venta').length;
    const perdidos   = leads.filter(l => l.estado === 'cierre_sin_venta').length;
    const tasaCierre = ganados + perdidos > 0
      ? Math.round((ganados / (ganados + perdidos)) * 100)
      : 0;
    const cotsMes    = mockQuotes.filter(q => {
      const d = new Date(q.fechaCotizacion);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;
    return { active: active.length, withAlert: withAlert.length, cotsMes, tasaCierre };
  }, [leads]);

  const pipelineData = useMemo(() =>
    COLUMNAS.map(col => ({
      name: col.label,
      cantidad: leads.filter(l => l.estado === col.id).length,
      color: col.color,
    })), [leads]);

  const alertLeads = useMemo(() =>
    leads
      .filter(l => getAlertLevel(l.fechaProximaActividad) !== 'none')
      .sort((a, b) =>
        (a.fechaProximaActividad?.getTime() ?? 0) - (b.fechaProximaActividad?.getTime() ?? 0)
      )
      .slice(0, 8),
    [leads]
  );

  // Last 10 activities across all leads, newest first
  const recentActivities = useMemo(() => {
    const all = leads.flatMap(l => l.actividades.map(a => ({
      ...a,
      fecha: a.fecha instanceof Date ? a.fecha : new Date(a.fecha),
    })));
    return all.sort((a, b) => b.fecha.getTime() - a.fecha.getTime()).slice(0, 10);
  }, [leads]);

  const panelOrg     = selectedLead ? mockOrganizations.find(o => o.id === selectedLead.organizacionId) : null;
  const panelContact = selectedLead ? mockContacts.find(c => c.id === selectedLead.contactoId) : null;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-text">Dashboard</h1>
        <p className="text-sm text-text-muted">Resumen ejecutivo — Bioactiva CRM</p>
      </div>

      {/* ── Metric cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Leads activos"     value={metrics.active}       icon={Kanban}      color="blue"  />
        <MetricCard label="Con alerta hoy"    value={metrics.withAlert}    icon={Bell}        color="red"   />
        <MetricCard label="Cotizaciones mes"  value={metrics.cotsMes}      icon={FileText}    color="green" />
        <MetricCard label="Tasa de cierre"    value={`${metrics.tasaCierre}%`} icon={TrendingUp} color="amber" />
      </div>

      {/* ── Pipeline chart + Alert list ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Bar chart */}
        <div className="lg:col-span-3 bg-surface rounded-2xl border border-border-subtle shadow-subtle p-6">
          <h2 className="text-sm font-bold text-text uppercase tracking-wider mb-6">Leads por etapa</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={pipelineData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9dbfa8' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9dbfa8' }} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #edfce8', borderRadius: 12, fontSize: 12 }}
              />
              <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
                {pipelineData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Alert list */}
        <div className="lg:col-span-2 bg-surface rounded-2xl border border-border-subtle shadow-subtle p-6">
          <h2 className="text-sm font-bold text-text uppercase tracking-wider mb-4">Alertas activas</h2>
          {alertLeads.length === 0 ? (
            <p className="text-xs text-text-muted italic">Sin alertas activas</p>
          ) : (
            <div className="space-y-3">
              {alertLeads.map(lead => {
                const level = getAlertLevel(lead.fechaProximaActividad);
                const org = mockOrganizations.find(o => o.id === lead.organizacionId);
                return (
                  <button
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-app-bg transition-colors text-left group"
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                      level === 'danger' ? 'bg-red-50' : 'bg-amber-50'
                    )}>
                      {level === 'danger'
                        ? <AlertTriangle className="w-4 h-4 text-red-500" />
                        : <Clock className="w-4 h-4 text-amber-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-text truncate">{org?.nombre ?? lead.organizacionId}</p>
                      <p className="text-[10px] text-text-muted truncate">{lead.proximaActividad}</p>
                      <p className={cn(
                        'text-[10px] font-bold',
                        level === 'danger' ? 'text-red-500' : 'text-amber-500'
                      )}>
                        {lead.fechaProximaActividad
                          ? new Date(lead.fechaProximaActividad).toLocaleDateString('es-PE')
                          : ''}
                      </p>
                    </div>
                    <ChevronRight className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Recent activity ── */}
      <div className="bg-surface rounded-2xl border border-border-subtle shadow-subtle p-6">
        <h2 className="text-sm font-bold text-text uppercase tracking-wider mb-6">Actividad reciente</h2>
        {recentActivities.length === 0 ? (
          <p className="text-xs text-text-muted italic">Sin actividades registradas</p>
        ) : (
          <Timeline items={recentActivities} />
        )}
      </div>

      {/* Lead panel */}
      <LeadPanel
        lead={selectedLead}
        orgNombre={panelOrg?.nombre ?? ''}
        contactoNombre={panelContact ? `${panelContact.nombres} ${panelContact.apellidos}` : '—'}
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        onLeadUpdate={updated => {
          setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
          setSelectedLead(updated);
        }}
      />
    </div>
  );
}