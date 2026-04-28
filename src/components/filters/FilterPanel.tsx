'use client';

import { useState, useMemo } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { Lead } from '@/src/types/crm';
import type { Organization } from '@/src/types/crm';
import { cn } from '@/src/lib/utils';
import { getAlertLevel } from '@/src/lib/alertLevel';

export interface FilterState {
  estados: string[];
  encargados: string[];
  canales: string[];
  sectores: string[];
  tiposOrg: string[];
  tamanosOrg: string[];
  soloConAlerta: boolean;
  fechaDesde: string;
  fechaHasta: string;
}

export const emptyFilters: FilterState = {
  estados: [],
  encargados: [],
  canales: [],
  sectores: [],
  tiposOrg: [],
  tamanosOrg: [],
  soloConAlerta: false,
  fechaDesde: '',
  fechaHasta: '',
};

interface FilterPanelProps {
  leads: Lead[];
  organizations: Organization[];
  filters: FilterState;
  onChange: (f: FilterState) => void;
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (val: string) =>
    onChange(selected.includes(val) ? selected.filter(x => x !== val) : [...selected, val]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs border transition-all',
          selected.length > 0
            ? 'border-primary bg-primary/5 text-primary font-semibold'
            : 'border-border-subtle text-text-muted bg-surface'
        )}
      >
        <span>{selected.length > 0 ? `${label} (${selected.length})` : label}</span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border-subtle rounded-xl shadow-premium z-20 max-h-44 overflow-y-auto">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-xs text-text-muted italic">Sin opciones</p>
          ) : (
            options.map(opt => (
              <label key={opt} className="flex items-center gap-2 px-3 py-2 hover:bg-app-bg cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                  className="accent-primary"
                />
                <span className="text-xs text-text">{opt}</span>
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function applyFilters(leads: Lead[], orgs: Organization[], f: FilterState): Lead[] {
  return leads.filter(lead => {
    const org = orgs.find(o => o.id === lead.organizacionId);

    if (f.estados.length     && !f.estados.includes(lead.estado)) return false;
    if (f.encargados.length  && !f.encargados.includes(lead.encargado ?? '')) return false;
    if (f.canales.length     && !f.canales.includes(lead.canal ?? '')) return false;
    if (f.sectores.length    && !f.sectores.includes(org?.sector ?? '')) return false;
    if (f.tiposOrg.length    && !f.tiposOrg.includes(org?.tipo ?? '')) return false;
    if (f.tamanosOrg.length  && !f.tamanosOrg.includes(org?.tamano ?? '')) return false;
    if (f.soloConAlerta      && getAlertLevel(lead.fechaProximaActividad) === 'none') return false;
    if (f.fechaDesde         && lead.creadoEn < new Date(f.fechaDesde)) return false;
    if (f.fechaHasta         && lead.creadoEn > new Date(f.fechaHasta + 'T23:59:59')) return false;

    return true;
  });
}

export default function FilterPanel({ leads, organizations, filters, onChange }: FilterPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Derive unique option lists from data
  const opts = useMemo(() => ({
    estados:    [...new Set(leads.map(l => l.estado))].filter(Boolean),
    encargados: [...new Set(leads.map(l => l.encargado).filter(Boolean))] as string[],
    canales:    [...new Set(leads.map(l => l.canal).filter(Boolean))] as string[],
    sectores:   [...new Set(organizations.map(o => o.sector).filter(Boolean))] as string[],
    tipos:      [...new Set(organizations.map(o => o.tipo).filter(Boolean))] as string[],
    tamanos:    [...new Set(organizations.map(o => o.tamano).filter(Boolean))] as string[],
  }), [leads, organizations]);

  const hasFilters = Object.entries(filters).some(([k, v]) =>
    k === 'soloConAlerta' ? v === true : Array.isArray(v) ? v.length > 0 : v !== ''
  );

  const set = <K extends keyof FilterState>(key: K, val: FilterState[K]) =>
    onChange({ ...filters, [key]: val });

  return (
    <div className="bg-surface rounded-2xl border border-border-subtle shadow-subtle">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setCollapsed(!collapsed)}
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold text-text uppercase tracking-wider">Filtros</span>
          {hasFilters && (
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-primary text-white">
              Activos
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <button
              onClick={e => { e.stopPropagation(); onChange(emptyFilters); }}
              className="text-[10px] text-text-muted hover:text-red-500 flex items-center gap-1 transition-colors"
            >
              <X className="w-3 h-3" /> Limpiar
            </button>
          )}
          {collapsed ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronUp className="w-4 h-4 text-text-muted" />}
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4 border-t border-border-subtle pt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MultiSelect label="Estado"     options={opts.estados}    selected={filters.estados}    onChange={v => set('estados', v)} />
            <MultiSelect label="Encargado"  options={opts.encargados} selected={filters.encargados} onChange={v => set('encargados', v)} />
            <MultiSelect label="Canal"      options={opts.canales}    selected={filters.canales}    onChange={v => set('canales', v)} />
            <MultiSelect label="Sector"     options={opts.sectores}   selected={filters.sectores}   onChange={v => set('sectores', v)} />
            <MultiSelect label="Tipo org."  options={opts.tipos}      selected={filters.tiposOrg}   onChange={v => set('tiposOrg', v)} />
            <MultiSelect label="Tamaño"     options={opts.tamanos}    selected={filters.tamanosOrg} onChange={v => set('tamanosOrg', v)} />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Date ranges */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Creado desde</label>
              <input
                type="date"
                value={filters.fechaDesde}
                onChange={e => set('fechaDesde', e.target.value)}
                className="text-xs border border-border-subtle rounded-lg px-2 py-1.5 bg-app-bg/30 outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider">hasta</label>
              <input
                type="date"
                value={filters.fechaHasta}
                onChange={e => set('fechaHasta', e.target.value)}
                className="text-xs border border-border-subtle rounded-lg px-2 py-1.5 bg-app-bg/30 outline-none focus:border-primary"
              />
            </div>

            {/* Alert toggle */}
            <label className="flex items-center gap-2 cursor-pointer ml-auto">
              <input
                type="checkbox"
                checked={filters.soloConAlerta}
                onChange={e => set('soloConAlerta', e.target.checked)}
                className="accent-primary w-3.5 h-3.5"
              />
              <span className="text-xs font-semibold text-text-muted">Solo con alerta activa</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
