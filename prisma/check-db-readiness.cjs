const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const checks = {
  duplicateBusinessSlugs: `
    SELECT COUNT(*)::int AS count
    FROM (SELECT "slug" FROM "Business" GROUP BY "slug" HAVING COUNT(*) > 1) duplicates
  `,
  duplicateOwnerEmails: `
    SELECT COUNT(*)::int AS count
    FROM (SELECT "email" FROM "Owner" GROUP BY "email" HAVING COUNT(*) > 1) duplicates
  `,
  duplicateUserPhones: `
    SELECT COUNT(*)::int AS count
    FROM (
      SELECT "phone", "businessId"
      FROM "User"
      GROUP BY "phone", "businessId"
      HAVING COUNT(*) > 1
    ) duplicates
  `,
  duplicateScanTokens: `
    SELECT COUNT(*)::int AS count
    FROM (SELECT "token" FROM "ScanToken" GROUP BY "token" HAVING COUNT(*) > 1) duplicates
  `,
  orphanOwners: `
    SELECT COUNT(*)::int AS count
    FROM "Owner" owner_record
    LEFT JOIN "Business" business ON business."id" = owner_record."businessId"
    WHERE business."id" IS NULL
  `,
  orphanUsers: `
    SELECT COUNT(*)::int AS count
    FROM "User" user_record
    LEFT JOIN "Business" business ON business."id" = user_record."businessId"
    WHERE business."id" IS NULL
  `,
  orphanStamps: `
    SELECT COUNT(*)::int AS count
    FROM "Stamp" stamp
    LEFT JOIN "User" user_record ON user_record."id" = stamp."userId"
    LEFT JOIN "Business" business ON business."id" = stamp."businessId"
    WHERE user_record."id" IS NULL OR business."id" IS NULL
  `,
  orphanScanTokens: `
    SELECT COUNT(*)::int AS count
    FROM "ScanToken" scan_token
    LEFT JOIN "User" user_record ON user_record."id" = scan_token."userId"
    LEFT JOIN "Business" business ON business."id" = scan_token."businessId"
    WHERE user_record."id" IS NULL OR business."id" IS NULL
  `,
  orphanHaircuts: `
    SELECT COUNT(*)::int AS count
    FROM "Haircut" haircut
    LEFT JOIN "User" user_record ON user_record."id" = haircut."userId"
    LEFT JOIN "Business" business ON business."id" = haircut."businessId"
    LEFT JOIN "Owner" barber ON barber."id" = haircut."barberId"
    WHERE user_record."id" IS NULL
       OR business."id" IS NULL
       OR (haircut."barberId" IS NOT NULL AND barber."id" IS NULL)
  `,
  orphanProducts: `
    SELECT COUNT(*)::int AS count
    FROM "Product" product
    LEFT JOIN "Business" business ON business."id" = product."businessId"
    WHERE business."id" IS NULL
  `,
  orphanStyles: `
    SELECT COUNT(*)::int AS count
    FROM "HaircutStyle" style
    LEFT JOIN "Business" business ON business."id" = style."businessId"
    WHERE business."id" IS NULL
  `,
  orphanMovements: `
    SELECT COUNT(*)::int AS count
    FROM "inventory_movements" movement
    LEFT JOIN "Business" business ON business."id" = movement."businessId"
    LEFT JOIN "Product" product ON product."id" = movement."productId"
    LEFT JOIN "Owner" owner_record ON owner_record."id" = movement."userId"
    WHERE business."id" IS NULL
       OR product."id" IS NULL
       OR (movement."userId" IS NOT NULL AND owner_record."id" IS NULL)
  `,
}

async function main() {
  let hasProblems = false

  for (const [name, sql] of Object.entries(checks)) {
    const [row] = await prisma.$queryRawUnsafe(sql)
    const count = row.count
    console.log(`${name}: ${count}`)
    hasProblems ||= count > 0
  }

  if (hasProblems) {
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
