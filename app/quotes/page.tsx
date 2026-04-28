'use client';

import { useState } from 'react';
import { Plus, Download, ExternalLink, ArrowUpRight, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '@/src/lib/utils';
import DataTable from '@/src/components/ui/DataTable';
import Drawer from '@/src/components/ui/Drawer';

type QuoteStatus = 'enviada' | 'aceptada' | 'rechazada' | 'pendiente';

interface Quote {
  id: string;
  client: string;
  contact: string;
  amount: number;
  currency: 'PEN' | 'USD';
  status: QuoteStatus;
  date: string;
  lead: string;
}

const initialQuotes: Quote[] = [
  { id: 'COT-2024-001', client: 'Agrofértil del Norte S.A.C.',  contact: 'Carlos Mendoza', amount: 45800,  currency: 'PEN', status: 'enviada',   date: '2024-03-15', lead: 'Fertilizantes Premium' },
  { id: 'COT-2024-002', client: 'Corporación La Joya de Arequipa', contact: 'Ana Torres',     amount: 82700,  currency: 'PEN', status: 'aceptada',  date: '2024-03-10', lead: 'Consultoría Técnica' },
  { id: 'COT-2024-003', client: 'EcoAgroPerú Exportaciones',    contact: 'Luis Paredes',   amount: 18200,  currency: 'PEN', status: 'enviada',   date: '2024-03-18', lead: 'Plaguicidas Orgánicos' },
  { id: 'COT-2024-004', client: 'AgroExport Perú Industrial',    contact: 'Jorge Ramos',    amount: 12500,  currency: 'USD', status: 'rechazada', date: '2024-02-28', lead: 'Kit Nutrición' },
  { id: 'COT-2024-005', client: 'Agrofértil del Norte S.A.C.',  contact: 'Sandra Vega',    amount: 22100,  currency: 'PEN', status: 'pendiente', date: '2024-03-20', lead: 'Micronutrientes' },
  { id: 'COT-2024-006', client: 'Inversiones Agrícolas del Sur', contact: 'Roberto Díaz',   amount: 55000,  currency: 'PEN', status: 'aceptada',  date: '2024-03-22', lead: 'Sistema Riego' },
  { id: 'COT-2024-007', client: 'BioCultivos del Oriente',      contact: 'Elena Ruiz',     amount: 32000,  currency: 'PEN', status: 'enviada',   date: '2024-03-25', lead: 'Bioestimulantes' },
];

const STATUS_META: Record<QuoteStatus, { label: string; color: string; bg: string }> = {
  enviada:   { label: 'Enviada',   color: '#2563eb', bg: 'bg-blue-50' },
  aceptada:  { label: 'Aceptada', color: '#1C7E3C', bg: 'bg-secondary/30' },
  rechazada: { label: 'Rechazada', color: '#dc2626', bg: 'bg-red-50' },
  pendiente: { label: 'Pendiente', color: '#6b7280', bg: 'bg-gray-50' },
};

const initialForm = {
  client: '',
  contact: '',
  lead: '',
  amount: '',
  currency: 'PEN' as 'PEN' | 'USD',
  status: 'enviada' as QuoteStatus,
  date: new Date().toISOString().slice(0, 10),
};

export default function QuotesPage() {
  const [quotesList, setQuotesList] = useState<Quote[]>(initialQuotes);
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'todos'>('todos');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(initialForm);

  const filtered = quotesList.filter(
    (q) => statusFilter === 'todos' || q.status === statusFilter
  );

  const totalActive = quotesList.reduce((sum, quote) => sum + quote.amount, 0);
  const acceptedCount = quotesList.filter((quote) => quote.status === 'aceptada').length;
  const sentCount = quotesList.filter((quote) => quote.status === 'enviada').length;
  const conversionRate = quotesList.length > 0 ? Math.round((acceptedCount / quotesList.length) * 100) : 0;

  const kpis = [
    { label: 'Total Activo', value: formatCurrency(totalActive, 'PEN'), icon: TrendingUp, color: 'text-primary' },
    { label: 'Aceptadas', value: String(acceptedCount), icon: CheckCircle2, color: 'text-primary' },
    { label: 'Enviadas', value: String(sentCount), icon: Clock, color: 'text-blue-600' },
    { label: 'Conversión', value: `${conversionRate}%`, icon: ArrowUpRight, color: 'text-primary' },
  ];

  const columns = [
    {
      key: 'id',
      header: 'ID Cotización',
      sticky: 'left' as const,
      render: (item: Quote) => (
        <span className="font-mono font-black text-primary text-xs">{item.id}</span>
      ),
    },
    {
      key: 'client',
      header: 'Cliente / Razón Social',
      sticky: 'left' as const,
      render: (item: Quote) => (
        <div className="flex flex-col">
          <span className="font-bold text-text truncate max-w-50">{item.client}</span>
          <span className="text-[10px] text-text-muted font-medium uppercase">{item.contact}</span>
        </div>
      ),
    },
    { key: 'lead', header: 'Servicio / Lead' },
    {
      key: 'amount',
      header: 'Monto Total',
      render: (item: Quote) => (
        <span className="font-bold text-text">{formatCurrency(item.amount, item.currency)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (item: Quote) => {
        const meta = STATUS_META[item.status];
        return (
          <span
            className={cn(
              'px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider',
              meta.bg
            )}
            style={{ color: meta.color }}
          >
            {meta.label}
          </span>
        );
      },
    },
    {
      key: 'date',
      header: 'Fecha',
      render: (item: Quote) => (
        <span className="text-text-muted text-xs font-medium">{formatDate(item.date)}</span>
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
          <button className="p-1.5 rounded-lg hover:bg-app-bg text-text-muted hover:text-primary transition-colors">
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const handleCreateQuote = () => {
    if (!form.client.trim() || !form.lead.trim()) return;

    const nextId = `COT-2024-${String(quotesList.length + 1).padStart(3, '0')}`;

    const newQuote: Quote = {
      id: nextId,
      client: form.client.trim(),
      contact: form.contact.trim() || 'Sin contacto',
      lead: form.lead.trim(),
      amount: Number(form.amount) || 0,
      currency: form.currency,
      status: form.status,
      date: form.date,
    };

    setQuotesList([newQuote, ...quotesList]);
    setShowCreate(false);
    setForm(initialForm);
  };

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

      <Drawer isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nueva Cotización">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Cliente</label>
              <input
                type="text"
                value={form.client}
                onChange={(e) => setForm({ ...form, client: e.target.value })}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                placeholder="Razón social o empresa"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Contacto</label>
              <input
                type="text"
                value={form.contact}
                onChange={(e) => setForm({ ...form, contact: e.target.value })}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                placeholder="Nombre del contacto"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Servicio / Lead</label>
              <input
                type="text"
                value={form.lead}
                onChange={(e) => setForm({ ...form, lead: e.target.value })}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                placeholder="Descripción de la propuesta"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Monto</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Moneda</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value as 'PEN' | 'USD' })}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
              >
                <option value="PEN">PEN</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Estado</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as QuoteStatus })}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
              >
                {Object.keys(STATUS_META).map((status) => (
                  <option key={status} value={status}>{STATUS_META[status as QuoteStatus].label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider">Fecha cotización</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancelar</button>
            <button
              onClick={handleCreateQuote}
              disabled={!form.client.trim() || !form.lead.trim()}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              Guardar cotización
            </button>
          </div>
        </div>
      </Drawer>

      {/* KPI row */}
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

      {/* Data Table with Filter Tabs */}
      <div className="space-y-4">
        <div className="flex gap-1 bg-app-bg p-1 rounded-xl w-fit border border-border-subtle">
          {(['todos', 'enviada', 'aceptada', 'rechazada', 'pendiente'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-xs font-bold transition-all',
                statusFilter === s
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-text-muted hover:text-text'
              )}
            >
              {s === 'todos' ? 'Todas' : STATUS_META[s].label}
            </button>
          ))}
        </div>

        <DataTable
          data={filtered}
          columns={columns}
          pageSize={8}
        />
      </div>
    </div>
  );
}
