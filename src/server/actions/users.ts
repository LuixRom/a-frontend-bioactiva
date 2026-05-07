'use server';

import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';
import { prisma } from '@/src/server/db';
import type { UserRole } from '@prisma/client';

/**
 * Forma pública de un usuario — NUNCA exporta passwordHash al cliente.
 */
export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  lastLogin: Date | null;
  createdAt: Date;
};

function toPublic(row: {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  lastLogin: Date | null;
  createdAt: Date;
}): PublicUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    active: row.active,
    lastLogin: row.lastLogin,
    createdAt: row.createdAt,
  };
}

// ─── Lecturas ──────────────────────────────────────────────────────

export async function listUsers(): Promise<PublicUser[]> {
  const rows = await prisma.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      lastLogin: true,
      createdAt: true,
    },
  });
  return rows.map(toPublic);
}

export async function findUserByEmail(email: string): Promise<PublicUser | null> {
  const row = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      lastLogin: true,
      createdAt: true,
    },
  });
  return row ? toPublic(row) : null;
}

// ─── Mutaciones ────────────────────────────────────────────────────

export type UserCreateInput = {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  active?: boolean;
};

export async function createUser(input: UserCreateInput): Promise<PublicUser> {
  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error('El correo es obligatorio');
  if (!input.name.trim()) throw new Error('El nombre es obligatorio');
  if (!input.password || input.password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres');
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error(`Ya existe un usuario con el correo ${email}`);

  const passwordHash = await bcrypt.hash(input.password, 10);
  const created = await prisma.user.create({
    data: {
      email,
      name:   input.name.trim(),
      role:   input.role,
      active: input.active ?? true,
      passwordHash,
    },
    select: {
      id: true, email: true, name: true, role: true,
      active: true, lastLogin: true, createdAt: true,
    },
  });
  revalidatePath('/users');
  return toPublic(created);
}

export type UserUpdateInput = {
  email?: string;
  name?: string;
  role?: UserRole;
  active?: boolean;
};

/** Actualiza datos del usuario (sin tocar password). */
export async function updateUser(
  id: string,
  patch: UserUpdateInput,
): Promise<PublicUser> {
  const data: Record<string, unknown> = {};
  if (patch.email !== undefined) {
    const email = patch.email.trim().toLowerCase();
    if (!email) throw new Error('El correo no puede estar vacío');
    // Verificar que no choque con otro usuario
    const collision = await prisma.user.findFirst({
      where: { email, NOT: { id } },
    });
    if (collision) throw new Error(`El correo ${email} ya está en uso`);
    data.email = email;
  }
  if (patch.name !== undefined)   data.name   = patch.name.trim();
  if (patch.role !== undefined)   data.role   = patch.role;
  if (patch.active !== undefined) data.active = patch.active;

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true, email: true, name: true, role: true,
      active: true, lastLogin: true, createdAt: true,
    },
  });
  revalidatePath('/users');
  return toPublic(updated);
}

/** Cambia la contraseña de un usuario. La hashea antes de guardar. */
export async function updateUserPassword(
  id: string,
  newPassword: string,
): Promise<{ ok: true }> {
  if (!newPassword || newPassword.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres');
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id },
    data: { passwordHash },
  });
  revalidatePath('/users');
  return { ok: true };
}

export async function deleteUser(id: string): Promise<{ ok: true }> {
  await prisma.user.delete({ where: { id } });
  revalidatePath('/users');
  return { ok: true };
}

// ─── Auth ──────────────────────────────────────────────────────────

/** Verifica credenciales y devuelve el usuario si son válidas. */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<PublicUser | null> {
  const cleanEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: cleanEmail },
  });
  if (!user || !user.active) return null;

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;

  // Actualizar lastLogin (best-effort, no bloquea el login)
  try {
    await prisma.user.update({
      where: { id: user.id },
      data:  { lastLogin: new Date() },
    });
  } catch {
    /* noop */
  }

  return toPublic({ ...user, lastLogin: new Date() });
}
