// Comentario: Resuelve tokens QR escaneados para encontrar tarjetas de clientes.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireBarberAuth } from '@/lib/auth'
import { validateSameOriginRequest } from '@/lib/security'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const scanTokenDelegate = (prisma as unknown as {
      scanToken?: {
        findUnique: (args: unknown) => Promise<{
          token: string
          businessId: string
          expiresAt: Date
          usedAt: Date | null
          user: {
            id: string
            name: string
            phone: string
            stamps: number
            totalCuts: number
          }
        } | null>
      }
    }).scanToken
    if (!scanTokenDelegate) {
      return NextResponse.json(
        { error: 'Cliente Prisma desactualizado. Reinicia el servidor.' },
        { status: 503 }
      )
    }

    const originError = validateSameOriginRequest(request)
    if (originError) return originError

    const auth = await requireBarberAuth()
    if (auth.unauthorizedResponse) {
      return auth.unauthorizedResponse
    }

    const token = String((await request.json().catch(() => ({})))?.token ?? '').trim()
    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 })
    }

    const scanToken = await scanTokenDelegate.findUnique({
      where: { token },
      include: {
        user: true
      }
    })

    if (!scanToken || scanToken.businessId !== auth.owner?.businessId) {
      return NextResponse.json({ error: 'QR no válido' }, { status: 404 })
    }

    // Allow reuse of the same scan token until it expires or is invalidated manually.
    // Previously we rejected tokens with `usedAt`; remove that restriction so the
    // same QR can be scanned multiple times while still honoring `expiresAt`.

    if (scanToken.expiresAt <= new Date()) {
      return NextResponse.json({ error: 'QR expirado. Pide uno nuevo.' }, { status: 400 })
    }

    const user = scanToken.user

    return NextResponse.json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      stamps: user.stamps,
      totalCuts: user.totalCuts,
      canRedeem: user.stamps >= 5,
      scanToken: scanToken.token
    })
  } catch (error) {
    console.error('Error resolviendo token QR:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
