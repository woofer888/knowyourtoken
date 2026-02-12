import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Add connection pool configuration
    // This helps manage connections better in serverless environments
    __internal: {
      engine: {
        connectTimeout: 10000, // 10 seconds
      },
    },
  })

// In production, we still want to reuse the same instance
// This prevents connection pool exhaustion in serverless environments
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
} else {
  // In production, ensure we're using a singleton
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = prisma
  }
}

