CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "previousStock" INTEGER NOT NULL,
    "newStock" INTEGER NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "inventory_movements_businessId_createdAt_idx"
ON "inventory_movements"("businessId", "createdAt");

CREATE INDEX "inventory_movements_productId_createdAt_idx"
ON "inventory_movements"("productId", "createdAt");

CREATE INDEX "inventory_movements_userId_createdAt_idx"
ON "inventory_movements"("userId", "createdAt");

ALTER TABLE "inventory_movements"
ADD CONSTRAINT "inventory_movements_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_movements"
ADD CONSTRAINT "inventory_movements_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "inventory_movements"
ADD CONSTRAINT "inventory_movements_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "Owner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "inventory_movements"
ADD CONSTRAINT "inventory_movements_type_check" CHECK ("type" IN ('IN', 'OUT'));

ALTER TABLE "inventory_movements"
ADD CONSTRAINT "inventory_movements_quantity_check" CHECK ("quantity" > 0);

ALTER TABLE "inventory_movements"
ADD CONSTRAINT "inventory_movements_stock_check"
CHECK ("previousStock" >= 0 AND "newStock" >= 0);
