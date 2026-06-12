// Comentario: Genera exportaciones de reportes administrativos.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type PeriodKey = 'today' | '7d' | '30d'

const PERIODS: Record<PeriodKey, { label: string; days: number; filename: string }> = {
  today: { label: 'Dia', days: 1, filename: 'reporte-dia' },
  '7d': { label: 'Semana', days: 7, filename: 'reporte-semana' },
  '30d': { label: 'Mes', days: 30, filename: 'reporte-mes' },
}

const STANDARD_HAIRCUT_PRICE_CENTS = 2500

function getPeriodKey(value: string | null): PeriodKey {
  if (value === 'today' || value === '30d') return value
  return '7d'
}

function getPeriodStart(days: number) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (days - 1))
  return start
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(value)
}

function formatMoney(valueCents: number) {
  return (valueCents / 100).toFixed(2)
}

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

function csvRow(values: Array<string | number | null | undefined>) {
  return values.map(csvCell).join(',')
}

export async function GET(request: NextRequest) {
  const { owner, unauthorizedResponse } = await requireAdminAuth()
  if (unauthorizedResponse) return unauthorizedResponse
  if (!owner) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const periodKey = getPeriodKey(request.nextUrl.searchParams.get('period'))
  const period = PERIODS[periodKey]
  const periodStart = getPeriodStart(period.days)
  const generatedAt = new Date()

  const [haircuts, users] = await Promise.all([
    prisma.haircut.findMany({
      where: {
        businessId: owner.businessId,
        createdAt: { gte: periodStart },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        type: true,
        serviceName: true,
        priceCents: true,
        paymentMethod: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            phone: true,
          },
        },
        barber: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      where: {
        businessId: owner.businessId,
        createdAt: { gte: periodStart },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        name: true,
        phone: true,
        stamps: true,
        totalCuts: true,
        createdAt: true,
      },
    }),
  ])

  const paidHaircuts = haircuts.filter((haircut) => haircut.type === 'PAID')
  const freeHaircuts = haircuts.filter((haircut) => haircut.type === 'FREE')
  const revenueCents = paidHaircuts.reduce(
    (sum, haircut) => sum + (haircut.priceCents ?? STANDARD_HAIRCUT_PRICE_CENTS),
    0
  )

  const rows = [
    csvRow(['Reporte', period.label]),
    csvRow(['Negocio', owner.business.name]),
    csvRow(['Desde', formatDate(periodStart)]),
    csvRow(['Generado', formatDate(generatedAt)]),
    csvRow(['Ingresos PEN', formatMoney(revenueCents)]),
    csvRow(['Cortes pagados', paidHaircuts.length]),
    csvRow(['Cortes gratis', freeHaircuts.length]),
    csvRow(['Clientes nuevos', users.length]),
    '',
    csvRow(['Detalle de cortes']),
    csvRow(['Fecha', 'Cliente', 'Telefono', 'Tipo', 'Servicio', 'Precio PEN', 'Metodo pago', 'Barbero', 'Email barbero']),
    ...haircuts.map((haircut) => csvRow([
      formatDate(haircut.createdAt),
      haircut.user?.name,
      haircut.user?.phone,
      haircut.type === 'PAID' ? 'Pagado' : 'Gratis',
      haircut.serviceName,
      haircut.type === 'PAID' ? formatMoney(haircut.priceCents ?? STANDARD_HAIRCUT_PRICE_CENTS) : '0.00',
      haircut.paymentMethod,
      haircut.barber?.name,
      haircut.barber?.email,
    ])),
    '',
    csvRow(['Clientes nuevos']),
    csvRow(['Fecha registro', 'Cliente', 'Telefono', 'Sellos', 'Total cortes']),
    ...users.map((user) => csvRow([
      formatDate(user.createdAt),
      user.name,
      user.phone,
      user.stamps,
      user.totalCuts,
    ])),
  ]

  const csv = `sep=,\r\n${rows.join('\r\n')}`
  const filename = `${period.filename}-${generatedAt.toISOString().slice(0, 10)}.csv`

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
