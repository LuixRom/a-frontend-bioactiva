'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Search, Loader2, CheckCircle2, XCircle,
  FileText, Building2, ChevronRight,
} from 'lucide-react';
import Drawer from './Drawer';
import { cn } from '@/src/lib/utils';
import type { SunatData } from './SunatInput';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Badge de estado/condición con color semántico */
function StatusBadge({ value }: { value: string }) {
  const upper = value.toUpperCase();
  const isGood = ['ACTIVO', 'HABIDO'].some((s) => upper.includes(s));
  const isBad  = ['INACTIVO', 'NO HABIDO', 'BAJA'].some((s) => upper.includes(s));
  return (
    <span
      className={cn(
        'inline-block text-xs font-bold px-2.5 py-0.5 rounded-lg',
        isGood ? 'bg-emerald-500/15 text-emerald-400' :
        isBad  ? 'bg-red-500/15 text-red-400' :
                 'bg-secondary/20 text-text',
      )}
    >
      {value}
    </span>
  );
}

/** Identifica si la clave necesita badge especial */
const isBadgeKey = (k: string) =>
  k.includes('Estado') || k.includes('Condici');

// ── Orden preferido de campos ────────────────────────────────────────────────
const FIELD_ORDER = [
  'Número de RUC',
  'Tipo Contribuyente',
  'Nombre Comercial',
  'Fecha de Inscripción',
  'Estado del Contribuyente',
  'Condición del Contribuyente',
  'Domicilio Fiscal',
  'Sistema Emisión de Comprobante',
  'Sistema Contabilidad',
  'Actividad(es) Económica(s)',
  'Comprobantes de Pago c/aut. de impresión (F. 806 u 816)',
  'Sistema de Emisión Electrónica',
  'Emisor electrónico desde',
  'Comprobantes Electrónicos',
  'Afiliado al PLE desde',
  'Padrones',
];

function sortRawEntries(raw: Record<string, string>) {
  const entries = Object.entries(raw);
  const ordered: [string, string][] = [];
  const rest: [string, string][] = [];

  for (const key of FIELD_ORDER) {
    const found = entries.find(([k]) => k === key);
    if (found) ordered.push(found);
  }
  for (const entry of entries) {
    if (!FIELD_ORDER.includes(entry[0])) rest.push(entry);
  }
  return [...ordered, ...rest];
}

// ── Main Component ───────────────────────────────────────────────────────────

