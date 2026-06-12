// Comentario: Consulta o actualiza la informacion de un usuario especifico.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireBarberAuth } from '@/lib/auth'
import { isValidBusinessSlug } from '@/lib/security'
import { toCanonicalBusinessSlug } from '@/lib/businessSlug'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET /api/users/[id] - Obtener datos del usuario
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

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        business: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    let includeHistory = false
    let isBarberFromBusiness = false

    try {
      const auth = await requireBarberAuth()
      isBarberFromBusiness =
        !auth.unauthorizedResponse && auth.owner?.businessId === user.business.id
    } catch (authError) {
      console.warn('Auth check failed in GET /api/users/[id], falling back to slug validation', authError)
    }

    if (isBarberFromBusiness) {
      includeHistory = true
    } else if (!requestedBusinessSlug || requestedBusinessSlug !== user.business.slug) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      )
    }

    const history = includeHistory
      ? await prisma.stamp.findMany({
          where: { userId: id },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            type: true,
            createdAt: true
          }
        })
      : undefined

    const response = NextResponse.json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      stamps: user.stamps,
      totalCuts: user.totalCuts,
      canRedeem: user.stamps >= 5,
      businessName: user.business.name,
      businessSlug: user.business.slug,
      ...(history ? { history } : {})
    })

    response.headers.set('Cache-Control', 'no-store')
    return response

  } catch (error) {
    console.error('Error en GET /api/users/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
