import { NextRequest, NextResponse } from 'next/server';
import { addActivity } from '@/src/server/actions/leads';
import type { Activity } from '@/src/types/crm';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await req.json()) as Omit<Activity, 'id' | 'fechaCompletada'> & {
    linkReunion?: string;
  };

  try {
    const activity = await addActivity(id, {
      tipo:        body.tipo,
      estado:      body.estado,
      nota:        body.nota,
      responsable: body.responsable,
      fecha:       body.fecha,
    });
    // El campo linkReunion del body de main viene del flujo Teams; si llega
    // lo adjuntamos al cuerpo de respuesta como extra (no se persiste todavía
    // — schema lo agregará en una iteración futura).
    return NextResponse.json(
      { ...activity, linkReunion: body.linkReunion },
      { status: 201 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al crear actividad' },
      { status: 400 },
    );
  }
}
