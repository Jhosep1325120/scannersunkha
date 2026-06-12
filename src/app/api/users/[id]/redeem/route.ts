// Comentario: Gestiona canjes de recompensas para un usuario.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireBarberAuth } from '@/lib/auth'
import { validateSameOriginRequest } from '@/lib/security'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// POST /api/users/[id]/redeem - Canjear corte gratis
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const scanTokenDelegate = (prisma as unknown as { scanToken?: {
      findUnique: typeof prisma.scanToken.findUnique
      updateMany: typeof prisma.scanToken.updateMany
    } }).scanToken
    if (!scanTokenDelegate) {
      return NextResponse.json(
        { error: 'Cliente Prisma desactualizado. Reinicia el servidor.' },
        { status: 503 }
      )
    }

    const originError = validateSameOriginRequest(_request)
    if (originError) return originError

    const auth = await requireBarberAuth()
    if (auth.unauthorizedResponse) {
      return auth.unauthorizedResponse
    }
    const owner = auth.owner

    const { id } = await params
    const body = await _request.json().catch(() => ({}))
    const scanTokenValue = String(body?.scanToken ?? '').trim()

    if (!id || !scanTokenValue) {
      return NextResponse.json(
        { error: 'Se requiere ID de usuario y QR vigente' },
        { status: 400 }
      )
    }

    // Obtener usuario
    const user = await prisma.user.findUnique({
      where: { id },
      include: { business: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      )
    }

    if (!owner || user.businessId !== owner.businessId) {
      return NextResponse.json(
        { error: 'No autorizado para operar este cliente' },
        { status: 403 }
      )
    }

    const scanToken = await scanTokenDelegate.findUnique({
      where: { token: scanTokenValue }
    })

    // Allow reuse of the scan token until expiry/manual invalidation. Do not reject
    // on `usedAt` so barbers can keep scanning the same QR while it's valid.
    if (
      !scanToken
      || scanToken.userId !== id
      || scanToken.businessId !== owner.businessId
      || scanToken.expiresAt <= new Date()
    ) {
      return NextResponse.json(
        { error: 'QR invalido o expirado. Escanea nuevamente.' },
        { status: 400 }
      )
    }

    // Validar que tenga exactamente 5 sellos
    if (user.stamps < 5) {
      return NextResponse.json(
        { 
          error: `El cliente solo tiene ${user.stamps} sellos. Necesita 5 para canjear.`,
          stamps: user.stamps,
          canRedeem: false
        },
        { status: 400 }
      )
    }

    // Calcular nuevos valores
    const newTotalCuts = user.totalCuts + 1

    // Actualizar usuario: resetear sellos a 0, incrementar cortes totales
    // Prevent accidental duplicate redeems in a short window.
    const DUPLICATE_SCAN_WINDOW_SECONDS = Number(process.env.DUPLICATE_SCAN_WINDOW_SECONDS ?? '10')
    const lastFreeHaircut = await prisma.haircut.findFirst({
      where: { userId: id, businessId: owner.businessId, type: 'FREE' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    })

    if (lastFreeHaircut) {
      const elapsedMs = Date.now() - lastFreeHaircut.createdAt.getTime()
      if (elapsedMs < DUPLICATE_SCAN_WINDOW_SECONDS * 1000) {
        return NextResponse.json(
          { error: `Reintento rápido detectado. Espera ${DUPLICATE_SCAN_WINDOW_SECONDS} segundos antes de intentar nuevamente.` },
          { status: 429 }
        )
      }
    }

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: {
          stamps: 0,
          totalCuts: newTotalCuts
        }
      }),
      prisma.stamp.create({
        data: {
          userId: id,
          businessId: user.businessId,
          type: 'FREE'
        }
      }),
      prisma.haircut.create({
        data: {
          userId: id,
          businessId: user.businessId,
          barberId: owner.id,
          type: 'FREE',
          serviceName: 'Corte gratis',
          priceCents: 0,
          paymentMethod: null,
        }
      })
    ])

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        phone: updatedUser.phone,
        stamps: 0,
        totalCuts: updatedUser.totalCuts,
        canRedeem: false,
        scanToken: scanToken.token
      },
      message: '✅ Corte gratis canjeado exitosamente. El contador se ha reiniciado a 0/5.'
    })

  } catch (error) {
    console.error('Error en POST /api/users/[id]/redeem:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
