'use client';

import { useState, useMemo } from 'react';
import { useAuthStore } from '@/src/store/authStore';
import { useLeadStore } from '@/src/store/leadStore';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend,
} from 'recharts';
import {
  Kanban, Bell, FileText, TrendingUp, AlertTriangle, Clock,
  ChevronRight, DollarSign, Trophy, Building2,
} from 'lucide-react';
import { getAlertLevel } from '@/src/lib/alertLevel';
import Timeline from '@/src/components/ui/Timeline';
import LeadPanel from '@/src/components/pipeline/LeadPanel';
import type { Lead, Organization, Contact, Quote } from '@/src/types/crm';
import { ESTADOS_LEAD, MESES_ES } from '@/src/lib/constants';
import { cn, formatCurrency } from '@/src/lib/utils';

interface DashboardClientProps {
  initialLeads: Lead[];
  organizations: Organization[];
  contacts: Contact[];
  quotes: Quote[];
}

const COLUMNAS = ESTADOS_LEAD;
const thisMonth = new Date().getMonth();
const thisYear  = new Date().getFullYear();

const SECTOR_COLORS = [
  '#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
  '#06B6D4', '#A855F7', '#EAB308', '#22C55E',
];

function MetricCard({
  label, value, sublabel, icon: Icon, color,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: React.ElementType;
  color: 'blue' | 'red' | 'green' | 'amber' | 'purple';
}) {
  const colorMap = {
    blue:   'bg-blue-50  text-blue-600  border-blue-100',
    red:    'bg-red-50   text-red-500   border-red-100',
    green:  'bg-primary/10 text-primary border-primary/10',
    amber:  'bg-amber-50 text-amber-600 border-amber-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
  };
  return (
    <div className="bg-surface rounded-2xl p-5 border border-border-subtle shadow-subtle flex items-center gap-4">
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center border', colorMap[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-black text-text truncate" title={String(value)}>
          {value}
        </p>
        <p className="text-xs font-semibold text-text-muted">{label}</p>
        {sublabel && (
          <p className="text-[10px] text-text-muted mt-0.5">{sublabel}</p>
        )}
      </div>
    </div>
  );
}

