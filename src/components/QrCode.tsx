// Comentario: Genera visualmente el codigo QR de una tarjeta de cliente.
'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface QrCodeProps {
  value: string
  size?: number
  className?: string
}

export function QrCode({ value, size = 200, className }: QrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string>('')

  useEffect(() => {
    const generateQR = async () => {
      try {
        const url = await QRCode.toDataURL(value, {
          width: size,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        })
        setDataUrl(url)
      } catch (err) {
        console.error('Error generating QR:', err)
      }
    }

    generateQR()
  }, [value, size])

  if (!dataUrl) {
    return (
      <div 
        className={cn(
          "bg-gray-800 animate-pulse rounded-lg",
          className
        )}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <Image
      src={dataUrl}
      alt="QR Code"
      width={size}
      height={size}
      className={cn('rounded-lg', className)}
    />
  )
}
