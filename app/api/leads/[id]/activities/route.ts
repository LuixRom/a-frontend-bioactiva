import { NextRequest, NextResponse } from 'next/server';
import { mockLeads } from '@/src/lib/mockData';
import type { Activity } from '@/src/types/crm';

let leads = [...mockLeads];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json() as Omit<Activity, 'id' | 'fecha'>;

  const idx = leads.findIndex(l => l.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });

  const newActivity: Activity = {
    id: `ACT-${Date.now()}`,
    tipo: body.tipo,
    nota: body.nota,
    responsable: body.responsable,
    fecha: new Date(),
  };

  leads[idx] = {
    ...leads[idx],
    actividades: [newActivity, ...leads[idx].actividades],
  };

  return NextResponse.json(newActivity, { status: 201 });
}
