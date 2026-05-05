'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/src/store/authStore';
import Sidebar from '@/src/components/Sidebar';
import LoginPage from '@/src/components/LoginPage';
import TopBar from '@/src/components/TopBar';
import { getMsalInstance } from '@/src/lib/msalConfig';
import { useToast } from '@/src/components/ui/Toast';
import { useKeepAlive } from '@/src/hooks/useKeepAlive';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, userEmail, setMsToken, setMsAccountUsername } = useAuthStore();
  const { showToast } = useToast();
  // Mantiene la DB de Neon despierta con un ping cada 4 min mientras
  // el usuario tenga la app abierta. Evita el "DB durmió" durante demos.
  useKeepAlive();
  /**
   * Guard against hydration mismatch.
   *
   * The zustand `persist` middleware reads `localStorage` only on the client,
   * so the server always sees isAuthenticated=false and renders <LoginPage>,
   * while a returning user's browser sees isAuthenticated=true and renders the
   * full shell. Those two trees disagree → hydration error.
   *
   * Solution: render nothing on the first pass (matches the server's empty
   * pre-render). After the component mounts (client only), flip `mounted` to
   * true and let the real auth-dependent UI appear.
   */
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const handleRedirect = async () => {
      try {
        const msalInstance = await getMsalInstance();
        const response = await msalInstance.handleRedirectPromise();
        if (response && response.accessToken && response.account) {
          setMsToken(response.accessToken);
          setMsAccountUsername(response.account.username);
          showToast('Cuenta de Microsoft conectada exitosamente', 'success');
        }
      } catch (error) {
        console.error('Error handling MSAL redirect:', error);
      }
    };
    handleRedirect();
  }, [setMsToken, setMsAccountUsername, showToast, userEmail]);

  if (!mounted) {
    // Render a blank screen that matches what the server sends.
    // This avoids any tree-shape mismatch during hydration.
    return null;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="flex min-h-screen bg-app-bg font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 p-6 overflow-x-hidden animate-fade-in">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
