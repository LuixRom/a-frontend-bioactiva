/**
 * Sembrado inicial de usuarios.
 *
 * Migra los 7 usuarios mock al modelo User real con passwords hasheadas.
 * Para todos, la password inicial es `bioactiva2024` — el admin debe
 * cambiarla desde la página de gestión de usuarios.
 *
 * Idempotente: usa upsert por email.
 *
 * Uso:
 *   npx tsx prisma/seed-users.ts
 */
import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const INITIAL_USERS: Array<{
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
}> = [
  { email: 'admin@bioactiva.pe',    name: 'Administración', role: 'Administrador', active: true  },
  { email: 'karien@bioactiva.pe',   name: 'Karien Díaz',    role: 'Trabajador',    active: true  },
  { email: 'arojas@bioactiva.pe',   name: 'Ana Rojas',      role: 'Trabajador',    active: true  },
  { email: 'ltorres@bioactiva.pe',  name: 'Luis Torres',    role: 'Trabajador',    active: true  },
  { email: 'mquispe@bioactiva.pe',  name: 'María Quispe',   role: 'Trabajador',    active: true  },
  { email: 'cmamani@bioactiva.pe',  name: 'Carlos Mamani',  role: 'Trabajador',    active: true  },
  { email: 'rcondori@bioactiva.pe', name: 'Rosa Condori',   role: 'Administrador', active: false },
];

const DEFAULT_PASSWORD = 'bioactiva2024';

async function main() {
  console.log(`🔐 Hasheando password por defecto "${DEFAULT_PASSWORD}"...`);
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  let created = 0;
  let updated = 0;

  for (const u of INITIAL_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      // No tocamos passwordHash si ya existe (no queremos resetear contraseñas)
      await prisma.user.update({
        where: { email: u.email },
        data: { name: u.name, role: u.role, active: u.active },
      });
      updated++;
    } else {
      await prisma.user.create({
        data: { ...u, passwordHash },
      });
      created++;
    }
  }

  console.log(`✓ ${created} creados, ${updated} actualizados.`);
  console.log(`\nPassword por defecto: ${DEFAULT_PASSWORD}`);
  console.log('Cambiar desde /users en la app.');
}

main()
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
