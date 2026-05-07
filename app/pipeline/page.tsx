import { listLeads } from '@/src/server/actions/leads';
import { listOrganizations } from '@/src/server/actions/organizations';
import {
  listContacts,
  getContactByCodigo,
} from '@/src/server/actions/contacts';
import PipelineClient from './PipelineClient';

export const dynamic = 'force-dynamic';

interface PipelinePageProps {
  searchParams: Promise<{ prefillContact?: string }>;
}

/**
 * El query param `prefillContact=ID00007` viene de la página de Contactos
 * cuando el usuario hace click en "Crear lead desde este contacto". Lo
 * resolvemos en el server (validación + obtener org del contacto) y
 * pasamos el prefill al client.
 */
export default async function PipelinePage({ searchParams }: PipelinePageProps) {
  const { prefillContact } = await searchParams;
  const [leads, organizations, contacts] = await Promise.all([
    listLeads(),
    listOrganizations(),
    listContacts(),
  ]);

  let prefill: { organizacionCodigo?: string; contactoCodigo?: string } | null = null;
  if (prefillContact) {
    const c = await getContactByCodigo(prefillContact);
    if (c) {
      prefill = {
        contactoCodigo:     c.id,
        organizacionCodigo: c.organizacionId,
      };
    }
  }

  return (
    <PipelineClient
      initialLeads={leads}
      organizations={organizations}
      contacts={contacts}
      prefill={prefill}
    />
  );
}
