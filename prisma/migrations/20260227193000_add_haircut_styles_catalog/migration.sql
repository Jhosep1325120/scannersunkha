-- CreateTable
CREATE TABLE "HaircutStyle" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "priceCents" INTEGER,
    "durationMin" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "HaircutStyle_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "HaircutStyle_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "HaircutStyle_businessId_active_idx" ON "HaircutStyle"("businessId", "active");

-- CreateIndex
CREATE INDEX "HaircutStyle_businessId_createdAt_idx" ON "HaircutStyle"("businessId", "createdAt");
