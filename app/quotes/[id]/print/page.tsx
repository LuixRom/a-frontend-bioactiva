import { notFound } from 'next/navigation';
import { getQuoteByCodigo } from '@/src/server/actions/quotes';
import { getLeadByCodigo } from '@/src/server/actions/leads';
import { getOrganizationByCodigo } from '@/src/server/actions/organizations';
import PrintView from './PrintView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function QuotePrintPage({ params }: PageProps) {
  const { id } = await params;
  const quote = await getQuoteByCodigo(id);
  if (!quote) notFound();

  const lead = await getLeadByCodigo(quote.leadId);
  const org  = lead ? await getOrganizationByCodigo(lead.organizacionId) : null;

  return <PrintView quote={quote} lead={lead} organizacion={org} />;
}
