'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, ExternalLink, TrendingUp, CheckCircle2, Clock, ArrowUpRight,
  Printer, Mail, ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatDate, cn } from '@/src/lib/utils';
import type { Quote, Lead, Organization, Contact } from '@/src/types/crm';
import DataTable from '@/src/components/ui/DataTable';
import Drawer from '@/src/components/ui/Drawer';
import { createQuote } from '@/src/server/actions/quotes';
import { useToast } from '@/src/components/ui/Toast';
import { useAuthStore } from '@/src/store/authStore';
import { useLeadStore } from '@/src/store/leadStore';
type QuoteEstado = Quote['estado'];

interface QuotesClientProps {
  initialQuotes: Quote[];
  leads: Lead[];
  organizations: Organization[];
  contacts: Contact[];
}

const STATUS_META: Record<QuoteEstado, { label: string; color: string; bg: string }> = {
  enviada:   { label: 'Enviada',   color: '#2563eb', bg: 'bg-blue-50' },
  aceptada:  { label: 'Aceptada', color: '#1C7E3C', bg: 'bg-secondary/30' },
  rechazada: { label: 'Rechazada', color: '#dc2626', bg: 'bg-red-50' },
  pendiente: { label: 'Pendiente', color: '#6b7280', bg: 'bg-gray-50' },
};

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Setiembre','Octubre','Noviembre','Diciembre',
];

type QuoteFormState = {
  leadId: string;
  ruc: string;
  contacto: string; // Renombrado de dirigidoA
  cliente: string;
  producto: string;
  servicio: string;
  monto: string;
  moneda: 'PEN' | 'USD';
  estado: QuoteEstado;
  remitente: string;
  observacion: string;
  linkPropuesta: string;
  fechaCotizacion: string;
};

const buildInitialQuoteForm = (defaults: { remitente?: string } = {}): QuoteFormState => ({
  leadId:        '',
  ruc:           '',
  contacto:      '',
  cliente:       '',
  producto:      '',
  servicio:      '',
  monto:         '',
  moneda:        'PEN',
  estado:        'enviada',
  remitente:     defaults.remitente ?? '',
  observacion:   '',
  linkPropuesta: '',
  fechaCotizacion: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })(),
});

