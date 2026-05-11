import { mockOrganizations, mockContacts, mockQuotes } from '@/src/lib/mockData';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  return (
    <DashboardClient
      organizations={mockOrganizations}
      contacts={mockContacts}
      quotes={mockQuotes}
    />
  );
}
