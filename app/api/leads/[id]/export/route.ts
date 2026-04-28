import { NextRequest, NextResponse } from 'next/server';
import { mockLeads, mockOrganizations, mockContacts } from '@/src/lib/mockData';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const lead = mockLeads.find(l => l.id === id);
  if (!lead) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });

  const org = mockOrganizations.find(o => o.id === lead.organizacionId);
  const contact = mockContacts.find(c => c.id === lead.contactoId);

  const rows = [
    {
      id: lead.id,
      estado: lead.estado,
      organizacion: org?.nombre ?? '',
      ruc: org?.ruc ?? '',
      contacto: contact ? `${contact.nombres} ${contact.apellidos}` : '',
      encargado: lead.encargado ?? '',
      canal: lead.canal ?? '',
      servicio: lead.servicioInteres ?? '',
      proximaActividad: lead.proximaActividad ?? '',
      fechaProximaActividad: lead.fechaProximaActividad?.toISOString().split('T')[0] ?? '',
      creadoEn: lead.creadoEn.toISOString().split('T')[0],
    },
  ];

  const headers = Object.keys(rows[0]);
  const csvRows = rows.map(r =>
    headers.map(h => {
      const v = String((r as Record<string, string>)[h] ?? '');
      return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(',')
  );
  const csv = '\uFEFF' + [headers.join(','), ...csvRows].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv;charset=utf-8;',
      'Content-Disposition': `attachment; filename="${id}-export.csv"`,
    },
  });
}
