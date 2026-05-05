'use client';

/**
 * Hook centralizado para hablar con Microsoft Graph desde el cliente.
 *
 * Resuelve cuatro cosas que antes estaban duplicadas y mal hechas en
 * varios componentes:
 *
 *   1. Refresh silent del token (acquireTokenSilent) con dedup de
 *      requests concurrentes — si dos botones piden token al mismo
 *      tiempo, se reusa la misma promesa.
 *   2. Manejo uniforme de errores 401 (token revocado) y 403 (consent
 *      faltante del admin del tenant).
 *   3. Estado tri-color: 'connected' | 'expired' | 'disconnected'.
 *   4. API simple: `callGraph('/me/events', { method, body })` sin
 *      preocuparse por headers ni serialización.
 */
import { useCallback, useMemo, useRef } from 'react';
import { useAuthStore } from '@/src/store/authStore';
import { getMsalInstance, loginRequest } from '@/src/lib/msalConfig';

export type MsConnectionStatus = 'connected' | 'expired' | 'disconnected';

export class MsNotConnectedError extends Error {
  constructor() {
    super('No hay sesión de Microsoft activa');
    this.name = 'MsNotConnectedError';
  }
}

export class MsConsentRequiredError extends Error {
  constructor() {
    super('Esta acción requiere permisos adicionales que el administrador del tenant debe aprobar');
    this.name = 'MsConsentRequiredError';
  }
}

export class MsGraphError extends Error {
  status: number;
  graphCode?: string;
  constructor(status: number, message: string, graphCode?: string) {
    super(message);
    this.name = 'MsGraphError';
    this.status = status;
    this.graphCode = graphCode;
  }
}

interface CallGraphInit extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

export function useMsGraph() {
  const msToken     = useAuthStore((s) => s.msToken);
  const setMsToken  = useAuthStore((s) => s.setMsToken);
  const userEmail   = useAuthStore((s) => s.userEmail);
  const msAccountUsername = useAuthStore((s) => s.msAccountUsername);

  // Dedup: si varios componentes piden token a la vez, comparten la
  // misma promesa.
  const inflightToken = useRef<Promise<string | null> | null>(null);

  const status: MsConnectionStatus = useMemo(() => {
    if (!msToken) return 'disconnected';
    return 'connected'; // 'expired' lo descubrimos al fallar una request
  }, [msToken]);

  /** Pide un token válido. Si el actual sirve, lo devuelve;
   *  si no, intenta `acquireTokenSilent`. Si eso falla, devuelve null. */
  const ensureToken = useCallback(async (): Promise<string | null> => {
    if (inflightToken.current) return inflightToken.current;

    const job = (async (): Promise<string | null> => {
      try {
        const pca = await getMsalInstance();
        const accounts = pca.getAllAccounts();
        if (accounts.length === 0) return null;

        const account = msAccountUsername
          ? accounts.find((a) => a.username === msAccountUsername)
          : accounts[0];
        if (!account) return null;

        const result = await pca.acquireTokenSilent({
          ...loginRequest,
          account,
        });
        if (result?.accessToken) {
          setMsToken(result.accessToken);
          if (typeof window !== 'undefined' && userEmail) {
            localStorage.setItem(`ms-token-${userEmail}`, result.accessToken);
          }
          return result.accessToken;
        }
        return null;
      } catch {
        // Si silent falla, devolvemos null y dejamos que el caller
        // decida si redirigir al login.
        return null;
      } finally {
        inflightToken.current = null;
      }
    })();

    inflightToken.current = job;
    return job;
  }, [msAccountUsername, setMsToken, userEmail]);

  /** Hace una llamada a Graph. Tira errores tipados:
   *   - MsNotConnectedError  → no hay token, redirigir al usuario a /profile
   *   - MsConsentRequiredError → 403, el admin del tenant no consintió
   *   - MsGraphError         → cualquier otro error con status + code
   */
  const callGraph = useCallback(
    async <T = unknown>(path: string, init: CallGraphInit = {}): Promise<T> => {
      const token = await ensureToken();
      if (!token) throw new MsNotConnectedError();

      const { body, headers, ...rest } = init;
      const res = await fetch(`${GRAPH_BASE}${path}`, {
        ...rest,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...(headers ?? {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      if (res.status === 204) return undefined as T;
      if (res.ok) return res.json() as Promise<T>;

      // Parsear error de Graph
      let graphCode: string | undefined;
      let message = `${res.status} ${res.statusText}`;
      try {
        const errBody = await res.json();
        graphCode = errBody?.error?.code;
        message = errBody?.error?.message ?? message;
      } catch {
        /* body no era JSON */
      }

      if (res.status === 401) {
        // Token inválido — limpiarlo para que el badge muestre 'expired'
        setMsToken(null);
        throw new MsGraphError(401, 'Sesión de Microsoft expirada', graphCode);
      }
      if (res.status === 403 && /consent|insufficient|forbidden/i.test(message)) {
        throw new MsConsentRequiredError();
      }
      throw new MsGraphError(res.status, message, graphCode);
    },
    [ensureToken, setMsToken],
  );

  /** Inicia loginRedirect — sólo usar desde un click del usuario. */
  const connect = useCallback(async () => {
    const pca = await getMsalInstance();
    await pca.loginRedirect(loginRequest);
  }, []);

  /** Cierra la sesión MS sin tocar el login del CRM. */
  const disconnect = useCallback(() => {
    setMsToken(null);
  }, [setMsToken]);

  return {
    status,
    isConnected: status === 'connected',
    callGraph,
    ensureToken,
    connect,
    disconnect,
  };
}
