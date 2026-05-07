import { NextResponse } from 'next/server';
import { mockLeads, mockOrganizations, mockContacts, mockQuotes } from '@/src/lib/mockData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  // Modo MOCK activo para evitar caídas por DB
  return NextResponse.json({
    status: 'ok',
    mode: 'mock',
    counts: {
      orgs: mockOrganizations.length,
      contacts: mockContacts.length,
      leads: mockLeads.length,
      quotes: mockQuotes.length,
    },
    timestamp: new Date().toISOString(),
  });
}
