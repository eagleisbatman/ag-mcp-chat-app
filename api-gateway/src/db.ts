/**
 * Prisma Database Client (TypeScript)
 * Railway automatically provides DATABASE_URL when PostgreSQL is linked
 */

import { PrismaClient } from '@prisma/client';

// Create a singleton Prisma client
export const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'info', 'warn', 'error']
      : ['error'],
});

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
