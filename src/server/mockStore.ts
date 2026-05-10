import { PublicUser, ResetToken } from './types';

export let MOCK_USERS: (PublicUser & { passwordHash: string })[] = [
  {
    id: 'admin@bioactiva.pe',
    email: 'admin@bioactiva.pe',
    name: 'Administración',
    role: 'Administrador',
    active: true,
    lastLogin: new Date(),
    createdAt: new Date('2025-01-01'),
    passwordHash: 'Bioactiva2025!'
  },
  {
    id: 'karien@bioactiva.pe',
    email: 'karien@bioactiva.pe',
    name: 'Karien Diaz',
    role: 'Trabajador',
    active: true,
    lastLogin: new Date(),
    createdAt: new Date('2025-01-10'),
    passwordHash: 'Bioactiva2025!'
  },
  {
    id: 'ltorres@bioactiva.pe',
    email: 'ltorres@bioactiva.pe',
    name: 'Luis Torres',
    role: 'Trabajador',
    active: true,
    lastLogin: new Date(),
    createdAt: new Date('2025-01-15'),
    passwordHash: 'Bioactiva2025!'
  },
  {
    id: 'arojas@bioactiva.pe',
    email: 'arojas@bioactiva.pe',
    name: 'Ana Rojas',
    role: 'Trabajador',
    active: true,
    lastLogin: new Date(),
    createdAt: new Date('2025-02-01'),
    passwordHash: 'Bioactiva2025!'
  },
  {
    id: 'mquispe@bioactiva.pe',
    email: 'mquispe@bioactiva.pe',
    name: 'María Quispe',
    role: 'Trabajador',
    active: true,
    lastLogin: new Date(),
    createdAt: new Date('2025-02-05'),
    passwordHash: 'Bioactiva2025!'
  },
  {
    id: 'cmamani@bioactiva.pe',
    email: 'cmamani@bioactiva.pe',
    name: 'Carlos Mamani',
    role: 'Trabajador',
    active: true,
    lastLogin: new Date(),
    createdAt: new Date('2025-02-10'),
    passwordHash: 'Bioactiva2025!'
  },
];

export const resetTokens = new Map<string, ResetToken>();
