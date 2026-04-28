'use client';

import { useState } from 'react';
import { Search, Building2, Users, Kanban, FileText, ExternalLink } from 'lucide-react';
import { mockOrganizations, mockContacts, mockLeads } from '@/src/lib/mockData';

type ResultType = 'org' | 'contact' | 'lead' | 'quote';

const TYPE_META: Record<ResultType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  org:     { label: 'Entidad',    icon: Building2, color: '#d97706', bg: '#fffbeb' },
  contact: { label: 'Contacto',   icon: Users,     color: '#7c3aed', bg: '#f5f3ff' },
  lead:    { label: 'Lead',       icon: Kanban,    color: '#2563eb', bg: '#eff6ff' },
  quote:   { label: 'Cotización', icon: FileText,  color: '#1C7E3C', bg: '#F1FFEC' },
};

export default function SearchPage() {
  const [query, setQuery] = useState('');

  const searchResults = () => {
    if (!query.trim()) return [];

    const q = query.toLowerCase();
    const results: { type: ResultType; label: string; sub: string; href: string }[] = [];

    // Search Organizations
    mockOrganizations.forEach(o => {
      if (o.nombre.toLowerCase().includes(q) || o.ruc?.includes(q)) {
        results.push({
          type: 'org',
          label: o.nombre,
          sub: `RUC: ${o.ruc || 'Sin RUC'} · ${o.sector || 'Sin sector'}`,
          href: `/organizations/${o.id}`,
        });
      }
    });

    // Search Contacts
    mockContacts.forEach(c => {
      if (
        c.nombres.toLowerCase().includes(q) ||
        c.apellidos.toLowerCase().includes(q) ||
        c.correo1.toLowerCase().includes(q)
      ) {
        const org = mockOrganizations.find(o => o.id === c.organizacionId);
        results.push({
          type: 'contact',
          label: `${c.nombres} ${c.apellidos}`,
          sub: `${c.cargo || 'Contacto'} · ${org?.nombre || 'Sin organización'}`,
          href: `/contacts/${c.id}`,
        });
      }
    });

    // Search Leads
    mockLeads.forEach(l => {
      const org = mockOrganizations.find(o => o.id === l.organizacionId);
      if (
        org?.nombre.toLowerCase().includes(q) ||
        l.servicioInteres?.toLowerCase().includes(q) ||
        l.encargado?.toLowerCase().includes(q)
      ) {
        results.push({
          type: 'lead',
          label: `Lead: ${org?.nombre}`,
          sub: `${l.estado.toUpperCase()} · Encargado: ${l.encargado || '—'}`,
          href: `/pipeline`,
        });
      }
    });

    return results;
  };

  const results = searchResults();

  const grouped = (['org', 'contact', 'lead', 'quote'] as ResultType[])
    .map((type) => ({ type, items: results.filter((r) => r.type === type) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#1C7E3C' }} />
        <input
          id="global-search"
          type="text"
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, RUC, correo…"
          autoFocus
          className="w-full pl-12 pr-4 py-4 rounded-2xl text-sm outline-none"
          style={{
            background: '#fff',
            border: '2px solid #1C7E3C',
            color: '#0f2d1a',
            boxShadow: '0 4px 20px rgba(28,126,60,0.12)',
          }}
        />
      </div>

      {/* Results */}
      {grouped.length > 0 ? (
        <div className="space-y-4">
          {grouped.map(({ type, items }) => {
            const meta = TYPE_META[type];
            const Icon = meta.icon;
            return (
              <div key={type} className="rounded-2xl overflow-hidden"
                   style={{ background: '#fff', border: '1px solid #edfce8', boxShadow: '0 2px 8px rgba(28,126,60,0.06)' }}>
                <div className="px-5 py-3 flex items-center gap-2" style={{ background: meta.bg, borderBottom: '1px solid #edfce8' }}>
                  <Icon className="w-4 h-4" style={{ color: meta.color }} />
                  <span className="text-xs font-bold uppercase tracking-wide" style={{ color: meta.color }}>
                    {meta.label}s
                  </span>
                  <span className="ml-auto text-xs font-semibold" style={{ color: meta.color }}>{items.length}</span>
                </div>
                <div className="divide-y" style={{ borderColor: '#edfce8' }}>
                  {items.map((r, i) => (
                    <a key={i} href={r.href}
                       className="flex items-center gap-4 px-5 py-3.5 hover:bg-green-50 transition-colors group">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#0f2d1a' }}>{r.label}</p>
                        <p className="text-xs" style={{ color: '#9dbfa8' }}>{r.sub}</p>
                      </div>
                      <ExternalLink className="ml-auto w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: '#1C7E3C' }} />
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <Search className="w-12 h-12 mx-auto mb-4" style={{ color: '#BCF7B3' }} />
          <p className="text-lg font-bold" style={{ color: '#0f2d1a' }}>Sin resultados</p>
          <p className="text-sm" style={{ color: '#9dbfa8' }}>Prueba con otro término de búsqueda</p>
        </div>
      )}
    </div>
  );
}
