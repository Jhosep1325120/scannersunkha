import { PrismaClient } from '@prisma/client'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()

const BUSINESS_SLUG = 'barberia-centro'
const TEMPORARY_PASSWORD = '123456789'
const TARGET_BARBER_COUNT = 6
const DEMO_SERVICE_PREFIX = 'Demo rendimiento semanal'

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

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function getPreviousWeekRange() {
  const nowInLima = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Lima' })
  )
  const currentDay = nowInLima.getDay()
  const daysSinceMonday = (currentDay + 6) % 7
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
  date.setHours(9 + ((barberIndex * 2 + cutIndex) % 10), (cutIndex * 10) % 60, 0, 0)

  return date
}

async function getAuthUsers() {
  const rows = await prisma.$queryRawUnsafe<AuthUserRow[]>(
    `SELECT
       lower(email) AS email,
       email_confirmed_at IS NOT NULL AS confirmed
     FROM auth.users
     WHERE email IS NOT NULL`
  )

  return new Map(rows.map((row) => [normalizeEmail(row.email), row]))
}

async function passwordWorks(
  supabase: SupabaseClient,
  email: string
) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: TEMPORARY_PASSWORD,
  })

  if (data.session) {
    await supabase.auth.signOut()
  }

  return !error && Boolean(data.user)
}

async function confirmDemoAuthEmail(email: string) {
  const updatedRows = await prisma.$executeRaw`
    UPDATE auth.users
    SET
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW()
    WHERE lower(email) = lower(${email})
  `

  if (updatedRows !== 1) {
    throw new Error(`No se pudo confirmar la cuenta demo ${email} en Supabase Auth.`)
  }
}

async function ensureAuthAccount(
  supabase: SupabaseClient,
  authUsers: Map<string, AuthUserRow>,
  email: string
) {
  const normalizedEmail = normalizeEmail(email)
  const existingAuthUser = authUsers.get(normalizedEmail)

  if (existingAuthUser) {
    if (!existingAuthUser.confirmed) {
      await confirmDemoAuthEmail(normalizedEmail)
      existingAuthUser.confirmed = true
      console.log(`Auth confirmado para demo: ${normalizedEmail}`)
    }

    const hasDemoPassword = await passwordWorks(supabase, normalizedEmail)
    if (!hasDemoPassword) {
      throw new Error(
        `${normalizedEmail} ya existe en Supabase Auth, pero no usa la contraseña temporal solicitada.`
      )
    }

    console.log(`Auth reutilizado: ${normalizedEmail}`)
    return
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: TEMPORARY_PASSWORD,
  })

  if (error) {
    throw new Error(`No se pudo crear ${normalizedEmail} en Supabase Auth: ${error.message}`)
  }

  if (!data.user) {
    throw new Error(`Supabase no devolvió el usuario creado para ${normalizedEmail}.`)
  }

  if (!data.session) {
    await confirmDemoAuthEmail(normalizedEmail)
    const hasDemoPassword = await passwordWorks(supabase, normalizedEmail)
    if (!hasDemoPassword) {
      throw new Error(`La cuenta demo ${normalizedEmail} fue confirmada, pero no pudo iniciar sesión.`)
    }
  }

  await supabase.auth.signOut()
  authUsers.set(normalizedEmail, { email: normalizedEmail, confirmed: true })
  console.log(`Auth creado: ${normalizedEmail}`)
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan las variables públicas de Supabase requeridas por el proyecto.')
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

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

  const authUsers = await getAuthUsers()
  const selectedBarbers = [...business.owners]

  console.log(`Negocio: ${business.name} (${BUSINESS_SLUG})`)
  console.log(`Barberos existentes en Owner: ${selectedBarbers.length}`)

  for (const owner of selectedBarbers.slice(0, TARGET_BARBER_COUNT)) {
    await ensureAuthAccount(supabase, authUsers, owner.email)

    await prisma.owner.update({
      where: { id: owner.id },
      data: {
        role: 'BARBER',
        businessId: business.id,
        password: TEMPORARY_PASSWORD,
      },
    })
  }

  for (const candidate of barberCandidates) {
    if (selectedBarbers.length >= TARGET_BARBER_COUNT) break

    const email = normalizeEmail(candidate.email)
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

    if (ownerByEmail) {
      if (ownerByEmail.businessId !== business.id) {
        throw new Error(`${email} ya pertenece a otro negocio.`)
      }

      await ensureAuthAccount(supabase, authUsers, email)
      const reusedOwner = await prisma.owner.update({
        where: { id: ownerByEmail.id },
        data: {
          role: 'BARBER',
          password: TEMPORARY_PASSWORD,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          businessId: true,
        },
      })
      selectedBarbers.push(reusedOwner)
      console.log(`Owner reutilizado: ${email}`)
      continue
    }

    await ensureAuthAccount(supabase, authUsers, email)
    const createdOwner = await prisma.owner.create({
      data: {
        name: candidate.name,
        email,
        password: TEMPORARY_PASSWORD,
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

    selectedBarbers.push(createdOwner)
    console.log(`Owner creado: ${email}`)
  }

  if (selectedBarbers.length < TARGET_BARBER_COUNT) {
    throw new Error(`Solo se pudieron preparar ${selectedBarbers.length} barberos.`)
  }

  const demoBarbers = selectedBarbers.slice(0, TARGET_BARBER_COUNT)
  const clients = await prisma.user.findMany({
    where: { businessId: business.id },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })

  if (clients.length === 0) {
    throw new Error('No hay clientes disponibles para asociar los cortes de demostración.')
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
        paymentMethod: paymentMethods[(barberIndex + cutIndex) % paymentMethods.length],
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
  console.log(`Contraseña temporal demo: ${TEMPORARY_PASSWORD}`)
}

main()
  .catch((error) => {
    console.error('Error preparando barberos y rendimiento demo:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
