// Comentario: Organiza la experiencia del barbero para buscar y atender clientes.
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BarberScanner } from '@/components/BarberScanner'
import {
  Scissors,
  Gift,
  Lock,
  Unlock,
  LogOut,
  User,
  Phone,
  Award,
  Banknote,
  CreditCard,
  Smartphone,
  CalendarDays,
} from 'lucide-react'
import Link from 'next/link'
import confetti from 'canvas-confetti'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/ToastProvider'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'
import { StatePanel } from '@/components/ui/StatePanel'

interface UserData {
  id: string
  name: string
  phone: string
  stamps: number
  totalCuts: number
  canRedeem: boolean
  scanToken?: string
}

type PaymentMethod = 'CASH' | 'YAPE' | 'PLIN' | 'CARD'

interface BarberReportPeriod {
  revenueCents: number
  paidHaircuts: number
  freeHaircuts: number
  totalHaircuts: number
  clientsServed: number
  byPaymentMethod: Record<PaymentMethod, number>
}

interface BarberReport {
  today: BarberReportPeriod
  week: BarberReportPeriod
  month: BarberReportPeriod
  recentClients: Array<{
    id: string
    userName: string
    phone: string
    type: 'PAID' | 'FREE'
    serviceName: string
    priceCents: number | null
    paymentMethod: PaymentMethod | null
    createdAt: string
  }>
}

const PAYMENT_METHOD_OPTIONS: Array<{
  value: PaymentMethod
  label: string
  icon: typeof Banknote
}> = [
  { value: 'CASH', label: 'Efectivo', icon: Banknote },
  { value: 'YAPE', label: 'Yape', icon: Smartphone },
  { value: 'PLIN', label: 'Plin', icon: Smartphone },
  { value: 'CARD', label: 'Tarjeta', icon: CreditCard },
]

function formatPenFromCents(valueCents: number) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 2,
  }).format(valueCents / 100)
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getPaymentLabel(method: PaymentMethod | null) {
  if (!method) return 'Gratis'
  return PAYMENT_METHOD_OPTIONS.find((option) => option.value === method)?.label ?? method
}

