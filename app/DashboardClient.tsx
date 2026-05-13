'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  Building2,
  CalendarDays,
  CalendarRange,
  Clock,
  DollarSign,
  Eye,
  FileText,
  Kanban,
  Percent,
  RefreshCcw,
  Target,
  Timer,
  TrendingUp,
  X,
} from 'lucide-react';

import type { Contact, Lead, Organization, Quote } from '@/src/types/crm';
import { ESTADOS_LEAD } from '@/src/lib/constants';
import { cn, formatCurrency } from '@/src/lib/utils';

interface DashboardClientProps {
  initialLeads: Lead[];
  organizations: Organization[];
  contacts: Contact[];
  quotes: Quote[];
}

type MetricTone = 'green' | 'blue' | 'amber' | 'red' | 'purple' | 'slate';
type DetailModalType = 'pipeline' | 'inactive' | null;
type PeriodPreset = 'year' | 'q1' | 'q2' | 'q3' | 'q4' | 'custom';

const today = new Date();

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfYearNumber(year: number) {
  return new Date(year, 0, 1);
}

function endOfYearNumber(year: number) {
  return new Date(year, 11, 31, 23, 59, 59, 999);
}

function startOfQuarter(year: number, quarter: 1 | 2 | 3 | 4) {
  const startMonth = (quarter - 1) * 3;
  return new Date(year, startMonth, 1);
}

function endOfQuarter(year: number, quarter: 1 | 2 | 3 | 4) {
  const endMonth = quarter * 3;
  return new Date(year, endMonth, 0, 23, 59, 59, 999);
}

function endOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}

function daysBetween(start?: Date, end?: Date) {
  if (!start || !end) return null;

  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();

  if (Number.isNaN(startTime) || Number.isNaN(endTime)) return null;

  const diff = Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24));
  return diff >= 0 ? diff : null;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function isWithinRange(date: Date | undefined, start: Date, end: Date) {
  if (!date) return false;

  const time = new Date(date).getTime();
  return time >= start.getTime() && time <= end.getTime();
}

function formatDate(date?: Date) {
  if (!date) return '—';

  return new Date(date).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getLeadOrganization(lead: Lead, organizations: Organization[]) {
  return organizations.find((organization) => organization.id === lead.organizacionId);
}

function getLastLeadMovementDate(lead: Lead) {
  const activityDates = lead.actividades
    .map((activity) => activity.fechaCompletada ?? activity.fechaFin ?? activity.fecha)
    .filter(Boolean)
    .map((date) => new Date(date).getTime())
    .filter((time) => !Number.isNaN(time));

  if (!activityDates.length) return lead.creadoEn;

  return new Date(Math.max(...activityDates));
}

function getYearRange(leads: Lead[] = [], quotes: Quote[] = []) {
  const dates = [
    ...(leads?.map((lead) => lead.creadoEn) || []),
    ...(leads?.map((lead) => lead.fechaCierre).filter(Boolean) || []),
    ...(quotes?.map((quote) => quote.fechaCotizacion) || []),
    today,
  ].filter(Boolean) as Date[];

  if (dates.length === 0) return [today.getFullYear()];

  const years = dates.map((date) => new Date(date).getFullYear());
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);

  const range = [];

  for (let year = maxYear; year >= minYear; year -= 1) {
    range.push(year);
  }

  return range;
}

