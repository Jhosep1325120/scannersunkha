// Comentario: Registra nuevos clientes dentro del negocio seleccionado.
'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Scissors, User, Phone, ArrowRight, Sparkles, Info } from 'lucide-react'

export default function RegistrationPage() {
  const params = useParams()
  const router = useRouter()
  const businessSlug = params.businessSlug as string

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formatPhone = (value: string) => value.replace(/\D/g, '').slice(0, 9)

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

      if (response.ok || (response.status === 409 && data.user)) {
        router.push(`/${businessSlug}/card/${data.user.id}`)
        return
      }

      setError(data.error || 'Error al crear cuenta')
      setLoading(false)
    } catch {
      setError('Error de conexion. Intenta de nuevo.')
      setLoading(false)
    }
  }

  const isPhoneValid = /^9\d{8}$/.test(formData.phone)
  const isNameValid = formData.name.trim().length >= 2
  const isFormValid = isPhoneValid && isNameValid

  return (
    <div className="min-h-screen bf-shell flex flex-col">
      <header className="relative z-10 border-b border-[var(--line-0)] bg-[#0f151ccc]/90 backdrop-blur-xl">
        <div className="bf-container-sm py-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bf-panel flex items-center justify-center text-[#c79a4e]">
              <Scissors className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-3xl leading-none tracking-wide">Club de Fidelidad</h1>
              <p className="text-[#a89f93] text-xs capitalize">{businessSlug.replace(/-/g, ' ')}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full">
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#c79a4e55] bg-[#c79a4e1a] text-[#e4c083]">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">5 cortes = 1 gratis</span>
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="font-display text-5xl sm:text-6xl leading-none tracking-wide text-[#f3eee7]">Unete al club</h2>
            <p className="text-[#b8ada0] text-sm leading-relaxed mt-3">
              Acumula sellos en cada visita y desbloquea tu sexto corte sin costo.
            </p>
            <div className="mt-3 max-w-md mx-auto rounded-2xl border border-[#c79a4e45] bg-[#c79a4e14] px-3 py-2.5 flex items-start gap-2 text-left">
              <Info className="w-4 h-4 text-[#e4c083] mt-0.5 shrink-0" />
              <p className="text-[#e8dcc8] text-xs leading-relaxed">
                Si ya tienes cuenta, ingresa el mismo numero de telefono y abriremos tu tarjeta automaticamente.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="bf-panel rounded-3xl p-5 space-y-4">
            <div className="group">
              <label className="block text-[#cfc3b3] text-sm font-medium mb-2 ml-1">Nombre completo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-[#8c8378] group-focus-within:text-[#c79a4e] transition-colors" />
                </div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Carlos Rodriguez"
                  required
                  className="w-full bf-input bf-focus rounded-2xl py-4 pl-12 pr-4 transition-all"
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-[#cfc3b3] text-sm font-medium mb-2 ml-1">Numero de telefono</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone className="w-5 h-5 text-[#8c8378] group-focus-within:text-[#c79a4e] transition-colors" />
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
                  className="w-full bf-input bf-focus rounded-2xl py-4 pl-12 pr-4 transition-all"
                />
              </div>
              <p className="text-[#877d71] text-xs mt-2 ml-1">Tu telefono servira para recuperar tu tarjeta digital.</p>
            </div>

            {error && (
              <div className="bg-[#e26e6e1a] border border-[#e26e6e55] rounded-xl p-4">
                <p className="text-[#f1b6b6] text-sm text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="w-full mt-3 py-4 px-6 rounded-2xl font-bold text-base bf-btn-primary bf-focus bf-interactive disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? 'Creando cuenta...' : (
                <>
                  Crear mi tarjeta digital
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
