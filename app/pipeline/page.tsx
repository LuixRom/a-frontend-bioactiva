import { listLeads } from '@/src/server/actions/leads';
import { listOrganizations } from '@/src/server/actions/organizations';
import { listContacts } from '@/src/server/actions/contacts';
import PipelineClient from './PipelineClient';

export const dynamic = 'force-dynamic';

export default async function PipelinePage() {
  const [leads, organizations, contacts] = await Promise.all([
    listLeads(),
    listOrganizations(),
    listContacts(),
  ]);

  return (
    <PipelineClient
      initialLeads={leads}
      organizations={organizations}
      contacts={contacts}
    />
  );
}
