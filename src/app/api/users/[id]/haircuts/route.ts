// Comentario: Registra y consulta cortes asociados a un usuario.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireBarberAuth } from '@/lib/auth'
import { isValidBusinessSlug } from '@/lib/security'
import { toCanonicalBusinessSlug } from '@/lib/businessSlug'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEFAULT_LIMIT = 8
const MAX_LIMIT = 20

function parseLimit(rawLimit: string | null) {
  const parsed = Number(rawLimit ?? DEFAULT_LIMIT)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT
  return Math.min(Math.floor(parsed), MAX_LIMIT)
}

// GET /api/users/[id]/haircuts - Historial de cortes del cliente
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json(
        { error: 'Se requiere ID de usuario' },
        { status: 400 }
      )
    }

    const requestedBusinessSlugRaw = request.nextUrl.searchParams
      .get('businessSlug')
      ?.trim() || ''
    const requestedBusinessSlug = toCanonicalBusinessSlug(requestedBusinessSlugRaw)

    if (requestedBusinessSlug && !isValidBusinessSlug(requestedBusinessSlug)) {
      return NextResponse.json(
        { error: 'businessSlug invalido' },
        { status: 400 }
      )
    }

    const limit = parseLimit(request.nextUrl.searchParams.get('limit'))

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        business: {
          select: { id: true, slug: true },
        },
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    let isBarberFromBusiness = false
    try {
      const auth = await requireBarberAuth()
      isBarberFromBusiness =
        !auth.unauthorizedResponse && auth.owner?.businessId === user.business.id
    } catch (authError) {
      console.warn('Auth check failed in GET /api/users/[id]/haircuts, falling back to slug validation', authError)
    }

    if (!isBarberFromBusiness) {
      if (!requestedBusinessSlug || requestedBusinessSlug !== user.business.slug) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }
    }

    const haircutDelegate = (prisma as unknown as {
      haircut?: {
        findMany: (args: unknown) => Promise<Array<{
          id: string
          type: string
          serviceName: string | null
          priceCents: number | null
          createdAt: Date
        }>>
      }
    }).haircut

    if (!haircutDelegate) {
      const response = NextResponse.json({
        items: [],
        count: 0,
      })
      response.headers.set('Cache-Control', 'no-store')
      return response
    }

    const haircuts = await haircutDelegate.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        serviceName: true,
        priceCents: true,
        createdAt: true,
      },
    })

    const response = NextResponse.json({
      items: haircuts,
      count: haircuts.length,
    })
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    console.error('Error en GET /api/users/[id]/haircuts:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
