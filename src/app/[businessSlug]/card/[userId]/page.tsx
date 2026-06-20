// Comentario: Muestra la tarjeta de fidelidad de un cliente.
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { QRCodeSVG } from 'qrcode.react'
import { Scissors, Gift, Lock, Unlock, Crown, User, Calendar, Award, ShoppingBag, Percent } from 'lucide-react'
import { StatePanel } from '@/components/ui/StatePanel'
import { useToast } from '@/components/ui/ToastProvider'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { getBusinessWebsiteUrl } from '@/lib/publicUrl'

interface UserData {
  id: string
  name: string
  phone: string
  stamps: number
  totalCuts: number
  canRedeem: boolean
  businessName: string
  businessSlug: string
}

interface QrTokenData {
  token: string
  expiresAt: string
}

interface HaircutItem {
  id: string
  type: 'PAID' | 'FREE'
  serviceName: string
  priceCents: number | null
  createdAt: string
}

const QR_REFRESH_SAFETY_MS = 12_000
const QR_RETRY_DELAY_MS = 5_000
const QR_SLOW_NOTICE_MS = 6_000
const QR_TOKEN_TIMEOUT_MS = 25_000
const PROMOTION_ROTATION_MS = 4_500

const promotions = [
  {
    eyebrow: 'Promo especial',
    title: '15% de descuento',
    detail: 'En productos seleccionados al mostrar tu tarjeta.',
  },
  {
    eyebrow: 'Club Sunkha',
    title: 'Trae a un amigo',
    detail: 'Pregunta por beneficios para clientes frecuentes.',
  },
  {
    eyebrow: 'Semana barber',
    title: 'Combo corte + producto',
    detail: 'Consulta disponibilidad directamente en la barberia.',
  },
]

function getQrTokenStorageKey(businessSlug: string, userId: string) {
  return `qr-token:${businessSlug}:${userId}`
}

function getMillisecondsUntilExpiry(expiresAt: string) {
  return new Date(expiresAt).getTime() - Date.now()
}

function isUsableQrToken(token: QrTokenData | null) {
  if (!token?.token || !token.expiresAt) return false
  return getMillisecondsUntilExpiry(token.expiresAt) > QR_REFRESH_SAFETY_MS
}

function getReminderStorageKey(userId: string) {
  const today = new Date().toISOString().slice(0, 10)
  return `two-cuts-reminder:${userId}:${today}`
}

function formatHaircutDate(isoDate: string) {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(isoDate))
}

function formatPrice(priceCents: number | null) {
  if (priceCents === null || priceCents < 0) return 'No registrado'
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(priceCents / 100)
}

