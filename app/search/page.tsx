import { mockOrganizations, mockContacts, mockLeads, mockQuotes } from '@/src/lib/mockData';
import SearchClient from './SearchClient';

export const dynamic = 'force-dynamic';

export default async function SearchPage() {
  return (
    <SearchClient
      organizations={mockOrganizations}
      contacts={mockContacts}
      leads={mockLeads}
      quotes={mockQuotes}
    />
  );
}
