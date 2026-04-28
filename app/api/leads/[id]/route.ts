import { NextRequest, NextResponse } from 'next/server';
import { mockLeads } from '@/src/lib/mockData';
import type { Activity } from '@/src/types/crm';

// In-memory store (replace with DB in production)
let leads = [...mockLeads];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const lead = leads.find(l => l.id === id);
  if (!lead) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();

  const idx = leads.findIndex(l => l.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });

  leads[idx] = { ...leads[idx], ...body };
  return NextResponse.json(leads[idx]);
}
