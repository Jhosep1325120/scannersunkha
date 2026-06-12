// Comentario: Muestra el panel administrativo con reportes y gestion principal.
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import {
  ArrowRight,
  Boxes,
  CalendarDays,
  Database,
  Download,
  Gift,
  History,
  PackageMinus,
  PackagePlus,
  Pencil,
  Scissors,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { requireAdminAuth } from '@/lib/auth'
import { applyInventoryChange } from '@/lib/inventory'
import { ConfirmSubmitButton } from '@/components/ui/ConfirmSubmitButton'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type PeriodKey = 'today' | '7d' | '30d'
type PaymentMethod = 'CASH' | 'YAPE' | 'PLIN' | 'CARD'

const PERIOD_OPTIONS: Array<{ key: PeriodKey; label: string; days: number }> = [
  { key: 'today', label: 'Hoy', days: 1 },
  { key: '7d', label: '7 dias', days: 7 },
  { key: '30d', label: '30 dias', days: 30 },
]
const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Efectivo',
  YAPE: 'Yape',
  PLIN: 'Plin',
  CARD: 'Tarjeta',
}
const PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]
const STANDARD_HAIRCUT_PRICE_CENTS = 2500
const INVENTORY_FEEDBACK: Record<string, { tone: 'success' | 'error' | 'info'; message: string }> = {
  supplied: { tone: 'success', message: 'Abastecimiento registrado y stock actualizado.' },
  sold: { tone: 'success', message: 'Venta registrada y stock descontado.' },
  created: { tone: 'success', message: 'Producto agregado al inventario.' },
  updated: { tone: 'success', message: 'Producto actualizado correctamente.' },
  deleted: { tone: 'success', message: 'Producto eliminado del inventario sin borrar su historial.' },
  unchanged: { tone: 'info', message: 'El stock ya tenia ese valor; no se genero un movimiento.' },
  insufficient: { tone: 'error', message: 'No hay stock suficiente para registrar esa venta.' },
  missing: { tone: 'error', message: 'El producto ya no existe o no pertenece a este negocio.' },
  invalid: { tone: 'error', message: 'Ingresa una cantidad valida mayor que cero.' },
  'invalid-product': { tone: 'error', message: 'Completa correctamente los datos del producto.' },
  error: { tone: 'error', message: 'No se pudo completar la operacion de inventario.' },
}

const DATE_FORMATTER = new Intl.DateTimeFormat('es-DO', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatDate(value: Date) {
  return DATE_FORMATTER.format(value)
}

function formatPercent(value: number) {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`
}

function formatPenFromCents(valueCents: number) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 2,
  }).format(valueCents / 100)
}

function parsePositiveInt(value: FormDataEntryValue | null) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) return null
  return parsed
}

function parseQuantity(value: FormDataEntryValue | null) {
  const parsed = parsePositiveInt(value)
  return parsed !== null && parsed > 0 ? parsed : null
}

function inventoryRedirect(code: string, period: string): never {
  const safePeriod = period === 'today' || period === '30d' ? period : '7d'
  redirect(`/admin/dashboard?period=${safePeriod}&inventory=${code}#inventory`)
}

function parsePriceCents(value: FormDataEntryValue | null) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.round(parsed * 100)
}

async function updateProductStockAction(formData: FormData) {
  'use server'

  const { owner, unauthorizedResponse } = await requireAdminAuth()
  if (unauthorizedResponse || !owner) redirect('/admin/login?next=/admin/dashboard')

  const productId = String(formData.get('productId') ?? '')
  const mode = String(formData.get('mode') ?? '')
  const period = String(formData.get('period') ?? '7d')
  const quantity = parseQuantity(formData.get('quantity'))
  const targetStock = parsePositiveInt(formData.get('stock'))

  if (!productId || !['IN', 'OUT', 'ADJUST'].includes(mode)) {
    inventoryRedirect('invalid', period)
  }
  if (mode === 'ADJUST' ? targetStock === null : quantity === null) {
    inventoryRedirect('invalid', period)
  }

  let result: Awaited<ReturnType<typeof applyInventoryChange>>
  try {
    result = await applyInventoryChange({
      businessId: owner.businessId,
      productId,
      userId: owner.id,
      change: mode === 'ADJUST'
        ? { mode: 'ADJUST', targetStock: targetStock as number }
        : { mode: mode as 'IN' | 'OUT', quantity: quantity as number },
    })

  } catch (error) {
    console.error('Error actualizando inventario:', error)
    inventoryRedirect('error', period)
  }

  if (!result.ok) {
    inventoryRedirect(result.reason === 'INSUFFICIENT_STOCK' ? 'insufficient' : 'missing', period)
  }

  revalidatePath('/admin/dashboard')
  if (result.movementType === null) inventoryRedirect('unchanged', period)
  inventoryRedirect(result.movementType === 'IN' ? 'supplied' : 'sold', period)
}

async function createProductAction(formData: FormData) {
  'use server'

  const { owner, unauthorizedResponse } = await requireAdminAuth()
  if (unauthorizedResponse || !owner) redirect('/admin/login?next=/admin/dashboard')

  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const priceCents = parsePriceCents(formData.get('price'))
  const stock = parsePositiveInt(formData.get('stock'))
  const period = String(formData.get('period') ?? '7d')

  if (!name || priceCents === null) inventoryRedirect('invalid-product', period)

  try {
    await prisma.$transaction(async (tx) => {
      const initialStock = stock ?? 0
      const product = await tx.product.create({
        data: {
          businessId: owner.businessId,
          name,
          description: description || null,
          priceCents: priceCents as number,
          stock: initialStock,
          active: true,
        },
      })

      if (initialStock > 0) {
        await tx.inventoryMovement.create({
          data: {
            businessId: owner.businessId,
            productId: product.id,
            userId: owner.id,
            type: 'IN',
            reason: 'INITIAL',
            quantity: initialStock,
            previousStock: 0,
            newStock: initialStock,
          },
        })
      }
    })
  } catch (error) {
    console.error('Error creando producto:', error)
    inventoryRedirect('error', period)
  }

  revalidatePath('/admin/dashboard')
  inventoryRedirect('created', period)
}

