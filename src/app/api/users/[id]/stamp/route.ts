// Comentario: Agrega sellos de fidelidad a la tarjeta de un usuario.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireBarberAuth } from '@/lib/auth'
import { validateSameOriginRequest } from '@/lib/security'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
const PAYMENT_METHODS = ['CASH', 'YAPE', 'PLIN', 'CARD'] as const
type PaymentMethod = (typeof PAYMENT_METHODS)[number]

function parsePaymentMethod(value: unknown): PaymentMethod | null {
  const normalized = String(value ?? '').trim().toUpperCase()
  return PAYMENT_METHODS.includes(normalized as PaymentMethod)
    ? normalized as PaymentMethod
    : null
}

function parsePriceCents(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.round(parsed * 100)
}

function isStampCooldownEnabled() {
  return String(process.env.ENABLE_STAMP_COOLDOWN ?? 'false').toLowerCase() === 'true'
}

function getMinHoursBetweenStamps() {
  const parsed = Number(process.env.MIN_HOURS_BETWEEN_STAMPS ?? '12')
  if (!Number.isFinite(parsed) || parsed <= 0) return 12
  return parsed
}

// PATCH /api/users/[id]/stamp - Agregar 1 sello al cliente
export async function PATCH(
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
    const paymentMethod = parsePaymentMethod(body?.paymentMethod)
    const priceCents = parsePriceCents(body?.price)

    if (!id || !scanTokenValue) {
      return NextResponse.json(
        { error: 'Se requiere ID de usuario y QR vigente' },
        { status: 400 }
      )
    }

    if (!paymentMethod || priceCents === null) {
      return NextResponse.json(
        { error: 'Selecciona metodo de pago y monto cobrado' },
        { status: 400 }
      )
    }

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

    if (isStampCooldownEnabled()) {
      const minHours = getMinHoursBetweenStamps()
      const minMs = minHours * 60 * 60 * 1000
      const lastPaidStamp = await prisma.stamp.findFirst({
        where: {
          userId: id,
          businessId: owner.businessId,
          type: 'PAID',
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      })

      if (lastPaidStamp) {
        const elapsedMs = Date.now() - lastPaidStamp.createdAt.getTime()
        if (elapsedMs < minMs) {
          const waitMs = minMs - elapsedMs
          const waitHours = Math.ceil(waitMs / (60 * 60 * 1000))
          return NextResponse.json(
            {
              error: `Aun no se puede agregar otro sello. Intenta en aproximadamente ${waitHours} hora(s).`,
            },
            { status: 429 }
          )
        }
      }
    }

    const scanToken = await scanTokenDelegate.findUnique({
      where: { token: scanTokenValue }
    })

    // Validate token existence, ownership and expiry. Do NOT reject on `usedAt` so
    // the same QR can be reused multiple times while it's still valid.
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

    if (user.stamps >= 5) {
      return NextResponse.json(
        {
          error: 'El cliente ya tiene 5 sellos. Debe canjear su corte gratis primero.',
          stamps: user.stamps,
          canRedeem: true
        },
        { status: 400 }
      )
    }

    const newStamps = user.stamps + 1
    const newTotalCuts = user.totalCuts + 1
    const justCompleted = newStamps === 5
    const cutsLeftForReward = Math.max(0, 5 - newStamps)
    const shouldRemindTwoCutsLeft = cutsLeftForReward === 2

    // Prevent accidental duplicate scans in a very short window (e.g. double-tap).
    const DUPLICATE_SCAN_WINDOW_SECONDS = Number(process.env.DUPLICATE_SCAN_WINDOW_SECONDS ?? '10')
    const lastStamp = await prisma.stamp.findFirst({
      where: { userId: id, businessId: owner.businessId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    })

    if (lastStamp) {
      const elapsedMs = Date.now() - lastStamp.createdAt.getTime()
      if (elapsedMs < DUPLICATE_SCAN_WINDOW_SECONDS * 1000) {
        return NextResponse.json(
          { error: `Escaneo duplicado detectado. Espera ${DUPLICATE_SCAN_WINDOW_SECONDS} segundos antes de intentar nuevamente.` },
          { status: 429 }
        )
      }
    }

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: {
          stamps: newStamps,
          totalCuts: newTotalCuts
        }
      }),
      prisma.stamp.create({
        data: {
          userId: id,
          businessId: user.businessId,
          type: 'PAID'
        }
      }),
      prisma.haircut.create({
        data: {
          userId: id,
          businessId: user.businessId,
          barberId: owner.id,
          type: 'PAID',
          serviceName: 'Corte de cabello',
          priceCents,
          paymentMethod,
        }
      })
    ])

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        phone: updatedUser.phone,
        stamps: updatedUser.stamps,
        totalCuts: updatedUser.totalCuts,
        canRedeem: updatedUser.stamps >= 5,
        scanToken: scanToken.token
      },
      justCompleted,
      cutsLeftForReward,
      shouldRemindTwoCutsLeft,
      payment: {
        method: paymentMethod,
        priceCents,
      },
      message: justCompleted
        ? 'Felicidades! El cliente completo 5 sellos y tiene 1 GRATIS disponible'
        : `Sello agregado. Faltan ${cutsLeftForReward} para el gratis.`
    })

  } catch (error) {
    console.error('Error en PATCH /api/users/[id]/stamp:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
