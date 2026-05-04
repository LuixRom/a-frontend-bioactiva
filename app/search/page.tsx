import { listOrganizations } from '@/src/server/actions/organizations';
import { listContacts } from '@/src/server/actions/contacts';
import { listLeads } from '@/src/server/actions/leads';
import { listQuotes } from '@/src/server/actions/quotes';
import SearchClient from './SearchClient';

export const dynamic = 'force-dynamic';

export default async function SearchPage() {
  const [organizations, contacts, leads, quotes] = await Promise.all([
    listOrganizations(),
    listContacts(),
    listLeads(),
    listQuotes(),
  ]);

  return (
    <SearchClient
      organizations={organizations}
      contacts={contacts}
      leads={leads}
      quotes={quotes}
    />
  );
}
