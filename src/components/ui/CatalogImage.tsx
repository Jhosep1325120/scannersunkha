// Comentario: Muestra imagenes de catalogo con fallback visual.
'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { ImageOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CatalogImageProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
  label?: string
  unoptimized?: boolean
}

export function CatalogImage({
  src,
  alt,
  width,
  height,
  className,
  label,
  unoptimized,
}: CatalogImageProps) {
  const [failed, setFailed] = useState(false)

  const placeholderLabel = useMemo(() => label || alt, [alt, label])

  if (failed) {
    return (
      <div className={cn('w-full h-full relative overflow-hidden bg-[#121b24]', className)}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(199,154,78,0.18),transparent_55%)]" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
          <div className="w-11 h-11 rounded-xl bf-panel-soft flex items-center justify-center mb-2">
            <ImageOff className="w-5 h-5 text-[#c79a4e]" />
          </div>
          <p className="text-[#d9cfbf] text-xs font-medium">Imagen no disponible</p>
          <p className="text-[#9c9184] text-[11px] mt-1 line-clamp-2">{placeholderLabel}</p>
        </div>
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      unoptimized={unoptimized}
      className={className}
      onError={() => setFailed(true)}
    />
  )
}
