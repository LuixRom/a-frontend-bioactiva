'use server';

import type { UserRole } from '@/src/lib/constants';

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  lastLogin: Date | null;
  createdAt: Date;
};

export type UserCreateInput = {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  active?: boolean;
};

export type UserUpdateInput = {
  email?: string;
  name?: string;
  role?: UserRole;
  active?: boolean;
};

const MOCK_USER: PublicUser = {
  id: 'mock-user-123',
  email: 'admin@bioactiva.pe',
  name: 'Administrador Bioactiva',
  role: 'Administrador',
  active: true,
  lastLogin: new Date(),
  createdAt: new Date('2025-01-01'),
};

export async function listUsers(): Promise<PublicUser[]> {
  return [MOCK_USER];
}

export async function findUserByEmail(email: string): Promise<PublicUser | null> {
  console.info('[MOCK] findUserByEmail', email);
  return MOCK_USER;
}

export async function createUser(input: UserCreateInput): Promise<PublicUser> {
  return { ...MOCK_USER, email: input.email, name: input.name, role: input.role };
}

export async function updateUser(id: string, patch: UserUpdateInput): Promise<PublicUser> {
  return { ...MOCK_USER, ...patch };
}

export async function updateUserPassword(id: string, newPassword: string): Promise<{ ok: true }> {
  return { ok: true };
}

export async function deleteUser(id: string): Promise<{ ok: true }> {
  return { ok: true };
}

export async function verifyCredentials(email: string, password: string): Promise<PublicUser | null> {
  console.info('[MOCK] verifyCredentials', email);
  if (email === 'admin@bioactiva.pe' && password === 'Bioactiva2025!') {
    return MOCK_USER;
  }
  return null;
}
