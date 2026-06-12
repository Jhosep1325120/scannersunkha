// Comentario: Presenta estados vacios, de carga o error de forma uniforme.
'use client'

import type { ComponentType, ReactNode } from 'react'
import { AlertTriangle, Loader2, PackageSearch } from 'lucide-react'
import { cn } from '@/lib/utils'

type StatePanelTone = 'loading' | 'empty' | 'error'
type StatePanelSize = 'inline' | 'screen'

interface StatePanelProps {
  tone: StatePanelTone
  title: string
  detail?: string
  size?: StatePanelSize
  action?: ReactNode
  className?: string
}

const toneStyles: Record<StatePanelTone, { icon: ComponentType<{ className?: string }>; iconClass: string }> = {
  loading: {
    icon: Loader2,
    iconClass: 'text-[#e4c083] animate-spin',
  },
  empty: {
    icon: PackageSearch,
    iconClass: 'text-[#b8ada0]',
  },
  error: {
    icon: AlertTriangle,
    iconClass: 'text-[#f1b6b6]',
  },
}

export function StatePanel({
  tone,
  title,
  detail,
  size = 'inline',
  action,
  className,
}: StatePanelProps) {
  const Icon = toneStyles[tone].icon

  const content = (
    <div className={cn('bf-panel rounded-3xl p-6 text-center', size === 'screen' && 'max-w-md w-full', className)}>
      <div className="mx-auto mb-3 w-12 h-12 rounded-2xl bf-panel-soft flex items-center justify-center">
        <Icon className={cn('w-6 h-6', toneStyles[tone].iconClass)} />
      </div>
      <p className="text-[#f3eee7] font-semibold">{title}</p>
      {detail && <p className="text-sm text-[#a89f93] mt-1">{detail}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )

  if (size === 'screen') {
    return <div className="min-h-screen bf-shell px-6 flex items-center justify-center">{content}</div>
  }

  return content
}
