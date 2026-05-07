import { listLeads } from '@/src/server/actions/leads';
import { listOrganizations } from '@/src/server/actions/organizations';
import { listContacts } from '@/src/server/actions/contacts';
import { listQuotes } from '@/src/server/actions/quotes';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [leads, organizations, contacts, quotes] = await Promise.all([
    listLeads(),
    listOrganizations(),
    listContacts(),
    listQuotes(),
  ]);

  return (
    <DashboardClient
      initialLeads={leads}
      organizations={organizations}
      contacts={contacts}
      quotes={quotes}
    />
  );
}