interface ValidadorSunatProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ValidadorSunat({ isOpen, onClose }: ValidadorSunatProps) {
  const [modo, setModo] = useState<'ruc' | 'nombre'>('ruc');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [nombreLoading, setNombreLoading] = useState(false);
  const [nombreResults, setNombreResults] = useState<{ ruc: string; nombre: string; ubicacion?: string; estado?: string }[]>([]);
  const [showNombreDropdown, setShowNombreDropdown] = useState(false);
  const [rawData, setRawData] = useState<Record<string, string> | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const inputRef              = useRef<HTMLInputElement>(null);
  const nombreDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setModo('ruc');
      setQuery('');
      setLoading(false);
      setNombreLoading(false);
      setNombreResults([]);
      setShowNombreDropdown(false);
      setRawData(null);
      setError(null);
    }
  }, [isOpen]);

  const applySunatData = (json: SunatData) => {
    const raw = json._raw ?? json;
    setRawData(raw as Record<string, string>);
  };

  const fetchByRuc = async (ruc: string) => {
    setLoading(true);
    setRawData(null);
    setError(null);

    try {
      const res = await fetch(`/api/search-document?document=${encodeURIComponent(ruc)}`, {
        signal: AbortSignal.timeout(40000),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || `Error ${res.status}`);
      }

      applySunatData(await res.json());
    } catch (e: any) {
      if (e.name === 'AbortError') {
        setError('La consulta tardó demasiado. Intenta de nuevo.');
      } else {
        setError(e.message || 'Error desconocido al consultar SUNAT.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchNombreResults = async (nombre: string) => {
    if (nombreDebounce.current) clearTimeout(nombreDebounce.current);

    const value = nombre.trim();
    if (value.length < 3) {
      setNombreResults([]);
      setShowNombreDropdown(false);
      return;
    }

    nombreDebounce.current = setTimeout(async () => {
      setNombreLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search-nombre?nombre=${encodeURIComponent(value)}`, {
          signal: AbortSignal.timeout(40000),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as any).error || `Error ${res.status}`);
        }

        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setNombreResults(data);
          setShowNombreDropdown(true);
        } else {
          setNombreResults([]);
          setShowNombreDropdown(false);
        }
      } catch (e: any) {
        if (e.name === 'AbortError') {
          setError('La consulta tardó demasiado. Intenta de nuevo.');
        } else {
          setError(e.message || 'Error desconocido al consultar SUNAT.');
        }
        setNombreResults([]);
        setShowNombreDropdown(false);
      } finally {
        setNombreLoading(false);
      }
    }, 700);
  };

  const handleSearch = async () => {
    const q = query.trim();
    if (!q || loading) return;

    setShowNombreDropdown(false);

    if (modo === 'ruc') {
      if (!/^\d{11}$/.test(q)) {
        setError('Ingresa un RUC válido de 11 dígitos.');
        setRawData(null);
        return;
      }

      await fetchByRuc(q);
      return;
    }

    if (q.length < 3) {
      setError('Ingresa al menos 3 caracteres para buscar por razón social.');
      setRawData(null);
      return;
    }

    await fetchNombreResults(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleClose = () => {
    setQuery('');
    setModo('ruc');
    setRawData(null);
    setError(null);
    setNombreResults([]);
    setShowNombreDropdown(false);
    onClose();
  };

  const companyName = rawData
    ? Object.entries(rawData)
        .find(([k]) => k.includes('RUC'))?.[1]
        ?.split(' - ')[1]?.trim() ?? 'Empresa encontrada'
    : null;

  const searchPlaceholder = modo === 'ruc' ? 'Ej: 20464993879' : 'Ej: bioactiva, servicios, importadora...';

  return (
    <Drawer isOpen={isOpen} onClose={handleClose} title="Validador SUNAT" width="w-[42%]">
      <div className="space-y-5">

        <div className="inline-flex rounded-xl border border-border-subtle bg-app-bg p-1">
          <button
            type="button"
            onClick={() => {
              setModo('ruc');
              setQuery('');
              setNombreResults([]);
              setShowNombreDropdown(false);
              setError(null);
              setRawData(null);
            }}
            className={cn(
              'px-3 py-1.5 text-xs font-bold rounded-lg transition-colors',
              modo === 'ruc' ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
            )}
          >
            RUC
          </button>
          <button
            type="button"
            onClick={() => {
              setModo('nombre');
              setQuery('');
              setNombreResults([]);
              setShowNombreDropdown(false);
              setError(null);
              setRawData(null);
            }}
            className={cn(
              'px-3 py-1.5 text-xs font-bold rounded-lg transition-colors',
              modo === 'nombre' ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
            )}
          >
            Razón social
          </button>
        </div>

        {/* ── Buscador ── */}
        <div className="space-y-2 relative">
          <p className="text-xs text-text-muted">
            {modo === 'ruc'
              ? <>Ingresa un <span className="font-bold text-text">RUC válido de 11 dígitos</span> para obtener la ficha SUNAT completa.</>
              : <>Ingresa una <span className="font-bold text-text">razón social</span> para buscar coincidencias y luego elegir el RUC exacto.</>
            }
          </p>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                const value = modo === 'ruc' ? e.target.value.replace(/\D/g, '').slice(0, 11) : e.target.value;
                setQuery(value);
                setError(null);
                setRawData(null);
                if (modo === 'nombre') {
                  fetchNombreResults(value);
                } else {
                  setNombreResults([]);
                  setShowNombreDropdown(false);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="flex-1 px-4 py-3 bg-app-bg border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all placeholder:text-text-muted/50"
            />
            <button
              onClick={handleSearch}
              disabled={loading || nombreLoading || (modo === 'ruc' ? !/^\d{11}$/.test(query.trim()) : query.trim().length < 3)}
              className="btn-primary px-4 disabled:opacity-50 flex items-center gap-2"
            >
              {loading || nombreLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Search className="w-4 h-4" />}
            </button>
          </div>

          {modo === 'nombre' && showNombreDropdown && nombreResults.length > 0 && (
            <div className="absolute z-20 mt-2 w-full rounded-xl border border-border-subtle bg-surface shadow-lg overflow-hidden">
              {nombreResults.map((item) => (
                <button
                  key={item.ruc}
                  type="button"
                  onClick={async () => {
                    setQuery(item.nombre);
                    setShowNombreDropdown(false);
                    setNombreResults([]);
                    await fetchByRuc(item.ruc);
                  }}
                  className="w-full text-left px-4 py-3 border-b border-border-subtle last:border-b-0 hover:bg-app-bg transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-text truncate">{item.nombre}</p>
                      <p className="text-xs text-text-muted font-mono">RUC {item.ruc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-text-muted shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Loading ── */}
        {(loading || nombreLoading) && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-7 h-7 text-primary" />
              </div>
              <Loader2 className="absolute -top-1 -right-1 w-5 h-5 text-primary animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-text">Consultando SUNAT...</p>
              <p className="text-xs text-text-muted animate-pulse mt-1">
                Puede tomar hasta 30 segundos
              </p>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-400">No se pudo obtener la ficha</p>
              <p className="text-xs text-red-400/70 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* ── Resultado ── */}
        {rawData && !loading && (
          <div className="space-y-3">

            {/* Banner empresa */}
            <div className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-xl">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-black text-lg shrink-0">
                {companyName?.[0] ?? '?'}
              </div>
              <div className="min-w-0">
                <p className="font-black text-primary text-sm truncate">{companyName}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    Ficha Registral Encontrada
                  </span>
                </div>
              </div>
            </div>

            {/* Campos SUNAT */}
            <div className="space-y-2">
              {sortRawEntries(rawData).map(([key, value]) => (
                <div
                  key={key}
                  className="p-3.5 bg-app-bg/60 border border-border-subtle rounded-xl group hover:border-primary/30 transition-colors"
                >
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
                    {key}
                  </p>
                  {isBadgeKey(key) ? (
                    <StatusBadge value={value} />
                  ) : (
                    <p className="text-sm font-medium text-text whitespace-pre-wrap leading-relaxed">
                      {value}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {!rawData && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-app-bg border border-border-subtle flex items-center justify-center">
              <FileText className="w-7 h-7 text-text-muted" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-muted">Sin resultados aún</p>
              <p className="text-xs text-text-muted/60 mt-1 max-w-xs">
              Busca por un RUC válido de 11 dígitos para ver la ficha SUNAT completa con todos sus datos registrales.
              </p>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