async function updateProductAction(formData: FormData) {
  'use server'

  const { owner, unauthorizedResponse } = await requireAdminAuth()
  if (unauthorizedResponse || !owner) redirect('/admin/login?next=/admin/dashboard')

  const productId = String(formData.get('productId') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const priceCents = parsePriceCents(formData.get('price'))
  const period = String(formData.get('period') ?? '7d')

  if (!productId || !name || priceCents === null) {
    inventoryRedirect('invalid-product', period)
  }

  try {
    const result = await prisma.product.updateMany({
      where: { id: productId, businessId: owner.businessId, active: true },
      data: {
        name,
        description: description || null,
        priceCents,
      },
    })

    if (result.count === 0) inventoryRedirect('missing', period)
  } catch (error) {
    console.error('Error editando producto:', error)
    inventoryRedirect('error', period)
  }

  revalidatePath('/admin/dashboard')
  inventoryRedirect('updated', period)
}

async function deleteProductAction(formData: FormData) {
  'use server'

  const { owner, unauthorizedResponse } = await requireAdminAuth()
  if (unauthorizedResponse || !owner) redirect('/admin/login?next=/admin/dashboard')

  const productId = String(formData.get('productId') ?? '')
  const period = String(formData.get('period') ?? '7d')
  if (!productId) inventoryRedirect('missing', period)

  try {
    const result = await prisma.product.updateMany({
      where: { id: productId, businessId: owner.businessId, active: true },
      data: { active: false },
    })

    if (result.count === 0) inventoryRedirect('missing', period)
  } catch (error) {
    console.error('Error eliminando producto:', error)
    inventoryRedirect('error', period)
  }

  revalidatePath('/admin/dashboard')
  inventoryRedirect('deleted', period)
}

function countByType(
  items: Array<{ type: string }>
) {
  let paid = 0
  let free = 0
  for (const item of items) {
    if (item.type === 'PAID') paid += 1
    if (item.type === 'FREE') free += 1
  }
  return { paid, free }
}

function emptyPaymentTotals() {
  return Object.fromEntries(PAYMENT_METHODS.map((method) => [method, 0])) as Record<PaymentMethod, number>
}

function toDayKey(value: Date) {
  return value.toISOString().slice(0, 10)
}

function buildDaySeries(start: Date, end: Date) {
  const days: Array<{ key: string; label: string }> = []
  const cursor = new Date(start)
  cursor.setHours(0, 0, 0, 0)
  const finish = new Date(end)
  finish.setHours(0, 0, 0, 0)

  const shortDay = new Intl.DateTimeFormat('es-DO', { weekday: 'short' })

  while (cursor <= finish) {
    days.push({
      key: toDayKey(cursor),
      label: shortDay.format(cursor).replace('.', '').slice(0, 3),
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  return days
}

function getSelectedPeriodKey(
  raw: string | string[] | undefined
): PeriodKey {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value === 'today' || value === '30d') return value
  return '7d'
}

function getPeriodStart(days: number) {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (days - 1))
  return start
}

function getLimaDayRange(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? ''
  const start = new Date(`${part('year')}-${part('month')}-${part('day')}T05:00:00.000Z`)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  return { start, end }
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const selectedPeriodKey = getSelectedPeriodKey(resolvedSearchParams?.period)
  const inventoryCode = Array.isArray(resolvedSearchParams?.inventory)
    ? resolvedSearchParams?.inventory[0]
    : resolvedSearchParams?.inventory
  const inventoryFeedback = inventoryCode ? INVENTORY_FEEDBACK[inventoryCode] : undefined
  const selectedPeriod = PERIOD_OPTIONS.find((option) => option.key === selectedPeriodKey) ?? PERIOD_OPTIONS[1]
  const periodStart = getPeriodStart(selectedPeriod.days)

  const { owner } = await requireAdminAuth()
  if (!owner) redirect('/admin/login?next=/admin/dashboard')

  const businessId = owner.businessId
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const limaToday = getLimaDayRange(now)
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(now.getDate() - 7)
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(now.getDate() - 30)

  const totalUsers = await prisma.user.count({ where: { businessId } })
  const usersLast7Days = await prisma.user.count({ where: { businessId, createdAt: { gte: sevenDaysAgo } } })
  const usersLast30Days = await prisma.user.count({ where: { businessId, createdAt: { gte: thirtyDaysAgo } } })
  const periodNewUsers = await prisma.user.count({
    where: {
      businessId,
      createdAt: { gte: periodStart },
    },
  })

  const allHaircuts = await prisma.haircut.findMany({
    where: { businessId },
    select: { type: true, priceCents: true, paymentMethod: true, createdAt: true, userId: true },
  })

  const last30Haircuts = await prisma.haircut.findMany({
    where: {
      businessId,
      createdAt: { gte: thirtyDaysAgo },
    },
    select: { type: true },
  })

  const periodUsersCreated = await prisma.user.findMany({
    where: {
      businessId,
      createdAt: { gte: periodStart },
    },
    select: { createdAt: true },
  })

  const paidHaircutsInPeriod = await prisma.haircut.findMany({
    where: {
      businessId,
      createdAt: { gte: periodStart },
    },
    select: {
      type: true,
      createdAt: true,
      userId: true,
      priceCents: true,
      paymentMethod: true,
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      barber: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })
  const recentUsers = await prisma.user.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
    take: 25,
    select: {
      id: true,
      name: true,
      phone: true,
      createdAt: true,
      stamps: true,
      totalCuts: true,
      updatedAt: true,
    },
  })
  const topUsers = await prisma.user.findMany({
    where: { businessId },
    orderBy: [{ totalCuts: 'desc' }, { updatedAt: 'desc' }],
    take: 5,
    select: {
      id: true,
      name: true,
      totalCuts: true,
      stamps: true,
    },
  })
  const products = await prisma.product.findMany({
    where: { businessId, active: true },
    orderBy: [{ stock: 'asc' }, { createdAt: 'desc' }],
    take: 12,
    select: {
      id: true,
      name: true,
      description: true,
      priceCents: true,
      stock: true,
      active: true,
    },
  })
  const inventoryMovements = await prisma.inventoryMovement.findMany({
    where: { businessId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      type: true,
      reason: true,
      quantity: true,
      previousStock: true,
      newStock: true,
      unitPriceCents: true,
      totalCents: true,
      createdAt: true,
      product: { select: { name: true } },
      user: { select: { name: true } },
    },
  })
  const todayProductSales = await prisma.inventoryMovement.findMany({
    where: {
      businessId,
      reason: 'SALE',
      createdAt: { gte: limaToday.start, lt: limaToday.end },
    },
    select: {
      quantity: true,
      totalCents: true,
    },
  })

  const totalByType = countByType(allHaircuts)
  const totalHaircuts = totalByType.paid + totalByType.free
  const totalFreeHaircuts = totalByType.free
  const totalRevenueCents = allHaircuts.reduce((sum, haircut) => {
    if (haircut.type !== 'PAID') return sum
    return sum + (haircut.priceCents ?? STANDARD_HAIRCUT_PRICE_CENTS)
  }, 0)
  const todayRevenueCents = allHaircuts.reduce((sum, haircut) => {
    if (haircut.type !== 'PAID' || haircut.createdAt < todayStart) return sum
    return sum + (haircut.priceCents ?? STANDARD_HAIRCUT_PRICE_CENTS)
  }, 0)
  const weekRevenueCents = allHaircuts.reduce((sum, haircut) => {
    if (haircut.type !== 'PAID' || haircut.createdAt < sevenDaysAgo) return sum
    return sum + (haircut.priceCents ?? STANDARD_HAIRCUT_PRICE_CENTS)
  }, 0)
  const monthRevenueCents = allHaircuts.reduce((sum, haircut) => {
    if (haircut.type !== 'PAID' || haircut.createdAt < thirtyDaysAgo) return sum
    return sum + (haircut.priceCents ?? STANDARD_HAIRCUT_PRICE_CENTS)
  }, 0)
  const lowStockProducts = products.filter((product) => product.active && (product.stock ?? 0) <= 3)
  const todayProductSalesTotalCents = todayProductSales.reduce(
    (sum, sale) => sum + (sale.totalCents ?? 0),
    0
  )
  const todayProductUnitsSold = todayProductSales.reduce(
    (sum, sale) => sum + sale.quantity,
    0
  )

  const last30ByType = countByType(last30Haircuts)
  const paidHaircutsLast30Days = last30ByType.paid
  const freeHaircutsLast30Days = last30ByType.free
  const totalHaircutsLast30Days = paidHaircutsLast30Days + freeHaircutsLast30Days

  const periodHaircutsCreated = paidHaircutsInPeriod.map((item) => ({
    createdAt: item.createdAt,
  }))
  const periodByType = countByType(
    paidHaircutsInPeriod.map((item) => ({ type: item.type }))
  )
  const periodPaidHaircuts = periodByType.paid
  const periodFreeHaircuts = periodByType.free
  const periodTotalHaircuts = periodPaidHaircuts + periodFreeHaircuts
  const periodFreeShare = periodTotalHaircuts > 0
    ? (periodFreeHaircuts / periodTotalHaircuts) * 100
    : 0
  const freeShare = totalHaircuts > 0 ? (totalFreeHaircuts / totalHaircuts) * 100 : 0
  const freeShare30d = totalHaircutsLast30Days > 0
    ? (freeHaircutsLast30Days / totalHaircutsLast30Days) * 100
    : 0

  const usersByDay = new Map<string, number>()
  for (const user of periodUsersCreated) {
    const dayKey = toDayKey(user.createdAt)
    usersByDay.set(dayKey, (usersByDay.get(dayKey) ?? 0) + 1)
  }

  const haircutsByDay = new Map<string, number>()
  for (const haircut of periodHaircutsCreated) {
    const dayKey = toDayKey(haircut.createdAt)
    haircutsByDay.set(dayKey, (haircutsByDay.get(dayKey) ?? 0) + 1)
  }

  const daySeries = buildDaySeries(periodStart, now)
  const activitySeries = daySeries.map((day) => ({
    ...day,
    users: usersByDay.get(day.key) ?? 0,
    haircuts: haircutsByDay.get(day.key) ?? 0,
  }))
  const peakActivity = Math.max(
    1,
    ...activitySeries.map((item) => Math.max(item.users, item.haircuts))
  )
  const paidByUser = new Map<string, { paidCuts: number; paidCents: number }>()
  const paidByBarber = new Map<string, { name: string; email: string; paidCuts: number; paidCents: number }>()
  const periodPaymentTotals = emptyPaymentTotals()
  let periodPaidRevenueCents = 0

  for (const paidHaircut of paidHaircutsInPeriod) {
    if (paidHaircut.type !== 'PAID') continue
    const paidAmount = paidHaircut.priceCents ?? STANDARD_HAIRCUT_PRICE_CENTS
    periodPaidRevenueCents += paidAmount
    if (paidHaircut.paymentMethod && PAYMENT_METHODS.includes(paidHaircut.paymentMethod as PaymentMethod)) {
      periodPaymentTotals[paidHaircut.paymentMethod as PaymentMethod] += paidAmount
    }
    const previous = paidByUser.get(paidHaircut.userId) ?? { paidCuts: 0, paidCents: 0 }
    paidByUser.set(paidHaircut.userId, {
      paidCuts: previous.paidCuts + 1,
      paidCents: previous.paidCents + paidAmount,
    })

    const barberKey = paidHaircut.barber?.id ?? 'sin-barbero'
    const barberPrevious = paidByBarber.get(barberKey) ?? {
      name: paidHaircut.barber?.name ?? 'Sin barbero asignado',
      email: paidHaircut.barber?.email ?? '',
      paidCuts: 0,
      paidCents: 0,
    }
    paidByBarber.set(barberKey, {
      ...barberPrevious,
      paidCuts: barberPrevious.paidCuts + 1,
      paidCents: barberPrevious.paidCents + paidAmount,
    })
  }

  const clientsToday = new Set(
    allHaircuts
      .filter((haircut) => haircut.createdAt >= todayStart)
      .map((haircut) => haircut.userId)
  ).size
  const clientsWeek = new Set(
    allHaircuts
      .filter((haircut) => haircut.createdAt >= sevenDaysAgo)
      .map((haircut) => haircut.userId)
  ).size
  const clientsMonth = new Set(
    allHaircuts
      .filter((haircut) => haircut.createdAt >= thirtyDaysAgo)
      .map((haircut) => haircut.userId)
  ).size

  const barberPerformance = [...paidByBarber.values()]
    .sort((a, b) => b.paidCents - a.paidCents)

  const paidUsersIndex = new Map(
    paidHaircutsInPeriod
      .filter((item) => item.type === 'PAID' && item.user)
      .map((item) => [item.userId, item.user as { id: string; name: string; phone: string }])
  )
  const paidUserIds = [...paidByUser.keys()]
  const periodClientPayments = paidUserIds
    .map((userId) => {
      const user = paidUsersIndex.get(userId)
      const paidData = paidByUser.get(userId)
      if (!user || !paidData) return null
      return {
        ...user,
        paidCuts: paidData.paidCuts,
        paidCents: paidData.paidCents,
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.paidCents - a.paidCents)
    .slice(0, 10)

  return (
    <div className="min-h-screen bf-shell">
      <header className="relative z-10 border-b border-[var(--line-0)] bg-[#0f151ccc]/90 backdrop-blur-xl">
        <div className="bf-container py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-3xl sm:text-4xl leading-none tracking-wide">Panel Admin</h1>
            <p className="text-[#a89f93] text-xs truncate">{owner.business.name}</p>
            <Breadcrumbs
              className="mt-1"
              items={[
                { label: 'Admin', href: '/admin/dashboard' },
                { label: 'Admin' },
              ]}
            />
          </div>
          <Link
            href="/barber"
            className="px-3 py-2 rounded-xl text-xs bf-btn-secondary bf-focus bf-interactive inline-flex items-center gap-1"
          >
            Ir a escaner
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      <main className="relative z-10 bf-container py-6 space-y-5">
        <section className="bf-panel rounded-3xl p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#8f8578]">Resumen de periodo</p>
              <h2 className="text-xl sm:text-2xl font-semibold text-[#f3eee7]">
                {selectedPeriod.label}
              </h2>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <div className="rounded-2xl border border-[var(--line-0)] bg-[#101820cc] p-1 inline-flex gap-1">
                {PERIOD_OPTIONS.map((option) => {
                  const isActive = option.key === selectedPeriodKey
                  return (
                    <Link
                      key={option.key}
                      href={`/admin/dashboard?period=${option.key}`}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium bf-focus bf-interactive ${
                        isActive
                          ? 'bg-[#c79a4e] text-[#111820]'
                          : 'text-[#cfc3b3] hover:bg-[#16212acc]'
                      }`}
                    >
                      {option.label}
                    </Link>
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-1.5 sm:justify-end">
                {PERIOD_OPTIONS.map((option) => (
                  <Link
                    key={`export-${option.key}`}
                    href={`/api/admin/reports/export?period=${option.key}`}
                    className="px-2.5 py-1.5 rounded-xl text-[11px] font-semibold bf-btn-secondary bf-focus bf-interactive inline-flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Excel {option.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <article className="rounded-2xl border border-[var(--line-0)] bg-[#121a22cc] p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#8f8578]">Nuevos usuarios</p>
              <p className="font-data text-3xl leading-none text-[#f3eee7] mt-2">{periodNewUsers}</p>
            </article>

            <article className="rounded-2xl border border-[var(--line-0)] bg-[#121a22cc] p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#8f8578]">Cortes pagados</p>
              <p className="font-data text-3xl leading-none text-[#f0d8ad] mt-2">{periodPaidHaircuts}</p>
            </article>

            <article className="rounded-2xl border border-[var(--line-0)] bg-[#121a22cc] p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#8f8578]">Cortes gratis</p>
              <p className="font-data text-3xl leading-none text-[#89cf9f] mt-2">{periodFreeHaircuts}</p>
            </article>

            <article className="rounded-2xl border border-[var(--line-0)] bg-[#121a22cc] p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#8f8578]">Gratis / total</p>
              <p className="font-data text-3xl leading-none text-[#89cf9f] mt-2">{formatPercent(periodFreeShare)}</p>
              <p className="text-xs text-[#a89f93] mt-2">{periodTotalHaircuts} cortes en periodo</p>
            </article>
          </div>
        </section>

        <section className="bf-panel rounded-3xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#8f8578]">Cuentas del negocio</p>
              <h2 className="text-xl sm:text-2xl font-semibold text-[#f3eee7]">Ingresos por cortes</h2>
            </div>
            <CalendarDays className="w-5 h-5 text-[#c79a4e]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            <article className="rounded-2xl border border-[var(--line-0)] bg-[#121a22cc] p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#8f8578]">Hoy</p>
              <p className="font-data text-3xl leading-none text-[#f3eee7] mt-2">{formatPenFromCents(todayRevenueCents)}</p>
            </article>
            <article className="rounded-2xl border border-[var(--line-0)] bg-[#121a22cc] p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#8f8578]">Semana</p>
              <p className="font-data text-3xl leading-none text-[#f0d8ad] mt-2">{formatPenFromCents(weekRevenueCents)}</p>
            </article>
            <article className="rounded-2xl border border-[var(--line-0)] bg-[#121a22cc] p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#8f8578]">Mes</p>
              <p className="font-data text-3xl leading-none text-[#c79a4e] mt-2">{formatPenFromCents(monthRevenueCents)}</p>
            </article>
            <article className="rounded-2xl border border-[var(--line-0)] bg-[#121a22cc] p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#8f8578]">Total historico</p>
              <p className="font-data text-3xl leading-none text-[#89cf9f] mt-2">{formatPenFromCents(totalRevenueCents)}</p>
            </article>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <section className="bf-panel rounded-3xl p-4 sm:p-5 xl:col-span-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8f8578]">Metodos de pago</p>
                <h2 className="text-xl sm:text-2xl font-semibold text-[#f3eee7]">{selectedPeriod.label}</h2>
              </div>
              <Database className="w-5 h-5 text-[#c79a4e]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((method) => (
                <article key={method} className="rounded-2xl border border-[var(--line-0)] bg-[#121a22cc] p-4">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[#8f8578]">
                    {PAYMENT_METHOD_LABELS[method]}
                  </p>
                  <p className="font-data text-2xl leading-none text-[#f3eee7] mt-2">
                    {formatPenFromCents(periodPaymentTotals[method])}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="bf-panel rounded-3xl p-4 sm:p-5 xl:col-span-7">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8f8578]">Clientes atendidos</p>
                <h2 className="text-xl sm:text-2xl font-semibold text-[#f3eee7]">Dia, semana y mes</h2>
              </div>
              <Users className="w-5 h-5 text-[#c79a4e]" />
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <article className="rounded-2xl border border-[var(--line-0)] bg-[#121a22cc] p-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[#8f8578]">Hoy</p>
                <p className="font-data text-3xl leading-none text-[#f3eee7] mt-2">{clientsToday}</p>
              </article>
              <article className="rounded-2xl border border-[var(--line-0)] bg-[#121a22cc] p-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[#8f8578]">Semana</p>
                <p className="font-data text-3xl leading-none text-[#f0d8ad] mt-2">{clientsWeek}</p>
              </article>
              <article className="rounded-2xl border border-[var(--line-0)] bg-[#121a22cc] p-4">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[#8f8578]">Mes</p>
                <p className="font-data text-3xl leading-none text-[#89cf9f] mt-2">{clientsMonth}</p>
              </article>
            </div>

            {barberPerformance.length === 0 ? (
              <p className="text-sm text-[#a89f93]">Aun no hay pagos registrados por barbero.</p>
            ) : (
              <div className="space-y-1.5">
                {barberPerformance.map((barber) => (
                  <div
                    key={`${barber.name}-${barber.email}`}
                    className="rounded-xl border border-[var(--line-0)] bg-[#121a22cc] px-3 py-2.5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-[#f3eee7] font-medium truncate">{barber.name}</p>
                      <p className="text-xs text-[#a89f93] truncate">{barber.email || 'Cortes antiguos sin barbero'}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-[#d9cfbf]">{barber.paidCuts} corte(s) pagado(s)</p>
                      <p className="text-[11px] text-[#f0d8ad] font-semibold">{formatPenFromCents(barber.paidCents)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>

        <section className="bf-panel rounded-3xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#f3eee7]">Actividad diaria</h2>
            <div className="text-[11px] text-[#8f8578] flex items-center gap-3">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-[#c79a4e]" />
                Cortes
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2 w-2 rounded-full bg-[#4fb27a]" />
                Registros
              </span>
            </div>
          </div>

          <div className="overflow-x-auto bf-scroll">
            <div className="min-w-[620px] grid grid-cols-12 gap-2">
              {activitySeries.map((item) => {
                const haircutHeight = Math.max(4, Math.round((item.haircuts / peakActivity) * 64))
                const userHeight = Math.max(4, Math.round((item.users / peakActivity) * 64))
                return (
                  <div key={item.key} className="rounded-xl border border-[var(--line-0)] bg-[#111a23cc] p-2">
                    <div className="h-16 flex items-end justify-center gap-1">
                      <div
                        className="w-2 rounded-sm bg-[#c79a4e]"
                        style={{ height: `${haircutHeight}px` }}
                        title={`Cortes: ${item.haircuts}`}
                      />
                      <div
                        className="w-2 rounded-sm bg-[#4fb27a]"
                        style={{ height: `${userHeight}px` }}
                        title={`Registros: ${item.users}`}
                      />
                    </div>
                    <p className="mt-2 text-[10px] text-center uppercase tracking-[0.08em] text-[#8f8578]">{item.label}</p>
                    <p className="text-[10px] text-center text-[#d9cfbf]">
                      {item.haircuts}/{item.users}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="bf-panel rounded-3xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#f3eee7]">Pagos por corte (sin gratis)</h2>
            <span className="text-[11px] text-[#8f8578]">{selectedPeriod.label}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <article className="rounded-2xl border border-[var(--line-0)] bg-[#121a22cc] p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#8f8578]">Ingreso periodo</p>
              <p className="font-data text-3xl leading-none text-[#f3eee7] mt-2">
                {formatPenFromCents(periodPaidRevenueCents)}
              </p>
            </article>
            <article className="rounded-2xl border border-[var(--line-0)] bg-[#121a22cc] p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#8f8578]">Cortes pagados</p>
              <p className="font-data text-3xl leading-none text-[#f0d8ad] mt-2">{periodPaidHaircuts}</p>
            </article>
            <article className="rounded-2xl border border-[var(--line-0)] bg-[#121a22cc] p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#8f8578]">Ticket por corte</p>
              <p className="font-data text-3xl leading-none text-[#c79a4e] mt-2">
                {formatPenFromCents(STANDARD_HAIRCUT_PRICE_CENTS)}
              </p>
            </article>
          </div>

          {periodClientPayments.length === 0 ? (
            <p className="text-sm text-[#a89f93]">Aun no hay cortes pagados en este periodo.</p>
          ) : (
            <div className="space-y-1.5">
              {periodClientPayments.map((client) => (
                <div
                  key={client.id}
                  className="rounded-xl border border-[var(--line-0)] bg-[#121a22cc] px-3 py-2.5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-[#f3eee7] font-medium truncate">{client.name}</p>
                    <p className="text-xs text-[#a89f93] truncate">{client.phone}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-[#d9cfbf]">{client.paidCuts} corte(s) pagado(s)</p>
                    <p className="text-[11px] text-[#f0d8ad] font-semibold">
                      {formatPenFromCents(client.paidCents)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bf-panel rounded-3xl p-4 sm:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5 rounded-2xl border border-[var(--line-0)] bg-[#0f171fcc] p-4 sm:p-5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#8f8578]">Operacion historica</p>
              <p className="font-data text-5xl sm:text-6xl leading-none text-[#f3eee7] mt-2">{totalHaircuts}</p>
              <p className="text-xs text-[#a89f93] mt-2">Cortes acumulados del negocio</p>

              <div className="h-px bg-gradient-to-r from-[#c79a4e66] via-[#c79a4e26] to-transparent my-4" />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] text-[#8f8578]">Pagados (30d)</p>
                  <p className="text-2xl font-semibold text-[#f0d8ad]">{paidHaircutsLast30Days}</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#8f8578]">Gratis (30d)</p>
                  <p className="text-2xl font-semibold text-[#89cf9f]">{freeHaircutsLast30Days}</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <article className="rounded-2xl border border-[var(--line-0)] bg-[#121a22cc] p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[#8f8578]">Usuarios</p>
                  <Users className="w-4 h-4 text-[#c79a4e]" />
                </div>
                <p className="font-data text-3xl leading-none text-[#f3eee7]">{totalUsers}</p>
                <p className="text-xs text-[#a89f93] mt-2">+{usersLast7Days} en 7 dias</p>
              </article>

              <article className="rounded-2xl border border-[var(--line-0)] bg-[#121a22cc] p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[#8f8578]">Cortes</p>
                  <Scissors className="w-4 h-4 text-[#c79a4e]" />
                </div>
                <p className="font-data text-3xl leading-none text-[#f3eee7]">{totalHaircuts}</p>
                <p className="text-xs text-[#a89f93] mt-2">Historial completo</p>
              </article>

              <article className="rounded-2xl border border-[var(--line-0)] bg-[#121a22cc] p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-[#8f8578]">Gratis</p>
                  <Gift className="w-4 h-4 text-[#89cf9f]" />
                </div>
                <p className="font-data text-3xl leading-none text-[#89cf9f]">{totalFreeHaircuts}</p>
                <p className="text-xs text-[#a89f93] mt-2">{formatPercent(freeShare)} del total</p>
              </article>
            </div>
          </div>
        </section>

        <section id="inventory" className="bf-panel rounded-3xl p-4 sm:p-5 scroll-mt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#8f8578]">Inventario</p>
              <h2 className="text-xl sm:text-2xl font-semibold text-[#f3eee7]">Entradas y ventas de productos</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 rounded-2xl border border-[var(--line-0)] bg-[#101820cc] px-3 py-2 text-xs text-[#cfc3b3]">
                <Boxes className="w-4 h-4 text-[#c79a4e]" />
                {lowStockProducts.length} bajo stock
              </div>
              <Link
                href="/api/admin/inventory/export"
                className="inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold bf-btn-secondary bf-focus bf-interactive"
              >
                <Download className="w-4 h-4" />
                Exportar Excel
              </Link>
            </div>
          </div>

          {inventoryFeedback && (
            <div
              className={`mb-4 rounded-xl border px-3 py-2.5 text-sm ${
                inventoryFeedback.tone === 'success'
                  ? 'border-[#4fb27a66] bg-[#4fb27a1f] text-[#d6efdf]'
                  : inventoryFeedback.tone === 'error'
                    ? 'border-[#e26e6e66] bg-[#e26e6e1f] text-[#f7d1d1]'
                    : 'border-[#c79a4e66] bg-[#c79a4e1a] text-[#f2e6d2]'
              }`}
              role="status"
            >
              {inventoryFeedback.message}
            </div>
          )}

          <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <article className="rounded-2xl border border-[#4fb27a55] bg-[#4fb27a14] p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#89cf9f]">Ventas de productos hoy</p>
              <p className="font-data text-3xl leading-none text-[#f3eee7] mt-2">
                {formatPenFromCents(todayProductSalesTotalCents)}
              </p>
              <p className="text-xs text-[#a89f93] mt-2">Suma de todas las ventas locales del dia</p>
            </article>
            <article className="rounded-2xl border border-[var(--line-0)] bg-[#121a22cc] p-4">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#8f8578]">Productos vendidos hoy</p>
              <p className="font-data text-3xl leading-none text-[#f0d8ad] mt-2">{todayProductUnitsSold}</p>
              <p className="text-xs text-[#a89f93] mt-2">Unidades descontadas por ventas</p>
            </article>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <div className="xl:col-span-7 space-y-2">
              {products.length === 0 ? (
                <p className="text-sm text-[#a89f93]">Aun no hay productos registrados.</p>
              ) : (
                products.map((product) => {
                  const stock = product.stock ?? 0
                  const isLowStock = product.active && stock <= 3
                  return (
                    <article
                      key={product.id}
                      className="rounded-xl border border-[var(--line-0)] bg-[#121a22cc] px-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-[#f3eee7] font-medium truncate">{product.name}</p>
                        <p className="text-xs text-[#a89f93]">
                          {formatPenFromCents(product.priceCents)}
                          {' | '}
                          <span className={isLowStock ? 'text-[#f0d8ad]' : 'text-[#89cf9f]'}>
                            Stock {stock}
                          </span>
                          {!product.active ? ' | Inactivo' : ''}
                        </p>
                      </div>

                      <form action={updateProductStockAction} className="mt-2 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
                        <input type="hidden" name="productId" value={product.id} />
                        <input type="hidden" name="period" value={selectedPeriodKey} />
                        <input
                          name="quantity"
                          type="number"
                          min="1"
                          step="1"
                          placeholder="Cantidad"
                          className="w-full bf-input bf-focus rounded-xl px-3 py-2 text-sm"
                          aria-label={`Cantidad para ${product.name}`}
                          required
                        />
                        <button
                          type="submit"
                          name="mode"
                          value="IN"
                          className="px-3 py-2 rounded-xl text-xs font-semibold bf-btn-primary bf-focus bf-interactive inline-flex items-center justify-center gap-1.5"
                        >
                          <PackagePlus className="w-3.5 h-3.5" />
                          Abastecer
                        </button>
                        <button
                          type="submit"
                          name="mode"
                          value="OUT"
                          className="px-3 py-2 rounded-xl text-xs font-semibold border border-[#e26e6e66] bg-[#e26e6e1a] text-[#f1b6b6] bf-focus bf-interactive inline-flex items-center justify-center gap-1.5"
                        >
                          <PackageMinus className="w-3.5 h-3.5" />
                          Registrar venta
                        </button>
                      </form>

                      <details className="mt-2 text-xs text-[#8f8578]">
                        <summary className="cursor-pointer bf-focus rounded-lg w-fit">Ajustar stock manualmente</summary>
                        <form action={updateProductStockAction} className="mt-2 flex gap-2">
                          <input type="hidden" name="productId" value={product.id} />
                          <input type="hidden" name="period" value={selectedPeriodKey} />
                          <input type="hidden" name="mode" value="ADJUST" />
                          <input
                            name="stock"
                            type="number"
                            min="0"
                            step="1"
                            defaultValue={stock}
                            className="min-w-0 flex-1 bf-input bf-focus rounded-xl px-3 py-2 text-sm"
                            aria-label={`Nuevo stock total de ${product.name}`}
                            required
                          />
                          <button
                            type="submit"
                            className="px-3 py-2 rounded-xl text-xs font-semibold bf-btn-secondary bf-focus bf-interactive"
                          >
                            Guardar ajuste
                          </button>
                        </form>
                      </details>

                      <details className="mt-2 text-xs text-[#8f8578]">
                        <summary className="cursor-pointer bf-focus rounded-lg w-fit inline-flex items-center gap-1.5">
                          <Pencil className="w-3.5 h-3.5" />
                          Editar producto
                        </summary>
                        <div className="mt-2 rounded-xl border border-[var(--line-0)] bg-[#0f171fcc] p-3 space-y-3">
                          <form action={updateProductAction} className="space-y-2">
                            <input type="hidden" name="productId" value={product.id} />
                            <input type="hidden" name="period" value={selectedPeriodKey} />
                            <input
                              name="name"
                              defaultValue={product.name}
                              placeholder="Nombre del producto"
                              className="w-full bf-input bf-focus rounded-xl px-3 py-2 text-sm"
                              required
                            />
                            <input
                              name="description"
                              defaultValue={product.description ?? ''}
                              placeholder="Descripcion corta"
                              className="w-full bf-input bf-focus rounded-xl px-3 py-2 text-sm"
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                              <input
                                name="price"
                                type="number"
                                min="0"
                                step="0.01"
                                defaultValue={(product.priceCents / 100).toFixed(2)}
                                aria-label={`Precio de ${product.name}`}
                                className="w-full bf-input bf-focus rounded-xl px-3 py-2 text-sm"
                                required
                              />
                              <button
                                type="submit"
                                className="px-3 py-2 rounded-xl text-xs font-semibold bf-btn-primary bf-focus bf-interactive inline-flex items-center justify-center gap-1.5"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                Guardar cambios
                              </button>
                            </div>
                          </form>

                          <form action={deleteProductAction} className="border-t border-[var(--line-0)] pt-3">
                            <input type="hidden" name="productId" value={product.id} />
                            <input type="hidden" name="period" value={selectedPeriodKey} />
                            <ConfirmSubmitButton
                              type="submit"
                              confirmMessage={`¿Eliminar ${product.name} del inventario? Su historial de movimientos se conservara.`}
                              className="w-full px-3 py-2 rounded-xl text-xs font-semibold border border-[#e26e6e66] bg-[#e26e6e1a] text-[#f1b6b6] bf-focus bf-interactive inline-flex items-center justify-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Eliminar producto
                            </ConfirmSubmitButton>
                          </form>
                        </div>
                      </details>
                    </article>
                  )
                })
              )}
            </div>

            <form action={createProductAction} className="xl:col-span-5 rounded-2xl border border-[var(--line-0)] bg-[#0f171fcc] p-4 space-y-3">
              <input type="hidden" name="period" value={selectedPeriodKey} />
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[#f3eee7]">Nuevo producto</h3>
                <PackagePlus className="w-4 h-4 text-[#c79a4e]" />
              </div>
              <input
                name="name"
                placeholder="Nombre del producto"
                className="w-full bf-input bf-focus rounded-xl px-3 py-2.5 text-sm"
                required
              />
              <input
                name="description"
                placeholder="Descripcion corta"
                className="w-full bf-input bf-focus rounded-xl px-3 py-2.5 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Precio S/"
                  className="w-full bf-input bf-focus rounded-xl px-3 py-2.5 text-sm"
                  required
                />
                <input
                  name="stock"
                  type="number"
                  min="0"
                  placeholder="Stock"
                  className="w-full bf-input bf-focus rounded-xl px-3 py-2.5 text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full px-3 py-3 rounded-xl text-sm font-semibold bf-btn-primary bf-focus bf-interactive inline-flex items-center justify-center gap-2"
              >
                <PackagePlus className="w-4 h-4" />
                Agregar al inventario
              </button>
            </form>
          </div>

          <div className="mt-5 rounded-2xl border border-[var(--line-0)] bg-[#0f171fcc] p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-semibold text-[#f3eee7] inline-flex items-center gap-2">
                <History className="w-4 h-4 text-[#c79a4e]" />
                Historial de movimientos
              </h3>
              <span className="text-[11px] text-[#8f8578]">Ultimos 20</span>
            </div>

            {inventoryMovements.length === 0 ? (
              <p className="text-sm text-[#a89f93]">Aun no hay entradas ni salidas registradas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-xs">
                  <thead className="text-[#8f8578] uppercase tracking-[0.08em]">
                    <tr className="border-b border-[var(--line-0)]">
                      <th className="px-2 py-2 font-medium">Producto</th>
                      <th className="px-2 py-2 font-medium">Tipo</th>
                      <th className="px-2 py-2 font-medium">Cantidad</th>
                      <th className="px-2 py-2 font-medium">Stock anterior</th>
                      <th className="px-2 py-2 font-medium">Stock nuevo</th>
                      <th className="px-2 py-2 font-medium">Precio unit.</th>
                      <th className="px-2 py-2 font-medium">Total venta</th>
                      <th className="px-2 py-2 font-medium">Responsable</th>
                      <th className="px-2 py-2 font-medium">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryMovements.map((movement) => (
                      <tr key={movement.id} className="border-b border-[var(--line-0)] last:border-0 text-[#cfc3b3]">
                        <td className="px-2 py-2.5 font-medium text-[#f3eee7]">{movement.product.name}</td>
                        <td className="px-2 py-2.5">
                          <span className={movement.type === 'IN' ? 'text-[#89cf9f]' : 'text-[#f1b6b6]'}>
                            {movement.reason === 'SALE'
                              ? 'VENTA'
                              : movement.reason === 'ADJUSTMENT'
                                ? 'AJUSTE'
                                : movement.type === 'IN'
                                  ? 'ENTRADA'
                                  : 'SALIDA'}
                          </span>
                        </td>
                        <td className="px-2 py-2.5">{movement.quantity}</td>
                        <td className="px-2 py-2.5">{movement.previousStock}</td>
                        <td className="px-2 py-2.5">{movement.newStock}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap">
                          {movement.unitPriceCents === null ? '-' : formatPenFromCents(movement.unitPriceCents)}
                        </td>
                        <td className="px-2 py-2.5 whitespace-nowrap font-semibold text-[#f0d8ad]">
                          {movement.totalCents === null ? '-' : formatPenFromCents(movement.totalCents)}
                        </td>
                        <td className="px-2 py-2.5">{movement.user?.name ?? 'Sistema'}</td>
                        <td className="px-2 py-2.5 whitespace-nowrap">{formatDate(movement.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <section className="bf-panel rounded-3xl p-4 sm:p-5 xl:col-span-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#f3eee7] inline-flex items-center gap-2">
                <Database className="w-4 h-4 text-[#c79a4e]" />
                Base de datos de clientes
              </h2>
              <span className="text-[11px] text-[#8f8578]">Slug: {owner.business.slug}</span>
            </div>
            {recentUsers.length === 0 ? (
              <p className="text-sm text-[#a89f93]">Aun no hay usuarios registrados.</p>
            ) : (
              <div className="space-y-1.5">
                {recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="rounded-xl border border-[var(--line-0)] bg-[#121a22cc] px-3 py-2.5 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-[#f3eee7] font-medium truncate">{user.name}</p>
                      <p className="text-xs text-[#a89f93] truncate">{user.phone}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-[#d9cfbf]">{formatDate(user.createdAt)}</p>
                      <p className="text-[11px] text-[#8f8578]">
                        Sellos {user.stamps} | Cortes {user.totalCuts}
                      </p>
                      <p className="text-[11px] text-[#8f8578]">
                        Actualizado {formatDate(user.updatedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bf-panel rounded-3xl p-4 sm:p-5 xl:col-span-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[#f3eee7]">Top clientes</h2>
              <UserRound className="w-4 h-4 text-[#c79a4e]" />
            </div>
            {topUsers.length === 0 ? (
              <p className="text-sm text-[#a89f93]">Sin datos todavia.</p>
            ) : (
              <div className="space-y-1.5">
                {topUsers.map((user, index) => (
                  <div
                    key={user.id}
                    className="rounded-xl border border-[var(--line-0)] bg-[#121a22cc] px-3 py-2.5 flex items-center justify-between gap-3"
                  >
                    <p className="text-sm text-[#f3eee7] truncate">
                      <span className="inline-flex w-6 text-[#8f8578]">#{index + 1}</span>
                      {user.name}
                    </p>
                    <div className="text-right">
                      <p className="text-xs text-[#d9cfbf]">{user.totalCuts} cortes</p>
                      <p className="text-[11px] text-[#8f8578]">{user.stamps}/5</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>

        <section className="bf-panel-soft rounded-2xl p-3 sm:p-4 border border-[var(--line-0)]">
          <p className="text-[11px] uppercase tracking-[0.12em] text-[#8f8578] mb-1">Lectura rapida</p>
          <p className="text-sm text-[#cfc3b3]">
            Nuevos usuarios en 30 dias: <span className="text-[#f3eee7] font-semibold">{usersLast30Days}</span>
            {' | '}
            Tasa de cortes gratis: <span className="text-[#89cf9f] font-semibold">{formatPercent(freeShare30d)}</span>
          </p>
        </section>
      </main>
    </div>
  )
}
