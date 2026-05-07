import { mockQuotes, mockLeads, mockOrganizations, mockContacts } from '@/src/lib/mockData';
import QuotesClient from './QuotesClient';

export const dynamic = 'force-dynamic';

export default async function QuotesPage() {
  return (
    <QuotesClient
      initialQuotes={mockQuotes}
      leads={mockLeads}
      organizations={mockOrganizations}
      contacts={mockContacts}
    />
  );
}
