// Comentario: Devuelve estilos de corte disponibles para un negocio.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValidBusinessSlug } from '@/lib/security'
import { toCanonicalBusinessSlug } from '@/lib/businessSlug'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DEFAULT_LIMIT = 12
const MAX_LIMIT = 40
const FIXED_PRICE_CENTS = 2500

const DEFAULT_HAIRCUT_STYLES = [
  { id: 'default-taper-fade', name: 'Taper Fade', description: 'Desvanecido limpio con acabado gradual', imageUrl: null, priceCents: FIXED_PRICE_CENTS, durationMin: 40 },
  { id: 'default-low-fade', name: 'Low Fade', description: 'Corte fresco con fade bajo y natural', imageUrl: null, priceCents: FIXED_PRICE_CENTS, durationMin: 35 },
  { id: 'default-mid-fade', name: 'Mid Fade', description: 'Balance perfecto entre clasico y moderno', imageUrl: null, priceCents: FIXED_PRICE_CENTS, durationMin: 40 },
  { id: 'default-high-fade', name: 'High Fade', description: 'Look marcado con desvanecido alto', imageUrl: null, priceCents: FIXED_PRICE_CENTS, durationMin: 40 },
  { id: 'default-skin-fade', name: 'Skin Fade', description: 'Desvanecido a piel para acabado mas nitido', imageUrl: null, priceCents: FIXED_PRICE_CENTS, durationMin: 45 },
  { id: 'default-mod-cut', name: 'Mod Cut', description: 'Estilo moderno texturizado en la parte superior', imageUrl: null, priceCents: FIXED_PRICE_CENTS, durationMin: 45 },
  { id: 'default-french-crop', name: 'French Crop', description: 'Frontal definido y facil de peinar', imageUrl: null, priceCents: FIXED_PRICE_CENTS, durationMin: 35 },
  { id: 'default-quiff', name: 'Quiff', description: 'Volumen frontal con laterales limpios', imageUrl: null, priceCents: FIXED_PRICE_CENTS, durationMin: 45 },
  { id: 'default-pompadour', name: 'Pompadour', description: 'Volumen clasico con estilo elegante', imageUrl: null, priceCents: FIXED_PRICE_CENTS, durationMin: 50 },
  { id: 'default-buzz-cut', name: 'Buzz Cut', description: 'Corte uniforme, practico y minimalista', imageUrl: null, priceCents: FIXED_PRICE_CENTS, durationMin: 25 },
  { id: 'default-mullet-modern', name: 'Mullet Moderno', description: 'Version actual del mullet con transicion limpia', imageUrl: null, priceCents: FIXED_PRICE_CENTS, durationMin: 50 },
  { id: 'default-undercut', name: 'Undercut', description: 'Contraste definido entre laterales y parte superior', imageUrl: null, priceCents: FIXED_PRICE_CENTS, durationMin: 45 },
]

function parseLimit(rawLimit: string | null) {
  const parsed = Number(rawLimit ?? DEFAULT_LIMIT)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT
  return Math.min(Math.floor(parsed), MAX_LIMIT)
}

function fallbackItems(limit: number) {
  return DEFAULT_HAIRCUT_STYLES.slice(0, limit)
}

function applyFixedPrice<T extends { priceCents: number | null }>(items: T[]): T[] {
  return items.map((item) => ({
    ...item,
    priceCents: FIXED_PRICE_CENTS,
  }))
}

// GET /api/business/[slug]/haircut-styles - Catalogo de cortes activos para clientes
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

    // In some environments the generated Prisma client can be behind schema changes.
    // If haircutStyle delegate is unavailable, return fallback catalog instead of 500.
    const haircutStyleDelegate = (prisma as {
      haircutStyle?: {
        findMany: (args: unknown) => Promise<Array<{
          id: string
          name: string
          description: string | null
          imageUrl: string | null
          priceCents: number | null
          durationMin: number | null
        }>>
      }
    }).haircutStyle

    if (!haircutStyleDelegate) {
      const fallback = applyFixedPrice(fallbackItems(limit))
      const response = NextResponse.json({
        items: fallback,
        count: fallback.length,
      })
      response.headers.set('Cache-Control', 'no-store')
      return response
    }

    let items: Array<{
      id: string
      name: string
      description: string | null
      imageUrl: string | null
      priceCents: number | null
      durationMin: number | null
    }> = []

    try {
      items = await haircutStyleDelegate.findMany({
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
          durationMin: true,
        },
      })
    } catch (dbError) {
      console.warn(
        'HaircutStyle catalog not available yet, using defaults:',
        dbError
      )
      const fallback = applyFixedPrice(fallbackItems(limit))
      const response = NextResponse.json({
        items: fallback,
        count: fallback.length,
      })
      response.headers.set('Cache-Control', 'no-store')
      return response
    }

    const finalItems = items.length > 0
      ? items
      : fallbackItems(limit)
    const normalizedItems = applyFixedPrice(finalItems)

    const response = NextResponse.json({
      items: normalizedItems,
      count: normalizedItems.length,
    })
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    console.error('Error en GET /api/business/[slug]/haircut-styles:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
