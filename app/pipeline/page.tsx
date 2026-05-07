import { mockLeads, mockOrganizations, mockContacts } from '@/src/lib/mockData';
import PipelineClient from './PipelineClient';

export const dynamic = 'force-dynamic';

interface PipelinePageProps {
  searchParams: Promise<{ prefillContact?: string }>;
}

export default async function PipelinePage({ searchParams }: PipelinePageProps) {
  const { prefillContact } = await searchParams;
  
  let prefill: { organizacionCodigo?: string; contactoCodigo?: string } | null = null;
  if (prefillContact) {
    const c = mockContacts.find(c => c.id === prefillContact);
    if (c) {
      prefill = {
        contactoCodigo:     c.id,
        organizacionCodigo: c.organizacionId,
      };
    }
  }

  return (
    <PipelineClient
      initialLeads={mockLeads}
      organizations={mockOrganizations}
      contacts={mockContacts}
      prefill={prefill}
    />
  );
}
