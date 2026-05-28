import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

/**
 * Cache the PrismaClient on the global object in non-production to avoid
 * re-instantiating on every hot-reload (which exhausts DB connections).
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
