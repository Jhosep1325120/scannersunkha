// Comentario: Devuelve productos activos disponibles para un negocio.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValidBusinessSlug } from '@/lib/security'
import { toCanonicalBusinessSlug } from '@/lib/businessSlug'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEFAULT_LIMIT = 8
const MAX_LIMIT = 24

function parseLimit(rawLimit: string | null) {
  const parsed = Number(rawLimit ?? DEFAULT_LIMIT)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT
  return Math.min(Math.floor(parsed), MAX_LIMIT)
}

// GET /api/business/[slug]/products - Productos activos para clientes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const normalizedSlug = toCanonicalBusinessSlug(String(slug ?? ''))

    if (!isValidBusinessSlug(normalizedSlug)) {
      return NextResponse.json(
        { error: 'businessSlug invalido' },
        { status: 400 }
      )
    }

    const business = await prisma.business.findUnique({
      where: { slug: normalizedSlug },
      select: { id: true },
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Negocio no encontrado' },
        { status: 404 }
      )
    }

    const limit = parseLimit(request.nextUrl.searchParams.get('limit'))
    const products = await prisma.product.findMany({
      where: {
        businessId: business.id,
        active: true,
      },
      orderBy: [{ createdAt: 'desc' }],
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        priceCents: true,
        stock: true,
      },
    })

    const response = NextResponse.json({
      items: products,
      count: products.length,
    })
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    console.error('Error en GET /api/business/[slug]/products:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
