import { mockOrganizations, mockContacts, mockLeads, mockQuotes } from '@/src/lib/mockData';
import OrganizationsClient from './OrganizationsClient';

export const dynamic = 'force-dynamic';

export default async function OrganizationsPage() {
  return (
    <OrganizationsClient
      initialOrgs={mockOrganizations}
      contacts={mockContacts}
      leads={mockLeads}
      quotes={mockQuotes}
    />
  );
}
