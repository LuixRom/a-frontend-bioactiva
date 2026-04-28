interface CalendarEvent {
  titulo: string;
  descripcion: string;
  fecha: Date;
  duracionMinutos?: number;
}

export function generateGoogleCalendarLink(event: CalendarEvent): string {
  const start = formatGCalDate(event.fecha);
  const end = formatGCalDate(
    new Date(event.fecha.getTime() + (event.duracionMinutos || 60) * 60000)
  );

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.titulo,
    details: event.descripcion,
    dates: `${start}/${end}`,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function formatGCalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}
