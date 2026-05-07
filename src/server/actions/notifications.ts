'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/src/server/db';
import { NotificationType } from '@prisma/client';

export type PublicNotification = {
  id: string;
  userId: string;
  leadId: string | null;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: Date;
  lead?: {
    id: string;
    codigo: string;
    organizacion: {
      nombre: string;
    };
  } | null;
};

/**
 * Lista las notificaciones para el usuario actual.
 * @param userId ID del usuario (de la sesión)
 * @param filter 'mis-leads' o 'todos'
 */
export async function listNotifications(userId: string, filter: 'mis-leads' | 'todos' = 'todos'): Promise<PublicNotification[]> {
  const where: any = { userId };
  
  // En este sistema, 'mis-leads' y 'todos' para el usuario actual devuelven 
  // lo mismo porque el modelo solo guarda notificaciones dirigidas específicamente.
  // Sin embargo, si quisiéramos ver notificaciones generales, 'todos' las incluiría.
  
  if (filter === 'mis-leads') {
    where.leadId = { not: null };
  }

  const rows = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      lead: {
        select: {
          id: true,
          codigo: true,
          organizacion: {
            select: { nombre: true }
          }
        }
      }
    }
  });

  return rows as PublicNotification[];
}

/**
 * Marca una notificación como leída.
 */
export async function markNotificationAsRead(id: string) {
  await prisma.notification.update({
    where: { id },
    data: { read: true }
  });
  revalidatePath('/notifications');
  return { success: true };
}

/**
 * Obtiene el conteo de notificaciones no leídas para un usuario.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return await prisma.notification.count({
    where: { userId, read: false }
  });
}

/**
 * Proceso centralizado de generación de notificaciones internas.
 * Escanea Leads y Actividades para detectar eventos relevantes.
 */
export async function generateNotifications() {
  const now = new Date();
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  try {
    // 1. Obtener todos los leads con actividades pendientes
    const leads = await prisma.lead.findMany({
      where: {
        encargadoEmail: { not: null },
        estado: { notIn: ['cerrado_ganado', 'cerrado_perdido'] }
      },
      include: {
        actividades: {
          where: { estado: 'pendiente' }
        }
      }
    });

    let createdCount = 0;

    for (const lead of leads) {
      if (!lead.encargadoEmail) continue;

      // Buscar el ID del usuario responsable
      const user = await prisma.user.findUnique({
        where: { email: lead.encargadoEmail.toLowerCase().trim() }
      });

      if (!user) continue;

      for (const activity of lead.actividades) {
        let type: NotificationType | null = null;
        let message = '';

        if (activity.fecha < now) {
          type = 'ACTIVIDAD_VENCIDA';
          message = `Actividad vencida en lead ${lead.codigo} (${lead.servicioInteres || 'Sin servicio'})`;
        } else if (activity.fecha <= next24h) {
          type = 'ACTIVIDAD_PROXIMA';
          message = `Actividad próxima a vencer en lead ${lead.codigo}`;
        }

        if (type) {
          try {
            // Intentar crear (el @@unique evitará duplicados si ya existe para este lead/tipo)
            await prisma.notification.upsert({
              where: {
                userId_leadId_type: {
                  userId: user.id,
                  leadId: lead.id,
                  type: type
                }
              },
              update: {}, // No hacemos nada si ya existe
              create: {
                userId: user.id,
                leadId: lead.id,
                type: type,
                message: message
              }
            });
            createdCount++;
          } catch (err) {
            // Si falla por el unique constraint, simplemente lo ignoramos
            console.error(`Error creando notificación para lead ${lead.id}:`, err);
          }
        }
      }
    }

    revalidatePath('/notifications');
    return { success: true, createdCount };
  } catch (err) {
    console.error('Error en el proceso de generación de notificaciones:', err);
    // No lanzamos el error para no romper el resto del sistema como pide el requisito
    return { success: false, error: String(err) };
  }
}