function getFirstQuoteForLead(leadId: string, quotes: Quote[]) {
  return quotes
    .filter((quote) => quote.leadId === leadId)
    .sort(
      (a, b) =>
        new Date(a.fechaCotizacion).getTime() -
        new Date(b.fechaCotizacion).getTime(),
    )[0];
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = 'green',
  onDetail,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ElementType;
  tone?: MetricTone;
  onDetail?: () => void;
}) {
  const toneMap: Record<MetricTone, string> = {
    green: 'bg-primary/10 text-primary border-primary/15',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
  };

  return (
    <div className="group h-full rounded-3xl border border-border-subtle bg-surface p-5 text-left shadow-subtle transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="min-h-[2rem] text-xs font-black uppercase tracking-[0.18em] text-text-muted">
              {title}
            </p>

            <p
              className="mt-3 whitespace-nowrap text-[clamp(1.25rem,1.7vw,1.85rem)] font-black leading-tight text-text"
              title={String(value)}
            >
              {value}
            </p>

            {subtitle && (
              <p className="mt-2 text-xs font-semibold leading-5 text-text-muted">
                {subtitle}
              </p>
            )}
          </div>

          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-transform duration-200 group-hover:scale-105',
              toneMap[tone],
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>

        {onDetail && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onDetail}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.12em] text-primary transition hover:bg-primary hover:text-white"
            >
              <Eye className="h-3.5 w-3.5" />
              Ver detalle
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'h-full rounded-3xl border border-border-subtle bg-surface p-6 shadow-subtle',
        className,
      )}
    >
      <div className="mb-5">
        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-text">
          {title}
        </h2>

        {subtitle && (
          <p className="mt-1 text-sm leading-5 text-text-muted">
            {subtitle}
          </p>
        )}
      </div>

      {children}
    </section>
  );
}

