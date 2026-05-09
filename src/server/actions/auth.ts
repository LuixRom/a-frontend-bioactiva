'use server';

import { MOCK_USERS, resetTokens } from '../mockStore';
import { updateUserPassword } from './users';

/**
 * Solicita un restablecimiento de contraseña
 */
export async function requestPasswordReset(email: string) {
  // Validar formato básico
  if (!email || !email.includes('@')) {
    return { error: 'Ingrese un correo válido.' };
  }

  // Buscar usuario
  const user = MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return { error: 'El correo ingresado no se encuentra registrado.' };
  }

  // Generar token
  const token = crypto.randomUUID();
  const expiration = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

  resetTokens.set(token, {
    email: user.email,
    token,
    estado: 'activo',
    fechaExpiracion: expiration,
  });

  // Simular envío de correo
  console.log('----------------------------------------------------');
  console.log('📧 SIMULACIÓN DE CORREO ENVIADO');
  console.log(`Para: ${user.email}`);
  console.log(`Enlace de recuperación: http://localhost:3000/recuperar-contrasena?token=${token}`);
  console.log('----------------------------------------------------');

  return { success: true };
}

/**
 * Valida un token de restablecimiento
 */
export async function validateResetToken(token: string) {
  if (!token) return { error: 'Token no proporcionado.' };

  const storedToken = resetTokens.get(token);

  if (!storedToken || storedToken.estado !== 'activo') {
    return { error: 'El enlace de recuperación ha expirado.' };
  }

  if (storedToken.fechaExpiracion < new Date()) {
    storedToken.estado = 'expirado';
    return { error: 'El enlace de recuperación ha expirado.' };
  }

  return { success: true, email: storedToken.email };
}

/**
 * Cambia la contraseña usando el token
 */
export async function resetPassword(token: string, nuevaContrasena: string, confirmacion: string) {
  // Validar token internamente
  const validation = await validateResetToken(token);
  if (validation.error) return { error: validation.error };

  // Validar coincidencia
  if (nuevaContrasena !== confirmacion) {
    return { error: 'Las contraseñas no coinciden.' };
  }

  // Validar requisitos: 8 caracteres, una mayúscula, un número
  const hasUpperCase = /[A-Z]/.test(nuevaContrasena);
  const hasNumber = /[0-9]/.test(nuevaContrasena);
  
  if (nuevaContrasena.length < 8 || !hasUpperCase || !hasNumber) {
    return { error: 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.' };
  }

  const email = validation.email!;
  const user = MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return { error: 'Usuario no encontrado.' };
  }

  // Actualizar contraseña
  await updateUserPassword(user.id, nuevaContrasena);

  // Marcar token como usado
  const storedToken = resetTokens.get(token);
  if (storedToken) {
    storedToken.estado = 'usado';
  }

  return { success: true };
}
