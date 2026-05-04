'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { validateRuc, rucValidationMessage } from '@/src/lib/rucValidator';

// ── Typed response shape from the SUNAT proxy ──────────────────────────────
export interface SunatData {
  ruc?: string;
  nombre?: string;
  nombreCompleto?: string;
  ubicacion?: string;
  actividades?: string;
  estado?: string;
  condicion?: string;
  _raw?: Record<string, string>;
}

interface SunatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSuccess: (data: SunatData) => void;
  /** Llamado cuando el usuario modifica el campo y ya no hay longitud válida (limpia datos previos) */
  onClear?: () => void;
  disabled?: boolean;
}

export default function SunatInput({
  value,
  onChange,
  onSuccess,
  onClear,
  disabled = false,
}: SunatInputProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 11);
    onChange(val);
    if (error) setError(false);
    if (success) setSuccess(false);
    // Limpiar datos previos apenas el usuario empieza a cambiar el número
    const isValid = val.length === 11;
    if (!isValid) onClear?.();
  };

  // Stable reference for onSuccess to avoid re-triggering the effect
  const stableOnSuccess = useCallback(onSuccess, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Validación local (módulo 11) antes de gastar la llamada a SUNAT.
  const validation = useMemo(() => validateRuc(value), [value]);
  const validationMsg = rucValidationMessage(validation);

  useEffect(() => {
    const isValidLength = value.length === 11;

    if (!isValidLength) {
      setLoading(false);
      setSuccess(false);
      setError(false);
      return;
    }

    // Si el formato/checksum local falla, no consultamos SUNAT — sería
    // un request desperdiciado y la respuesta sería "no encontrado".
    if (!validation.ok) {
      setLoading(false);
      setSuccess(false);
      setError(false);
      return;
    }

    setLoading(true);
    setSuccess(false);
    setError(false);

    const controller = new AbortController();

    const fetchDocument = async () => {
      try {
        const res = await fetch(`/api/search-document?document=${value}`, {
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: SunatData = await res.json();

        setLoading(false);
        setSuccess(true);

        // Always pass back the typed shape; ensure ruc is set from input
        stableOnSuccess({ ...data, ruc: data.ruc ?? value });

        const clearTimer = setTimeout(() => setSuccess(false), 3000);
        return () => clearTimeout(clearTimer);
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') return; // debounce cancel — ignore
        setLoading(false);
        setError(true);
      }
    };

    const debounce = setTimeout(() => {
      fetchDocument();
    }, 500);

    return () => {
      clearTimeout(debounce);
      controller.abort();
    };
  }, [value, stableOnSuccess, validation.ok]);

  const isValidLength = value.length === 11;
  const showFormatWarning = isValidLength && !validation.ok && !loading;
  const sourceLabel = 'SUNAT (RUC)';

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-end">
        <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
          RUC
        </label>
        <span className={cn(
          'text-[10px] font-bold px-1.5 py-0.5 rounded',
          isValidLength ? 'bg-primary/10 text-primary' : 'bg-app-bg text-text-muted'
        )}>
          {value.length}/11
        </span>
      </div>

      <div className="relative group">
        <input
          type="text"
          inputMode="numeric"
          value={value}
          onChange={handleInputChange}
          disabled={disabled || loading}
          placeholder="Ingresa RUC (11 dígitos)..."
          className={cn(
            'w-full pl-4 pr-10 py-3 bg-surface border rounded-xl text-sm outline-none transition-all',
            isValidLength && !loading && !success && !error ? 'border-primary/50' : 'border-border-subtle',
            success ? 'border-primary ring-1 ring-primary ring-opacity-20' : '',
            error
              ? 'border-red-500 ring-1 ring-red-500 ring-opacity-20'
              : 'focus:border-primary focus:ring-1 focus:ring-primary focus:ring-opacity-20',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
          {loading && <Loader2 className="w-5 h-5 text-primary animate-spin" />}
          {success && <CheckCircle2 className="w-5 h-5 text-primary animate-fade-in" />}
          {error   && <XCircle    className="w-5 h-5 text-red-500 animate-fade-in" />}
          {showFormatWarning && <AlertTriangle className="w-5 h-5 text-amber-500 animate-fade-in" />}
        </div>
      </div>

      {loading && (
        <p className="text-[10px] font-semibold text-primary animate-pulse ml-1">
          Consultando {sourceLabel}...
        </p>
      )}
      {success && (
        <p className="text-[10px] font-semibold text-primary ml-1">
          ✓ Datos cargados desde {sourceLabel}
        </p>
      )}
      {error && (
        <p className="text-[10px] font-semibold text-red-500 ml-1">
          No se encontraron datos en {sourceLabel}.
        </p>
      )}
      {showFormatWarning && validationMsg && (
        <p className="text-[10px] font-semibold text-amber-600 ml-1">
          ⚠ {validationMsg}
        </p>
      )}
    </div>
  );
}
