'use server';

import { mockContacts } from '@/src/lib/mockData';
import type { Contact } from '@/src/types/crm';

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

export async function listContacts(): Promise<Contact[]> {
  console.info('[MOCK] listContacts');
  return mockContacts;
}

export async function getContactByCodigo(id: string): Promise<Contact | null> {
  console.info('[MOCK] getContactByCodigo', id);
  return mockContacts.find(c => c.id === id) || null;
}

export async function createContact(input: ContactInput): Promise<Contact> {
  console.info('[MOCK] createContact', input);
  return mockContacts[0];
}

export async function updateContact(id: string, input: ContactInput): Promise<Contact> {
  console.info('[MOCK] updateContact', id, input);
  const idx = mockContacts.findIndex(c => c.id === id);
  if (idx === -1) throw new Error('Contacto no encontrado');
  mockContacts[idx] = {
    ...mockContacts[idx],
    ...Object.fromEntries(
      Object.entries(input).map(([k, v]) => [k, v === null ? undefined : v])
    ),
  } as Contact;
  return mockContacts[idx];
}
