import { NextRequest, NextResponse } from 'next/server';
import { mockLeads } from '@/src/lib/mockData';

// In-memory store (replace with DB in production)
let leads = [...mockLeads];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const estado = searchParams.get('estado');
  const encargado = searchParams.get('encargado');
  const canal = searchParams.get('canal');

  let result = leads;
  if (estado) result = result.filter(l => l.estado === estado);
  if (encargado) result = result.filter(l => l.encargado === encargado);
  if (canal) result = result.filter(l => l.canal === canal);

  return NextResponse.json(result);
}
