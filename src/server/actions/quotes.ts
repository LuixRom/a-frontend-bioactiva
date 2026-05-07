'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/src/server/db';
import { toQuote } from '@/src/server/transformers';
import type { Quote } from '@/src/types/crm';
import type { EstadoCotizacion, Moneda } from '@/src/lib/constants';

export async function listQuotes(): Promise<Quote[]> {
  const rows = await prisma.quote.findMany({
    orderBy: { fechaCotizacion: 'desc' },
    include: { lead: { select: { codigo: true } } },
  });
  return rows.map((row) => ({
    ...toQuote(row),
    leadId: row.lead.codigo,
  }));
}

export async function getQuoteByCodigo(codigo: string): Promise<Quote | null> {
  const row = await prisma.quote.findUnique({
    where: { codigo },
    include: { lead: { select: { codigo: true } } },
  });
  if (!row) return null;
  return { ...toQuote(row), leadId: row.lead.codigo };
}

async function nextQuoteCodigo(year: number): Promise<string> {
  const last = await prisma.quote.findFirst({
    where: { codigo: { startsWith: `COT-${year}-` } },
    orderBy: { codigo: 'desc' },
  });
  const n = last ? Number(last.codigo.slice(-3)) : 0;
  return `COT-${year}-${String(n + 1).padStart(3, '0')}`;
}

export type QuoteInput = {
  leadCodigo: string;
  anio: number;
  mes: string;
  dirigidoA: string;
  fechaCotizacion: Date | string;
  cliente: string;
  producto?: string | null;
  servicio: string;
  monto: number;
  moneda: Moneda;
  estado: EstadoCotizacion;
  remitente: string;
  observacion?: string | null;
  linkPropuesta?: string | null;
};

export async function createQuote(input: QuoteInput): Promise<Quote> {
  const lead = await prisma.lead.findUnique({ where: { codigo: input.leadCodigo } });
  if (!lead) throw new Error(`Lead "${input.leadCodigo}" no existe`);

  const fechaCotizacion =
    input.fechaCotizacion instanceof Date ? input.fechaCotizacion : new Date(input.fechaCotizacion);

  const codigo = await nextQuoteCodigo(input.anio);

  const created = await prisma.quote.create({
    data: {
      codigo,
      leadId:        lead.id,
      anio:          input.anio,
      mes:           input.mes,
      dirigidoA:     input.dirigidoA,
      fechaCotizacion,
      cliente:       input.cliente,
      producto:      input.producto ?? null,
      servicio:      input.servicio,
      monto:         input.monto,
      moneda:        input.moneda,
      estado:        input.estado,
      remitente:     input.remitente,
      observacion:   input.observacion ?? null,
      linkPropuesta: input.linkPropuesta ?? null,
    },
    include: { lead: { select: { codigo: true } } },
  });

  // Si lead estaba "nuevo", impulsar a "en_proceso" automáticamente
  if (lead.estado === 'nuevo') {
    await prisma.lead.update({
      where: { id: lead.id },
      data:  { estado: 'en_proceso' },
    });
    revalidatePath('/pipeline');
  }

  revalidatePath('/quotes');
  return { ...toQuote(created), leadId: created.lead.codigo };
}

export async function updateQuoteEstado(
  codigo: string,
  estado: EstadoCotizacion,
): Promise<Quote> {
  const updated = await prisma.quote.update({
    where: { codigo },
    data: { estado },
    include: { lead: { select: { codigo: true } } },
  });
  revalidatePath('/quotes');
  return { ...toQuote(updated), leadId: updated.lead.codigo };
}
