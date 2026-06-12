// Comentario: Entrega datos de reporte para el panel del barbero.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireBarberAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PAYMENT_METHODS = ['CASH', 'YAPE', 'PLIN', 'CARD'] as const

function getDayStart() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

function getDaysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

function summarizePaidHaircuts(
  haircuts: Array<{ priceCents: number | null; paymentMethod: string | null; userId: string }>
) {
  const byPaymentMethod = Object.fromEntries(PAYMENT_METHODS.map((method) => [method, 0]))
  const clientIds = new Set<string>()
  let revenueCents = 0

  for (const haircut of haircuts) {
    revenueCents += haircut.priceCents ?? 0
    clientIds.add(haircut.userId)
    if (haircut.paymentMethod && haircut.paymentMethod in byPaymentMethod) {
      byPaymentMethod[haircut.paymentMethod] += haircut.priceCents ?? 0
    }
  }

  return {
    revenueCents,
    paidHaircuts: haircuts.length,
    clientsServed: clientIds.size,
    byPaymentMethod,
  }
}

export async function GET() {
  try {
    const { owner, unauthorizedResponse } = await requireBarberAuth()
    if (unauthorizedResponse) return unauthorizedResponse
    if (!owner) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const todayStart = getDayStart()
    const sevenDaysAgo = getDaysAgo(7)
    const thirtyDaysAgo = getDaysAgo(30)

    const haircuts = await prisma.haircut.findMany({
      where: {
        businessId: owner.businessId,
        barberId: owner.id,
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        serviceName: true,
        priceCents: true,
        paymentMethod: true,
        createdAt: true,
        userId: true,
        user: {
          select: {
            name: true,
            phone: true,
          },
        },
      },
    })

    const paidHaircuts = haircuts.filter((haircut) => haircut.type === 'PAID')
    const freeHaircuts = haircuts.filter((haircut) => haircut.type === 'FREE')

    const todayPaid = paidHaircuts.filter((haircut) => haircut.createdAt >= todayStart)
    const weekPaid = paidHaircuts.filter((haircut) => haircut.createdAt >= sevenDaysAgo)
    const monthPaid = paidHaircuts

    const todayAll = haircuts.filter((haircut) => haircut.createdAt >= todayStart)
    const weekAll = haircuts.filter((haircut) => haircut.createdAt >= sevenDaysAgo)
    const monthAll = haircuts

    const recentClients = haircuts.slice(0, 20).map((haircut) => ({
      id: haircut.id,
      userName: haircut.user.name,
      phone: haircut.user.phone,
      type: haircut.type,
      serviceName: haircut.serviceName,
      priceCents: haircut.priceCents,
      paymentMethod: haircut.paymentMethod,
      createdAt: haircut.createdAt.toISOString(),
    }))

    return NextResponse.json({
      today: {
        ...summarizePaidHaircuts(todayPaid),
        totalHaircuts: todayAll.length,
        freeHaircuts: todayAll.filter((haircut) => haircut.type === 'FREE').length,
      },
      week: {
        ...summarizePaidHaircuts(weekPaid),
        totalHaircuts: weekAll.length,
        freeHaircuts: weekAll.filter((haircut) => haircut.type === 'FREE').length,
      },
      month: {
        ...summarizePaidHaircuts(monthPaid),
        totalHaircuts: monthAll.length,
        freeHaircuts: freeHaircuts.length,
      },
      recentClients,
    })
  } catch (error) {
    console.error('Error obteniendo reporte de barbero:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
