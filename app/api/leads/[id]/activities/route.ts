import { NextRequest, NextResponse } from 'next/server';
import { mockLeads } from '@/src/lib/mockData';
import type { Activity } from '@/src/types/crm';
import { syncLeadNextActivity } from '@/src/lib/activityStatus';

const leads = [...mockLeads];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json() as Omit<Activity, 'id' | 'fechaCompletada'>;

  const idx = leads.findIndex(l => l.id === id);
  if (idx === -1) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });

  const newActivity: Activity = {
    id: `ACT-${Date.now()}`,
    tipo: body.tipo,
    estado: body.estado,
    nota: body.nota,
    responsable: body.responsable,
    fechaInicio: new Date(body.fechaInicio),
    fechaFin: body.fechaFin ? new Date(body.fechaFin) : undefined,
    fechaCompletada: body.estado === 'realizada' ? new Date(body.fechaInicio) : undefined,
    linkReunion: body.linkReunion,
  };

  leads[idx] = syncLeadNextActivity({
    ...leads[idx],
    actividades: [newActivity, ...leads[idx].actividades],
  });

  return NextResponse.json(newActivity, { status: 201 });
}
