CREATE TABLE IF NOT EXISTS public."ScanToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanToken_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ScanToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScanToken_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES public."Business"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
