import type { Lead } from '@/src/types/crm';
import { getAlertLevel } from '@/src/lib/alertLevel';

export async function checkAndNotify(lead: Lead): Promise<void> {
  if (!lead.fechaProximaActividad || !lead.encargadoEmail) return;

  const level = getAlertLevel(lead.fechaProximaActividad);
  // Only notify if activity is due within 3 days (warning or danger)
  if (level === 'none') return;

  try {
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        encargadoEmail: lead.encargadoEmail,
        encargadoNombre: lead.encargado,
        leadId: lead.id,
        organizacion: lead.organizacionId,
        proximaActividad: lead.proximaActividad,
        fecha: new Date(lead.fechaProximaActividad).toLocaleDateString('es-PE'),
      }),
    });
  } catch (err) {
    // Notification failure is non-blocking
    console.warn('[checkAndNotify] Failed to send notification:', err);
  }
}
