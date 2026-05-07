'use server';

import { mockOrganizations } from '@/src/lib/mockData';
import type { Organization } from '@/src/types/crm';

export type OrganizationInput = {
  ruc?: string | null;
  nombre: string;
  nombreCompleto?: string | null;
  area?: string | null;
  tipo?: string | null;
  tamano?: string | null;
  sector?: string | null;
  ubicacion?: string | null;
  linkedin?: string | null;
  alianzas?: string[];
  actividades?: string | null;
  contactoVigente?: boolean;
};

export async function listOrganizations(): Promise<Organization[]> {
  console.info('[MOCK] listOrganizations');
  return mockOrganizations;
}

export async function getOrganizationById(id: string): Promise<Organization | null> {
  console.info('[MOCK] getOrganizationById', id);
  return mockOrganizations.find(o => o.id === id) || null;
}

export async function createOrganization(input: OrganizationInput): Promise<Organization> {
  console.info('[MOCK] createOrganization', input);
  return mockOrganizations[0];
}

export async function updateOrganization(
  id: string,
  patch: Partial<OrganizationInput>,
): Promise<Organization> {
  console.info('[MOCK] updateOrganization', id, patch);
  const org = mockOrganizations.find(o => o.id === id);
  if (!org) throw new Error('Organización no encontrada');
  return { ...org, ...patch } as any;
}
