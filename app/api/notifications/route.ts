import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const {
    encargadoEmail,
    encargadoNombre,
    leadId,
    organizacion,
    proximaActividad,
    fecha,
  } = await req.json();

  if (!encargadoEmail || !leadId) {
    return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
  }
  console.info('[notifications] Demo mode, email sending disabled', {
    encargadoEmail,
    encargadoNombre,
    leadId,
    organizacion,
    proximaActividad,
    fecha,
  });

  return NextResponse.json({
    ok: true,
    mode: 'demo',
    message: 'Notificación registrada sin envío de correo',
  });
}
