// Prisma Database Client
// Railway automatically provides DATABASE_URL when PostgreSQL is linked

const { PrismaClient } = require('@prisma/client');

// Create a singleton Prisma client
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? ['query', 'info', 'warn', 'error'] 
    : ['error'],
});

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = { prisma };

