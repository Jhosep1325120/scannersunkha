// Comentario: Envuelve la lectura de QR desde la camara del dispositivo.
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Camera, X, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QrScannerProps {
  onScan: (decodedText: string) => void
  onError?: (errorMessage: string) => void
  className?: string
}

export function QrScanner({ onScan, onError, className }: QrScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [hasCamera, setHasCamera] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkCamera = async () => {
      try {
        const devices = await Html5Qrcode.getCameras()
        setHasCamera(devices.length > 0)
      } catch {
        const message = 'No se pudo acceder a la cámara'
        setHasCamera(false)
        setError(message)
        onError?.(message)
      }
    }

    void checkCamera()
  }, [onError])

  const startScanning = useCallback(async () => {
    if (!containerRef.current) return

    try {
      const devices = await Html5Qrcode.getCameras()
      if (devices.length === 0) {
        const message = 'No se encontraron cámaras'
        setError(message)
        onError?.(message)
        return
      }

      const backCamera = devices.find(
        (device) =>
          device.label.toLowerCase().includes('back')
          || device.label.toLowerCase().includes('trasera')
      )
      const cameraId = backCamera?.id || devices[0].id

      scannerRef.current = new Html5Qrcode('qr-reader', {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      })

      await scannerRef.current.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          onScan(decodedText)
        },
        (errorMessage) => {
          if (!errorMessage.includes('NotFoundException')) {
            console.warn('QR Scan error:', errorMessage)
          }
        }
      )

      setIsScanning(true)
      setError(null)
    } catch (err: unknown) {
      console.error('Failed to start scanner:', err)
      const message = 'Error al iniciar la cámara. Asegúrate de dar permisos.'
      setError(message)
      onError?.(message)
      setIsScanning(false)
    }
  }, [onError, onScan])

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        await scannerRef.current.clear()
      } catch (err) {
        console.error('Error stopping scanner:', err)
      }
      scannerRef.current = null
    }

    setIsScanning(false)
  }, [])

  useEffect(() => {
    return () => {
      void stopScanning()
    }
  }, [stopScanning])

  return (
    <div className={cn('relative', className)}>
      <div
        ref={containerRef}
        className={cn(
          'relative overflow-hidden rounded-xl border-2 transition-all duration-300',
          isScanning ? 'border-amber-500/50 bg-black' : 'border-gray-700 bg-gray-900'
        )}
      >
        <div
          id="qr-reader"
          className={cn(
            'w-full aspect-square',
            !isScanning && 'hidden'
          )}
        />

        {!isScanning && (
          <div className="aspect-square flex flex-col items-center justify-center p-8">
            <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center mb-4">
              <Camera className="w-10 h-10 text-gray-500" />
            </div>
            <p className="text-gray-400 text-center text-sm">
              {error || 'Escanea el QR del cliente para validar su visita'}
            </p>
          </div>
        )}

        {isScanning && (
          <>
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-amber-500" />
              <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-amber-500" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-amber-500" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-amber-500" />
            </div>

            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500/50 animate-scan-line" />
            </div>

            <button
              onClick={() => void stopScanning()}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-gray-900/80 flex items-center justify-center hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </>
        )}
      </div>

      {!isScanning && (
        <button
          onClick={() => void startScanning()}
          disabled={!hasCamera}
          className={cn(
            'w-full mt-4 py-4 px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2',
            hasCamera
              ? 'bg-amber-500 hover:bg-amber-400 text-gray-900'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          )}
        >
          <Camera className="w-5 h-5" />
          {hasCamera ? 'Iniciar Escáner' : 'Cámara no disponible'}
        </button>
      )}

      {error && (
        <button
          onClick={() => {
            setError(null)
            void startScanning()
          }}
          className="w-full mt-4 py-3 px-6 rounded-xl font-medium text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 transition-all flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Reintentar
        </button>
      )}
    </div>
  )
}
