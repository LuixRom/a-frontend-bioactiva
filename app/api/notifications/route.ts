import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const { data, error } = await resend.emails.send({
    from: 'BioActiva CRM <crm@bioactiva.pe>',
    to: encargadoEmail,
    subject: `Recordatorio de actividad — ${organizacion}`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px; color: #0f2d1a;">
        <h2 style="color: #1C7E3C;">Recordatorio de actividad</h2>
        <p>Hola ${encargadoNombre || 'equipo'},</p>
        <p>Tienes una actividad pendiente para el lead <strong>${leadId}</strong>:</p>
        <div style="background:#f1ffec;border-left:4px solid #1C7E3C;padding:12px 16px;border-radius:4px;margin:16px 0;">
          <strong>Organización:</strong> ${organizacion}<br/>
          <strong>Actividad:</strong> ${proximaActividad}<br/>
          <strong>Fecha:</strong> ${fecha}
        </div>
        <p>Ingresa al CRM para actualizar el estado del lead.</p>
        <a href="${appUrl}/pipeline"
           style="display:inline-block;background:#1C7E3C;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">
          Ver en el CRM
        </a>
      </div>
    `,
  });

  if (error) {
    console.error('[notifications] Resend error:', error);
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id });
}
