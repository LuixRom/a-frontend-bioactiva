import { getInvitationByToken } from '@/src/server/actions/invitations';
import ActivationForm from './ActivationForm';
import { AlertCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { connection } from 'next/server';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ActivatePage({ params }: PageProps) {
  await connection();
  const { token } = await params;
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
          <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto border border-red-100 shadow-sm">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-text">Invitación no válida</h1>
            <p className="text-text-muted leading-relaxed">
              El enlace que has seguido no es válido o ya ha sido utilizado para activar una cuenta.
            </p>
          </div>
          <Link 
            href="/login" 
            className="inline-block px-8 py-3 bg-surface border border-border-subtle rounded-xl text-sm font-bold text-text hover:bg-app-bg transition-all"
          >
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    );
  }

  if (invitation.isExpired) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
          <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto border border-amber-100 shadow-sm">
            <Clock className="w-10 h-10 text-amber-500" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-text">Enlace expirado</h1>
            <p className="text-text-muted leading-relaxed">
              El tiempo para definir las credenciales venció y necesita volver a solicitar el correo.
            </p>
          </div>
          <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50 text-xs text-amber-800 text-left italic">
            Nota: Los enlaces de invitación tienen una vigencia de 24 horas por seguridad.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center p-4">
      <ActivationForm token={token} email={invitation.email} />
    </div>
  );
}
