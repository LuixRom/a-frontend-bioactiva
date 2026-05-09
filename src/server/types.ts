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

export type ResetToken = {
  email: string;
  token: string;
  estado: 'activo' | 'usado' | 'expirado';
  fechaExpiracion: Date;
};
