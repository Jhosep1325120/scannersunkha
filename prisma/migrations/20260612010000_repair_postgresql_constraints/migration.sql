-- Bring a database created manually in line with prisma/schema.prisma.
-- Unique indexes intentionally fail if duplicate business slugs, owner emails,
-- scan tokens, or user phone/business pairs already exist.

CREATE UNIQUE INDEX IF NOT EXISTS "Business_slug_key"
ON public."Business" ("slug");

CREATE INDEX IF NOT EXISTS "Business_slug_idx"
ON public."Business" ("slug");

CREATE UNIQUE INDEX IF NOT EXISTS "Owner_email_key"
ON public."Owner" ("email");

CREATE INDEX IF NOT EXISTS "Owner_businessId_idx"
ON public."Owner" ("businessId");

CREATE INDEX IF NOT EXISTS "Owner_role_idx"
ON public."Owner" ("role");

CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_businessId_key"
ON public."User" ("phone", "businessId");

CREATE INDEX IF NOT EXISTS "User_businessId_idx"
ON public."User" ("businessId");

CREATE INDEX IF NOT EXISTS "Stamp_userId_idx"
ON public."Stamp" ("userId");

CREATE INDEX IF NOT EXISTS "Stamp_businessId_idx"
ON public."Stamp" ("businessId");

CREATE UNIQUE INDEX IF NOT EXISTS "ScanToken_token_key"
ON public."ScanToken" ("token");

CREATE INDEX IF NOT EXISTS "ScanToken_userId_createdAt_idx"
ON public."ScanToken" ("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "ScanToken_businessId_createdAt_idx"
ON public."ScanToken" ("businessId", "createdAt");

CREATE INDEX IF NOT EXISTS "ScanToken_userId_businessId_usedAt_expiresAt_idx"
ON public."ScanToken" ("userId", "businessId", "usedAt", "expiresAt");

CREATE INDEX IF NOT EXISTS "ScanToken_expiresAt_idx"
ON public."ScanToken" ("expiresAt");

CREATE INDEX IF NOT EXISTS "Haircut_userId_createdAt_idx"
ON public."Haircut" ("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "Haircut_businessId_createdAt_idx"
ON public."Haircut" ("businessId", "createdAt");

CREATE INDEX IF NOT EXISTS "Haircut_barberId_createdAt_idx"
ON public."Haircut" ("barberId", "createdAt");

CREATE INDEX IF NOT EXISTS "Haircut_businessId_paymentMethod_idx"
ON public."Haircut" ("businessId", "paymentMethod");

CREATE INDEX IF NOT EXISTS "Product_businessId_active_idx"
ON public."Product" ("businessId", "active");

CREATE INDEX IF NOT EXISTS "Product_businessId_createdAt_idx"
ON public."Product" ("businessId", "createdAt");

CREATE INDEX IF NOT EXISTS "HaircutStyle_businessId_active_idx"
ON public."HaircutStyle" ("businessId", "active");

CREATE INDEX IF NOT EXISTS "HaircutStyle_businessId_createdAt_idx"
ON public."HaircutStyle" ("businessId", "createdAt");

CREATE INDEX IF NOT EXISTS "inventory_movements_businessId_createdAt_idx"
ON public."inventory_movements" ("businessId", "createdAt");

CREATE INDEX IF NOT EXISTS "inventory_movements_productId_createdAt_idx"
ON public."inventory_movements" ("productId", "createdAt");

CREATE INDEX IF NOT EXISTS "inventory_movements_userId_createdAt_idx"
ON public."inventory_movements" ("userId", "createdAt");

ALTER TABLE public."Owner"
DROP CONSTRAINT IF EXISTS "Owner_businessId_fkey",
ADD CONSTRAINT "Owner_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES public."Business"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public."User"
DROP CONSTRAINT IF EXISTS "User_businessId_fkey",
ADD CONSTRAINT "User_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES public."Business"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public."Stamp"
DROP CONSTRAINT IF EXISTS "Stamp_userId_fkey",
DROP CONSTRAINT IF EXISTS "Stamp_businessId_fkey",
ADD CONSTRAINT "Stamp_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES public."User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "Stamp_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES public."Business"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public."ScanToken"
DROP CONSTRAINT IF EXISTS "ScanToken_userId_fkey",
DROP CONSTRAINT IF EXISTS "ScanToken_businessId_fkey",
ADD CONSTRAINT "ScanToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES public."User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "ScanToken_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES public."Business"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public."Haircut"
DROP CONSTRAINT IF EXISTS "Haircut_userId_fkey",
DROP CONSTRAINT IF EXISTS "Haircut_businessId_fkey",
DROP CONSTRAINT IF EXISTS "Haircut_barberId_fkey",
ADD CONSTRAINT "Haircut_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES public."User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "Haircut_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES public."Business"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "Haircut_barberId_fkey"
  FOREIGN KEY ("barberId") REFERENCES public."Owner"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public."Product"
DROP CONSTRAINT IF EXISTS "Product_businessId_fkey",
ADD CONSTRAINT "Product_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES public."Business"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public."HaircutStyle"
DROP CONSTRAINT IF EXISTS "HaircutStyle_businessId_fkey",
ADD CONSTRAINT "HaircutStyle_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES public."Business"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public."inventory_movements"
DROP CONSTRAINT IF EXISTS "inventory_movements_businessId_fkey",
DROP CONSTRAINT IF EXISTS "inventory_movements_productId_fkey",
DROP CONSTRAINT IF EXISTS "inventory_movements_userId_fkey",
ADD CONSTRAINT "inventory_movements_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES public."Business"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "inventory_movements_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES public."Product"("id")
  ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "inventory_movements_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES public."Owner"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE public."inventory_movements"
DROP CONSTRAINT IF EXISTS "inventory_movements_type_check",
DROP CONSTRAINT IF EXISTS "inventory_movements_quantity_check",
DROP CONSTRAINT IF EXISTS "inventory_movements_stock_check",
DROP CONSTRAINT IF EXISTS "inventory_movements_reason_check",
DROP CONSTRAINT IF EXISTS "inventory_movements_prices_check",
ADD CONSTRAINT "inventory_movements_type_check"
  CHECK ("type" IN ('IN', 'OUT')),
ADD CONSTRAINT "inventory_movements_quantity_check"
  CHECK ("quantity" > 0),
ADD CONSTRAINT "inventory_movements_stock_check"
  CHECK ("previousStock" >= 0 AND "newStock" >= 0),
ADD CONSTRAINT "inventory_movements_reason_check"
  CHECK ("reason" IS NULL OR "reason" IN ('SALE', 'SUPPLY', 'ADJUSTMENT', 'INITIAL')),
ADD CONSTRAINT "inventory_movements_prices_check"
  CHECK (
    ("unitPriceCents" IS NULL OR "unitPriceCents" >= 0)
    AND ("totalCents" IS NULL OR "totalCents" >= 0)
  );
