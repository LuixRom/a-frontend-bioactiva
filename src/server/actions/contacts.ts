'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/src/server/db';
import { toContact } from '@/src/server/transformers';
import type { Contact } from '@/src/types/crm';

/**
 * Devuelve todos los contactos. El frontend espera `organizacionId` con
 * el código humano (ORG-2025-001), así que mapeamos el cuid interno al
 * código antes de devolver.
 */
export async function listContacts(): Promise<Contact[]> {
  const rows = await prisma.contact.findMany({
    orderBy: { codigo: 'asc' },
    include: { organizacion: { select: { codigo: true } } },
  });
  return rows.map((row) => ({
    ...toContact(row),
    organizacionId: row.organizacion.codigo,
  }));
}

export async function getContactByCodigo(codigo: string): Promise<Contact | null> {
  const row = await prisma.contact.findUnique({
    where: { codigo },
    include: { organizacion: { select: { codigo: true } } },
  });
  if (!row) return null;
  return {
    ...toContact(row),
    organizacionId: row.organizacion.codigo,
  };
}

async function nextContactCodigo(): Promise<string> {
  // Códigos del Excel son "ID00001"; mantenemos ese formato para nuevos.
  const last = await prisma.contact.findFirst({
    where: { codigo: { startsWith: 'ID' } },
    orderBy: { codigo: 'desc' },
  });
  const n = last ? Number(last.codigo.replace(/\D/g, '')) : 0;
  return `ID${String(n + 1).padStart(5, '0')}`;
}

export type ContactInput = {
  organizacionCodigo: string; // código humano de la org
  vocativo?: string | null;
  nombres: string;
  apellidos: string;
  correo1?: string | null;
  correo2?: string | null;
  telefono?: string | null;
  cargo?: string | null;
  comentarios?: string | null;
};

export async function createContact(input: ContactInput): Promise<Contact> {
  if (!input.nombres?.trim() || !input.apellidos?.trim()) {
    throw new Error('Nombres y apellidos son obligatorios');
  }

  const org = await prisma.organization.findUnique({
    where: { codigo: input.organizacionCodigo },
  });
  if (!org) throw new Error(`Organización "${input.organizacionCodigo}" no existe`);

  const codigo = await nextContactCodigo();
  const created = await prisma.contact.create({
    data: {
      codigo,
      organizacionId: org.id,
      vocativo:    input.vocativo ?? null,
      nombres:     input.nombres.trim(),
      apellidos:   input.apellidos.trim(),
      correo1:     input.correo1 ?? null,
      correo2:     input.correo2 ?? null,
      telefono:    input.telefono ?? null,
      cargo:       input.cargo ?? null,
      comentarios: input.comentarios ?? null,
    },
    include: { organizacion: { select: { codigo: true } } },
  });
  revalidatePath('/contacts');
  return {
    ...toContact(created),
    organizacionId: created.organizacion.codigo,
  };
}
