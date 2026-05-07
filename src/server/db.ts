/**
 * Prisma client singleton con retry automático en errores transitorios
 * de conexión. Diseñado para Neon free tier, donde la compute auto-suspende
 * tras ~5 min de inactividad — la primera query después de dormir suele
 * fallar con `P1001` o un timeout, pero la siguiente despierta la DB.
 *
 * El wrapper reintenta hasta 3 veces con backoff exponencial transparente
 * para el caller. Las server actions no necesitan saber nada de esto.
 */
import { Prisma, PrismaClient } from '@prisma/client';

/** Códigos de error de Prisma que indican un problema TRANSITORIO de
 *  conexión y se pueden reintentar sin riesgo. */
const TRANSIENT_PRISMA_CODES = new Set([
  'P1001', // Can't reach database server
  'P1002', // Database server timed out
  'P1008', // Operations timed out
  'P1017', // Server has closed the connection
]);

/** Reconoce mensajes textuales típicos de Neon dormido. */
const TRANSIENT_MESSAGE_RE =
  /reach database server|connection.*(?:reset|closed|refused)|timed? ?out/i;

function isTransient(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return TRANSIENT_PRISMA_CODES.has(err.code);
  }
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (err instanceof Error && TRANSIENT_MESSAGE_RE.test(err.message)) return true;
  return false;
}

const MAX_RETRIES = 3;

/** Extensión de Prisma que envuelve cada operación con retry. */
const retryExtension = Prisma.defineExtension({
  name: 'retry-on-transient',
  query: {
    async $allOperations({ args, query, operation, model }) {
      let lastError: unknown;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          return await query(args);
        } catch (err) {
          lastError = err;
          if (attempt >= MAX_RETRIES || !isTransient(err)) throw err;
          // Backoff exponencial con jitter: 400ms, 900ms, 1900ms
          const delay = 400 * Math.pow(2, attempt) + Math.random() * 200;
          if (process.env.NODE_ENV === 'development') {
            const target = model ? `${model}.${operation}` : operation;
            console.warn(
              `[prisma-retry] ${target} falló (intento ${attempt + 1}/${MAX_RETRIES + 1}), ` +
                `reintenta en ${Math.round(delay)}ms`,
            );
          }
          await new Promise((r) => setTimeout(r, delay));
        }
      }
      throw lastError;
    },
  },
});

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrisma> | undefined;
};

function createPrisma() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
  return base.$extends(retryExtension);
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
