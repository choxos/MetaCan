import { PrismaClient } from '@prisma/client'

// One client per process. Next.js hot-reloads modules in dev, which would
// otherwise open a new pool on every edit until Postgres refuses connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function constrainedDatabaseUrl(): string | undefined {
  const value = process.env.DATABASE_URL
  if (!value) return undefined
  const url = new URL(value)
  if (!url.searchParams.has('connection_limit')) {
    url.searchParams.set('connection_limit', '5')
  }
  if (!url.searchParams.has('pool_timeout')) {
    url.searchParams.set('pool_timeout', '30')
  }
  return url.toString()
}

const datasourceUrl = constrainedDatabaseUrl()

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
