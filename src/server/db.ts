/**
 * Prisma client singleton.
 *
 * Next.js en dev hot-reload ejecuta el módulo varias veces; con `new
 * PrismaClient()` ingenuo se acumulan conexiones. El truco estándar es
 * adjuntar el cliente a globalThis para reutilizarlo entre reloads.
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
