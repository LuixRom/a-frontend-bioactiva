import { mockContacts, mockOrganizations, mockLeads } from '@/src/lib/mockData';
import ContactsClient from './ContactsClient';

export const dynamic = 'force-dynamic';

export default async function ContactsPage() {
  return (
    <ContactsClient
      initialContacts={mockContacts}
      organizations={mockOrganizations}
      leads={mockLeads}
    />
  );
}
