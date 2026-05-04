'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/src/store/authStore';
import { Eye, EyeOff, Leaf } from 'lucide-react';
import { mockUsers } from '@/src/lib/mockData';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    await new Promise((r) => setTimeout(r, 600));

    // Demo authentication: check if user exists in mockUsers
    // Para la demo, cualquier contraseña es válida (ej. '123456')
    const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (user) {
      if (user.active === false) {
        setError('Esta cuenta está inactiva. Contacta al administrador.');
      } else {
        const timeStr = new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
        user.lastLogin = `Hoy ${timeStr}`;
        login('demo-token-bioactiva', user.email, user.name, user.rol);
        router.push('/');
      }
    } else {
      setError('Correo no encontrado. Usa un correo de la lista de usuarios.');
    }

    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0f2d1a 0%, #1C7E3C 50%, #24a34e 100%)' }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${120 + i * 80}px`,
              height: `${120 + i * 80}px`,
              background: 'rgba(188,247,179,0.05)',
              top: `${10 + i * 12}%`,
              left: `${5 + i * 15}%`,
              animation: `pulse-green ${3 + i}s infinite`,
            }}
          />
        ))}
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Card */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.97)', boxShadow: '0 32px 80px rgba(0,0,0,0.3)' }}>
          {/* Header */}
          <div className="px-8 pt-8 pb-6" style={{ background: 'linear-gradient(135deg, #1C7E3C, #24a34e)' }}>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Bioactiva CRM</h1>
                <p className="text-xs" style={{ color: '#BCF7B3' }}>Gestión comercial inteligente</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
            <div>
              <p className="text-lg font-bold mb-1" style={{ color: '#0f2d1a' }}>Iniciar sesión</p>
              <p className="text-sm" style={{ color: '#4a7c5e' }}>Accede a tu cuenta para continuar</p>
            </div>

            {error && (
              <div className="rounded-lg px-4 py-2.5 text-sm font-medium" style={{ background: '#fff5f5', color: '#c53030', border: '1px solid #fed7d7' }}>
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#4a7c5e' }}>Correo electrónico</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ border: '1.5px solid #c8edcf', background: '#f8fdf6', color: '#0f2d1a' }}
                placeholder="correo@bioactiva.pe"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#4a7c5e' }}>Contraseña</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-11 rounded-xl text-sm outline-none transition-all"
                  style={{ border: '1.5px solid #c8edcf', background: '#f8fdf6', color: '#0f2d1a' }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60"
              style={{ background: loading ? '#4a7c5e' : 'linear-gradient(135deg, #1C7E3C, #24a34e)' }}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
