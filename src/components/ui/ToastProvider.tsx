// Comentario: Provee notificaciones temporales para mensajes de la interfaz.
'use client'

import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastTone = 'success' | 'error' | 'info'

interface ToastInput {
  title: string
  detail?: string
  tone?: ToastTone
  durationMs?: number
}

interface ToastItem extends ToastInput {
  id: string
  tone: ToastTone
}

interface ToastContextValue {
  pushToast: (input: ToastInput) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

function toneClass(tone: ToastTone) {
  if (tone === 'success') return 'border-[#4fb27a66] bg-[#4fb27a1f] text-[#d6efdf]'
  if (tone === 'error') return 'border-[#e26e6e66] bg-[#e26e6e1f] text-[#f7d1d1]'
  return 'border-[#c79a4e66] bg-[#c79a4e1a] text-[#f2e6d2]'
}

function ToneIcon({ tone }: { tone: ToastTone }) {
  if (tone === 'success') return <CheckCircle2 className="w-5 h-5 text-[#89cf9f] mt-0.5" />
  if (tone === 'error') return <AlertTriangle className="w-5 h-5 text-[#f1b6b6] mt-0.5" />
  return <Info className="w-5 h-5 text-[#e4c083] mt-0.5" />
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const pushToast = useCallback(({ title, detail, tone = 'info', durationMs = 3500 }: ToastInput) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts((prev) => [...prev, { id, title, detail, tone, durationMs }])

    window.setTimeout(() => {
      removeToast(id)
    }, durationMs)
  }, [removeToast])

  const value = useMemo(() => ({ pushToast }), [pushToast])

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="fixed bottom-4 left-4 right-4 z-[70] pointer-events-none">
        <div className="mx-auto max-w-md space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={cn('pointer-events-auto rounded-2xl border px-4 py-3 backdrop-blur-xl flex items-start gap-3', toneClass(toast.tone))}
              role="status"
              aria-live="polite"
            >
              <ToneIcon tone={toast.tone} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.detail && <p className="text-sm opacity-90">{toast.detail}</p>}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-current/80 hover:text-current transition-colors"
                aria-label="Cerrar notificacion"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
