/**
 * Healthcheck endpoint.
 *
 * - Despierta la DB de Neon si está dormida (al hacer una query trivial).
 * - Devuelve métricas básicas para que el frontend pueda mostrar un
 *   indicador de salud.
 * - El cliente puede llamarlo en intervalos para mantener la DB viva
 *   durante una demo (ver `useKeepAlive`).
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/src/server/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const start = Date.now();
  try {
    const [orgs, contacts, leads, quotes] = await Promise.all([
      prisma.organization.count(),
      prisma.contact.count(),
      prisma.lead.count(),
      prisma.quote.count(),
    ]);
    const latencyMs = Date.now() - start;
    return NextResponse.json({
      status: 'ok',
      latencyMs,
      counts: { orgs, contacts, leads, quotes },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const latencyMs = Date.now() - start;
    return NextResponse.json(
      {
        status: 'error',
        latencyMs,
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