export default function DigitalCardPage() {
  const params = useParams()
  const { businessSlug, userId } = params as { businessSlug: string; userId: string }

  const [user, setUser] = useState<UserData | null>(null)
  const [qrToken, setQrToken] = useState<QrTokenData | null>(null)
  const [qrError, setQrError] = useState<string | null>(null)
  const [qrNotice, setQrNotice] = useState<string | null>(null)
  const [qrRetryNonce, setQrRetryNonce] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [haircuts, setHaircuts] = useState<HaircutItem[]>([])
  const [loadingHaircuts, setLoadingHaircuts] = useState(true)
  const [activePromotionIndex, setActivePromotionIndex] = useState(0)
  const { pushToast } = useToast()

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch(
          `/api/users/${userId}?businessSlug=${encodeURIComponent(businessSlug)}`
        )

        if (!response.ok) {
          throw new Error('Usuario no encontrado')
        }

        const data = await response.json()
        setUser(data)
      } catch {
        setError('No se pudo cargar la informacion del usuario')
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      void fetchUserData()
    }
  }, [businessSlug, userId])

  useEffect(() => {
    if (!userId || !businessSlug) return
    let cancelled = false
    let refreshTimerId: ReturnType<typeof setTimeout> | null = null
    const storageKey = getQrTokenStorageKey(businessSlug, userId)
    let hasUsableCachedToken = false
    let tokenRequest: Promise<void> | null = null

    const scheduleRefresh = (expiresAt?: string) => {
      if (refreshTimerId) clearTimeout(refreshTimerId)

      const delayMs = expiresAt
        ? Math.max(QR_RETRY_DELAY_MS, getMillisecondsUntilExpiry(expiresAt) - QR_REFRESH_SAFETY_MS)
        : QR_RETRY_DELAY_MS

      refreshTimerId = setTimeout(() => {
        void refreshToken()
      }, delayMs)
    }

    const refreshToken = async () => {
      if (tokenRequest) return tokenRequest

      tokenRequest = (async () => {
        const controller = new AbortController()
        const timeoutId = window.setTimeout(() => controller.abort(), QR_TOKEN_TIMEOUT_MS)
        const slowNoticeId = window.setTimeout(() => {
          if (!cancelled) {
            setQrNotice('La conexion esta demorando, seguimos intentando...')
          }
        }, QR_SLOW_NOTICE_MS)

        try {
          if (!cancelled) {
            setQrError(null)
            setQrNotice(null)
          }

          const response = await fetch(`/api/users/${userId}/token`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-requested-with': 'barber-fidelity',
            },
            body: JSON.stringify({ businessSlug }),
            signal: controller.signal,
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => null) as { error?: string } | null
            const apiError = errorData?.error?.trim()

            if (!cancelled) {
              setQrToken(null)
              setQrError(apiError || 'No se pudo generar el QR. Reintentando...')
              scheduleRefresh()
            }
            return
          }

          const data = await response.json() as QrTokenData
          if (!cancelled) {
            setQrToken(data)
            setQrError(null)
            setQrNotice(null)
            const expiresAtMs = new Date(data.expiresAt).getTime()
            setSecondsLeft(Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000)))
            window.sessionStorage.setItem(storageKey, JSON.stringify(data))
            scheduleRefresh(data.expiresAt)
          }
        } catch (error) {
          if (!cancelled) {
            setQrToken(null)
            setSecondsLeft(0)
            setQrError(
              error instanceof DOMException && error.name === 'AbortError'
                ? 'La conexion tardo demasiado. Reintentando...'
                : 'No se pudo conectar para generar el QR. Reintentando...'
            )
            setQrNotice(null)
            scheduleRefresh()
          }
        } finally {
          window.clearTimeout(timeoutId)
          window.clearTimeout(slowNoticeId)
          tokenRequest = null
        }
      })()

      return tokenRequest
    }

    try {
      const cachedToken = JSON.parse(window.sessionStorage.getItem(storageKey) || 'null') as QrTokenData | null
      if (cachedToken && isUsableQrToken(cachedToken)) {
        hasUsableCachedToken = true
        setQrToken(cachedToken)
        setQrError(null)
        setQrNotice(null)
        setSecondsLeft(Math.max(0, Math.floor(getMillisecondsUntilExpiry(cachedToken.expiresAt) / 1000)))
        scheduleRefresh(cachedToken.expiresAt)
      }
    } catch {
      window.sessionStorage.removeItem(storageKey)
    }

    if (!hasUsableCachedToken) {
      void refreshToken()
    }

    return () => {
      cancelled = true
      if (refreshTimerId) clearTimeout(refreshTimerId)
    }
  }, [businessSlug, userId, qrRetryNonce])

  useEffect(() => {
    if (!qrToken?.expiresAt) return

    const tick = () => {
      const expiresAtMs = new Date(qrToken.expiresAt).getTime()
      setSecondsLeft(Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000)))
    }

    tick()
    const timerId = setInterval(tick, 1000)
    return () => clearInterval(timerId)
  }, [qrToken?.expiresAt])

  useEffect(() => {
    const timerId = setInterval(() => {
      setActivePromotionIndex((currentIndex) => (currentIndex + 1) % promotions.length)
    }, PROMOTION_ROTATION_MS)

    return () => clearInterval(timerId)
  }, [])

  useEffect(() => {
    if (!user || user.stamps !== 3) {
      return
    }

    const storageKey = getReminderStorageKey(user.id)
    const alreadyShownToday = window.localStorage.getItem(storageKey) === '1'
    if (!alreadyShownToday) {
      pushToast({
        tone: 'info',
        title: 'Recordatorio',
        detail: 'Te faltan solo 2 cortes para tu corte GRATIS.',
        durationMs: 5500,
      })
      window.localStorage.setItem(storageKey, '1')
    }
  }, [pushToast, user])

  useEffect(() => {
    const fetchHaircuts = async () => {
      try {
        const response = await fetch(
          `/api/users/${userId}/haircuts?businessSlug=${encodeURIComponent(businessSlug)}&limit=6`
        )
        if (!response.ok) {
          throw new Error('No se pudo cargar historial')
        }
        const data = await response.json()
        setHaircuts(Array.isArray(data.items) ? data.items : [])
      } catch {
        setHaircuts([])
      } finally {
        setLoadingHaircuts(false)
      }
    }

    if (userId && businessSlug) {
      setLoadingHaircuts(true)
      void fetchHaircuts()
    }
  }, [businessSlug, userId])

  if (loading) {
    return <StatePanel tone="loading" title="Cargando tu tarjeta..." size="screen" />
  }

  if (error || !user) {
    return (
      <StatePanel
        tone="error"
        title="No se pudo cargar tu tarjeta"
        detail={error || 'Usuario no encontrado'}
        size="screen"
      />
    )
  }

  const filledStamps = user.stamps
  const activePromotion = promotions[activePromotionIndex]

  return (
    <div className="min-h-screen bf-shell">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-[var(--line-0)] bg-[#0f151ccc]/90 backdrop-blur-xl">
        <div className="bf-container-sm py-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bf-panel flex items-center justify-center text-[#c79a4e]">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl leading-none tracking-wide text-[#f3eee7]">{user.businessName}</h1>
              <p className="text-[#a89f93] text-xs">Miembro del Club</p>
              <Breadcrumbs className="mt-1" items={[{ label: 'Cliente' }, { label: 'Tarjeta' }]} />
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 bf-container-sm py-7 sm:py-8">
        <div className="text-center mb-8">
          <h2 className="font-display text-4xl sm:text-5xl leading-none tracking-wide text-[#f3eee7] mb-3">Hola, {user.name.split(' ')[0]}!</h2>
          <p className="text-[#b8ada0] text-sm">
            {user.canRedeem
              ? 'Tienes un corte GRATIS disponible!'
              : `Acumula ${5 - filledStamps} sello${5 - filledStamps !== 1 ? 's' : ''} mas para tu recompensa`}
          </p>
        </div>

        <div className="relative mb-8">
          <div className="relative bf-panel rounded-3xl p-5 sm:p-6 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#c79a4e14] via-transparent to-transparent pointer-events-none" />

            <div className="relative flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#c79a4e1a] border border-[#c79a4e55] flex items-center justify-center">
                  <User className="w-6 h-6 text-[#c79a4e]" />
                </div>
                <div>
                  <h3 className="text-[#f3eee7] font-semibold">{user.name}</h3>
                  <p className="text-[#a89f93] text-xs">{user.phone}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-[#c79a4e]">
                  <Award className="w-4 h-4" />
                  <span className="font-bold">{user.totalCuts}</span>
                </div>
                <p className="text-[#8b8175] text-xs">Cortes</p>
              </div>
            </div>

            <div className="relative grid grid-cols-3 gap-3 mb-6">
              {Array.from({ length: 5 }).map((_, index) => {
                const isStamped = index < filledStamps
                return (
                  <div
                    key={index}
                    className={`
                      aspect-square rounded-2xl flex items-center justify-center transition-all duration-500
                      ${isStamped
                        ? 'bg-[#c79a4e] text-[#12171d]'
                        : 'bg-[#16212a] border-2 border-dashed border-[var(--line-0)] text-[#746a5f]'
                      }
                    `}
                  >
                    {isStamped ? (
                      <Scissors className="w-8 h-8 text-gray-950" />
                    ) : (
                      <span className="font-bold text-lg">{index + 1}</span>
                    )}
                  </div>
                )
              })}

              <div
                className={`
                  aspect-square rounded-2xl flex items-center justify-center transition-all duration-500
                  ${user.canRedeem
                    ? 'bg-[#4fb27a] border-2 border-[#4fb27a]'
                    : 'bg-[#16212a] border-2 border-dashed border-[var(--line-0)] text-[#746a5f]'
                  }
                `}
              >
                {user.canRedeem ? (
                  <div className="flex flex-col items-center">
                    <Unlock className="w-6 h-6 text-[#f3eee7] mb-1" />
                    <span className="text-[#f3eee7] text-[11px] font-bold tracking-wide">GRATIS</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Lock className="w-6 h-6 text-[#746a5f] mb-1" />
                    <Gift className="w-5 h-5 text-[#746a5f]" />
                  </div>
                )}
              </div>
            </div>

            <div className="relative mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[#b8ada0] text-xs">Progreso</span>
                <span className={user.canRedeem ? 'text-[#89cf9f] font-bold' : 'text-[#c79a4e] font-bold'}>
                  {Math.min(filledStamps, 5)}/5
                </span>
              </div>
              <div className="h-2 bg-[#16212a] rounded-full overflow-hidden">
                <div
                  className={`
                    h-full rounded-full transition-all duration-700 ease-out
                    ${user.canRedeem ? 'bg-[#4fb27a]' : 'bg-[#c79a4e]'}
                  `}
                  style={{ width: `${Math.min((filledStamps / 5) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            window.open(getBusinessWebsiteUrl(businessSlug), '_blank')
          }}
          className="w-full py-3 mb-6 rounded-xl bg-yellow-500 text-black font-bold"
        >
          Visitar sitio web
        </button>

        <div className="relative overflow-hidden bf-panel rounded-3xl p-5 sm:p-6 mb-6 border-[#c79a4e55]">
          <div className="absolute inset-0 bg-gradient-to-r from-[#c79a4e24] via-[#4fb27a12] to-transparent pointer-events-none" />
          <div className="relative flex items-start gap-4">
            <div className="w-12 h-12 shrink-0 rounded-2xl bg-[#c79a4e] text-[#12171d] flex items-center justify-center">
              <Percent className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[#e4c083] text-xs uppercase tracking-[0.18em] font-semibold">
                {activePromotion.eyebrow}
              </p>
              <h3 className="mt-1 text-[#f3eee7] font-display text-3xl sm:text-4xl leading-none tracking-wide">
                {activePromotion.title}
              </h3>
              <p className="mt-2 text-[#b8ada0] text-sm">
                {activePromotion.detail}
              </p>
            </div>
          </div>
          <div className="relative flex gap-2 mt-4">
            {promotions.map((promotion, index) => (
              <button
                key={promotion.title}
                type="button"
                aria-label={`Ver promocion ${index + 1}`}
                onClick={() => setActivePromotionIndex(index)}
                className={`h-1.5 rounded-full transition-all bf-focus ${
                  index === activePromotionIndex ? 'w-8 bg-[#c79a4e]' : 'w-2 bg-[#746a5f]'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="relative bf-panel rounded-3xl p-5 sm:p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#c79a4e1a] border border-[#c79a4e55] flex items-center justify-center">
              <Scissors className="w-5 h-5 text-[#c79a4e]" />
            </div>
            <div>
              <h3 className="text-[#f3eee7] font-semibold">Tu Codigo QR</h3>
              <p className="text-[#a89f93] text-xs">Muestralo al barbero</p>
            </div>
          </div>

          <div className="flex justify-center py-4">
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl">
              {qrToken?.token ? (
                <QRCodeSVG
                  value={qrToken.token}
                  size={180}
                  level="M"
                  includeMargin={false}
                />
              ) : (
                <div className="w-[180px] h-[180px] flex flex-col items-center justify-center gap-2 text-center text-xs font-semibold text-[#12171d]">
                  <span>{qrError ? 'QR no disponible' : 'Generando QR...'}</span>
                  {qrError ? (
                    <button
                      type="button"
                      onClick={() => {
                        setQrError(null)
                        setQrNotice(null)
                        setQrRetryNonce((current) => current + 1)
                      }}
                      className="rounded-lg bg-[#12171d] px-3 py-1.5 text-[11px] font-bold text-white"
                    >
                      Reintentar
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <p className="text-[#a89f93] text-xs text-center">
            Este codigo es temporal y se renueva automaticamente. Si ya fue escaneado, espera unos segundos para que se genere uno nuevo.
          </p>
          <p className="text-[#e4c083] text-xs text-center mt-1 font-data">
            {qrToken?.token ? `Expira en ${secondsLeft}s` : qrError || qrNotice || 'Espera unos segundos'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="bf-panel bf-kpi-card text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Scissors className="w-4 h-4 text-[#c79a4e]" />
              <span className="text-2xl font-bold text-[#f3eee7]">{filledStamps}</span>
            </div>
            <p className="text-[#a89f93] text-xs">Sellos actuales</p>
          </div>
          <div className="bf-panel bf-kpi-card text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-[#c79a4e]" />
              <span className="text-2xl font-bold text-[#c79a4e]">{user.totalCuts}</span>
            </div>
            <p className="text-[#a89f93] text-xs">Cortes totales</p>
          </div>
        </div>

        <div className="mt-6 bf-panel rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#f3eee7] font-semibold">Historial de cortes</h3>
            <span className="text-[#a89f93] text-xs">Ultimos {haircuts.length}</span>
          </div>

          {loadingHaircuts ? (
            <StatePanel
              tone="loading"
              title="Cargando historial..."
              className="rounded-xl p-4"
            />
          ) : haircuts.length === 0 ? (
            <StatePanel
              tone="empty"
              title="Aun no tienes cortes registrados"
              detail="Tu historial aparecera aqui despues de tu primera visita."
              className="rounded-xl p-4"
            />
          ) : (
            <div className="space-y-2">
              {haircuts.map((haircut) => (
                <div
                  key={haircut.id}
                  className="rounded-xl border border-[var(--line-0)] bg-[#10171fcc] px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm text-[#f3eee7] font-medium">{haircut.serviceName}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${
                        haircut.type === 'FREE'
                          ? 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10'
                          : 'text-amber-300 border-amber-500/40 bg-amber-500/10'
                      }`}
                    >
                      {haircut.type === 'FREE' ? 'Gratis' : 'Pagado'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-[#a89f93]">{formatHaircutDate(haircut.createdAt)}</p>
                    <p className="text-xs text-[#b8ada0]">{formatPrice(haircut.priceCents)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="bf-panel rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#c79a4e1a] border border-[#c79a4e55] flex items-center justify-center">
                  <Scissors className="w-5 h-5 text-[#c79a4e]" />
                </div>
                <div>
                  <h3 className="text-[#f3eee7] font-semibold">Catalogo de cortes</h3>
                  <p className="text-[#a89f93] text-xs">Taper fade, mod cut y mas</p>
                </div>
              </div>
              <Link
                href={`/${businessSlug}/card/${userId}/haircut-styles`}
                className="text-xs px-3 py-2 rounded-lg bf-btn-primary bf-focus bf-interactive font-semibold"
              >
                Abrir
              </Link>
            </div>
          </div>

          <div className="bf-panel rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#c79a4e1a] border border-[#c79a4e55] flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-[#c79a4e]" />
                </div>
                <div>
                  <h3 className="text-[#f3eee7] font-semibold">Catalogo de productos</h3>
                  <p className="text-[#a89f93] text-xs">Ver imagenes, precios y stock</p>
                </div>
              </div>
              <Link
                href={`/${businessSlug}/card/${userId}/products`}
                className="text-xs px-3 py-2 rounded-lg bf-btn-primary bf-focus bf-interactive font-semibold"
              >
                Abrir
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
