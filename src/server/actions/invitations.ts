'use server';

import { revalidatePath } from 'next/cache';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/src/server/db';
import { Resend } from 'resend';
import type { UserRole } from '@prisma/client';

const resend = new Resend(process.env.RESEND_API_KEY);
const DOMAIN = '@bioactiva.pe';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export type UserInvitationPublic = {
  id: string;
  email: string;
  role: UserRole;
  expiresAt: Date;
  used: Boolean;
  createdAt: Date;
  status: 'Enviada' | 'Expirada' | 'Activada';
};

/**
 * Lista todas las invitaciones para el panel de administración.
 */
export async function listInvitations(): Promise<UserInvitationPublic[]> {
  const now = new Date();
  const rows = await prisma.userInvitation.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return rows.map(r => {
    let status: UserInvitationPublic['status'] = 'Enviada';
    if (r.used) status = 'Activada';
    else if (r.expiresAt < now) status = 'Expirada';

    return {
      id: r.id,
      email: r.email,
      role: r.role,
      expiresAt: r.expiresAt,
      used: r.used,
      createdAt: r.createdAt,
      status,
    };
  });
}

/**
 * Envía una invitación a un nuevo correo.
 */
export async function inviteUser(email: string, role: UserRole) {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Validaciones básicas
  if (!cleanEmail || !role) {
    throw new Error('Campos obligatorios para el envío del correo');
  }

  // 2. Validación de dominio
  if (!cleanEmail.endsWith(DOMAIN)) {
    throw new Error('El correo no pertenece al dominio');
  }

  // 3. Validar si ya existe como usuario
  const existingUser = await prisma.user.findUnique({
    where: { email: cleanEmail },
  });
  if (existingUser) {
    throw new Error('El correo ya está registrado');
  }

  // Generar token y expiración (24h)
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  // 4. Guardar o actualizar invitación (si ya existía una previa no usada)
  const invitation = await prisma.userInvitation.upsert({
    where: { email: cleanEmail },
    update: {
      token,
      role,
      expiresAt,
      used: false,
    },
    create: {
      email: cleanEmail,
      token,
      role,
      expiresAt,
    },
  });

  // 5. Enviar correo vía Resend
  const activationLink = `${APP_URL}/activate/${token}`;
  
  try {
    const { error } = await resend.emails.send({
      from: 'Bioactiva CRM <onboarding@resend.dev>', // En prod usar dominio verificado
      to: [cleanEmail],
      subject: 'Invitación a Bioactiva CRM',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #edfce8; padding: 20px; border-radius: 16px;">
          <h1 style="color: #1C7E3C; font-size: 24px;">¡Hola!</h1>
          <p style="color: #4a7c5e; font-size: 16px; line-height: 1.5;">
            Has sido invitado a unirte al equipo de <strong>Bioactiva CRM</strong> con el rol de <strong>${role}</strong>.
          </p>
          <p style="color: #4a7c5e; font-size: 16px; line-height: 1.5;">
            Para activar tu cuenta y definir tus credenciales, haz clic en el siguiente botón:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${activationLink}" style="background-color: #1C7E3C; color: white; padding: 12px 24px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block;">
              Activar mi cuenta
            </a>
          </div>
          <p style="color: #9dbfa8; font-size: 12px;">
            Este enlace expirará en 24 horas. Si no solicitaste esta invitación, puedes ignorar este correo.
          </p>
        </div>
      `,
    });

    if (error) {
      throw new Error(`Error de Resend: ${error.message}`);
    }
  } catch (err) {
    console.error('Error enviando invitación:', err);
    throw new Error(err instanceof Error ? err.message : 'No se pudo enviar el correo de invitación');
  }

  revalidatePath('/users');
  return { success: true };
}

/**
 * Obtiene una invitación por su token para el flujo de activación.
 */
export async function getInvitationByToken(token: string) {
  const invitation = await prisma.userInvitation.findUnique({
    where: { token },
  });

  if (!invitation || invitation.used) return null;

  const isExpired = invitation.expiresAt < new Date();
  return {
    ...invitation,
    isExpired,
  };
}

/**
 * Crea el usuario final a partir de una invitación válida.
 */
export async function activateUser(
  token: string, 
  name: string, 
  lastName: string, 
  password: string
) {
  const invitation = await prisma.userInvitation.findUnique({
    where: { token },
  });

  if (!invitation) throw new Error('Invitación no encontrada');
  if (invitation.used) throw new Error('Esta invitación ya fue utilizada');
  if (invitation.expiresAt < new Date()) {
    throw new Error('El tiempo para definir las credenciales venció y necesita volver a solicitar el correo.');
  }

  if (!name.trim() || !lastName.trim() || !password) {
    throw new Error('Todos los campos son obligatorios');
  }

  // Hashear password
  const passwordHash = await bcrypt.hash(password, 10);

  // Transacción: Crear usuario y marcar invitación como usada
  const [user] = await prisma.$transaction([
    prisma.user.create({
      data: {
        email: invitation.email,
        name: `${name.trim()} ${lastName.trim()}`,
        lastName: lastName.trim(),
        role: invitation.role,
        passwordHash,
        active: true,
      },
    }),
    prisma.userInvitation.update({
      where: { id: invitation.id },
      data: { used: true },
    }),
  ]);

  return { success: true, email: user.email };
}
