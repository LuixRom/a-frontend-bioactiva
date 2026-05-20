import { mockOrganizations, mockContacts, mockQuotes, mockLeads } from '@/src/lib/mockData';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  return (
    <DashboardClient
      initialLeads={mockLeads}
      organizations={mockOrganizations}
      contacts={mockContacts}
      quotes={mockQuotes}
    />
  );
}
