import { NextRequest, NextResponse } from 'next/server';
import { mockOrganizations, mockContacts, mockLeads } from '@/src/lib/mockData';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  if (!q || q.length < 2) {
    return NextResponse.json({ organizations: [], contacts: [], leads: [] });
  }

  const query = q.toLowerCase();

  const organizations = mockOrganizations.filter(o =>
    o.nombre.toLowerCase().includes(query) ||
    o.ruc?.includes(query) ||
    o.sector?.toLowerCase().includes(query)
  ).slice(0, 5);

  const contacts = mockContacts.filter(c =>
    `${c.nombres} ${c.apellidos}`.toLowerCase().includes(query) ||
    c.correo1?.toLowerCase().includes(query) ||
    c.cargo?.toLowerCase().includes(query)
  ).slice(0, 5);

  const leads = mockLeads.filter(l =>
    l.id.toLowerCase().includes(query) ||
    l.servicioInteres?.toLowerCase().includes(query) ||
    l.encargado?.toLowerCase().includes(query)
  ).slice(0, 3);

  return NextResponse.json({ organizations, contacts, leads });
}
