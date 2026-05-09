'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Leaf, ArrowLeft, Mail, CheckCircle, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { requestPasswordReset, validateResetToken, resetPassword } from '@/src/server/actions/auth';

type ViewState = 'form' | 'enviado' | 'nueva-contrasena' | 'error-token';

function RecuperarContrasenaContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token');

  const [view, setView] = useState<ViewState>('form');
  const [email, setEmail] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successEmail, setSuccessEmail] = useState('');

  // Efecto para detectar el token en la URL
  useEffect(() => {
    if (tokenFromUrl) {
      const verify = async () => {
        setLoading(true);
        const result = await validateResetToken(tokenFromUrl);
        setLoading(false);
        if (result.success) {
          setView('nueva-contrasena');
          setSuccessEmail(result.email || '');
        } else {
          setError(result.error || 'Token inválido');
          setView('error-token');
        }
      };
      verify();
    }
  }, [tokenFromUrl]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validación básica en cliente
    if (!email.includes('@')) {
      setError('Ingrese un correo válido.');
      return;
    }

    setLoading(true);
    try {
      const result = await requestPasswordReset(email);
      if (result.success) {
        setView('enviado');
      } else {
        setError(result.error || 'Error inesperado');
      }
    } catch (err) {
      setError('No se pudo enviar el correo. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones en cliente
    if (nuevaContrasena !== confirmacion) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    const hasUpperCase = /[A-Z]/.test(nuevaContrasena);
    const hasNumber = /[0-9]/.test(nuevaContrasena);
    
    if (nuevaContrasena.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (!hasUpperCase) {
      setError('La contraseña debe tener al menos una mayúscula.');
      return;
    }
    if (!hasNumber) {
      setError('La contraseña debe tener al menos un número.');
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(tokenFromUrl!, nuevaContrasena, confirmacion);
      if (result.success) {
        router.push('/?mensaje=contrasena-actualizada');
      } else {
        setError(result.error || 'Error al actualizar la contraseña');
      }
    } catch (err) {
      setError('Error inesperado al procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0f2d1a 0%, #1C7E3C 50%, #24a34e 100%)' }}
    >
      {/* Fondo decorativo igual a LoginPage */}
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
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.97)', boxShadow: '0 32px 80px rgba(0,0,0,0.3)' }}>
          {/* Header */}
          <div className="px-8 pt-8 pb-6" style={{ background: 'linear-gradient(135deg, #1C7E3C, #24a34e)' }}>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <Leaf className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Bioactiva CRM</h1>
              </div>
            </div>
          </div>

          <div className="px-8 py-7">
            {view === 'form' && (
              <form onSubmit={handleRequestReset} className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold mb-1" style={{ color: '#0f2d1a' }}>Recuperar contraseña</h2>
                  <p className="text-sm" style={{ color: '#4a7c5e' }}>Ingresa tu correo y te enviaremos un enlace de recuperación.</p>
                </div>

                {error && (
                  <div className="rounded-lg px-4 py-2.5 text-sm font-medium" style={{ background: '#fff5f5', color: '#c53030', border: '1px solid #fed7d7' }}>
                    {error}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#4a7c5e' }}>Correo electrónico</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{ border: '1.5px solid #c8edcf', background: '#f8fdf6', color: '#0f2d1a' }}
                    placeholder="correo@bioactiva.pe"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60"
                  style={{ background: loading ? '#4a7c5e' : 'linear-gradient(135deg, #1C7E3C, #24a34e)' }}
                >
                  {loading ? 'Enviando...' : 'Enviar enlace'}
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="w-full flex items-center justify-center gap-2 text-xs font-medium transition-colors hover:underline"
                  style={{ color: '#4a7c5e' }}
                >
                  <ArrowLeft className="w-3 h-3" />
                  Volver al inicio de sesión
                </button>
              </form>
            )}

            {view === 'enviado' && (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#f0fff4' }}>
                    <Mail className="w-8 h-8" style={{ color: '#1C7E3C' }} />
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-bold mb-1" style={{ color: '#0f2d1a' }}>Correo enviado</h2>
                  <p className="text-sm px-4" style={{ color: '#4a7c5e' }}>
                    Revisa tu bandeja de entrada. El enlace de recuperación expira en 30 minutos.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setView('form')}
                    className="text-sm font-semibold transition-colors hover:underline"
                    style={{ color: '#1C7E3C' }}
                  >
                    Reenviar correo
                  </button>
                  <div className="border-t border-gray-100 pt-3">
                    <button
                      type="button"
                      onClick={() => router.push('/')}
                      className="flex items-center justify-center gap-2 w-full text-xs font-medium transition-colors hover:underline"
                      style={{ color: '#4a7c5e' }}
                    >
                      <ArrowLeft className="w-3 h-3" />
                      Volver al inicio de sesión
                    </button>
                  </div>
                </div>
              </div>
            )}

            {view === 'nueva-contrasena' && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold mb-1" style={{ color: '#0f2d1a' }}>Nueva contraseña</h2>
                  <p className="text-sm" style={{ color: '#4a7c5e' }}>Para <strong>{successEmail}</strong></p>
                </div>

                {error && (
                  <div className="rounded-lg px-4 py-2.5 text-sm font-medium" style={{ background: '#fff5f5', color: '#c53030', border: '1px solid #fed7d7' }}>
                    {error}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#4a7c5e' }}>Nueva contraseña</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={nuevaContrasena}
                      onChange={(e) => setNuevaContrasena(e.target.value)}
                      required
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
                  <p className="text-[10px] pl-1" style={{ color: '#4a7c5e' }}>8+ caracteres, una mayúscula y un número.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#4a7c5e' }}>Confirmar contraseña</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={confirmacion}
                    onChange={(e) => setConfirmacion(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{ border: '1.5px solid #c8edcf', background: '#f8fdf6', color: '#0f2d1a' }}
                    placeholder="••••••••"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60"
                  style={{ background: loading ? '#4a7c5e' : 'linear-gradient(135deg, #1C7E3C, #24a34e)' }}
                >
                  {loading ? 'Guardando...' : 'Guardar contraseña'}
                </button>
              </form>
            )}

            {view === 'error-token' && (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#fff5f5' }}>
                    <AlertCircle className="w-8 h-8" style={{ color: '#c53030' }} />
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-bold mb-1" style={{ color: '#0f2d1a' }}>Enlace no válido</h2>
                  <p className="text-sm px-4" style={{ color: '#4a7c5e' }}>
                    {error || 'El enlace de recuperación ha expirado o ya ha sido utilizado.'}
                  </p>
                </div>
                
                <button
                  type="button"
                  onClick={() => setView('form')}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200"
                  style={{ background: 'linear-gradient(135deg, #1C7E3C, #24a34e)' }}
                >
                  Solicitar nuevo enlace
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="flex items-center justify-center gap-2 w-full text-xs font-medium transition-colors hover:underline"
                  style={{ color: '#4a7c5e' }}
                >
                  <ArrowLeft className="w-3 h-3" />
                  Volver al inicio de sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RecuperarContrasenaPage() {
  return (
    <Suspense fallback={null}>
      <RecuperarContrasenaContent />
    </Suspense>
  );
}
