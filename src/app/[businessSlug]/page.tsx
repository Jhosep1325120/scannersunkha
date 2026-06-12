// Comentario: Muestra la pagina publica de un negocio usando su slug.
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  Phone,
  Scissors,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react'

export default function RegistrationPage() {
  const params = useParams()
  const router = useRouter()
  const routeSlug = String(params.businessSlug ?? '').toLowerCase()
  const businessSlug = 'barberia-sunkha'

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (routeSlug && routeSlug !== businessSlug) {
      router.replace(`/${businessSlug}`)
    }
  }, [routeSlug, router, businessSlug])

  const formatPhone = (value: string) => {
    const numeric = value.replace(/\D/g, '')
    return numeric.slice(0, 9)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-requested-with': 'barber-fidelity',
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          businessSlug,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        router.push(`/${businessSlug}/card/${data.user.id}`)
      } else if (response.status === 409 && data.user) {
        router.push(`/${businessSlug}/card/${data.user.id}`)
      } else {
        setError(data.error || 'Error al crear cuenta')
        setLoading(false)
      }
    } catch {
      setError('Error de conexion. Intenta de nuevo.')
      setLoading(false)
    }
  }

  const isPhoneValid = /^9\d{8}$/.test(formData.phone)
  const isNameValid = formData.name.trim().length >= 2
  const isFormValid = isPhoneValid && isNameValid

  return (
    <div className="min-h-screen bf-shell">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#c79a4e1f] blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-[#c79a4e12] blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-[var(--line-0)] bg-[#0f151ccc]/90 backdrop-blur-xl">
        <div className="bf-container-sm py-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bf-panel flex items-center justify-center text-[#c79a4e]">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#8f8578]">Programa cliente</p>
              <h1 className="font-display text-3xl leading-none tracking-wide text-[#f3eee7]">Acceso de fidelidad</h1>
              <p className="text-[#a89f93] text-xs capitalize mt-1">{businessSlug.replace(/-/g, ' ')}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 bf-container-sm py-7 sm:py-9">
        <div className="grid grid-cols-1 gap-4">
          <section className="bf-panel rounded-3xl p-5 sm:p-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#c79a4e55] bg-[#c79a4e1a] px-3 py-1.5 text-[#e4c083] text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              5 cortes pagados + 1 gratis
            </div>

            <h2 className="mt-4 font-display text-5xl sm:text-6xl leading-none tracking-wide text-[#f3eee7]">
              Unete al club
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#b8ada0]">
              Registra tu nombre y telefono para abrir tu tarjeta digital al instante.
              Si ya tienes cuenta, usa el mismo telefono y te llevamos directo.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {[
                { icon: BadgeCheck, title: 'Valido', detail: 'Identidad segura' },
                { icon: Clock3, title: 'Rapido', detail: 'Menos de 20 seg' },
                { icon: ShieldCheck, title: 'Privado', detail: 'Uso interno' },
              ].map((item) => (
                <article
                  key={item.title}
                  className="rounded-2xl border border-[var(--line-0)] bg-[#101820cc] px-2.5 py-3 text-center"
                >
                  <item.icon className="mx-auto h-4 w-4 text-[#c79a4e]" />
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#d9cfbf]">{item.title}</p>
                  <p className="mt-0.5 text-[11px] text-[#8f8578]">{item.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="bf-panel rounded-3xl p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="group">
                <label className="mb-2 ml-1 block text-sm font-medium text-[#cfc3b3]">Nombre completo</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <User className="h-5 w-5 text-[#8c8378] group-focus-within:text-[#c79a4e] transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Carlos Rodriguez"
                    required
                    className="w-full rounded-2xl py-4 pl-12 pr-4 bf-input bf-focus"
                  />
                </div>
              </div>

              <div className="group">
                <label className="mb-2 ml-1 block text-sm font-medium text-[#cfc3b3]">Numero de telefono</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Phone className="h-5 w-5 text-[#8c8378] group-focus-within:text-[#c79a4e] transition-colors" />
                  </div>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                    placeholder="9 digitos (912345678)"
                    required
                    pattern="9[0-9]{8}"
                    minLength={9}
                    maxLength={9}
                    className="w-full rounded-2xl py-4 pl-12 pr-4 bf-input bf-focus"
                  />
                </div>
                <p className="mt-2 ml-1 text-xs text-[#877d71]">Se usa para identificar tu cuenta en cada visita.</p>
              </div>

              {error && (
                <div className="rounded-xl border border-[#e26e6e55] bg-[#e26e6e1a] p-4">
                  <p className="text-center text-sm text-[#f1b6b6]">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !isFormValid}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-4 px-6 text-base font-bold bf-btn-primary bf-focus bf-interactive disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  'Creando cuenta...'
                ) : (
                  <>
                    Abrir mi tarjeta digital
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  )
}
