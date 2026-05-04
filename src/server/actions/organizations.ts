'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/src/server/db';
import { toOrganization } from '@/src/server/transformers';
import type { Organization } from '@/src/types/crm';

export async function listOrganizations(): Promise<Organization[]> {
  const rows = await prisma.organization.findMany({
    orderBy: { codigo: 'asc' },
  });
  return rows.map(toOrganization);
}

export async function getOrganizationByCodigo(codigo: string): Promise<Organization | null> {
  const row = await prisma.organization.findUnique({ where: { codigo } });
  return row ? toOrganization(row) : null;
}

async function nextOrgCodigo(): Promise<string> {
  const year = new Date().getFullYear();
  const last = await prisma.organization.findFirst({
    where: { codigo: { startsWith: `ORG-${year}-` } },
    orderBy: { codigo: 'desc' },
  });
  const lastN = last ? Number(last.codigo.slice(-3)) : 0;
  // Si no hay ORG del año actual, sigue desde el ORG total
  if (!last) {
    const totalLast = await prisma.organization.findFirst({
      orderBy: { codigo: 'desc' },
    });
    const totalN = totalLast ? Number(totalLast.codigo.slice(-3)) : 0;
    return `ORG-${year}-${String(totalN + 1).padStart(3, '0')}`;
  }
  return `ORG-${year}-${String(lastN + 1).padStart(3, '0')}`;
}

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

export async function createOrganization(input: OrganizationInput): Promise<Organization> {
  if (!input.nombre?.trim()) throw new Error('El nombre es obligatorio');

  const codigo = await nextOrgCodigo();
  const created = await prisma.organization.create({
    data: {
      codigo,
      ruc:             input.ruc ?? null,
      nombre:          input.nombre.trim(),
      nombreCompleto:  input.nombreCompleto ?? null,
      area:            input.area ?? null,
      tipo:            input.tipo ?? null,
      tamano:          input.tamano ?? null,
      sector:          input.sector ?? null,
      ubicacion:       input.ubicacion ?? null,
      linkedin:        input.linkedin ?? null,
      alianzas:        input.alianzas ?? [],
      actividades:     input.actividades ?? null,
      contactoVigente: input.contactoVigente ?? true,
    },
  });
  revalidatePath('/organizations');
  return toOrganization(created);
}

export async function updateOrganization(
  codigo: string,
  patch: Partial<OrganizationInput>,
): Promise<Organization> {
  const updated = await prisma.organization.update({
    where: { codigo },
    data: {
      ...(patch.ruc !== undefined && { ruc: patch.ruc }),
      ...(patch.nombre !== undefined && { nombre: patch.nombre }),
      ...(patch.nombreCompleto !== undefined && { nombreCompleto: patch.nombreCompleto }),
      ...(patch.area !== undefined && { area: patch.area }),
      ...(patch.tipo !== undefined && { tipo: patch.tipo }),
      ...(patch.tamano !== undefined && { tamano: patch.tamano }),
      ...(patch.sector !== undefined && { sector: patch.sector }),
      ...(patch.ubicacion !== undefined && { ubicacion: patch.ubicacion }),
      ...(patch.linkedin !== undefined && { linkedin: patch.linkedin }),
      ...(patch.alianzas !== undefined && { alianzas: patch.alianzas }),
      ...(patch.actividades !== undefined && { actividades: patch.actividades }),
      ...(patch.contactoVigente !== undefined && { contactoVigente: patch.contactoVigente }),
    },
  });
  revalidatePath('/organizations');
  return toOrganization(updated);
}
