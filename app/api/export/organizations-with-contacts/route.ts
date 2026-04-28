import { NextResponse } from 'next/server';
import { mockOrganizations, mockContacts } from '@/src/lib/mockData';

export async function GET() {
  // Flatten: one row per org-contact combination
  const rows = mockOrganizations.flatMap(org => {
    const orgContacts = mockContacts.filter(c => c.organizacionId === org.id);
    if (orgContacts.length === 0) {
      return [{
        org_internalId: org.id,
        org_nombre: org.nombre,
        org_ruc: org.ruc ?? '',
        org_sector: org.sector ?? '',
        org_area: org.area ?? '',
        contact_nombres: '',
        contact_apellidos: '',
        contact_correo1: '',
        contact_cargo: '',
      }];
    }
    return orgContacts.map(c => ({
      org_internalId: org.id,
      org_nombre: org.nombre,
      org_ruc: org.ruc ?? '',
      org_sector: org.sector ?? '',
      org_area: org.area ?? '',
      contact_nombres: c.nombres,
      contact_apellidos: c.apellidos,
      contact_correo1: c.correo1 ?? '',
      contact_cargo: c.cargo ?? '',
    }));
  });

  const headers = Object.keys(rows[0]);
  const csvRows = rows.map(r =>
    headers.map(h => {
      const v = String((r as Record<string, string>)[h] ?? '');
      return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(',')
  );
  const csv = '\uFEFF' + [headers.join(','), ...csvRows].join('\n');
  const date = new Date().toISOString().split('T')[0];

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv;charset=utf-8;',
      'Content-Disposition': `attachment; filename="bioactiva-orgs-contactos-${date}.csv"`,
    },
  });
}
