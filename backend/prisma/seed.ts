/**
 * Bootstrap seed for ClimaCore.
 *
 * Currently provisions the first ADMIN user from environment variables
 * (idempotent upsert). Intended to be run once after `prisma migrate dev`
 * via `npm run prisma:seed`.
 *
 * Set in backend/.env:
 *   ADMIN_EMAIL=admin@climacore.local
 *   ADMIN_PASSWORD=<at-least-10-chars>
 *   ADMIN_FULL_NAME=Site Admin   (optional)
 *
 * If ADMIN_EMAIL or ADMIN_PASSWORD is missing, the seed prints a notice
 * and exits 0. That's fine for first-time setups before auth is wired.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_FULL_NAME?.trim() || 'ClimaCore Admin';

  if (!email || !password) {
    console.log(
      '[seed] ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin bootstrap.',
    );
    console.log(
      '[seed] Set both in backend/.env and rerun `npm run prisma:seed`.',
    );
    return;
  }

  if (password.length < 10) {
    throw new Error('[seed] ADMIN_PASSWORD must be at least 10 characters.');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, fullName, role: 'ADMIN', isActive: true },
    create: { email, passwordHash, fullName, role: 'ADMIN' },
  });

  console.log(`[seed] Admin ready: ${user.email}  (id=${user.id})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