export default function BarberPageClient() {
  const router = useRouter()
  const [authChecking, setAuthChecking] = useState(true)
  const [scannedUser, setScannedUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [price, setPrice] = useState('25')
  const [report, setReport] = useState<BarberReport | null>(null)
  const { pushToast } = useToast()

  const fetchReport = useCallback(async () => {
    try {
      const response = await fetch('/api/barber/report', { cache: 'no-store' })
      if (!response.ok) return
      const data = await response.json()
      setReport(data)
    } catch {
      setReport(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const ensureSession = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.auth.getSession()
        if (!data.session?.user?.email) {
          if (!cancelled) router.replace('/barber/login?next=/barber')
          return
        }
      } catch {
        if (!cancelled) router.replace('/barber/login?next=/barber')
        return
      }

      if (!cancelled) {
        setAuthChecking(false)
        void fetchReport()
      }
    }

    void ensureSession()

    return () => {
      cancelled = true
    }
  }, [fetchReport, router])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/barber/login')
    router.refresh()
  }

  const handleScanSuccess = (user: UserData) => {
    setScannedUser(user)
  }

  const handleAddStamp = async () => {
    if (!scannedUser) return
    if (!scannedUser.scanToken) {
      pushToast({
        tone: 'error',
        title: 'QR no valido',
        detail: 'El QR anterior ya no es válido. Solicita un nuevo QR al cliente y escanéalo para continuar.',
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/users/${scannedUser.id}/stamp`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-requested-with': 'barber-fidelity',
        },
        body: JSON.stringify({
          scanToken: scannedUser.scanToken,
          paymentMethod,
          price,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setScannedUser(data.user)
        void fetchReport()
        pushToast({
          tone: 'success',
          title: 'Sello agregado',
          detail: data.message,
        })

        if (data.justCompleted) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#c79a4e', '#4fb27a', '#ffffff'],
          })
        }
      } else {
        pushToast({
          tone: 'error',
          title: 'No se pudo agregar sello',
          detail: data.error,
        })
      }
    } catch {
      pushToast({
        tone: 'error',
        title: 'Error de conexion',
        detail: 'Verifica tu red e intenta nuevamente.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRedeem = async () => {
    if (!scannedUser) return
    if (!scannedUser.scanToken) {
      pushToast({
        tone: 'error',
        title: 'QR no valido',
        detail: 'El QR anterior ya no es válido. Solicita un nuevo QR al cliente y escanéalo para continuar.',
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/users/${scannedUser.id}/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-requested-with': 'barber-fidelity',
        },
        body: JSON.stringify({ scanToken: scannedUser.scanToken }),
      })

      const data = await response.json()

      if (response.ok) {
        setScannedUser(data.user)
        void fetchReport()
        pushToast({
          tone: 'success',
          title: 'Canje completado',
          detail: data.message,
        })

        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#4fb27a', '#89cf9f', '#ffffff'],
        })
      } else {
        pushToast({
          tone: 'error',
          title: 'No se pudo canjear',
          detail: data.error,
        })
      }
    } catch {
      pushToast({
        tone: 'error',
        title: 'Error de conexion',
        detail: 'Verifica tu red e intenta nuevamente.',
      })
    } finally {
      setLoading(false)
    }
  }

  const resetScan = () => {
    setScannedUser(null)
  }

  if (authChecking) {
    return <StatePanel tone="loading" title="Validando sesion..." size="screen" />
  }

  return (
    <div className="min-h-screen bf-shell">
      <header className="relative z-10 border-b border-[var(--line-0)] bg-[#0f151ccc]/90 backdrop-blur-xl">
        <div className="bf-container-sm py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bf-panel flex items-center justify-center text-[#c79a4e]">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-3xl sm:text-4xl leading-none tracking-wide">Panel Barbero</h1>
              <p className="text-[#a89f93] text-xs">Escaneo y validacion de clientes</p>
              <Breadcrumbs className="mt-1" items={[{ label: 'Barbero' }, { label: 'Escaner' }]} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/barber/camera-test"
              className="text-xs px-3 py-2 rounded-lg bf-btn-secondary bf-focus bf-interactive"
            >
              Probar camara
            </Link>
            <button
              onClick={handleLogout}
              className="w-10 h-10 rounded-xl bf-btn-secondary flex items-center justify-center bf-focus bf-interactive"
              aria-label="Cerrar sesion"
            >
              <LogOut className="w-5 h-5 text-[#cfc3b3]" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 bf-container-sm py-6">
        {report && (
          <section className="mb-6 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: 'Hoy', data: report.today },
                { label: 'Semana', data: report.week },
                { label: 'Mes', data: report.month },
              ].map((item) => (
                <article key={item.label} className="bf-panel rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-[#8f8578]">{item.label}</p>
                    <CalendarDays className="w-4 h-4 text-[#c79a4e]" />
                  </div>
                  <p className="font-data text-2xl leading-none text-[#f3eee7]">
                    {formatPenFromCents(item.data.revenueCents)}
                  </p>
                  <p className="text-xs text-[#a89f93] mt-2">
                    {item.data.totalHaircuts} cortes | {item.data.clientsServed} clientes
                  </p>
                </article>
              ))}
            </div>

            <div className="bf-panel rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[#f3eee7]">Caja de hoy</h2>
                <span className="text-[11px] text-[#8f8578]">{report.today.paidHaircuts} pagados</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PAYMENT_METHOD_OPTIONS.map((option) => {
                  const Icon = option.icon
                  return (
                    <div key={option.value} className="rounded-xl border border-[var(--line-0)] bg-[#121a22cc] p-3">
                      <div className="flex items-center gap-2 text-[#cfc3b3] mb-1">
                        <Icon className="w-4 h-4 text-[#c79a4e]" />
                        <span className="text-xs">{option.label}</span>
                      </div>
                      <p className="font-data text-lg text-[#f3eee7]">
                        {formatPenFromCents(report.today.byPaymentMethod[option.value] ?? 0)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {!scannedUser ? (
          <>
            <div className="text-center mb-6">
              <h2 className="font-display text-4xl sm:text-5xl leading-none tracking-wide mb-2">Escanear cliente</h2>
              <p className="text-[#a89f93] text-sm">Apunta la camara al QR temporal del cliente</p>
            </div>

            <BarberScanner onScanSuccess={handleScanSuccess} />

            <div className="mt-6 bf-panel rounded-2xl p-4">
              <h3 className="text-[#d9cfbf] text-sm font-medium mb-3">Instrucciones:</h3>
              <ol className="text-[#a89f93] text-sm space-y-2">
                <li className="flex items-start gap-3">
                  <span className="bf-panel-soft text-[#d9cfbf] w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">1</span>
                  <span>Pide al cliente abrir su tarjeta digital</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bf-panel-soft text-[#d9cfbf] w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">2</span>
                  <span>Escanea su QR vigente</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bf-panel-soft text-[#d9cfbf] w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">3</span>
                  <span>Agrega sello o canjea su corte gratis</span>
                </li>
              </ol>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <button
              onClick={resetScan}
              className="text-sm flex items-center gap-2 bf-link-muted bf-interactive"
            >
              {'<-'} {scannedUser.scanToken ? 'Escanear otro cliente' : 'Escanear nuevo QR'}
            </button>

            <div className="bf-panel rounded-3xl p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-[#c79a4e1a] border border-[#c79a4e55] flex items-center justify-center">
                  <User className="w-7 h-7 text-[#c79a4e]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[#f3eee7] font-bold text-lg truncate">{scannedUser.name}</h3>
                  <div className="flex items-center gap-2 text-[#a89f93] text-sm">
                    <Phone className="w-4 h-4" />
                    <span>{scannedUser.phone}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-2 mb-6">
                {Array.from({ length: 5 }).map((_, index) => {
                  const isStamped = index < scannedUser.stamps
                  return (
                    <div
                      key={index}
                      className={`aspect-square rounded-xl flex items-center justify-center border ${isStamped ? 'bg-[#c79a4e] border-[#c79a4e] text-[#12171d]' : 'bg-[#16212a] border-[var(--line-0)] text-[#6f665b]'}`}
                    >
                      {isStamped ? <Scissors className="w-5 h-5" /> : index + 1}
                    </div>
                  )
                })}

                <div
                  className={`aspect-square rounded-xl flex items-center justify-center border ${scannedUser.canRedeem ? 'bg-[#4fb27a] border-[#4fb27a] text-white' : 'bg-[#16212a] border-[var(--line-0)] text-[#6f665b]'}`}
                >
                  {scannedUser.canRedeem ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
              </div>

              <div className="flex justify-between items-center mb-2">
                <span className="text-[#b8ada0] text-sm">Progreso</span>
                <span className={`font-bold ${scannedUser.canRedeem ? 'text-[#89cf9f]' : 'text-[#e4c083]'}`}>
                  {scannedUser.stamps}/5
                </span>
              </div>
              <div className="h-2 bg-[#16212a] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${scannedUser.canRedeem ? 'bg-[#4fb27a]' : 'bg-[#c79a4e]'}`}
                  style={{ width: `${Math.min((scannedUser.stamps / 5) * 100, 100)}%` }}
                />
              </div>
            </div>

            {!scannedUser.canRedeem ? (
              <div className="space-y-3">
                <div className="bf-panel rounded-2xl p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-[#f3eee7]">Cobro del corte</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {PAYMENT_METHOD_OPTIONS.map((option) => {
                      const Icon = option.icon
                      const isActive = paymentMethod === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setPaymentMethod(option.value)}
                          className={`rounded-xl border px-3 py-3 text-xs font-semibold bf-focus bf-interactive flex items-center justify-center gap-2 ${
                            isActive
                              ? 'bg-[#c79a4e] border-[#c79a4e] text-[#111820]'
                              : 'bg-[#121a22cc] border-[var(--line-0)] text-[#cfc3b3]'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {option.label}
                        </button>
                      )
                    })}
                  </div>
                  <label className="block">
                    <span className="text-xs text-[#a89f93]">Monto cobrado S/</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={price}
                      onChange={(event) => setPrice(event.target.value)}
                      className="mt-1 w-full bf-input bf-focus rounded-xl px-3 py-3 text-sm"
                    />
                  </label>
                </div>

                <button
                  onClick={handleAddStamp}
                  disabled={loading}
                  className="w-full py-4 px-6 rounded-2xl font-bold text-base bf-btn-primary bf-focus bf-interactive flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Scissors className="w-5 h-5" />
                  {loading ? 'Procesando...' : 'Cobrar y agregar sello'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleRedeem}
                disabled={loading}
                className="w-full py-5 px-6 rounded-2xl font-bold text-lg bf-btn-success bf-focus bf-interactive flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Gift className="w-6 h-6" />
                {loading ? 'Procesando...' : 'Canjear corte gratis'}
              </button>
            )}

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bf-panel bf-kpi-card text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Award className="w-4 h-4 text-[#c79a4e]" />
                  <span className="text-2xl font-bold text-[#f3eee7]">{scannedUser.stamps}</span>
                </div>
                <p className="text-[#a89f93] text-xs">Sellos actuales</p>
              </div>
              <div className="bf-panel bf-kpi-card text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Scissors className="w-4 h-4 text-[#c79a4e]" />
                  <span className="text-2xl font-bold text-[#f0d8ad]">{scannedUser.totalCuts}</span>
                </div>
                <p className="text-[#a89f93] text-xs">Cortes totales</p>
              </div>
            </div>

            {report && report.recentClients.length > 0 && (
              <div className="bf-panel rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[#f3eee7]">Ultimos atendidos</h3>
                  <span className="text-[11px] text-[#8f8578]">30 dias</span>
                </div>
                <div className="space-y-2">
                  {report.recentClients.slice(0, 6).map((client) => (
                    <div
                      key={client.id}
                      className="rounded-xl border border-[var(--line-0)] bg-[#121a22cc] px-3 py-2 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-[#f3eee7] truncate">{client.userName}</p>
                        <p className="text-xs text-[#a89f93] truncate">{client.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[#d9cfbf]">
                          {client.type === 'FREE' ? 'Gratis' : formatPenFromCents(client.priceCents ?? 0)}
                        </p>
                        <p className="text-[11px] text-[#8f8578]">
                          {getPaymentLabel(client.paymentMethod)} | {formatShortDate(client.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
