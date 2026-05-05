import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function ping(attempt = 1): Promise<void> {
  const start = Date.now();
  try {
    const [orgs, leads, quotes] = await Promise.all([
      prisma.organization.count(),
      prisma.lead.count(),
      prisma.quote.count(),
    ]);
    const ms = Date.now() - start;
    console.log(`✓ DB OK (intento ${attempt}) — ${orgs} orgs · ${leads} leads · ${quotes} quotes — ${ms}ms`);
  } catch (e) {
    const ms = Date.now() - start;
    const msg = (e as Error).message.slice(0, 200);
    console.log(`✗ Falló intento ${attempt} en ${ms}ms: ${msg}`);
    if (attempt < 3) {
      console.log('  Reintentando en 3s...');
      await new Promise((r) => setTimeout(r, 3000));
      return ping(attempt + 1);
    }
  } finally {
    if (attempt === 3 || true) await prisma.$disconnect();
  }
}

ping();
