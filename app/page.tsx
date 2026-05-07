import { mockLeads, mockOrganizations, mockContacts, mockQuotes } from '@/src/lib/mockData';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Volvemos a usar datos mock para estabilidad inmediata
  return (
    <DashboardClient
      initialLeads={mockLeads}
      organizations={mockOrganizations}
      contacts={mockContacts}
      quotes={mockQuotes}
    />
  );
}
