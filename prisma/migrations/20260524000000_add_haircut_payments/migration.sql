ALTER TABLE "Haircut" ADD COLUMN "barberId" TEXT;
ALTER TABLE "Haircut" ADD COLUMN "paymentMethod" TEXT;

CREATE INDEX "Haircut_barberId_createdAt_idx" ON "Haircut"("barberId", "createdAt");
CREATE INDEX "Haircut_businessId_paymentMethod_idx" ON "Haircut"("businessId", "paymentMethod");

ALTER TABLE "Haircut" ADD CONSTRAINT "Haircut_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
