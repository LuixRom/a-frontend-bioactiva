import type { Activity, Lead } from '@/src/types/crm';

export type DerivedActivityStatus = 'pendiente' | 'realizada' | 'vencida';

export function getActivityStatus(activity: Activity): DerivedActivityStatus {
  if (activity.estado === 'realizada') return 'realizada';

  const raw = new Date(activity.fecha);
  // Dates stored as UTC midnight (old format) appear as previous local day in UTC-offset timezones.
  // Shift them to UTC noon so toLocaleDateString gives the intended calendar date.
  const adjusted =
    raw.getUTCHours() === 0 && raw.getUTCMinutes() === 0 && raw.getUTCSeconds() === 0
      ? new Date(Date.UTC(raw.getUTCFullYear(), raw.getUTCMonth(), raw.getUTCDate(), 12))
      : raw;

  const todayStr = new Date().toLocaleDateString('en-CA');
  const actStr = adjusted.toLocaleDateString('en-CA');

  if (actStr < todayStr) return 'vencida';
  return 'pendiente';
}

export function getNextPendingActivity(activities: Activity[]): Activity | null {
  const pending = activities
    .filter(activity => getActivityStatus(activity) !== 'realizada')
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  return pending[0] ?? null;
}

export function syncLeadNextActivity(lead: Lead): Lead {
  const nextActivity = getNextPendingActivity(lead.actividades);

  return {
    ...lead,
    proximaActividad: nextActivity?.nota ?? undefined,
    fechaProximaActividad: nextActivity ? new Date(nextActivity.fecha) : undefined,
  };
}
