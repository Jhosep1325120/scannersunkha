// Comentario: Carga datos iniciales para probar la app en desarrollo.
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding sample data...')

  // Crear negocio de ejemplo
  const business = await prisma.business.upsert({
    where: { slug: 'barberia-centro' },
    update: {},
    create: {
      name: 'Barbería Sunkha',
      slug: 'barberia-centro',
    },
  })

  // Crear owner de ejemplo
  await prisma.owner.upsert({
    where: { email: 'admin@sunkha.com' },
    update: {},
    create: {
      email: 'admin@sunkha.com',
      password: '$2b$10$example.hash.here', // Cambia esto por un hash real
      name: 'Admin Sunkha',
      role: 'ADMIN',
      businessId: business.id,
    },
  })

  console.log('Sample data inserted successfully')
}

main()
  .catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
