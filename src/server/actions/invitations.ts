'use server';

import type { UserRole } from '@/src/lib/constants';

export type UserInvitationPublic = {
  id: string;
  email: string;
  role: UserRole;
  expiresAt: Date;
  used: Boolean;
  createdAt: Date;
  status: 'Enviada' | 'Expirada' | 'Activada';
};

export async function listInvitations(): Promise<UserInvitationPublic[]> {
  console.info('[MOCK] listInvitations');
  return [
    {
      id: 'inv-1',
      email: 'trabajador1@bioactiva.pe',
      role: 'Trabajador',
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      used: false,
      createdAt: new Date(),
      status: 'Enviada',
    }
  ];
}

export async function inviteUser(email: string, role: UserRole) {
  console.info('[MOCK] inviteUser', email, role);
  return { success: true };
}

export async function getInvitationByToken(token: string) {
  console.info('[MOCK] getInvitationByToken', token);
  // Simular que cualquier token "demo" es válido
  if (token === 'expired') {
    return { id: 'inv-exp', email: 'exp@bioactiva.pe', role: 'Trabajador' as UserRole, isExpired: true };
  }
  return {
    id: 'inv-demo',
    email: 'nuevo-usuario@bioactiva.pe',
    role: 'Trabajador' as UserRole,
    isExpired: false,
  };
}

export async function activateUser(
  token: string, 
  name: string, 
  lastName: string, 
  password: string
) {
  console.info('[MOCK] activateUser', { name, lastName });
  return { success: true, email: 'nuevo-usuario@bioactiva.pe' };
}
