// Comentario: Permite explorar productos recomendados para el cliente.
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, ShoppingBag, Tags } from 'lucide-react'
import { resolveProductImageSrc } from '@/lib/catalogImages'
import { StatePanel } from '@/components/ui/StatePanel'
import { CatalogImage } from '@/components/ui/CatalogImage'
import { Breadcrumbs } from '@/components/ui/Breadcrumbs'

interface UserData {
  id: string
  name: string
  businessName: string
}

interface ProductItem {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  priceCents: number
  stock: number | null
}

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(priceCents / 100)
}

function getStockLabel(stock: number | null) {
  if (stock === null) return 'Stock por confirmar'
  if (stock <= 0) return 'Agotado'
  return `${stock} disponibles`
}

function getStockClass(stock: number | null) {
  if (stock === null) return 'text-[#d9cfbf] border-[#d9cfbf33] bg-[#d9cfbf14]'
  if (stock <= 0) return 'text-[#f1b6b6] border-[#e26e6e55] bg-[#e26e6e1a]'
  return 'text-[#bde0c5] border-[#4fb27a55] bg-[#4fb27a1a]'
}

export default function ProductsPanelPage() {
  const params = useParams()
  const { businessSlug, userId } = params as { businessSlug: string; userId: string }

  const [user, setUser] = useState<UserData | null>(null)
  const [products, setProducts] = useState<ProductItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userRes, productsRes] = await Promise.all([
          fetch(`/api/users/${userId}?businessSlug=${encodeURIComponent(businessSlug)}`),
          fetch(`/api/business/${encodeURIComponent(businessSlug)}/products?limit=24`),
        ])

        if (!userRes.ok) throw new Error('No se pudo cargar usuario')
        if (!productsRes.ok) throw new Error('No se pudo cargar productos')

        const userData = await userRes.json()
        const productsData = await productsRes.json()
        setUser({
          id: userData.id,
          name: userData.name,
          businessName: userData.businessName,
        })
        setProducts(Array.isArray(productsData.items) ? productsData.items : [])
      } catch {
        setError('No se pudo cargar el panel de productos')
      } finally {
        setLoading(false)
      }
    }

    if (businessSlug && userId) {
      void fetchData()
    }
  }, [businessSlug, userId])

  if (loading) {
    return <StatePanel tone="loading" title="Cargando catalogo..." size="screen" />
  }

  if (error || !user) {
    return (
      <StatePanel
        tone="error"
        title="No se pudo abrir el panel de productos"
        detail={error || 'Error al cargar panel'}
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
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-2xl sm:text-3xl leading-none text-[#f3eee7] tracking-wide">Productos</h1>
              <p className="text-[#a89f93] text-xs truncate">{user.businessName}</p>
              <Breadcrumbs
                className="mt-1"
                items={[
                  { label: 'Tarjeta', href: `/${businessSlug}/card/${userId}` },
                  { label: 'Productos' },
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
        <section className="bf-panel rounded-3xl p-4 sm:p-5 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[#d9cfbf]">
              <Tags className="w-4 h-4 text-[#c79a4e]" />
              <p className="text-sm">Catalogo vigente para clientes</p>
            </div>
            <p className="font-data text-xs text-[#a89f93]">{products.length} producto(s)</p>
          </div>
        </section>

        {products.length === 0 ? (
          <StatePanel
            tone="empty"
            title="Aun no hay productos publicados"
            detail="Este catalogo se actualiza desde el panel del negocio."
            className="p-10"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {products.map((product) => (
              <article
                key={product.id}
                className="bf-panel rounded-3xl overflow-hidden h-full flex flex-col bf-interactive"
              >
                <div className="relative aspect-[4/3] bg-[#111820]">
                  <CatalogImage
                    src={resolveProductImageSrc(product.name, product.imageUrl)}
                    alt={product.name}
                    width={1000}
                    height={750}
                    label={product.name}
                    className="w-full h-full object-cover"
                  />
                  <span
                    className={`absolute top-3 right-3 text-[11px] px-2.5 py-1 rounded-full border ${getStockClass(product.stock)}`}
                  >
                    {getStockLabel(product.stock)}
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-[#f3eee7] font-semibold leading-tight">{product.name}</h2>
                    <p className="text-[#e4c083] text-sm font-semibold whitespace-nowrap font-data">
                      {formatPrice(product.priceCents)}
                    </p>
                  </div>

                  <p className="text-sm text-[#b8ada0] min-h-10">
                    {product.description || 'Producto profesional para mantenimiento y estilo diario.'}
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
