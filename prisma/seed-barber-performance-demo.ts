import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const BUSINESS_SLUG = 'barberia-centro'
const TARGET_BARBER_COUNT = 6
const AUTH_MANAGED_PASSWORD_MARKER = 'MANAGED_BY_SUPABASE_AUTH'
const DEMO_SERVICE_PREFIX = 'Demo rendimiento semanal'

// Crea primero estas cuentas manualmente en Supabase Authentication.
const barberCandidates = [
  { name: 'Diego Ramírez Soto', email: 'diego.ramirez@sunkha.pe' },
  { name: 'Mateo Vargas León', email: 'mateo.vargas@sunkha.pe' },
  { name: 'Sebastián Rojas Díaz', email: 'sebastian.rojas@sunkha.pe' },
  { name: 'Alejandro Torres Peña', email: 'alejandro.torres@sunkha.pe' },
  { name: 'Bruno Mendoza Castro', email: 'bruno.mendoza@sunkha.pe' },
  { name: 'Nicolás Salazar Flores', email: 'nicolas.salazar@sunkha.pe' },
] as const

const performanceProfiles = [
  { cuts: 6, priceCents: 3500 },
  { cuts: 5, priceCents: 3000 },
  { cuts: 4, priceCents: 2800 },
  { cuts: 3, priceCents: 2500 },
  { cuts: 2, priceCents: 2200 },
  { cuts: 1, priceCents: 2000 },
] as const

const paymentMethods = ['YAPE', 'CASH', 'PLIN', 'CARD'] as const

type AuthUserRow = {
  email: string
  confirmed: boolean
}

type DemoBarber = {
  id: string
  name: string
  email: string
  role: string
  businessId: string
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function getPreviousWeekRange() {
  const nowInLima = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Lima' })
  )
  const daysSinceMonday = (nowInLima.getDay() + 6) % 7
  const currentMonday = new Date(nowInLima)

  currentMonday.setDate(nowInLima.getDate() - daysSinceMonday)
  currentMonday.setHours(0, 0, 0, 0)

  const previousMonday = new Date(currentMonday)
  previousMonday.setDate(previousMonday.getDate() - 7)

  const previousSundayEnd = new Date(currentMonday)
  previousSundayEnd.setMilliseconds(-1)

  return {
    start: previousMonday,
    end: previousSundayEnd,
    key: previousMonday.toISOString().slice(0, 10),
  }
}

function buildHaircutDate(
  weekStart: Date,
  barberIndex: number,
  cutIndex: number
) {
  const date = new Date(weekStart)
  const dayOffset = (barberIndex + cutIndex) % 6

  date.setDate(date.getDate() + dayOffset)
  date.setHours(
    9 + ((barberIndex * 2 + cutIndex) % 10),
    (cutIndex * 10) % 60,
    0,
    0
  )

  return date
}

async function getConfirmedAuthUsers() {
  const rows = await prisma.$queryRawUnsafe<AuthUserRow[]>(
    `SELECT
       lower(email) AS email,
       email_confirmed_at IS NOT NULL AS confirmed
     FROM auth.users
     WHERE email IS NOT NULL`
  )

  return new Map(
    rows
      .filter((row) => row.confirmed)
      .map((row) => [normalizeEmail(row.email), row])
  )
}

