import { create } from 'zustand';
import { mockUsers as initialUsers, CRMUser } from '@/src/lib/mockData';

type UsersState = {
  users: CRMUser[];
  setUsers: (users: CRMUser[]) => void;
  addUser: (user: CRMUser) => void;
  updateUser: (user: CRMUser) => void;
  deleteUser: (id: number) => void;
};

export const useUsersStore = create<UsersState>((set) => {
  // Try to load any users from localStorage first if we want persistence
  let localUsers: CRMUser[] = [...initialUsers];
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('crm-users');
    if (saved) {
      try {
        localUsers = JSON.parse(saved);
        // Sync with initialUsers for fallback compatibility
        initialUsers.length = 0;
        initialUsers.push(...localUsers);
      } catch (e) {
        console.error(e);
      }
    }
  }

  const save = (arr: CRMUser[]) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('crm-users', JSON.stringify(arr));
    }
  };

  return {
    users: localUsers,
    setUsers: (users) => {
      initialUsers.length = 0;
      initialUsers.push(...users);
      save(users);
      set({ users });
    },
    addUser: (newUser) => set((state) => {
      const updated = [...state.users, newUser];
      initialUsers.length = 0;
      initialUsers.push(...updated);
      save(updated);
      return { users: updated };
    }),
    updateUser: (updatedUser) => set((state) => {
      const updated = state.users.map(u => u.id === updatedUser.id ? updatedUser : u);
      initialUsers.length = 0;
      initialUsers.push(...updated);
      save(updated);
      return { users: updated };
    }),
    deleteUser: (id) => set((state) => {
      const updated = state.users.filter(u => u.id !== id);
      initialUsers.length = 0;
      initialUsers.push(...updated);
      save(updated);
      return { users: updated };
    }),
  };
});
