// Comentario: Genera tokens seguros para identificar tarjetas por QR.
import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValidBusinessSlug, validateSameOriginRequest } from '@/lib/security'
import { toCanonicalBusinessSlug } from '@/lib/businessSlug'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEFAULT_TOKEN_TTL_SECONDS = 180
const MIN_TOKEN_TTL_SECONDS = 60
const MAX_TOKEN_TTL_SECONDS = 600

function getTokenTtlSeconds() {
  const raw = Number(process.env.QR_TOKEN_TTL_SECONDS)
  if (!Number.isFinite(raw)) return DEFAULT_TOKEN_TTL_SECONDS
  return Math.min(MAX_TOKEN_TTL_SECONDS, Math.max(MIN_TOKEN_TTL_SECONDS, Math.floor(raw)))
}

function tokenResponse(body: { token: string; expiresAt: string }) {
  const response = NextResponse.json(body)
  response.headers.set('Cache-Control', 'no-store')
  return response
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const scanTokenDelegate = (prisma as unknown as { scanToken?: {
      deleteMany: typeof prisma.scanToken.deleteMany
      create: typeof prisma.scanToken.create
      findFirst: typeof prisma.scanToken.findFirst
    } }).scanToken
    if (!scanTokenDelegate) {
      return NextResponse.json(
        { error: 'Cliente Prisma desactualizado. Reinicia el servidor.' },
        { status: 503 }
      )
    }

    const originError = validateSameOriginRequest(request)
    if (originError) return originError

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const businessSlug = toCanonicalBusinessSlug(String(body?.businessSlug ?? ''))

    if (!id || !businessSlug) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 })
    }

    if (!isValidBusinessSlug(businessSlug)) {
      return NextResponse.json({ error: 'businessSlug invalido' }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: {
        id,
        business: { slug: businessSlug },
      },
      select: {
        id: true,
        businessId: true,
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const tokenTtlSeconds = getTokenTtlSeconds()
    const now = new Date()

    // Reuse the latest valid token to avoid hammering DB writes.
    const existingValidToken = await scanTokenDelegate.findFirst({
      where: {
        userId: user.id,
        businessId: user.businessId,
        usedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { expiresAt: 'desc' },
      select: {
        token: true,
        expiresAt: true,
      },
    })

    if (existingValidToken) {
      return tokenResponse({
        token: existingValidToken.token,
        expiresAt: existingValidToken.expiresAt.toISOString(),
      })
    }

    const expiresAt = new Date(now.getTime() + tokenTtlSeconds * 1000)
    const token = randomBytes(24).toString('base64url')

    const scanToken = await scanTokenDelegate.create({
      data: {
        token,
        userId: user.id,
        businessId: user.businessId,
        expiresAt
      }
    })

    return tokenResponse({
      token: scanToken.token,
      expiresAt: scanToken.expiresAt.toISOString()
    })
  } catch (error) {
    console.error('Error generando token QR:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
