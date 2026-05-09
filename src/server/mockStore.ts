import { PublicUser, ResetToken } from './types';

export let MOCK_USERS: (PublicUser & { passwordHash: string })[] = [
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

export const resetTokens = new Map<string, ResetToken>();
