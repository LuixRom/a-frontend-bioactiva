import { listQuotes } from '@/src/server/actions/quotes';
import { listLeads } from '@/src/server/actions/leads';
import { listOrganizations } from '@/src/server/actions/organizations';
import { listContacts } from '@/src/server/actions/contacts';
import QuotesClient from './QuotesClient';

export const dynamic = 'force-dynamic';

export default async function QuotesPage() {
  const [quotes, leads, organizations, contacts] = await Promise.all([
    listQuotes(),
    listLeads(),
    listOrganizations(),
    listContacts(),
  ]);

  return (
    <QuotesClient
      initialQuotes={quotes}
      leads={leads}
      organizations={organizations}
      contacts={contacts}
    />
  );
}
