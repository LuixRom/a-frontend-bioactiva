'use server';

import type { UserRole } from '@/src/lib/constants';
import { MOCK_USERS } from '../mockStore';
import type { PublicUser } from '../types';

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

export async function listUsers(): Promise<PublicUser[]> {
  return MOCK_USERS.map(({ passwordHash, ...u }) => u);
}

export async function findUserByEmail(email: string): Promise<PublicUser | null> {
  console.info('[MOCK] findUserByEmail', email);
  const user = MOCK_USERS.find(u => u.email === email);
  if (!user) return null;
  const { passwordHash, ...publicUser } = user;
  return publicUser;
}

export async function createUser(input: UserCreateInput): Promise<PublicUser> {
  const newUser = {
    ...MOCK_USERS[0],
    id: `mock-${Date.now()}`,
    email: input.email,
    name: input.name,
    role: input.role
  };
  return newUser;
}

export async function updateUser(id: string, patch: UserUpdateInput): Promise<PublicUser> {
  const user = MOCK_USERS.find(u => u.id === id) || MOCK_USERS[0];
  return { ...user, ...patch };
}

export async function updateUserPassword(id: string, newPassword: string): Promise<{ ok: true }> {
  const userIndex = MOCK_USERS.findIndex(u => u.id === id);
  if (userIndex !== -1) {
    MOCK_USERS[userIndex].passwordHash = newPassword;
  }
  return { ok: true };
}

export async function deleteUser(id: string): Promise<{ ok: true }> {
  return { ok: true };
}

export async function verifyCredentials(email: string, password: string): Promise<PublicUser | null> {
  console.info('[MOCK] verifyCredentials', email);
  const user = MOCK_USERS.find(u => u.email === email && u.passwordHash === password);
  if (user) {
    const { passwordHash, ...publicUser } = user;
    return publicUser;
  }
  return null;
}