function DetailModal({
  type,
  onClose,
  pipelineDetails,
  inactiveLeadDetails,
}: {
  type: DetailModalType;
  onClose: () => void;
  pipelineDetails: Array<{
    quote: Quote;
    lead?: Lead;
    organization?: Organization;
  }>;
  inactiveLeadDetails: Array<{
    lead: Lead;
    organization?: Organization;
    lastMovement: Date;
    inactiveDays: number;
  }>;
}) {
  if (!type) return null;

  const isPipeline = type === 'pipeline';

  return (
    <div className="fixed inset-0 z-[9999] flex min-h-dvh items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="max-h-[86vh] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/40 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border-subtle bg-gradient-to-r from-primary/10 via-white to-app-bg p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
              Detalle de métrica
            </p>

            <h3 className="mt-2 text-2xl font-black text-text">
              {isPipeline ? 'Monto total en pipeline' : 'Leads con más de 30 días sin avance'}
            </h3>

            <p className="mt-1 text-sm text-text-muted">
              {isPipeline
                ? 'Cotizaciones con estado Enviada consideradas dentro del monto en pipeline.'
                : 'Leads abiertos cuyo último movimiento supera los 30 días.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-border-subtle bg-white p-2 text-text-muted transition hover:bg-app-bg hover:text-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[62vh] overflow-y-auto p-6">
          {isPipeline ? (
            pipelineDetails.length === 0 ? (
              <div className="rounded-3xl bg-app-bg/60 p-8 text-center text-sm font-semibold text-text-muted">
                No existen cotizaciones enviadas en el periodo seleccionado.
              </div>
            ) : (
              <div className="space-y-3">
                {pipelineDetails.map(({ quote, lead, organization }) => (
                  <div
                    key={quote.id}
                    className="rounded-3xl border border-border-subtle bg-app-bg/40 p-4"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="mb-2 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <p className="text-sm font-black text-text">
                            {quote.id}
                          </p>
                        </div>

                        <p className="text-sm font-bold text-text">
                          {quote.servicio}
                        </p>

                        <p className="mt-1 text-xs font-semibold text-text-muted">
                          Lead: {lead?.id ?? quote.leadId} · Organización:{' '}
                          {organization?.nombre ?? quote.cliente}
                        </p>

                        <p className="mt-1 text-xs text-text-muted">
                          Fecha cotización: {formatDate(quote.fechaCotizacion)}
                        </p>
                      </div>

                      <div className="shrink-0 rounded-2xl border border-primary/10 bg-white px-4 py-3 text-right">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-text-muted">
                          Monto
                        </p>

                        <p className="mt-1 whitespace-nowrap text-xl font-black text-primary">
                          {formatCurrency(quote.monto, quote.moneda)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : inactiveLeadDetails.length === 0 ? (
            <div className="rounded-3xl bg-app-bg/60 p-8 text-center text-sm font-semibold text-text-muted">
              No existen leads abiertos con más de 30 días sin avance.
            </div>
          ) : (
            <div className="space-y-3">
              {inactiveLeadDetails.map(({ lead, organization, lastMovement, inactiveDays }) => (
                <div
                  key={lead.id}
                  className="rounded-3xl border border-border-subtle bg-app-bg/40 p-4"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-red-600" />
                        <p className="text-sm font-black text-text">
                          {lead.id}
                        </p>
                      </div>

                      <p className="text-sm font-bold text-text">
                        {organization?.nombre ?? lead.organizacionId}
                      </p>

                      <p className="mt-1 text-xs font-semibold text-text-muted">
                        Servicio: {lead.servicioInteres ?? '—'} · Estado: {lead.estado}
                      </p>

                      <p className="mt-1 text-xs text-text-muted">
                        Último movimiento: {formatDate(lastMovement)}
                      </p>
                    </div>

                    <div className="shrink-0 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-right">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">
                        Sin avance
                      </p>

                      <p className="mt-1 whitespace-nowrap text-xl font-black text-red-700">
                        {inactiveDays} días
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardClient({
  initialLeads,
  organizations,
  contacts,
  quotes,
}: DashboardClientProps) {
  const years = useMemo(() => getYearRange(initialLeads, quotes), [initialLeads, quotes]);

  const [analysisYear, setAnalysisYear] = useState(today.getFullYear());
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('year');
  const [startDate, setStartDate] = useState(
    toDateInputValue(startOfYearNumber(today.getFullYear())),
  );
  const [endDate, setEndDate] = useState(
    toDateInputValue(endOfYearNumber(today.getFullYear())),
  );
  const [detailModal, setDetailModal] = useState<DetailModalType>(null);

  useEffect(() => {
    if (!detailModal) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [detailModal]);

  const openDetailModal = (type: DetailModalType) => {
    window.requestAnimationFrame(() => {
      window.scrollBy({ top: 1, behavior: 'smooth' });
    });

    setDetailModal(type);
  };

  const applyPreset = (preset: PeriodPreset, year = analysisYear) => {
    setPeriodPreset(preset);

    if (preset === 'year') {
      setStartDate(toDateInputValue(startOfYearNumber(year)));
      setEndDate(toDateInputValue(endOfYearNumber(year)));
    }

    if (preset === 'q1') {
      setStartDate(toDateInputValue(startOfQuarter(year, 1)));
      setEndDate(toDateInputValue(endOfQuarter(year, 1)));
    }

    if (preset === 'q2') {
      setStartDate(toDateInputValue(startOfQuarter(year, 2)));
      setEndDate(toDateInputValue(endOfQuarter(year, 2)));
    }

    if (preset === 'q3') {
      setStartDate(toDateInputValue(startOfQuarter(year, 3)));
      setEndDate(toDateInputValue(endOfQuarter(year, 3)));
    }

    if (preset === 'q4') {
      setStartDate(toDateInputValue(startOfQuarter(year, 4)));
      setEndDate(toDateInputValue(endOfQuarter(year, 4)));
    }
  };

  const handleYearChange = (year: number) => {
    setAnalysisYear(year);
    applyPreset(periodPreset === 'custom' ? 'year' : periodPreset, year);
  };

  const range = useMemo(() => {
    const start = new Date(`${startDate}T00:00:00`);
    const end = endOfDay(new Date(`${endDate}T00:00:00`));

    return {
      start,
      end,
      isValid: start.getTime() <= end.getTime(),
    };
  }, [startDate, endDate]);

  const filteredLeads = useMemo(() => {
    if (!range.isValid) return [];

    return (initialLeads ?? []).filter((lead) =>
      isWithinRange(lead.creadoEn, range.start, range.end),
    );
  }, [initialLeads, range]);

  const filteredQuotes = useMemo(() => {
    if (!range.isValid) return [];

    return (quotes ?? []).filter((quote) =>
      isWithinRange(quote.fechaCotizacion, range.start, range.end),
    );
  }, [quotes, range]);

  const sentQuotes = useMemo(
    () => filteredQuotes.filter((quote) => quote.estado === 'enviada'),
    [filteredQuotes],
  );

  const acceptedQuotes = useMemo(
    () => filteredQuotes.filter((quote) => quote.estado === 'aceptada'),
    [filteredQuotes],
  );

  const pipelineDetails = useMemo(() => {
    return sentQuotes.map((quote) => {
      const lead = (initialLeads ?? []).find((item) => item.id === quote.leadId);
      const organization = lead ? getLeadOrganization(lead, organizations ?? []) : undefined;

      return {
        quote,
        lead,
        organization,
      };
    });
  }, [sentQuotes, initialLeads, organizations]);

  const inactiveLeadDetails = useMemo(() => {
    const openLeads = (initialLeads ?? []).filter(
      (lead) => !['cerrado_ganado', 'cerrado_perdido'].includes(lead.estado),
    );

    return openLeads
      .map((lead) => {
        const lastMovement = getLastLeadMovementDate(lead);
        const inactiveDays = daysBetween(lastMovement, today) ?? 0;

        return {
          lead,
          organization: getLeadOrganization(lead, organizations ?? []),
          lastMovement,
          inactiveDays,
        };
      })
      .filter((item) => item.inactiveDays > 30)
      .sort((a, b) => b.inactiveDays - a.inactiveDays);
  }, [initialLeads, organizations]);

  const metrics = useMemo(() => {
    const leadsGenerated = filteredLeads.length;

    const proposalQuotes = filteredQuotes.filter((quote) =>
      ['pendiente', 'enviada', 'aceptada', 'rechazada'].includes(quote.estado),
    );

    const proposalToWonRate =
      proposalQuotes.length > 0
        ? Math.round((acceptedQuotes.length / proposalQuotes.length) * 100)
        : 0;

    const closedLeads = (initialLeads ?? []).filter(
      (lead) =>
        ['cerrado_ganado', 'cerrado_perdido'].includes(lead.estado) &&
        isWithinRange(lead.fechaCierre, range.start, range.end),
    );

    const closingDays = closedLeads
      .map((lead) => daysBetween(lead.creadoEn, lead.fechaCierre))
      .filter((value): value is number => value !== null);

    const avgClosingTime = Math.round(average(closingDays));

    const proposalStageDays = (initialLeads ?? [])
      .filter((lead) => lead.estado !== 'nuevo')
      .map((lead) => {
        const firstQuote = getFirstQuoteForLead(lead.id, quotes ?? []);

        if (!firstQuote) return null;

        return daysBetween(lead.creadoEn, firstQuote.fechaCotizacion);
      })
      .filter((value): value is number => value !== null);

    const avgProposalStageTime = Math.round(average(proposalStageDays));

    const followUpActions = filteredLeads.flatMap((lead) => lead.actividades);
    const avgFollowUps = leadsGenerated > 0 ? followUpActions.length / leadsGenerated : 0;

    const pipelineAmount = sentQuotes.reduce((sum, quote) => sum + quote.monto, 0);
    const closedRevenue = acceptedQuotes.reduce((sum, quote) => sum + quote.monto, 0);

    const openLeads = (initialLeads ?? []).filter(
      (lead) => !['cerrado_ganado', 'cerrado_perdido'].includes(lead.estado),
    );

    const inactiveRate =
      openLeads.length > 0
        ? Math.round((inactiveLeadDetails.length / openLeads.length) * 100)
        : 0;

    return {
      leadsGenerated,
      proposalToWonRate,
      avgClosingTime,
      avgProposalStageTime,
      avgFollowUps,
      pipelineAmount,
      closedRevenue,
      inactiveRate,
      acceptedQuotes: acceptedQuotes.length,
      proposalQuotes: proposalQuotes.length,
      sentQuotes: sentQuotes.length,
      inactiveLeads: inactiveLeadDetails.length,
      openLeads: openLeads.length,
    };
  }, [
    filteredLeads,
    filteredQuotes,
    initialLeads,
    quotes,
    range,
    sentQuotes,
    acceptedQuotes,
    inactiveLeadDetails,
  ]);

  const leadsByStage = useMemo(() => {
    return ESTADOS_LEAD.map((state) => ({
      name: state.label,
      cantidad: (initialLeads ?? []).filter((lead) => lead.estado === state.id).length,
      color: state.color,
    }));
  }, [initialLeads]);

  const quotesByStatus = useMemo(() => {
    const data = [
      {
        name: 'Pendiente',
        value: filteredQuotes.filter((quote) => quote.estado === 'pendiente').length,
        color: '#6B7280',
      },
      {
        name: 'Enviada',
        value: filteredQuotes.filter((quote) => quote.estado === 'enviada').length,
        color: '#3B82F6',
      },
      {
        name: 'Aceptada',
        value: filteredQuotes.filter((quote) => quote.estado === 'aceptada').length,
        color: '#10B981',
      },
      {
        name: 'Rechazada',
        value: filteredQuotes.filter((quote) => quote.estado === 'rechazada').length,
        color: '#EF4444',
      },
    ];

    return data.filter((item) => item.value > 0);
  }, [filteredQuotes]);

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        <div className="rounded-[2rem] border border-primary/10 bg-gradient-to-br from-primary/10 via-white to-app-bg p-6 shadow-subtle">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Kanban className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                    BioActiva CRM
                  </p>
                  <h1 className="text-xl font-black text-text">
                    Dashboard comercial
                  </h1>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-3 py-1.5 text-xs font-semibold text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Activo ·{' '}
                {today.toLocaleDateString('es-PE', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            </div>

            <div className="w-full rounded-[1.5rem] border border-border-subtle bg-white/95 p-5">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <CalendarRange className="h-4 w-4 text-primary" />
                  <p className="text-sm font-black uppercase tracking-[0.14em] text-text">
                    Periodo de análisis
                  </p>
                </div>

                <label className="flex items-center gap-2 rounded-xl border border-border-subtle bg-app-bg/50 px-3 py-2">
                  <span className="text-xs font-bold text-text-muted">Año</span>

                  <select
                    value={analysisYear}
                    onChange={(event) => handleYearChange(Number(event.target.value))}
                    className="rounded-lg border border-border-subtle bg-white px-2 py-1 text-sm font-black text-text outline-none focus:border-primary"
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
                {([
                  {
                    preset: 'year',
                    main: 'Año completo',
                    sub: String(analysisYear),
                  },
                  {
                    preset: 'q1',
                    main: '1er trimestre',
                    sub: 'Enero – Marzo',
                  },
                  {
                    preset: 'q2',
                    main: '2do trimestre',
                    sub: 'Abril – Junio',
                  },
                  {
                    preset: 'q3',
                    main: '3er trimestre',
                    sub: 'Julio – Setiembre',
                  },
                  {
                    preset: 'q4',
                    main: '4to trimestre',
                    sub: 'Octubre – Diciembre',
                  },
                ] as Array<{ preset: PeriodPreset; main: string; sub: string }>).map((item) => (
                  <button
                    key={item.preset}
                    type="button"
                    onClick={() => applyPreset(item.preset)}
                    className={cn(
                      'rounded-2xl border px-4 py-3 text-left transition',
                      periodPreset === item.preset
                        ? 'border-primary bg-primary text-white'
                        : 'border-border-subtle bg-app-bg/50 text-text hover:border-primary/30 hover:bg-primary/5',
                    )}
                  >
                    <p className="text-xs font-black uppercase tracking-[0.12em]">
                      {item.main}
                    </p>
                    <p className="mt-0.5 text-sm opacity-75">
                      {item.sub}
                    </p>
                  </button>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 rounded-2xl border border-border-subtle bg-app-bg/40 p-3 md:grid-cols-[1fr_1fr_auto]">
                <label className="space-y-1">
                  <span className="text-[11px] font-bold text-text-muted">
                    Fecha inicio
                  </span>

                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => {
                      setPeriodPreset('custom');
                      setStartDate(event.target.value);
                    }}
                    className="h-11 w-full rounded-2xl border border-border-subtle bg-white px-3 text-sm font-semibold text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-[11px] font-bold text-text-muted">
                    Fecha fin
                  </span>

                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => {
                      setPeriodPreset('custom');
                      setEndDate(event.target.value);
                    }}
                    className="h-11 w-full rounded-2xl border border-border-subtle bg-white px-3 text-sm font-semibold text-text outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => applyPreset('year')}
                  className="mt-auto inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-5 text-sm font-black text-primary transition hover:bg-primary hover:text-white"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Reiniciar
                </button>
              </div>

              {!range.isValid && (
                <p className="mt-3 rounded-2xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                  El rango de fechas no es válido.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 2xl:grid-cols-4">
          <MetricCard
            title="Leads generados"
            value={metrics.leadsGenerated}
            subtitle="Registrados en el periodo"
            icon={Target}
            tone="green"
          />

          <MetricCard
            title="Propuesta → venta"
            value={`${metrics.proposalToWonRate}%`}
            subtitle={`${metrics.acceptedQuotes} aceptadas de ${metrics.proposalQuotes} propuestas`}
            icon={Percent}
            tone="blue"
          />

          <MetricCard
            title="Tiempo promedio de cierre"
            value={`${metrics.avgClosingTime} días`}
            subtitle="Desde registro hasta cierre"
            icon={Timer}
            tone="amber"
          />

          <MetricCard
            title="Tiempo en etapa propuesta"
            value={`${metrics.avgProposalStageTime} días`}
            subtitle="Desde lead hasta pasar a ofertado"
            icon={Clock}
            tone="purple"
          />

          <MetricCard
            title="Seguimientos por lead"
            value={metrics.avgFollowUps.toFixed(1)}
            subtitle="Promedio de actividades registradas"
            icon={Activity}
            tone="slate"
          />

          <MetricCard
            title="Monto en pipeline"
            value={formatCurrency(metrics.pipelineAmount, 'PEN')}
            subtitle={`${metrics.sentQuotes} cotizaciones enviadas`}
            icon={DollarSign}
            tone="green"
            onDetail={() => openDetailModal('pipeline')}
          />

          <MetricCard
            title="Ingresos cerrados"
            value={formatCurrency(metrics.closedRevenue, 'PEN')}
            subtitle={`${metrics.acceptedQuotes} cotizaciones aceptadas`}
            icon={TrendingUp}
            tone="blue"
          />

          <MetricCard
            title="Leads sin avance"
            value={`${metrics.inactiveRate}%`}
            subtitle={`${metrics.inactiveLeads} de ${metrics.openLeads} leads abiertos`}
            icon={CalendarDays}
            tone={metrics.inactiveRate > 0 ? 'red' : 'green'}
            onDetail={() => openDetailModal('inactive')}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="xl:col-span-3">
            <SectionCard
              title="Pipeline por etapa"
              subtitle="Cantidad de leads por estado comercial."
            >
              <ResponsiveContainer width="100%" height={310}>
                <BarChart
                  data={leadsByStage}
                  margin={{ top: 8, right: 12, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#edfce8" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#73957e' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#73957e' }} />
                  <Tooltip
                    cursor={{ fill: '#F2FBEF' }}
                    contentStyle={{
                      background: '#fff',
                      border: '1px solid #edfce8',
                      borderRadius: 16,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="cantidad" radius={[10, 10, 0, 0]} barSize={52}>
                    {leadsByStage.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          </div>

          <div className="xl:col-span-2">
            <SectionCard
              title="Estado de cotizaciones"
              subtitle="Distribución de propuestas del periodo."
            >
              {quotesByStatus.length === 0 ? (
                <div className="flex h-[310px] items-center justify-center rounded-3xl bg-app-bg/50 text-sm font-semibold text-text-muted">
                  Sin cotizaciones en el periodo seleccionado.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={310}>
                  <PieChart>
                    <Pie
                      data={quotesByStatus}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={105}
                      paddingAngle={4}
                      label={({ name, value }) => `${name}: ${value}`}
                      fontSize={11}
                    >
                      {quotesByStatus.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: '#fff',
                        border: '1px solid #edfce8',
                        borderRadius: 16,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </SectionCard>
          </div>
        </div>
      </div>

      <DetailModal
        type={detailModal}
        onClose={() => setDetailModal(null)}
        pipelineDetails={pipelineDetails}
        inactiveLeadDetails={inactiveLeadDetails}
      />
    </>
  );
}