export default function DashboardClient({
  organizations,
  contacts,
  quotes,
}: Omit<DashboardClientProps, 'initialLeads'>) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const userEmail = useAuthStore((s) => s.userEmail);
  const role      = useAuthStore((s) => s.role);
  const allLeads  = useLeadStore((s) => s.leads);

  const leads = useMemo(
    () => role === 'Trabajador' ? allLeads.filter((l) => l.encargadoEmail === userEmail) : allLeads,
    [role, userEmail, allLeads],
  );

  const myLeadIds = useMemo(() => new Set(leads.map((l) => l.id)), [leads]);

  // Cotizaciones filtradas al trabajador (pertenecen a leads)
  const filteredQuotes = useMemo(
    () => role === 'Trabajador' ? quotes.filter((q) => myLeadIds.has(q.leadId)) : quotes,
    [role, quotes, myLeadIds],
  );

  // En el dashboard solo se muestran orgs/contactos ligados a los leads del trabajador
  // (las páginas /contacts y /organizations sí muestran todo)
  const filteredOrganizations = useMemo(() => {
    if (role !== 'Trabajador') return organizations;
    return organizations.filter((o) => leads.some((l) => l.organizacionId === o.id));
  }, [role, organizations, leads]);

  const filteredContacts = useMemo(() => {
    if (role !== 'Trabajador') return contacts;
    return contacts.filter((c) => leads.some((l) => l.contactoId === c.id));
  }, [role, contacts, leads]);

  // ─── KPIs financieros y del pipeline ──────────────────────────────
  const metrics = useMemo(() => {
    const activeStates: Lead['estado'][] = ['nuevo', 'en_proceso'];
    const activeLeads = leads.filter((l) => activeStates.includes(l.estado));
    const withAlert   = leads.filter((l) => getAlertLevel(l.fechaProximaActividad) !== 'none');
    const ganados     = leads.filter((l) => l.estado === 'cerrado_ganado');
    const perdidos    = leads.filter((l) => l.estado === 'cerrado_perdido');

    // Mapas auxiliares para vincular cotizaciones a leads
    const activeLeadIds = new Set(activeLeads.map((l) => l.id));
    const ganadosLeadIds = new Set(ganados.map((l) => l.id));

    // Pipeline value: Σ cotizaciones de leads activos (independiente del estado de la cotización)
    const pipelineValue = filteredQuotes
      .filter((q) => activeLeadIds.has(q.leadId))
      .reduce((sum, q) => sum + q.monto, 0);

    // Σ cotizaciones ganadas (cerrado_ganado + estado aceptada)
    const ganadoTotal = filteredQuotes
      .filter((q) => ganadosLeadIds.has(q.leadId) && q.estado === 'aceptada')
      .reduce((sum, q) => sum + q.monto, 0);

    // Tasa de cierre
    const tasaCierre = ganados.length + perdidos.length > 0
      ? Math.round((ganados.length / (ganados.length + perdidos.length)) * 100)
      : 0;

    // Cotizaciones del mes actual
    const cotsMes = filteredQuotes.filter((q) => {
      const d = new Date(q.fechaCotizacion);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    // Ticket promedio de cotizaciones aceptadas
    const aceptadas = filteredQuotes.filter((q) => q.estado === 'aceptada');
    const ticketPromedio = aceptadas.length > 0
      ? aceptadas.reduce((sum, q) => sum + q.monto, 0) / aceptadas.length
      : 0;

    return {
      active:        activeLeads.length,
      withAlert:     withAlert.length,
      cotsMes,
      tasaCierre,
      pipelineValue,
      ganadoTotal,
      ticketPromedio,
      ganados:       ganados.length,
      perdidos:      perdidos.length,
    };
  }, [leads, filteredQuotes]);

  // ─── Distribución por estado (kanban) ─────────────────────────────
  const pipelineData = useMemo(
    () =>
      COLUMNAS.map((col) => ({
        name:     col.label,
        cantidad: leads.filter((l) => l.estado === col.id).length,
        color:    col.color,
      })),
    [leads],
  );

  // ─── Cotizaciones por mes (todos los años) ────────────────────────
  const cotizacionesPorMes = useMemo(() => {
    const buckets: Record<string, { mes: string; cantidad: number; monto: number }> = {};
    for (const q of filteredQuotes) {
      const d = new Date(q.fechaCotizacion);
      const mesIdx = d.getMonth();
      const key = MESES_ES[mesIdx];
      if (!buckets[key]) buckets[key] = { mes: key.slice(0, 3), cantidad: 0, monto: 0 };
      buckets[key].cantidad += 1;
      buckets[key].monto += q.monto;
    }
    // ordenar por orden de mes natural
    return MESES_ES.map((m) => buckets[m] ?? { mes: m.slice(0, 3), cantidad: 0, monto: 0 });
  }, [filteredQuotes]);

  // ─── Top 5 organizaciones por monto cerrado ───────────────────────
  const topOrgsPorMonto = useMemo(() => {
    const orgIdToLeadIds = new Map<string, Set<string>>();
    for (const l of leads) {
      if (!orgIdToLeadIds.has(l.organizacionId)) orgIdToLeadIds.set(l.organizacionId, new Set());
      orgIdToLeadIds.get(l.organizacionId)!.add(l.id);
    }

    const result = filteredOrganizations
      .map((org) => {
        const leadIds = orgIdToLeadIds.get(org.id) ?? new Set();
        const monto = filteredQuotes
          .filter((q) => leadIds.has(q.leadId) && q.estado === 'aceptada')
          .reduce((sum, q) => sum + q.monto, 0);
        return { org, monto };
      })
      .filter((r) => r.monto > 0)
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 5);

    return result;
  }, [filteredOrganizations, leads, filteredQuotes]);

  // ─── Distribución por sector ──────────────────────────────────────
  const distribucionSectores = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of filteredOrganizations) {
      const sector = o.sector ?? 'Sin sector';
      counts[sector] = (counts[sector] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([sector, count], i) => ({
        name:  sector,
        value: count,
        color: SECTOR_COLORS[i % SECTOR_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredOrganizations]);

  // ─── Alertas activas ──────────────────────────────────────────────
  const alertLeads = useMemo(
    () =>
      leads
        .filter((l) => getAlertLevel(l.fechaProximaActividad) !== 'none')
        .sort(
          (a, b) =>
            (a.fechaProximaActividad ? new Date(a.fechaProximaActividad).getTime() : 0) -
            (b.fechaProximaActividad ? new Date(b.fechaProximaActividad).getTime() : 0),
        )
        .slice(0, 8),
    [leads],
  );

  // ─── Actividad reciente ───────────────────────────────────────────
  const recentActivities = useMemo(() => {
    const all = leads.flatMap((l) =>
      l.actividades.map((a) => ({
        ...a,
        estado: a.estado,
        fecha:  a.fecha instanceof Date ? a.fecha : new Date(a.fecha),
      })),
    );
    return all.sort((a, b) => b.fecha.getTime() - a.fecha.getTime()).slice(0, 10);
  }, [leads]);

  const panelOrg     = selectedLead ? filteredOrganizations.find((o) => o.id === selectedLead.organizacionId) : null;
  const panelContact = selectedLead ? filteredContacts.find((c) => c.id === selectedLead.contactoId) : null;

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-text">Dashboard</h1>
        <p className="text-sm text-text-muted">Resumen ejecutivo — BioActiva CRM</p>
      </div>

      {/* ── Top metrics ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Pipeline Value"
          value={formatCurrency(metrics.pipelineValue, 'PEN')}
          sublabel="Σ cotizaciones de leads activos"
          icon={DollarSign}
          color="blue"
        />
        <MetricCard
          label="Ganado total"
          value={formatCurrency(metrics.ganadoTotal, 'PEN')}
          sublabel={`${metrics.ganados} cierre${metrics.ganados === 1 ? '' : 's'} con venta`}
          icon={Trophy}
          color="green"
        />
        <MetricCard
          label="Tasa de cierre"
          value={`${metrics.tasaCierre}%`}
          sublabel={`${metrics.ganados} ganados / ${metrics.perdidos} perdidos`}
          icon={TrendingUp}
          color="amber"
        />
        <MetricCard
          label="Ticket promedio"
          value={formatCurrency(metrics.ticketPromedio, 'PEN')}
          sublabel="cotización aceptada"
          icon={FileText}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Leads activos"
          value={metrics.active}
          icon={Kanban}
          color="blue"
        />
        <MetricCard
          label="Con alerta"
          value={metrics.withAlert}
          sublabel="actividades vencidas o próximas"
          icon={Bell}
          color="red"
        />
        <MetricCard
          label="Cotizaciones del mes"
          value={metrics.cotsMes}
          sublabel={MESES_ES[thisMonth] + ' ' + thisYear}
          icon={FileText}
          color="green"
        />
        <MetricCard
          label="Organizaciones"
          value={filteredOrganizations.length}
          sublabel={`${filteredContacts.length} contactos`}
          icon={Building2}
          color="amber"
        />
      </div>

      {/* ── Kanban distribution + Alerts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-surface rounded-2xl border border-border-subtle shadow-subtle p-6">
          <h2 className="text-sm font-bold text-text uppercase tracking-wider mb-6">Leads por etapa</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pipelineData} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9dbfa8' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#9dbfa8' }} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #edfce8', borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
                {pipelineData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 bg-surface rounded-2xl border border-border-subtle shadow-subtle p-6">
          <h2 className="text-sm font-bold text-text uppercase tracking-wider mb-4">Alertas activas</h2>
          {alertLeads.length === 0 ? (
            <p className="text-xs text-text-muted italic">Sin alertas activas</p>
          ) : (
            <div className="space-y-3">
              {alertLeads.map((lead) => {
                const level = getAlertLevel(lead.fechaProximaActividad);
                const org = organizations.find((o) => o.id === lead.organizacionId);
                return (
                  <button
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-app-bg transition-colors text-left group"
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                        level === 'danger' ? 'bg-red-50' : 'bg-amber-50',
                      )}
                    >
                      {level === 'danger' ? (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-text truncate">
                        {org?.nombre ?? lead.organizacionId}
                      </p>
                      <p className="text-[10px] text-text-muted truncate">{lead.proximaActividad}</p>
                      <p
                        className={cn(
                          'text-[10px] font-bold',
                          level === 'danger' ? 'text-red-500' : 'text-amber-500',
                        )}
                      >
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

      {/* ── Cotizaciones por mes + Top orgs ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 bg-surface rounded-2xl border border-border-subtle shadow-subtle p-6">
          <h2 className="text-sm font-bold text-text uppercase tracking-wider mb-6">
            Cotizaciones por mes
            <span className="ml-2 text-[10px] text-text-muted font-medium normal-case">
              (todos los años · Σ monto)
            </span>
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cotizacionesPorMes} margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#9dbfa8' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9dbfa8' }} tickFormatter={(v) => `S/. ${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value), 'PEN')}
                contentStyle={{ background: '#fff', border: '1px solid #edfce8', borderRadius: 12, fontSize: 12 }}
              />
              <Bar dataKey="monto" name="monto" fill="#10B981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 bg-surface rounded-2xl border border-border-subtle shadow-subtle p-6">
          <h2 className="text-sm font-bold text-text uppercase tracking-wider mb-4">Top 5 organizaciones</h2>
          {topOrgsPorMonto.length === 0 ? (
            <p className="text-xs text-text-muted italic">Aún no hay cotizaciones aceptadas.</p>
          ) : (
            <div className="space-y-2">
              {topOrgsPorMonto.map((row, idx) => (
                <div
                  key={row.org.id}
                  className="flex items-center gap-3 p-3 bg-app-bg/30 rounded-xl"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-black flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-text truncate">{row.org.nombre}</p>
                    <p className="text-[10px] text-text-muted truncate">{row.org.sector ?? '—'}</p>
                  </div>
                  <p className="text-xs font-black text-primary shrink-0">
                    {formatCurrency(row.monto, 'PEN')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Distribución por sector + Recent activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 bg-surface rounded-2xl border border-border-subtle shadow-subtle p-6">
          <h2 className="text-sm font-bold text-text uppercase tracking-wider mb-4">Distribución por sector</h2>
          {distribucionSectores.length === 0 ? (
            <p className="text-xs text-text-muted italic">Sin datos de sector.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={distribucionSectores}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ name, value }) => `${name} (${value})`}
                  labelLine={false}
                  fontSize={9}
                >
                  {distribucionSectores.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #edfce8', borderRadius: 12, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="lg:col-span-3 bg-surface rounded-2xl border border-border-subtle shadow-subtle p-6">
          <h2 className="text-sm font-bold text-text uppercase tracking-wider mb-6">Actividad reciente</h2>
          {recentActivities.length === 0 ? (
            <p className="text-xs text-text-muted italic">Sin actividades registradas</p>
          ) : (
            <Timeline items={recentActivities} />
          )}
        </div>
      </div>

      {/* Lead panel */}
      <LeadPanel
        lead={selectedLead}
        orgNombre={panelOrg?.nombre ?? ''}
        contactoNombre={
          panelContact ? `${panelContact.nombres} ${panelContact.apellidos}` : '—'
        }
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        onEdit={() => setSelectedLead(null)}
      />
    </div>
  );
}
