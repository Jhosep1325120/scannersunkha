// Comentario: Renderiza migas de pan para navegar entre secciones.
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-[11px] text-[#a89f93]">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
              {item.href && !isLast ? (
                <Link href={item.href} className="bf-link-muted hover:underline underline-offset-2 bf-focus rounded px-1 py-0.5">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? 'text-[#d9cfbf]' : undefined}>{item.label}</span>
              )}

              {!isLast && <ChevronRight className="w-3 h-3 text-[#7e7469]" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
