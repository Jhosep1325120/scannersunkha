// Comentario: Permite explorar estilos de corte sugeridos para el cliente.
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Clock3, Scissors, Sparkles } from 'lucide-react'
import { resolveHaircutImageSrc } from '@/lib/catalogImages'
import { StatePanel } from '@/components/ui/StatePanel'
import { CatalogImage } from '@/components/ui/CatalogImage'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'

interface UserData {
  id: string
  name: string
  businessName: string
}

interface HaircutStyleItem {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  priceCents: number | null
  durationMin: number | null
}

function formatPrice(priceCents: number | null) {
  if (priceCents === null || priceCents < 0) return 'S/ 25.00'
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 2,
  }).format(priceCents / 100)
}

function formatDuration(durationMin: number | null) {
  if (durationMin === null || durationMin <= 0) return 'Duracion variable'
  return `${durationMin} min`
}

export default function HaircutStylesPanelPage() {
  const params = useParams()
  const { businessSlug, userId } = params as { businessSlug: string; userId: string }

  const [user, setUser] = useState<UserData | null>(null)
  const [styles, setStyles] = useState<HaircutStyleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, stylesRes] = await Promise.all([
          fetch(`/api/users/${userId}?businessSlug=${encodeURIComponent(businessSlug)}`),
          fetch(`/api/business/${encodeURIComponent(businessSlug)}/haircut-styles?limit=30`),
        ])

        if (!userRes.ok) throw new Error('No se pudo cargar usuario')
        if (!stylesRes.ok) throw new Error('No se pudo cargar cortes')

        const userData = await userRes.json()
        const stylesData = await stylesRes.json()
        setUser({
          id: userData.id,
          name: userData.name,
          businessName: userData.businessName,
        })
        setStyles(Array.isArray(stylesData.items) ? stylesData.items : [])
      } catch {
        setError('No se pudo cargar el catalogo de cortes')
      } finally {
        setLoading(false)
      }
    }

    if (businessSlug && userId) {
      void fetchData()
    }
  }, [businessSlug, userId])

  if (loading) {
    return <StatePanel tone="loading" title="Cargando catalogo de cortes..." size="screen" />
  }

  if (error || !user) {
    return (
      <StatePanel
        tone="error"
        title="No se pudo abrir el catalogo de cortes"
        detail={error || 'Error al cargar catalogo'}
        size="screen"
      />
    )
  }

  return (
    <div className="min-h-screen bf-shell">
      <header className="relative z-10 border-b border-[var(--line-0)] bg-[#0f151ccc]/90 backdrop-blur-xl">
        <div className="bf-container py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bf-panel flex items-center justify-center text-[#c79a4e]">
              <Scissors className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-2xl sm:text-3xl leading-none text-[#f3eee7] tracking-wide">Cortes</h1>
              <p className="text-[#a89f93] text-xs truncate">{user.businessName}</p>
              <Breadcrumbs
                className="mt-1"
                items={[
                  { label: 'Tarjeta', href: `/${businessSlug}/card/${userId}` },
                  { label: 'Cortes' },
                ]}
              />
            </div>
          </div>
          <Link
            href={`/${businessSlug}/card/${userId}`}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs bf-btn-secondary bf-focus bf-interactive"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </Link>
        </div>
      </header>

      <main className="relative z-10 bf-container py-7 sm:py-8">
        <section className="bf-panel rounded-3xl p-4 sm:p-5 mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[#d9cfbf]">
            <Sparkles className="w-4 h-4 text-[#c79a4e]" />
            <p className="text-sm">Selecciona tu estilo antes de tu visita</p>
          </div>
          <p className="font-data text-xs text-[#a89f93]">{styles.length} estilo(s)</p>
        </section>

        {styles.length === 0 ? (
          <StatePanel
            tone="empty"
            title="Aun no hay cortes publicados"
            detail="Este catalogo se completa desde la configuracion del negocio."
            className="p-10"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {styles.map((style) => (
              <article
                key={style.id}
                className="bf-panel rounded-3xl overflow-hidden h-full flex flex-col bf-interactive"
              >
                <div className="relative aspect-[4/3] bg-[#111820]">
                  <CatalogImage
                    src={resolveHaircutImageSrc(style.name, style.imageUrl)}
                    alt={style.name}
                    width={1000}
                    height={750}
                    label={style.name}
                    unoptimized
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-3 right-3 text-sm px-3 py-1 rounded-full border text-[#f4d29a] border-[#c79a4e80] bg-[#1a2430] font-data font-semibold shadow-[0_0_0_1px_rgba(199,154,78,0.2)]">
                    {formatPrice(style.priceCents)}
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-[#f3eee7] font-semibold leading-tight">{style.name}</h2>
                    <p className="text-xs text-[#b8ada0] inline-flex items-center gap-1 whitespace-nowrap">
                      <Clock3 className="w-3.5 h-3.5" />
                      {formatDuration(style.durationMin)}
                    </p>
                  </div>

                  <p className="text-sm text-[#b8ada0] min-h-10">
                    {style.description || 'Estilo recomendado por barberos profesionales.'}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
