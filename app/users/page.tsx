import { mockUsers } from '@/src/lib/mockData';
import UsersClient from './UsersClient';
import type { PublicUser } from '@/src/server/actions/users';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  // Transformamos mockUsers al formato PublicUser esperado por el cliente
  const users: PublicUser[] = mockUsers.map(u => ({
    id: u.id.toString(),
    email: u.email,
    name: u.name,
    role: u.rol as any, // Mapeo simple de rol
    active: u.active,
    lastLogin: u.lastLogin.includes('Hoy') ? new Date() : new Date('2026-05-01'),
    createdAt: new Date('2026-01-01'),
  }));

  return <UsersClient initialUsers={users} />;
}
