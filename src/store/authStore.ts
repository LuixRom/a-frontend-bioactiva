import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getToken, getUserEmail, getUserName, setToken, clearToken } from '@/src/core/auth';

type AuthState = {
  token: string | null;
  userEmail: string | null;
  userName: string | null;
  isAuthenticated: boolean;
  login: (token: string, email: string, name: string) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: getToken(),
      userEmail: getUserEmail(),
      userName: getUserName(),
      isAuthenticated: !!getToken(),
      login: (token, email, name) => {
        setToken(token, email, name);
        set({ token, userEmail: email, userName: name, isAuthenticated: true });
      },
      logout: () => {
        clearToken();
        set({ token: null, userEmail: null, userName: null, isAuthenticated: false });
      },
    }),
    { name: 'auth-store' }
  )
);