export default function QuotesClient({
  initialQuotes,
  leads,
  organizations,
  contacts,
}: QuotesClientProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { showToast } = useToast();
  const userName   = useAuthStore((s) => s.userName);
  const userEmail  = useAuthStore((s) => s.userEmail);
  const role       = useAuthStore((s) => s.role);
  const storeLeads = useLeadStore((s) => s.leads);
  const remitenteDefault = userName ?? 'Karien Díaz';

  const initialFormWithDefaults = useMemo(
    () => buildInitialQuoteForm({ remitente: remitenteDefault }),
    [remitenteDefault],
  );

  const [quotesList, setQuotesList] = useState<Quote[]>(() => {
    if (role === 'Trabajador') {
      const myLeadIds = new Set(
        storeLeads.filter((l) => l.encargadoEmail === userEmail).map((l) => l.id),
      );
      return initialQuotes.filter((q) => myLeadIds.has(q.leadId));
    }
    return initialQuotes;
  });
  const [statusFilter, setStatusFilter] = useState<QuoteEstado | 'todos'>('todos');
  const [view, setView] = useState<'list' | 'new'>('list');
  const [form, setForm] = useState<QuoteFormState>(initialFormWithDefaults);

  const filtered = quotesList.filter(
    (q) => statusFilter === 'todos' || q.estado === statusFilter
  );

  const totalActivo    = quotesList.reduce((sum, q) => sum + q.monto, 0);
  const aceptadas      = quotesList.filter(q => q.estado === 'aceptada').length;
  const enviadas       = quotesList.filter(q => q.estado === 'enviada').length;
  const conversion     = quotesList.length > 0 ? Math.round((aceptadas / quotesList.length) * 100) : 0;

  const kpis = [
    { label: 'Total Activo',  value: formatCurrency(totalActivo, 'PEN'), icon: TrendingUp,   color: 'text-primary' },
    { label: 'Aceptadas',     value: String(aceptadas),                  icon: CheckCircle2, color: 'text-primary' },
    { label: 'Enviadas',      value: String(enviadas),                   icon: Clock,        color: 'text-blue-600' },
    { label: 'Conversión',    value: `${conversion}%`,                   icon: ArrowUpRight, color: 'text-primary' },
  ];

  const columns = [
    {
      key: 'id',
      header: '# Cotización',
      sticky: 'left' as const,
      render: (item: Quote) => (
        <span className="font-mono font-black text-primary text-xs">{item.id}</span>
      ),
    },
    {
      key: 'leadId',
      header: 'ID Lead',
      render: (item: Quote) => (
        <span className="font-mono text-xs text-text-muted">{item.leadId}</span>
      ),
    },
    {
      key: 'periodo',
      header: 'Período',
      render: (item: Quote) => (
        <span className="text-xs text-text-muted">{item.mes} {item.anio}</span>
      ),
    },
    {
      key: 'contacto',
      header: 'Contacto',
      render: (item: Quote) => (
        <div className="flex flex-col">
          <span className="font-bold text-text truncate max-w-40">{item.dirigidoA}</span>
          <span className="text-[10px] text-text-muted">{item.cliente}</span>
        </div>
      ),
    },
    {
      key: 'servicio',
      header: 'Nombre del servicio',
      render: (item: Quote) => (
        <span className="text-xs text-text truncate max-w-52 block">{item.servicio}</span>
      ),
    },
    {
      key: 'monto',
      header: 'Monto',
      render: (item: Quote) => (
        <span className="font-bold text-text">{formatCurrency(item.monto, item.moneda)}</span>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      render: (item: Quote) => {
        const meta = STATUS_META[item.estado];
        return (
          <span
            className={cn('px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider', meta.bg)}
            style={{ color: meta.color }}
          >
            {meta.label}
          </span>
        );
      },
    },
    {
      key: 'remitente',
      header: 'Remitente',
      render: (item: Quote) => (
        <span className="text-xs text-text-muted">{item.remitente}</span>
      ),
    },
    {
      key: 'fechaCotizacion',
      header: 'Fecha',
      render: (item: Quote) => (
        <span className="text-text-muted text-xs">{formatDate(item.fechaCotizacion)}</span>
      ),
    },
    {
      key: 'actions',
      header: 'Acciones',
      sticky: 'right' as const,
      render: (item: Quote) => {
        const lead    = leads.find((l) => l.id === item.leadId);
        const contact = lead ? contacts.find((c) => c.id === lead.contactoId) : null;
        const email   = contact?.correo1 ?? '';
        const subject = encodeURIComponent(`Cotización ${item.id} — BioActiva`);
        const body = encodeURIComponent(
          `Estimado(a) ${item.dirigidoA},\n\n` +
          `Adjuntamos la cotización ${item.id} correspondiente al servicio:\n` +
          `${item.servicio}\n\n` +
          `Monto: ${formatCurrency(item.monto, item.moneda)}\n` +
          (item.linkPropuesta ? `\nPropuesta extendida: ${item.linkPropuesta}\n` : '') +
          `\nQuedamos atentos a sus comentarios.\n\n` +
          `Cordialmente,\n${item.remitente}\nBioActiva`,
        );
        const mailto = email
          ? `mailto:${email}?subject=${subject}&body=${body}`
          : `mailto:?subject=${subject}&body=${body}`;

        return (
          <div className="flex gap-1">
            <Link
              href={`/quotes/${item.id}/print`}
              title="Imprimir / PDF"
              className="p-1.5 rounded-lg hover:bg-app-bg text-text-muted hover:text-primary transition-colors"
            >
              <Printer className="w-4 h-4" />
            </Link>
            <a
              href={mailto}
              title={email ? `Enviar a ${email}` : 'Enviar al cliente'}
              className="p-1.5 rounded-lg hover:bg-app-bg text-text-muted hover:text-primary transition-colors"
            >
              <Mail className="w-4 h-4" />
            </a>
            {item.linkPropuesta && (
              <a
                href={item.linkPropuesta}
                target="_blank"
                rel="noreferrer"
                title="Abrir propuesta extendida"
                className="p-1.5 rounded-lg hover:bg-app-bg text-text-muted hover:text-primary transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        );
      },
    },
  ];

  const handleCreate = () => {
    if (!form.leadId.trim()) {
      showToast('Seleccionar un lead para asociar la cotización', 'error');
      return;
    }
    const fecha = new Date(form.fechaCotizacion);

    startTransition(async () => {
      try {
        const created = await createQuote({
          leadCodigo:      form.leadId.trim(),
          anio:            fecha.getFullYear(),
          mes:             MESES[fecha.getMonth()],
          dirigidoA:       form.contacto.trim(), // Se mapea contacto -> dirigidoA
          fechaCotizacion: fecha,
          cliente:         form.cliente.trim(),
          producto:        form.producto.trim() || null,
          servicio:        form.servicio.trim(),
          monto:           Number(form.monto) || 0,
          moneda:          form.moneda,
          estado:          form.estado,
          remitente:       form.remitente.trim(),
          observacion:     form.observacion.trim() || null,
          linkPropuesta:   form.linkPropuesta.trim() || null,
        });
        setQuotesList((prev) => [created, ...prev]);
        setView('list');
        setForm(buildInitialQuoteForm({ remitente: remitenteDefault }));
        showToast('Cotización creada', 'success');
        router.refresh();
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : 'Error al crear cotización',
          'error',
        );
      }
    });
  };

  const handleLeadSelect = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) { 
      setForm({ ...form, leadId: '', cliente: '', contacto: '', servicio: '' }); 
      return; 
    }
    const org     = organizations.find((o) => o.id === lead.organizacionId);
    const contact = contacts.find((c) => c.id === lead.contactoId);
    const nombre  = contact ? `${contact.vocativo ? contact.vocativo + ' ' : ''}${contact.nombres} ${contact.apellidos}` : '';
    setForm({
      ...form,
      leadId,
      ruc:       org?.ruc ?? '',
      cliente:   org?.nombreCompleto ?? org?.nombre ?? '',
      contacto:  nombre,
      servicio:  lead.servicioInteres ?? '',
    });
  };


  const canSave = Boolean(
    form.leadId && 
    form.cliente.trim() && 
    form.servicio.trim() && 
    form.moneda && 
    form.remitente.trim()
  );

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-app-bg p-1 rounded-xl border border-border-subtle w-fit">
          <button
            onClick={() => { setView('list'); setForm(buildInitialQuoteForm({ remitente: remitenteDefault })); }}
            className={cn('px-5 py-2 rounded-lg text-sm font-bold transition-all', view === 'list' ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text')}
          >
            Cotizaciones
          </button>
          <button
            onClick={() => setView('new')}
            className={cn('px-5 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5', view === 'new' ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text')}
          >
            <Plus className="w-3.5 h-3.5" /> Nueva Cotización
          </button>
        </div>
      </div>

      {view === 'new' && (
        <div className="max-w-2xl w-full mx-auto animate-fade-in">
          <div className="rounded-2xl border border-border-subtle bg-surface p-8 space-y-4">
          {/* Autocompletar desde lead existente */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Autocompletar desde lead</label>
            <select
              value={form.leadId}
              onChange={(e) => handleLeadSelect(e.target.value)}
              className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
            >
              <option value="">Seleccionar lead...</option>
              {leads.map((l) => {
                const org = organizations.find((o) => o.id === l.organizacionId);
                return (
                  <option key={l.id} value={l.id}>
                    {l.id} — {org?.nombre ?? '?'} · {l.servicioInteres ?? ''}
                  </option>
                );
              })}
            </select>
            <p className="text-xs text-text-muted">Seleccionar un lead completa automáticamente cliente, contacto y servicio.</p>
          </div>



          <hr className="border-border-subtle" />

          {/* Fecha — genera año/mes automático */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Fecha cotización</label>
            <input
              type="date"
              value={form.fechaCotizacion}
              onChange={(e) => setForm({ ...form, fechaCotizacion: e.target.value })}
              className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Contacto</label>
              <input
                type="text"
                value={form.contacto}
                onChange={(e) => setForm({ ...form, contacto: e.target.value })}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                placeholder="Nombre del contacto (opcional)"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Cliente <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.cliente}
                onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                placeholder="Razón social o empresa"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Producto</label>
              <input
                type="text"
                value={form.producto}
                onChange={(e) => setForm({ ...form, producto: e.target.value })}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                placeholder="Ej: Innovasuyu, Consultoría"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Remitente <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.remitente}
                onChange={(e) => setForm({ ...form, remitente: e.target.value })}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                placeholder="Ej: Karien Díaz"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Nombre del servicio <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={form.servicio}
              onChange={(e) => setForm({ ...form, servicio: e.target.value })}
              className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
              placeholder="Descripción del servicio ofertado"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Monto</label>
              <input
                type="number"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Moneda <span className="text-red-500">*</span></label>
              <select
                value={form.moneda}
                onChange={(e) => setForm({ ...form, moneda: e.target.value as 'PEN' | 'USD' })}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
              >
                <option value="PEN">PEN</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Estado</label>
              <select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value as QuoteEstado })}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
              >
                {(Object.keys(STATUS_META) as QuoteEstado[]).map((s) => (
                  <option key={s} value={s}>{STATUS_META[s].label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Observación</label>
            <textarea
              value={form.observacion}
              onChange={(e) => setForm({ ...form, observacion: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all resize-none"
              placeholder="Notas adicionales sobre la propuesta"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Link de propuesta</label>
            <input
              type="url"
              value={form.linkPropuesta}
              onChange={(e) => setForm({ ...form, linkPropuesta: e.target.value })}
              className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
              placeholder="https://drive.google.com/..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => { setView('list'); setForm(buildInitialQuoteForm({ remitente: remitenteDefault })); }} className="btn-secondary flex-1">
              <ArrowLeft className="w-4 h-4" /> Volver a Cotizaciones
            </button>
            <button onClick={handleCreate} disabled={!canSave} className="btn-primary flex-1 disabled:opacity-50">
              Guardar cotización
            </button>
          </div>
          </div>
        </div>
      )}

      {view === 'list' && (
      <>
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="card-premium p-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">{kpi.label}</span>
              <kpi.icon className={cn('w-4 h-4', kpi.color)} />
            </div>
            <p className={cn('text-2xl font-black', kpi.color)}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs + tabla */}
      <div className="space-y-4">
        <div className="flex gap-1 bg-app-bg p-1 rounded-xl w-fit border border-border-subtle">
          {(['todos', 'enviada', 'aceptada', 'rechazada', 'pendiente'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
                statusFilter === s ? 'bg-surface text-primary shadow-sm' : 'text-text-muted hover:text-text'
              )}
            >
              {s === 'todos' ? 'Todas' : STATUS_META[s].label}
            </button>
          ))}
        </div>

        <DataTable data={filtered} columns={columns} pageSize={8} />
      </div>
      </>
      )}
    </div>
  );
}
