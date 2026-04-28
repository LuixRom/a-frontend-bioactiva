import { compareTwoStrings } from 'string-similarity';
import type { Organization, Contact } from '@/src/types/crm';
import type { OrganizationImport, ContactImport } from '@/src/lib/excel-mapper';

export type RowStatus = 'nuevo' | 'duplicado_exacto' | 'duplicado_similar' | 'ok';

export interface PreviewRow<T = OrganizationImport | ContactImport> {
  data: T;
  status: RowStatus;
  conflictWith?: string;
  message?: string;
  omit: boolean;   // user-controlled — default true for exacto, false for similar
}

// 85% similarity threshold
const THRESHOLD = 0.85;

function bestMatch(query: string, targets: string[]): { index: number; rating: number } | null {
  if (targets.length === 0) return null;
  let best = { index: 0, rating: 0 };
  targets.forEach((t, i) => {
    const rating = compareTwoStrings(query.toLowerCase(), t.toLowerCase());
    if (rating > best.rating) best = { index: i, rating };
  });
  return best;
}

export function detectDuplicateOrgs(
  incoming: OrganizationImport[],
  existing: Organization[]
): PreviewRow<OrganizationImport>[] {
  return incoming.map(org => {
    // 1. Exact match by RUC
    if (org.ruc) {
      const byRuc = existing.find(e => e.ruc === org.ruc);
      if (byRuc) return {
        data: org,
        status: 'duplicado_exacto',
        conflictWith: byRuc.id,
        message: `RUC ${org.ruc} ya existe como "${byRuc.nombre}"`,
        omit: true,
      };
    }

    // 2. Fuzzy name match
    const names = existing.map(e => e.nombre);
    const best = bestMatch(org.nombre, names);
    if (best && best.rating >= THRESHOLD) {
      const matched = existing[best.index];
      return {
        data: org,
        status: 'duplicado_similar',
        conflictWith: matched.id,
        message: `Nombre similar a "${matched.nombre}" (${Math.round(best.rating * 100)}% coincidencia)`,
        omit: false,
      };
    }

    return { data: org, status: 'nuevo', omit: false };
  });
}

export function detectDuplicateContacts(
  incoming: ContactImport[],
  existing: Contact[]
): PreviewRow<ContactImport>[] {
  return incoming.map(contact => {
    // 1. Exact match by email
    if (contact.correo1) {
      const byEmail = existing.find(e => e.correo1 === contact.correo1);
      if (byEmail) return {
        data: contact,
        status: 'duplicado_exacto',
        conflictWith: byEmail.id,
        message: `Correo "${contact.correo1}" ya existe`,
        omit: true,
      };
    }

    // 2. Fuzzy full-name match
    const fullName = `${contact.nombres} ${contact.apellidos}`.trim();
    const existingNames = existing.map(e => `${e.nombres} ${e.apellidos}`.trim());
    const best = bestMatch(fullName, existingNames);
    if (best && best.rating >= THRESHOLD) {
      const matched = existing[best.index];
      return {
        data: contact,
        status: 'duplicado_similar',
        conflictWith: matched.id,
        message: `Nombre similar a "${matched.nombres} ${matched.apellidos}"`,
        omit: false,
      };
    }

    return { data: contact, status: 'nuevo', omit: false };
  });
}
