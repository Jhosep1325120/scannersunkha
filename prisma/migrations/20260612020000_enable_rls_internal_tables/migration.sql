-- These tables are accessed only by the trusted server-side Prisma connection.
-- With RLS enabled and no public policies, Supabase anon/authenticated API roles
-- cannot read or modify them through PostgREST.

ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."inventory_movements" ENABLE ROW LEVEL SECURITY;
