# Project Context - Barber Fidelity

## 1) Vision del sistema
Barber Fidelity es un sistema de fidelizacion para barberias con regla 5+1:
- Cliente acumula 1 sello por corte pagado.
- Al llegar a 5 sellos, desbloquea 1 corte gratis.

Modelo de uso:
- Cliente entra por QR del negocio y se registra.
- Cliente usa tarjeta digital con QR para validacion.
- Barbero escanea y aplica sello/canje desde su panel.

## 2) Stack tecnico
- Frontend/Backend: Next.js 16 (App Router)
- ORM: Prisma
- Auth: Supabase Auth (email/password)
- DB: Supabase Postgres

## 3) Arquitectura funcional actual
### Cliente
- Registro: `/{businessSlug}`
- Tarjeta: `/{businessSlug}/card/{userId}`
- La tarjeta muestra progreso y QR dinamico temporal.

### Barbero
- Login: `/barber/login`
- Panel: `/barber`
- Escaneo de QR y acciones:
  - Agregar sello
  - Canjear corte gratis

### Endpoints principales
- `POST /api/users` -> registro de cliente (solo negocio existente)
- `GET /api/users/[id]` -> datos de cliente (con reglas de acceso)
- `PATCH /api/users/[id]/stamp` -> agrega sello
- `POST /api/users/[id]/redeem` -> canjea gratis
- `POST /api/users/[id]/token` -> genera token QR temporal
- `POST /api/scan/resolve` -> resuelve token escaneado
- `/api/stamps` -> legado deprecado (410)

## 4) Seguridad implementada
- Supabase Auth en login de barbero.
- Middleware protege rutas privadas de barbero y endpoints de mutacion.
- Autorizacion por negocio:
  - El owner autenticado solo puede operar clientes de su `businessId`.
- QR dinamico temporal (no se usa `userId` fijo como QR operativo):
  - Token con expiracion.
  - Token de un solo uso al sellar/canjear.
- Validaciones de entrada:
  - Nombre sanitizado y con rango.
  - Telefono normalizado a 10 digitos.
  - `businessSlug` validado por regex.
- Controles de origen en APIs (same-origin/same-site + header interno).
- Headers de seguridad en middleware:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: same-origin`

## 5) QR dinamico (estado)
- Implementado y funcional.
- Vigencia configurable por entorno:
  - `QR_TOKEN_TTL_SECONDS` (actual: 180)
  - Limites aplicados en codigo: min 60, max 600.
- Tarjeta cliente muestra countdown de expiracion del QR.

## 6) Recordatorios y UX
- Recordatorio interno al cliente cuando esta en 3/5 (faltan 2 cortes).
- Se muestra como toast flotante en la tarjeta.
- Politica actual: mostrar solo 1 vez por dia por cliente/dispositivo
  - Persistencia local en `localStorage`.
- No se muestra recordatorio extra en panel del barbero.

## 7) Antifraude (preparado)
Cooldown de sellos preparado pero apagado para pruebas:
- `ENABLE_STAMP_COOLDOWN=false`
- `MIN_HOURS_BETWEEN_STAMPS=12`

Comportamiento cuando se active:
- Bloquea sellos muy seguidos (ej. dentro de 12h).
- Responde `429` con mensaje de espera aproximada.

## 8) Configuracion de entorno actual (referencia)
Variables importantes:
- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `QR_TOKEN_TTL_SECONDS=180`
- `ENABLE_STAMP_COOLDOWN=false`
- `MIN_HOURS_BETWEEN_STAMPS=12`

Nota: valores sensibles no deben compartirse fuera del entorno local/servidor.

## 9) Estado de datos y operaciones
- Proyecto conectado a Supabase Postgres (pooler).
- Seed de demo deshabilitado para produccion (no inserta datos fake).
- Negocio real configurado en DB (slug operativo: `barberia-centro`).
- Owner real vinculado por email de Supabase Auth.

## 10) Problemas conocidos y solucion rapida
### Error tipo `prisma.scanToken is undefined`
Causa: Prisma Client desactualizado en proceso en ejecucion.
Solucion:
1. Detener `npm run dev`.
2. Ejecutar `npx prisma generate`.
3. Volver a levantar `npm run dev`.

### Error de origen no permitido
- Ya mitigado con validacion mas robusta + header interno en fetch.

## 11) Checklist previo a deploy
1. Verificar `.env` de produccion.
2. Confirmar `npx prisma db push` en entorno objetivo.
3. Probar flujo completo cliente->barbero->sello->canje.
4. Decidir si activar cooldown en produccion.
5. Revisar branding/textos y codificacion visible de UI.

## 12) Proximos pasos recomendados
Corto plazo:
1. Ajustar/limpiar textos con caracteres mal codificados en UI.
2. Agregar rate limiting por IP en endpoints sensibles.
3. Agregar pruebas automatizadas de rutas criticas.

Mediano plazo:
1. PWA completa (manifest, icons, SW).
2. Push notifications reales (fase 2), especialmente para clientes opt-in.
3. Panel de metricas para negocio (retencion, canjes, visitas).

## 13) Convenciones para continuar trabajando
Cuando retomemos trabajo:
- Referencia base: este archivo.
- Mantener cambios en ramas limpias.
- Validar siempre con:
  - `npm run lint`
  - `npm run build`
- Si hay cambios Prisma:
  - `npx prisma generate`
  - `npx prisma db push` (segun entorno)
