import { listOrganizations } from '@/src/server/actions/organizations';
import { listContacts } from '@/src/server/actions/contacts';
import { listLeads } from '@/src/server/actions/leads';
import { listQuotes } from '@/src/server/actions/quotes';
import OrganizationsClient from './OrganizationsClient';

export const dynamic = 'force-dynamic';

export default async function OrganizationsPage() {
  const [orgs, contacts, leads, quotes] = await Promise.all([
    listOrganizations(),
    listContacts(),
    listLeads(),
    listQuotes(),
  ]);

  return (
    <OrganizationsClient
      initialOrgs={orgs}
      contacts={contacts}
      leads={leads}
      quotes={quotes}
    />
  );
}
