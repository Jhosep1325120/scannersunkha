-- CreateTable
CREATE TABLE "Haircut" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL DEFAULT 'Corte de cabello',
    "priceCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Haircut_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Haircut_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Haircut_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Haircut_userId_createdAt_idx" ON "Haircut"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Haircut_businessId_createdAt_idx" ON "Haircut"("businessId", "createdAt");
