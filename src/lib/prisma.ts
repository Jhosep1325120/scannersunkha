// Comentario: Crea y reutiliza el cliente Prisma de base de datos.
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function withConnectionGuards(rawUrl: string | undefined) {
  if (!rawUrl) return undefined
  if (rawUrl.startsWith('file:')) return rawUrl

  try {
    const url = new URL(rawUrl)
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', '1')
    }
    if (!url.searchParams.has('pgbouncer')) {
      url.searchParams.set('pgbouncer', 'true')
    }
    if (!url.searchParams.has('sslmode')) {
      url.searchParams.set('sslmode', 'require')
    }
    return url.toString()
  } catch {
    return rawUrl
  }
}

const datasourceUrl = withConnectionGuards(process.env.DATABASE_URL)
const prismaOptions = datasourceUrl ? { datasourceUrl } : undefined

export const prisma = globalForPrisma.prisma ?? new PrismaClient(prismaOptions)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
