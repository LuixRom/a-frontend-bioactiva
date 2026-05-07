import { listUsers } from '@/src/server/actions/users';
import UsersClient from './UsersClient';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const users = await listUsers();
  return <UsersClient initialUsers={users} />;
}
