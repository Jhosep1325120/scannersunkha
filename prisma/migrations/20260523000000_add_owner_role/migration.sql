ALTER TABLE "Owner" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'BARBER';

CREATE INDEX "Owner_role_idx" ON "Owner"("role");
