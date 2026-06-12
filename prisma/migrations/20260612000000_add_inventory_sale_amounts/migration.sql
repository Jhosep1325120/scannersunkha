ALTER TABLE "inventory_movements"
ADD COLUMN "reason" TEXT,
ADD COLUMN "unitPriceCents" INTEGER,
ADD COLUMN "totalCents" INTEGER;

ALTER TABLE "inventory_movements"
ADD CONSTRAINT "inventory_movements_reason_check"
CHECK ("reason" IS NULL OR "reason" IN ('SALE', 'SUPPLY', 'ADJUSTMENT', 'INITIAL'));

ALTER TABLE "inventory_movements"
ADD CONSTRAINT "inventory_movements_prices_check"
CHECK (
  ("unitPriceCents" IS NULL OR "unitPriceCents" >= 0)
  AND ("totalCents" IS NULL OR "totalCents" >= 0)
);
