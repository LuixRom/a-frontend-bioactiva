'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/src/store/authStore';
import { getMsalInstance, loginRequest } from '@/src/lib/msalConfig';
import { CheckCircle2, User as UserIcon, Link2, ExternalLink } from 'lucide-react';
import { useToast } from '@/src/components/ui/Toast';

export default function ProfilePage() {
  const { userName, userEmail, role, msToken, setMsToken } = useAuthStore();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Sincronizar store con localStorage al montar para Next.js hydration
    if (typeof window !== 'undefined' && userEmail) {
      const savedToken = localStorage.getItem(`ms-token-${userEmail}`);
      if (savedToken && savedToken !== msToken) {
        setMsToken(savedToken);
      }
    }
  }, [msToken, setMsToken, userEmail]);

  const handleConnectMicrosoft = async () => {
    setLoading(true);
    try {
      const msalInstance = await getMsalInstance();
      await msalInstance.loginRedirect(loginRequest);
    } catch (error: any) {
      if (error.errorCode === 'interaction_in_progress' || error.message?.includes('interaction_in_progress')) {
        // Limpiar estado de MSAL en sessionStorage
        Object.keys(sessionStorage)
          .filter(key => key.startsWith('msal.'))
          .forEach(key => sessionStorage.removeItem(key));
        // Limpiar estado de MSAL en localStorage por si acaso
        Object.keys(localStorage)
          .filter(key => key.startsWith('msal.'))
          .forEach(key => localStorage.removeItem(key));

        // Reintentar
        const msalInstance = await getMsalInstance();
        await msalInstance.loginRedirect(loginRequest);
      } else {
        console.error(error);
        showToast('Error al conectar con Microsoft', 'error');
        setLoading(false);
      }
    }
  };

  const handleDisconnect = () => {
    setMsToken(null);
    showToast('Cuenta de Microsoft desconectada', 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <h1 className="text-xl font-bold" style={{ color: '#0f2d1a' }}>Perfil de Usuario</h1>

      {/* Info card */}
      <div className="bg-surface rounded-2xl p-6 border border-border-subtle shadow-sm flex items-center gap-6">
        <div className="w-20 h-20 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
          <UserIcon className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-text">{userName}</h2>
          <p className="text-text-muted mt-1">{userEmail}</p>
          <span className="inline-block mt-3 px-3 py-1 bg-green-50 text-green-700 font-bold text-xs uppercase tracking-wider rounded-lg">
            {role}
          </span>
        </div>
      </div>

      {/* Integrations section */}
      <div className="bg-surface rounded-2xl border border-border-subtle shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border-subtle">
          <h3 className="text-lg font-bold text-text flex items-center gap-2">
            <Link2 className="w-5 h-5 text-text-muted" /> Integraciones
          </h3>
          <p className="text-sm text-text-muted mt-1">Conecta herramientas externas para expandir las capacidades del CRM.</p>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between p-5 border border-border-subtle rounded-xl bg-app-bg/30">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#EAEBFA] rounded-xl flex items-center justify-center flex-shrink-0">
                {/* MS Teams stylized icon */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 6C14 7.65685 12.6569 9 11 9C9.34315 9 8 7.65685 8 6C8 4.34315 9.34315 3 11 3C12.6569 3 14 4.34315 14 6Z" fill="#5059C9"/>
                  <path d="M20 7C20 8.10457 19.1046 9 18 9C16.8954 9 16 8.10457 16 7C16 5.89543 16.8954 5 18 5C19.1046 5 20 5.89543 20 7Z" fill="#7B83EB"/>
                  <path d="M14 14.5C14 16.9853 11.9853 19 9.5 19C7.01472 19 5 16.9853 5 14.5C5 12.567 6.25329 10.9262 8 10.25V10H11C12.6569 10 14 11.3431 14 13V14.5Z" fill="#5059C9"/>
                  <path d="M19.5 18C18.6716 18 18 17.3284 18 16.5V13.5C18 12.6716 17.3284 12 16.5 12H13.75C14.5267 12.6738 15 13.5284 15 14.5V16C15 17.1046 15.8954 18 17 18H19.5Z" fill="#7B83EB"/>
                </svg>
              </div>
              <div>
                <h4 className="text-base font-bold text-text">Microsoft Teams</h4>
                <p className="text-xs text-text-muted mt-1 max-w-md">Permite crear reuniones reales de Teams y generar enlaces de forma automática desde las actividades del CRM.</p>
              </div>
            </div>

            <div>
              {msToken ? (
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Microsoft conectado</span>
                  </div>
                  <button 
                    onClick={handleDisconnect}
                    className="text-[10px] font-bold text-text-muted hover:text-red-500 hover:underline"
                  >
                    Desconectar cuenta
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnectMicrosoft}
                  disabled={loading}
                  className="px-5 py-2.5 bg-[#5059C9] hover:bg-[#4048A8] text-white text-sm font-semibold rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {loading ? 'Conectando...' : 'Conectar con Microsoft'}
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
