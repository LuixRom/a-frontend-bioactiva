'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { User, KeyRound, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { activateUser } from '@/src/server/actions/invitations';
import { useToast } from '@/src/components/ui/Toast';

interface ActivationFormProps {
  token: string;
  email: string;
}

export default function ActivationForm({ token, email }: ActivationFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    name: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.lastName.trim() || !formData.password) {
      showToast('Todos los campos son obligatorios', 'error');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showToast('Las contraseñas no coinciden', 'error');
      return;
    }

    if (formData.password.length < 6) {
      showToast('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    startTransition(async () => {
      try {
        await activateUser(
          token, 
          formData.name, 
          formData.lastName, 
          formData.password
        );
        showToast('¡Cuenta activada correctamente!', 'success');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Error al activar cuenta', 'error');
      }
    });
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-3xl font-black text-text">Activa tu cuenta</h1>
        <p className="text-text-muted">
          Completa tus datos para empezar a usar <span className="text-primary font-bold">Bioactiva CRM</span>
        </p>
        <div className="mt-4 px-4 py-2 bg-app-bg rounded-xl border border-border-subtle inline-block">
          <p className="text-xs font-bold text-text-muted truncate max-w-xs">{email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 bg-surface p-8 rounded-3xl border border-border-subtle shadow-premium">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black text-text-muted uppercase tracking-widest">Nombre</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
              placeholder="Tu nombre"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-black text-text-muted uppercase tracking-widest">Apellido</label>
            <input
              type="text"
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
              placeholder="Tu apellido"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black text-text-muted uppercase tracking-widest">Contraseña</label>
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full pl-11 pr-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black text-text-muted uppercase tracking-widest">Confirmar Contraseña</label>
          <input
            type="password"
            required
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className="w-full px-4 py-3 bg-app-bg/30 border border-border-subtle rounded-xl text-sm outline-none focus:border-primary transition-all"
            placeholder="Repite tu contraseña"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Activando...
            </>
          ) : (
            'Activar Cuenta'
          )}
        </button>
      </form>
    </div>
  );
}
