import { listContacts } from '@/src/server/actions/contacts';
import { listOrganizations } from '@/src/server/actions/organizations';
import { listLeads } from '@/src/server/actions/leads';
import ContactsClient from './ContactsClient';

export const dynamic = 'force-dynamic';

export default async function ContactsPage() {
  const [contacts, organizations, leads] = await Promise.all([
    listContacts(),
    listOrganizations(),
    listLeads(),
  ]);

  return (
    <ContactsClient
      initialContacts={contacts}
      organizations={organizations}
      leads={leads}
    />
  );
}
