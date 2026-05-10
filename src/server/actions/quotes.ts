'use server';

import { mockQuotes } from '@/src/lib/mockData';
import type { Quote } from '@/src/types/crm';
import type { EstadoCotizacion, Moneda } from '@/src/lib/constants';

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

export async function listQuotes(): Promise<Quote[]> {
  console.info('[MOCK] listQuotes');
  return mockQuotes;
}

export async function getQuoteByCodigo(id: string): Promise<Quote | null> {
  console.info('[MOCK] getQuoteByCodigo', id);
  return mockQuotes.find(q => q.id === id) || null;
}

export async function createQuote(input: QuoteInput): Promise<Quote> {
  console.info('[MOCK] createQuote', input);
  const id = `COT-${new Date().getFullYear()}-${String(mockQuotes.length + 1).padStart(3, '0')}`;
  const newQuote: Quote = {
    id,
    leadId:          input.leadCodigo,
    anio:            input.anio,
    mes:             input.mes,
    dirigidoA:       input.dirigidoA,
    fechaCotizacion: new Date(input.fechaCotizacion),
    cliente:         input.cliente,
    producto:        input.producto ?? undefined,
    servicio:        input.servicio,
    monto:           input.monto,
    moneda:          input.moneda,
    estado:          input.estado,
    remitente:       input.remitente,
    observacion:     input.observacion ?? undefined,
    linkPropuesta:   input.linkPropuesta ?? undefined,
    creadoEn:        new Date(),
  };
  return newQuote;
}

export async function updateQuoteEstado(
  id: string,
  estado: EstadoCotizacion,
): Promise<Quote> {
  console.info('[MOCK] updateQuoteEstado', id, estado);
  const quote = mockQuotes.find(q => q.id === id);
  if (!quote) throw new Error('Cotización no encontrada');
  return { ...quote, estado };
}
