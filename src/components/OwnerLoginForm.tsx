// Comentario: Reutiliza el formulario de login para dueños, admin y barberos.
'use client'

import { FormEvent, useState } from 'react'
import { AlertCircle, Scissors } from 'lucide-react'

type OwnerLoginFormProps = {
  apiPath: string
  defaultNextPath: string
  title: string
  subtitle: string
  placeholder: string
}

export function OwnerLoginForm({
  apiPath,
  defaultNextPath,
  title,
  subtitle,
  placeholder,
}: OwnerLoginFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getSafeNextPath = () => {
    if (typeof window === 'undefined') return defaultNextPath
    const rawNext = new URLSearchParams(window.location.search).get('next') || defaultNextPath
    const isSafeRelativePath = rawNext.startsWith('/') && !rawNext.startsWith('//') && !rawNext.includes('\\')
    return isSafeRelativePath ? rawNext : defaultNextPath
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(apiPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || 'Credenciales invalidas')
        return
      }

      window.location.assign(getSafeNextPath())
    } catch {
      setError('No se pudo iniciar sesion. Revisa tu configuracion de Supabase.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bf-shell flex items-center justify-center px-6">
      <div className="relative z-10 w-full max-w-sm bf-panel rounded-3xl p-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 bf-panel flex items-center justify-center text-[#c79a4e]">
            <Scissors className="w-8 h-8" />
          </div>
          <h1 className="font-display text-4xl sm:text-5xl leading-none tracking-wide text-[#f3eee7]">{title}</h1>
          <p className="text-[#a89f93] text-sm mt-2">{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[#cfc3b3] text-sm font-medium mb-2 ml-1">Correo</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={placeholder}
              className="w-full bf-input bf-focus rounded-2xl py-4 px-4 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-[#cfc3b3] text-sm font-medium mb-2 ml-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Ingresa tu password"
              className="w-full bf-input bf-focus rounded-2xl py-4 px-4 transition-all"
              required
            />
          </div>

          {error && (
            <div className="bg-[#e26e6e1a] border border-[#e26e6e55] rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#f1b6b6] mt-0.5 shrink-0" />
              <p className="text-[#f1b6b6] text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl font-bold text-base bf-btn-primary bf-focus bf-interactive disabled:opacity-60"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