async function main() {
  const business = await prisma.business.findUnique({
    where: { slug: BUSINESS_SLUG },
    select: {
      id: true,
      name: true,
      owners: {
        where: { role: 'BARBER' },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          businessId: true,
        },
      },
    },
  })

  if (!business) {
    throw new Error(`No existe el negocio ${BUSINESS_SLUG}.`)
  }

  const confirmedAuthUsers = await getConfirmedAuthUsers()
  const selectedBarbers: DemoBarber[] = business.owners.filter((owner) =>
    confirmedAuthUsers.has(normalizeEmail(owner.email))
  )
  const selectedEmails = new Set(
    selectedBarbers.map((owner) => normalizeEmail(owner.email))
  )

  console.log(`Negocio: ${business.name} (${BUSINESS_SLUG})`)
  console.log(`Barberos existentes en Owner: ${business.owners.length}`)
  console.log(`Barberos reutilizados con Auth confirmado: ${selectedBarbers.length}`)

  for (const candidate of barberCandidates) {
    if (selectedBarbers.length >= TARGET_BARBER_COUNT) break

    const email = normalizeEmail(candidate.email)
    if (selectedEmails.has(email) || !confirmedAuthUsers.has(email)) {
      continue
    }

    const ownerByEmail = await prisma.owner.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        businessId: true,
      },
    })

    if (ownerByEmail && ownerByEmail.businessId !== business.id) {
      throw new Error(`${email} ya pertenece a otro negocio.`)
    }

    const owner = ownerByEmail
      ? await prisma.owner.update({
          where: { id: ownerByEmail.id },
          data: { role: 'BARBER' },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            businessId: true,
          },
        })
      : await prisma.owner.create({
          data: {
            name: candidate.name,
            email,
            password: AUTH_MANAGED_PASSWORD_MARKER,
            role: 'BARBER',
            businessId: business.id,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            businessId: true,
          },
        })

    selectedBarbers.push(owner)
    selectedEmails.add(email)
    console.log(`${ownerByEmail ? 'Owner reutilizado' : 'Owner creado'}: ${email}`)
  }

  if (selectedBarbers.length < TARGET_BARBER_COUNT) {
    const missingCount = TARGET_BARBER_COUNT - selectedBarbers.length
    const missingEmails = barberCandidates
      .map((candidate) => normalizeEmail(candidate.email))
      .filter(
        (email) =>
          !selectedEmails.has(email) && !confirmedAuthUsers.has(email)
      )
      .slice(0, missingCount)

    throw new Error(
      `Solo hay ${selectedBarbers.length} barberos preparados. ` +
      `Crea y confirma manualmente en Supabase Authentication estas ${missingCount} cuentas: ` +
      missingEmails.join(', ')
    )
  }

  const demoBarbers = selectedBarbers.slice(0, TARGET_BARBER_COUNT)
  const clients = await prisma.user.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })

  if (clients.length === 0) {
    throw new Error(
      'No hay clientes disponibles para asociar los cortes de demostración.'
    )
  }

  const week = getPreviousWeekRange()
  const serviceName = `${DEMO_SERVICE_PREFIX} ${week.key}`
  const existingDemoCuts = await prisma.haircut.count({
    where: {
      businessId: business.id,
      serviceName,
      createdAt: {
        gte: week.start,
        lte: week.end,
      },
    },
  })

  if (existingDemoCuts === 0) {
    const haircutRows = demoBarbers.flatMap((barber, barberIndex) => {
      const profile = performanceProfiles[barberIndex]

      return Array.from({ length: profile.cuts }, (_, cutIndex) => ({
        userId: clients[(barberIndex * 5 + cutIndex) % clients.length].id,
        businessId: business.id,
        barberId: barber.id,
        type: 'PAID',
        serviceName,
        priceCents: profile.priceCents,
        paymentMethod:
          paymentMethods[(barberIndex + cutIndex) % paymentMethods.length],
        createdAt: buildHaircutDate(week.start, barberIndex, cutIndex),
      }))
    })

    await prisma.haircut.createMany({ data: haircutRows })
    console.log(`Cortes demo creados para la semana ${week.key}: ${haircutRows.length}`)
  } else {
    console.log(
      `Actividad demo omitida: ya existen ${existingDemoCuts} cortes para la semana ${week.key}.`
    )
  }

  console.log('')
  console.log('Resumen de rendimiento:')
  demoBarbers.forEach((barber, index) => {
    const profile = performanceProfiles[index]
    const incomeCents = profile.cuts * profile.priceCents

    console.log(
      `- ${barber.name}: ${profile.cuts} cortes, S/ ${(incomeCents / 100).toFixed(2)}`
    )
  })
}

main()
  .catch((error) => {
    console.error('Error preparando barberos y rendimiento demo:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
