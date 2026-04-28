import type { Activity, Lead } from '@/src/types/crm';

export type DerivedActivityStatus = 'pendiente' | 'realizada' | 'vencida';

export function getActivityStatus(activity: Activity): DerivedActivityStatus {
  if (activity.estado === 'realizada') return 'realizada';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const activityDate = new Date(activity.fecha);
  activityDate.setHours(0, 0, 0, 0);

  if (activityDate.getTime() < today.getTime()) return 'vencida';
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
