import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getToken, getUserEmail, getUserName, setToken, clearToken } from '@/src/core/auth';

type AuthState = {
  token: string | null;
  userEmail: string | null;
  userName: string | null;
  role: 'Administrador' | 'Trabajador' | null;
  isAuthenticated: boolean;
  msToken: string | null;
  msAccountUsername: string | null;
  login: (token: string, email: string, name: string, role: 'Administrador' | 'Trabajador') => void;
  logout: () => void;
  setMsToken: (token: string | null) => void;
  setMsAccountUsername: (username: string | null) => void;
};

const getInitialMsToken = () => {
  if (typeof window !== 'undefined') {
    try {
      // Limpiar token viejo y genérico para que la prueba sea limpia
      localStorage.removeItem('ms-token');

      const persisted = localStorage.getItem('auth-store');
      if (persisted) {
        const state = JSON.parse(persisted)?.state;
        const email = state?.userEmail;
        if (email) {
          return localStorage.getItem(`ms-token-${email}`) || null;
        }
      }
    } catch (e) {}
  }
  return null;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: getToken(),
      userEmail: getUserEmail(),
      userName: getUserName(),
      role: null,
      isAuthenticated: !!getToken(),
      msToken: getInitialMsToken(),
      msAccountUsername: null,
      login: (token, email, name, role) => {
        setToken(token, email, name);
        set({ token, userEmail: email, userName: name, role, isAuthenticated: true });
        // After login, try to recover the specific msToken for this user
        if (typeof window !== 'undefined' && email) {
          const storedToken = localStorage.getItem(`ms-token-${email}`);
          if (storedToken) set({ msToken: storedToken });
        }
      },
      logout: () => {
        if (typeof window !== 'undefined') {
          const email = get().userEmail;
          const key = email ? `ms-token-${email}` : 'ms-token';
          localStorage.removeItem(key);

          // Limpiar también todo el estado de MSAL en localStorage al hacer logout
          Object.keys(localStorage)
            .filter(key => key.startsWith('msal.'))
            .forEach(key => localStorage.removeItem(key));

          // Limpiar sessionStorage por si acaso
          Object.keys(sessionStorage)
            .filter(key => key.startsWith('msal.'))
            .forEach(key => sessionStorage.removeItem(key));
        }
        clearToken();
        set({ token: null, userEmail: null, userName: null, role: null, isAuthenticated: false, msToken: null, msAccountUsername: null });
      },
      setMsToken: (token) => {
        if (typeof window !== 'undefined') {
          const email = get().userEmail;
          const key = email ? `ms-token-${email}` : 'ms-token';
          if (token) localStorage.setItem(key, token);
          else localStorage.removeItem(key);
        }
        set({ msToken: token });
      },
      setMsAccountUsername: (username) => {
        set({ msAccountUsername: username });
      },
    }),
    { name: 'auth-store' }
  )
);
