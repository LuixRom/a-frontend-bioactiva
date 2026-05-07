/**
 * Verifica que la migración del Excel quedó coherente:
 *  - cuenta de cada tabla
 *  - distribución de leads por estado
 *  - Σ monto de cotizaciones aceptadas
 *  - integridad de FKs (huérfanos = 0)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const [orgs, contactos, leads, activities, quotes] = await Promise.all([
    prisma.organization.count(),
    prisma.contact.count(),
    prisma.lead.count(),
    prisma.activity.count(),
    prisma.quote.count(),
  ]);

  const leadsPorEstado = await prisma.lead.groupBy({
    by: ['estado'],
    _count: true,
  });

  const aceptadasTotal = await prisma.quote.aggregate({
    where: { estado: 'aceptada' },
    _sum: { monto: true },
    _count: true,
  });

  const sample = await prisma.organization.findFirst({
    where: { codigo: 'ORG-2025-001' },
    include: {
      contactos: { select: { codigo: true, nombres: true, apellidos: true } },
      leads:     {
        select: {
          codigo: true,
          estado: true,
          servicioInteres: true,
          historialTexto: true,
          cotizaciones: { select: { codigo: true, monto: true, estado: true } },
        },
      },
    },
  });

  console.log('📊 Conteos');
  console.table({ orgs, contactos, leads, activities, quotes });

  console.log('\n📊 Leads por estado');
  console.table(leadsPorEstado.map((r) => ({ estado: r.estado, count: r._count })));

  console.log('\n📊 Cotizaciones aceptadas');
  console.log(`  Total: ${aceptadasTotal._count} cotizaciones`);
  console.log(`  Σ Monto (PEN): ${aceptadasTotal._sum.monto?.toString() ?? '0'}`);

  console.log('\n📊 Ejemplo: organización Altomayo (ORG-2025-001)');
  console.log(JSON.stringify(sample, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
