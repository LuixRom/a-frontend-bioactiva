import { NextRequest, NextResponse } from 'next/server';
import { generateNotifications } from '@/src/server/actions/notifications';

/**
 * Endpoint para disparar la generación de notificaciones internas.
 * Puede ser llamado por un CRON externo o un proceso programado.
 */
export async function POST(req: NextRequest) {
  try {
    const res = await generateNotifications();
    
    if (res.success) {
      return NextResponse.json({
        ok: true,
        createdCount: res.createdCount,
        message: 'Proceso de notificaciones completado con éxito',
      });
    } else {
      return NextResponse.json({
        ok: false,
        error: res.error,
      }, { status: 500 });
    }
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: 'Error interno ejecutando el proceso de notificaciones',
    }, { status: 500 });
  }
}
