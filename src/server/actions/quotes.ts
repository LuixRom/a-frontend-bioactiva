'use server';

import { mockQuotes } from '@/src/lib/mockData';
import type { Quote } from '@/src/types/crm';
import type { EstadoCotizacion, Moneda } from '@/src/lib/constants';

export type QuoteInput = {
  leadId: string;
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

export async function getQuoteById(id: string): Promise<Quote | null> {
  console.info('[MOCK] getQuoteById', id);
  return mockQuotes.find(q => q.id === id) || null;
}

export async function createQuote(input: QuoteInput): Promise<Quote> {
  console.info('[MOCK] createQuote', input);
  return mockQuotes[0];
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
