import { listUsers } from '@/src/server/actions/users';
import type { PublicUser } from '@/src/server/types';
import { listInvitations } from '@/src/server/actions/invitations';
import UsersClient from './UsersClient';
import { mockUsers } from '@/src/lib/mockData';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  let users: PublicUser[] = [];
  let invitations: any[] = [];

  try {
    users = await listUsers();
    invitations = await listInvitations();
  } catch (err) {
    console.error('Database unreachable in UsersPage, using mock data:', err);
    // Transformamos mockUsers al formato PublicUser esperado por el cliente
    users = mockUsers.map(u => ({
      id: u.id.toString(),
      email: u.email,
      name: u.name,
      role: u.rol as any,
      active: u.active,
      lastLogin: u.lastLogin.includes('Hoy') ? new Date() : new Date('2026-05-01'),
      createdAt: new Date('2026-01-01'),
    }));
    invitations = []; // No hay mocks para invitaciones por ahora
  }

  return <UsersClient initialUsers={users} initialInvitations={invitations} />;
}
