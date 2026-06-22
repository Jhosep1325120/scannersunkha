import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PUBLIC_BUSINESS_SLUG = 'barberia-sunkha'
const DATABASE_BUSINESS_SLUG = 'barberia-centro'
const DEFAULT_HAIRCUT_PRICE_CENTS = 2500

const demoClients = [
  { name: 'Luis Alberto Mendoza Rojas', phone: '912345671', stamps: 3 },
  { name: 'Carlos Eduardo Salazar Peña', phone: '923456782', stamps: 3 },
  { name: 'Miguel Ángel Torres Huamán', phone: '934567893', stamps: 3 },
  { name: 'José Antonio Vargas Quispe', phone: '945678904', stamps: 3 },
  { name: 'Diego Fernando Ramos Castillo', phone: '956789015', stamps: 3 },
  { name: 'Andrés Felipe Chávez Flores', phone: '967890126', stamps: 3 },
  { name: 'Renzo Sebastián Paredes Silva', phone: '978901237', stamps: 4 },
  { name: 'Jorge Luis Cabrera Medina', phone: '989012348', stamps: 4 },
  { name: 'Marco Antonio Ríos Valdivia', phone: '901234569', stamps: 4 },
  { name: 'Adrián Nicolás Soto Cárdenas', phone: '913579246', stamps: 4 },
  { name: 'Franco Alejandro León Castro', phone: '924680357', stamps: 4 },
  { name: 'Paolo Enrique Gutiérrez Núñez', phone: '935791468', stamps: 4 },
] as const

function haircutDate(clientIndex: number, haircutIndex: number) {
  const date = new Date()
  const daysAgo = (clientIndex + 1) * 2 + (haircutIndex + 1) * 8

  date.setDate(date.getDate() - daysAgo)
  date.setHours(10 + ((clientIndex + haircutIndex) % 8), 15, 0, 0)

  return date
}

async function main() {
  console.log('Creando clientes de demostración para Barber Fidelity...')

  const business = await prisma.business.findFirst({
    where: {
      slug: {
        in: [PUBLIC_BUSINESS_SLUG, DATABASE_BUSINESS_SLUG],
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  })

  if (!business) {
    throw new Error(
      `No existe el negocio ${PUBLIC_BUSINESS_SLUG} (slug en base: ${DATABASE_BUSINESS_SLUG}).`
    )
  }

  const barber = await prisma.owner.findFirst({
    where: {
      businessId: business.id,
      role: 'BARBER',
    },
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      id: true,
      name: true,
    },
  })

  let created = 0
  let skipped = 0

  for (const [clientIndex, client] of demoClients.entries()) {
    const existingClient = await prisma.user.findFirst({
      where: {
        businessId: business.id,
        phone: client.phone,
      },
      select: {
        id: true,
        name: true,
      },
    })

    if (existingClient) {
      skipped += 1
      console.log(`Omitido: ${client.phone} ya pertenece a ${existingClient.name}.`)
      continue
    }

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          businessId: business.id,
          name: client.name,
          phone: client.phone,
          stamps: client.stamps,
          totalCuts: client.stamps,
        },
        select: {
          id: true,
        },
      })

      const visits = Array.from({ length: client.stamps }, (_, haircutIndex) => ({
        createdAt: haircutDate(clientIndex, haircutIndex),
        haircutIndex,
      }))

      await tx.stamp.createMany({
        data: visits.map(({ createdAt }) => ({
          userId: user.id,
          businessId: business.id,
          type: 'PAID',
          createdAt,
        })),
      })

      await tx.haircut.createMany({
        data: visits.map(({ createdAt, haircutIndex }) => ({
          userId: user.id,
          businessId: business.id,
          barberId: barber?.id ?? null,
          type: 'PAID',
          serviceName: 'Corte de cabello',
          priceCents: DEFAULT_HAIRCUT_PRICE_CENTS,
          paymentMethod: haircutIndex % 2 === 0 ? 'YAPE' : 'CASH',
          createdAt,
        })),
      })
    })

    created += 1
    console.log(`Creado: ${client.name} — ${client.stamps} sellos.`)
  }

  console.log('')
  console.log(`Negocio: ${business.name} (${business.slug})`)
  console.log(`Barbero asociado al historial: ${barber?.name ?? 'Sin barbero disponible'}`)
  console.log(`Clientes creados: ${created}`)
  console.log(`Clientes omitidos por teléfono existente: ${skipped}`)
  console.log('Seed de demostración finalizado.')
}

main()
  .catch((error) => {
    console.error('Error al crear clientes de demostración:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
