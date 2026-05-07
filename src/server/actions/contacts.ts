'use server';

import { mockContacts } from '@/src/lib/mockData';
import type { Contact } from '@/src/types/crm';

export type ContactInput = {
  organizacionId: string; // ID de la org
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

export async function getContactById(id: string): Promise<Contact | null> {
  console.info('[MOCK] getContactById', id);
  return mockContacts.find(c => c.id === id) || null;
}

export async function createContact(input: ContactInput): Promise<Contact> {
  console.info('[MOCK] createContact', input);
  return mockContacts[0];
}
