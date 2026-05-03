'use client';

import { useState } from 'react';
import { Plus, Download, ExternalLink, TrendingUp, CheckCircle2, Clock, ArrowUpRight } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '@/src/lib/utils';
import { mockQuotes, mockLeads, mockOrganizations, mockContacts } from '@/src/lib/mockData';
import type { Quote } from '@/src/types/crm';
import DataTable from '@/src/components/ui/DataTable';
import Drawer from '@/src/components/ui/Drawer';
type QuoteEstado = Quote['estado'];

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

const initialForm = {
  leadId:        '',
  ruc:           '',
  dirigidoA:     '',
  cliente:       '',
  producto:      '',
  servicio:      '',
  monto:         '',
  moneda:        'PEN' as 'PEN' | 'USD',
  estado:        'enviada' as QuoteEstado,
  remitente:     '',
  observacion:   '',
  linkPropuesta: '',
  fechaCotizacion: new Date().toISOString().slice(0, 10),
};

export default function QuotesPage() {
  const [quotesList, setQuotesList] = useState<Quote[]>(mockQuotes);
  const [statusFilter, setStatusFilter] = useState<QuoteEstado | 'todos'>('todos');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(initialForm);

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
      key: 'dirigidoA',
      header: 'Dirigido a',
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
      render: (item: Quote) => (
        <div className="flex gap-2">
          <button className="p-1.5 rounded-lg hover:bg-app-bg text-text-muted hover:text-primary transition-colors">
            <Download className="w-4 h-4" />
          </button>
          {item.linkPropuesta && (
            <a
              href={item.linkPropuesta}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg hover:bg-app-bg text-text-muted hover:text-primary transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      ),
    },
  ];

  const handleCreate = () => {
    const fecha = new Date(form.fechaCotizacion);
    const newQuote: Quote = {
      id:              `COT-${fecha.getFullYear()}-${String(quotesList.length + 1).padStart(3, '0')}`,
      leadId:          form.leadId.trim(),
      anio:            fecha.getFullYear(),
      mes:             MESES[fecha.getMonth()],
      dirigidoA:       form.dirigidoA.trim(),
      fechaCotizacion: fecha,
      cliente:         form.cliente.trim(),
      producto:        form.producto.trim() || undefined,
      servicio:        form.servicio.trim(),
      monto:           Number(form.monto) || 0,
      moneda:          form.moneda,
      estado:          form.estado,
      remitente:       form.remitente.trim(),
      observacion:     form.observacion.trim() || undefined,
      linkPropuesta:   form.linkPropuesta.trim() || undefined,
      creadoEn:        new Date(),
    };

    setQuotesList([newQuote, ...quotesList]);
    setShowCreate(false);
    setForm(initialForm);
  };

  const handleLeadSelect = (leadId: string) => {
    const lead = mockLeads.find(l => l.id === leadId);
    if (!lead) { setForm({ ...form, leadId: '' }); return; }
    const org     = mockOrganizations.find(o => o.id === lead.organizacionId);
    const contact = mockContacts.find(c => c.id === lead.contactoId);
    const nombre  = contact ? `${contact.vocativo ? contact.vocativo + ' ' : ''}${contact.nombres} ${contact.apellidos}` : '';
    setForm({
      ...form,
      leadId,
      ruc:       org?.ruc ?? '',
      cliente:   org?.nombreCompleto ?? org?.nombre ?? '',
      dirigidoA: nombre,
      servicio:  lead.servicioInteres ?? '',
    });
  };


  const canSave = form.dirigidoA.trim() && form.cliente.trim() && form.servicio.trim() && form.remitente.trim();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-text">Registro de Cotizaciones</h1>
          <p className="text-sm text-text-muted">Seguimiento detallado de propuestas comerciales enviadas.</p>
        </div>
        <div className="flex gap-3">
          <button className="btn-secondary">
            <Download className="w-4 h-4" /> Exportar Reporte
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" /> Nueva Cotización
          </button>
        </div>
      </div>

      {/* Form drawer */}
      <Drawer isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nueva Cotización">
        <div className="space-y-4">
          {/* Autocompletar desde lead existente */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Autocompletar desde lead</label>
            <select
              value={form.leadId}
              onChange={(e) => handleLeadSelect(e.target.value)}
              className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
            >
              <option value="">Seleccionar lead...</option>
              {mockLeads.map(l => {
                const org = mockOrganizations.find(o => o.id === l.organizacionId);
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
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Dirigido a <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.dirigidoA}
                onChange={(e) => setForm({ ...form, dirigidoA: e.target.value })}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                placeholder="Nombre completo del destinatario"
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
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Moneda</label>
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
            <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancelar</button>
            <button onClick={handleCreate} disabled={!canSave} className="btn-primary flex-1 disabled:opacity-50">
              Guardar cotización
            </button>
          </div>
        </div>
      </Drawer>

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
    </div>
  );
}
