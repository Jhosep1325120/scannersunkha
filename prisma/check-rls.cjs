const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const rows = await prisma.$queryRaw`
    SELECT relname AS table_name, relrowsecurity AS rls_enabled
    FROM pg_class
    WHERE relnamespace = 'public'::regnamespace
      AND relname IN ('_prisma_migrations', 'inventory_movements')
    ORDER BY relname
  `

  console.log(rows)

  if (rows.length !== 2 || rows.some((row) => !row.rls_enabled)) {
    process.exitCode = 1
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
