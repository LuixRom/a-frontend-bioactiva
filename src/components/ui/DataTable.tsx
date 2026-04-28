'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search, Filter, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  sticky?: 'left' | 'right';
  /**
   * Optional: return a string to search against for this column.
   * If omitted, falls back to String(item[key]).
   */
  searchValue?: (item: T) => string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  /** Extra string extractors beyond columns — e.g. related entity names */
  extraSearchFields?: (item: T) => string[];
  onExport?: () => void;
  pageSize?: number;
  searchPlaceholder?: string;
}

export default function DataTable<T extends { id: string }>({
  data,
  columns,
  extraSearchFields,
  onExport,
  pageSize = 10,
  searchPlaceholder = 'Buscar...',
}: DataTableProps<T>) {
  const [sortKey, setSortKey]     = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [query, setQuery]         = useState('');

  // Reset to page 1 whenever data or query changes
  useEffect(() => { setCurrentPage(1); }, [data, query]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  // ── Client-side search ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;

    return data.filter(item => {
      // Search across all column values
      const colValues = columns.map(col => {
        if (col.searchValue) return col.searchValue(item);
        const raw = item[col.key as keyof T];
        return raw != null ? String(raw) : '';
      });
      // Plus any extra search fields (e.g. related entity names)
      const extraValues = extraSearchFields ? extraSearchFields(item) : [];
      return [...colValues, ...extraValues].some(v => v.toLowerCase().includes(q));
    });
  }, [data, query, columns, extraSearchFields]);

  // ── Sorting ─────────────────────────────────────────────────────────────
  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const av = String(a[sortKey as keyof T] ?? '').toLowerCase();
      const bv = String(b[sortKey as keyof T] ?? '').toLowerCase();
      return sortOrder === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [filtered, sortKey, sortOrder]);

  // ── Pagination ──────────────────────────────────────────────────────────
  const totalPages  = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage    = Math.min(currentPage, totalPages);
  const startIndex  = (safePage - 1) * pageSize;
  const paginatedData = sorted.slice(startIndex, startIndex + pageSize);

  // Max visible page buttons
  const pageButtons = Array.from({ length: totalPages }, (_, i) => i + 1).filter(p => {
    if (totalPages <= 7) return true;
    return p === 1 || p === totalPages || Math.abs(p - safePage) <= 2;
  });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-surface p-4 rounded-2xl shadow-subtle border border-border-subtle">
        {/* Search input */}
        <div className="relative w-full sm:w-96 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-primary transition-colors pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-10 pr-9 py-2 bg-app-bg/50 border border-border-subtle rounded-xl text-sm outline-none focus:bg-surface focus:border-primary transition-all"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right toolbar actions */}
        <div className="flex gap-2 w-full sm:w-auto items-center">
          {/* Results counter — shows when filtering */}
          {query && (
            <span className="text-xs font-semibold text-text-muted whitespace-nowrap">
              <span className="text-primary font-bold">{filtered.length}</span> de {data.length}
            </span>
          )}
          <button
            onClick={onExport}
            disabled={!onExport}
            className="btn-secondary py-2 flex-1 sm:flex-none disabled:opacity-40"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl shadow-premium border border-border-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-primary text-white">
                {columns.map(col => (
                  <th
                    key={String(col.key)}
                    onClick={() => col.sortable && handleSort(String(col.key))}
                    className={cn(
                      'px-6 py-4 text-left text-xs font-bold uppercase tracking-wider',
                      col.sortable && 'cursor-pointer hover:bg-primary-dark transition-colors',
                      col.sticky === 'left'  && 'sticky left-0 bg-primary z-10',
                      col.sticky === 'right' && 'sticky right-0 bg-primary z-10'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {col.header}
                      {col.sortable && (
                        <div className="flex flex-col">
                          <ChevronUp   className={cn('w-3 h-3 -mb-1', sortKey === String(col.key) && sortOrder === 'asc'  ? 'opacity-100' : 'opacity-40')} />
                          <ChevronDown className={cn('w-3 h-3',       sortKey === String(col.key) && sortOrder === 'desc' ? 'opacity-100' : 'opacity-40')} />
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {paginatedData.map((item, idx) => (
                <tr
                  key={item.id}
                  className={cn(
                    'transition-colors hover:bg-secondary/10',
                    idx % 2 === 0 ? 'bg-surface' : 'bg-app-bg/30'
                  )}
                >
                  {columns.map(col => (
                    <td
                      key={String(col.key)}
                      className={cn(
                        'px-6 py-4 text-sm text-text whitespace-nowrap',
                        col.sticky === 'left'  && cn('sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]',  idx % 2 === 0 ? 'bg-surface' : 'bg-[#f8fdf6]'),
                        col.sticky === 'right' && cn('sticky right-0 z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]', idx % 2 === 0 ? 'bg-surface' : 'bg-[#f8fdf6]')
                      )}
                    >
                      {col.render ? col.render(item) : (item[col.key as keyof T] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))}
              {paginatedData.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-text-muted italic">
                    {query
                      ? `Sin resultados para "${query}"`
                      : 'No se encontraron registros'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-border-subtle flex items-center justify-between bg-surface">
          <p className="text-xs font-bold text-text-muted">
            Mostrando{' '}
            <span className="text-primary">{sorted.length === 0 ? 0 : startIndex + 1}</span>
            {' '}–{' '}
            <span className="text-primary">{Math.min(startIndex + pageSize, sorted.length)}</span>
            {' '}de{' '}
            <span className="text-primary">{sorted.length}</span>
            {query && <span className="text-text-muted font-normal"> (filtrado)</span>}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="p-2 rounded-xl border border-border-subtle text-text-muted hover:bg-app-bg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1">
              {pageButtons.map((p, i, arr) => (
                <React.Fragment key={p}>
                  {i > 0 && arr[i - 1] !== p - 1 && (
                    <span className="text-text-muted text-xs px-1">…</span>
                  )}
                  <button
                    onClick={() => setCurrentPage(p)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-xs font-bold transition-all',
                      safePage === p
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-text-muted hover:bg-app-bg'
                    )}
                  >
                    {p}
                  </button>
                </React.Fragment>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="p-2 rounded-xl border border-border-subtle text-text-muted hover:bg-app-bg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
