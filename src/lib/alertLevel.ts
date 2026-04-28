/**
 * Calcula el nivel de alerta para la próxima actividad de un lead.
 */
export function getAlertLevel(fecha?: Date | string): 'none' | 'warning' | 'danger' {
  if (!fecha) return 'none';
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const target = new Date(fecha);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - hoy.getTime();
  const diff = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'danger';
  if (diff <= 3) return 'warning';
  return 'none';
}
