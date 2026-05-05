'use client';

import { useEffect } from 'react';

/**
 * Hace un fetch silencioso a /api/health cada `intervalMs` para evitar
 * que Neon free tier suspenda la compute por inactividad.
 *
 * Solo corre en el cliente. Se desconecta limpio en el unmount.
 *
 * @param intervalMs cada cuánto pingear la DB (default 4 minutos —
 *                   por debajo del corte de 5 min de Neon).
 */
export function useKeepAlive(intervalMs: number = 4 * 60 * 1000): void {
  useEffect(() => {
    let cancelled = false;

    const ping = async () => {
      try {
        await fetch('/api/health', { cache: 'no-store' });
      } catch {
        // silencio: el ping es defensivo, si falla no hay nada que hacer
      }
    };

    // Ping inicial al montar (si la DB está dormida, esto la despierta).
    ping();

    const id = setInterval(() => {
      if (!cancelled) ping();
    }, intervalMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);
}
