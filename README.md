# Barber Fidelity

Sistema de fidelizacion para barberias:
- Cliente: tarjeta digital con QR.
- Barbero: escaneo y gestion de sellos.
- Regla: 5 cortes pagados = 1 corte gratis.

## Stack

- Next.js 16 (App Router)
- Prisma ORM
- Supabase Auth (email/password)
- PostgreSQL (recomendado: base de datos de Supabase)

## Variables de entorno

Crea o actualiza `.env`:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[ANON_KEY]"
QR_TOKEN_TTL_SECONDS="180"
ENABLE_STAMP_COOLDOWN="false"
MIN_HOURS_BETWEEN_STAMPS="12"
```

`QR_TOKEN_TTL_SECONDS` controla la vigencia del QR dinamico del cliente (rango permitido: 60 a 600 segundos).
`ENABLE_STAMP_COOLDOWN` activa el bloqueo de sellos demasiado seguidos.
`MIN_HOURS_BETWEEN_STAMPS` define horas minimas entre sellos cuando el cooldown esta activo.

## Configuracion de Supabase Auth

1. En Supabase, habilita `Email` provider en Authentication.
2. Crea al menos un usuario barbero (Dashboard o API Admin).
3. Usa ese email/password para iniciar sesion en `/barber/login`.

## Instalacion

```bash
npm install
```

## Base de datos (Prisma + Supabase Postgres)

Si vienes de SQLite, haz un push limpio al schema actual:

```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

## Desarrollo

```bash
npm run dev
```

## Rutas principales

- `/{businessSlug}`: registro de cliente
- `/{businessSlug}/card/{userId}`: tarjeta digital
- `/barber/login`: login barbero (Supabase)
- `/barber`: panel barbero protegido

## Seguridad aplicada

- Eliminado login hardcodeado y `localStorage` para auth.
- Middleware protege `/barber/*` y operaciones de sellos.
- Endpoints protegidos:
  - `PATCH /api/users/[id]/stamp`
  - `POST /api/users/[id]/redeem`
- Endpoint legado deprecado:
  - `/api/stamps` responde `410 Gone`.
