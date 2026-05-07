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

const MOCK_USERS: (PublicUser & { passwordHash: string })[] = [
  {
    id: 'mock-admin',
    email: 'admin@bioactiva.pe',
    name: 'Administrador Bioactiva',
    role: 'Administrador',
    active: true,
    lastLogin: new Date(),
    createdAt: new Date('2025-01-01'),
    passwordHash: 'Bioactiva2025!'
  },
  {
    id: 'mock-worker-1',
    email: 'trabajador1@bioactiva.pe',
    name: 'Juan Trabajador',
    role: 'Trabajador',
    active: true,
    lastLogin: new Date(),
    createdAt: new Date('2025-02-01'),
    passwordHash: 'Bioactiva2025!'
  },
  {
    id: 'mock-worker-2',
    email: 'trabajador2@bioactiva.pe',
    name: 'Maria Vendedora',
    role: 'Trabajador',
    active: true,
    lastLogin: new Date(),
    createdAt: new Date('2025-02-05'),
    passwordHash: 'Bioactiva2025!'
  },
  {
    id: 'mock-worker-3',
    email: 'trabajador3@bioactiva.pe',
    name: 'Carlos Soporte',
    role: 'Trabajador',
    active: true,
    lastLogin: new Date(),
    createdAt: new Date('2025-02-10'),
    passwordHash: 'Bioactiva2025!'
  }
];

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
