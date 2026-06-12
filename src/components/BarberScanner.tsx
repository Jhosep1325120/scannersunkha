// Comentario: Escanea codigos QR y carga la tarjeta del cliente encontrado.
'use client'

import { useState, useRef, useEffect } from 'react'
import jsQR from 'jsqr'
import { Camera, X, RefreshCw, Keyboard, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserData {
  id: string
  name: string
  phone: string
  stamps: number
  totalCuts: number
  canRedeem: boolean
  scanToken?: string
}

interface BarberScannerProps {
  onScanSuccess: (user: UserData) => void
  className?: string
}

export function BarberScanner({ onScanSuccess, className }: BarberScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showManualInput, setShowManualInput] = useState(false)
  const [manualId, setManualId] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationRef = useRef<number | null>(null)
  const retryTimerRef = useRef<number | null>(null)
  const scannedRef = useRef(false)

  const parseError = (err: unknown) => {
    if (err instanceof Error) return `${err.name}: ${err.message}`
    return String(err)
  }

  const normalizeErrorMessage = (message: string) => {
    if (/qr.*(no\s*válido|no\s*valido|inválido|invalido)/i.test(message)) {
      return 'QR no válido'
    }
    return message
  }

  const isInvalidQrError = (message: string | null) =>
    !!message && /qr.*(no\s*válido|no\s*valido|inválido|invalido)/i.test(message)

  const handleResetScanner = async () => {
    setError(null)
    setShowManualInput(false)
    setManualId('')
    scannedRef.current = false
    stopScanning()
    await startScanning()
  }

  const clearRetryTimer = () => {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current)
      retryTimerRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      stopScanning()
      clearRetryTimer()
    }
  }, [])

  const startScanning = async () => {
    setIsLoading(true)
    setError(null)
    scannedRef.current = false

    try {
      const nav = navigator as Navigator & {
        getUserMedia?: (
          constraints: MediaStreamConstraints,
          successCallback: (stream: MediaStream) => void,
          errorCallback: (error: unknown) => void
        ) => void
        webkitGetUserMedia?: (
          constraints: MediaStreamConstraints,
          successCallback: (stream: MediaStream) => void,
          errorCallback: (error: unknown) => void
        ) => void
        mozGetUserMedia?: (
          constraints: MediaStreamConstraints,
          successCallback: (stream: MediaStream) => void,
          errorCallback: (error: unknown) => void
        ) => void
        msGetUserMedia?: (
          constraints: MediaStreamConstraints,
          successCallback: (stream: MediaStream) => void,
          errorCallback: (error: unknown) => void
        ) => void
      }

      const constraints: MediaStreamConstraints = {
        video: { facingMode: 'environment' },
        audio: false,
      }

      const stream = await (async () => {
        if (nav.mediaDevices && typeof nav.mediaDevices.getUserMedia === 'function') {
          return nav.mediaDevices.getUserMedia(constraints)
        }

        const legacyGetUserMedia = nav.getUserMedia
          || nav.webkitGetUserMedia
          || nav.mozGetUserMedia
          || nav.msGetUserMedia

        if (!legacyGetUserMedia) {
          throw new Error('MediaDevicesUnavailable')
        }

        return new Promise<MediaStream>((resolve, reject) => {
          legacyGetUserMedia.call(nav, constraints, resolve, reject)
        })
      })()

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setIsScanning(true)
        startQRDetection()
      }
    } catch (err: unknown) {
      handleScanError(err)
    } finally {
      setIsLoading(false)
    }
  }

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsScanning(false)
  }

  const startQRDetection = () => {
    const detect = async () => {
      if (!videoRef.current || !canvasRef.current || scannedRef.current) return

      const video = videoRef.current
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')

      if (!ctx || video.readyState !== 4) {
        animationRef.current = requestAnimationFrame(detect)
        return
      }

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      })

      if (code) {
        scannedRef.current = true
        stopScanning()

        try {
          const response = await fetch('/api/scan/resolve', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-requested-with': 'barber-fidelity',
            },
            body: JSON.stringify({ token: code.data }),
          })

          if (response.ok) {
            const userData = await response.json()
            onScanSuccess(userData)
          } else {
            const data = await response.json().catch(() => ({}))
            const normalizedError = normalizeErrorMessage(data.error || 'QR no válido')
            setError(normalizedError)

            if (/(QR ya utilizado|QR expirado|QR no válido|QR invalido|QR inválido)/i.test(normalizedError)) {
              clearRetryTimer()
              retryTimerRef.current = window.setTimeout(() => {
                setError(null)
                scannedRef.current = false
                void startScanning()
              }, 1800)
            }
          }
        } catch {
          setError('Error al validar QR')
        }
        return
      }

      animationRef.current = requestAnimationFrame(detect)
    }

    detect()
  }

  const handleScanError = (err: unknown) => {
    const errorStr = parseError(err)

    if (errorStr.includes('NotAllowedError')) {
      setError('Permiso denegado. Ve a Configuracion > Privacidad > Camara.')
    } else if (errorStr.includes('MediaDevicesUnavailable')) {
      const requiresHttps = typeof window !== 'undefined' && !window.isSecureContext
      setError(
        requiresHttps
          ? 'La camara requiere HTTPS en este dispositivo. Abre el panel con https:// o usa foto/ID manual.'
          : 'Este navegador no permite acceso a camara en esta sesion. Prueba en Chrome actualizado o usa foto/ID manual.'
      )
    } else if (errorStr.includes('NotFoundError')) {
      setError('No se encontro camara.')
    } else if (errorStr.includes('NotReadableError')) {
      setError('Camara ocupada. Cierra otras apps.')
    } else {
      setError('No se pudo iniciar la camara. Revisa permisos o usa foto/ID manual.')
    }
  }

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!manualId.trim()) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/users/${manualId.trim()}`)
      if (response.ok) {
        const userData = await response.json()
        userData.scanToken = undefined
        setManualId('')
        setShowManualInput(false)
        onScanSuccess(userData)
      } else {
        setError('Cliente no encontrado')
      }
    } catch {
      setError('Error de conexion')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setError(null)

    try {
      const img = new Image()
      img.src = URL.createObjectURL(file)

      await new Promise((resolve) => {
        img.onload = resolve
      })

      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        setError('Error procesando imagen')
        return
      }

      ctx.drawImage(img, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)

      if (code) {
        const response = await fetch('/api/scan/resolve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-requested-with': 'barber-fidelity',
          },
          body: JSON.stringify({ token: code.data }),
        })

        if (response.ok) {
          const userData = await response.json()
          onScanSuccess(userData)
        } else {
          const data = await response.json().catch(() => ({}))
          setError(normalizeErrorMessage(data.error || 'QR no válido'))
        }
      } else {
        setError('No se detecto QR en la imagen')
      }
    } catch {
      setError('Error al procesar imagen')
    } finally {
      setIsLoading(false)
    }
  }

  if (showManualInput) {
    return (
      <div className={cn('bf-panel rounded-2xl p-6', className)}>
        <h3 className="text-[#f3eee7] font-medium mb-4 flex items-center gap-2">
          <Keyboard className="w-5 h-5 text-[#c79a4e]" />
          Ingreso manual
        </h3>
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <input
            type="text"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="ID del cliente"
            className="w-full bf-input bf-focus rounded-xl py-3 px-4"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-3 px-4 rounded-xl font-medium text-sm bg-[#c79a4e] hover:bg-[#dcb87d] disabled:opacity-50 text-[#12171d] transition-all bf-focus"
            >
              {isLoading ? 'Buscando...' : 'Buscar'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowManualInput(false)
                setManualId('')
                setError(null)
              }}
              className="py-3 px-4 rounded-xl font-medium text-sm bf-btn-secondary transition-all bf-focus"
            >
              Volver
            </button>
          </div>
        </form>
        {error && <p className="text-[#f1b6b6] text-sm mt-3">{error}</p>}
      </div>
    )
  }

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border-2 transition-all duration-300 bg-black',
          isScanning ? 'border-[#c79a4e80]' : 'border-[var(--line-0)]'
        )}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn('w-full aspect-square object-cover', !isScanning && 'hidden')}
        />

        <canvas ref={canvasRef} className="hidden" />

        {!isScanning && (
          <div className="aspect-square flex flex-col items-center justify-center p-8 bg-[#0e151ccc]">
            <div className="w-20 h-20 rounded-2xl bf-panel-soft flex items-center justify-center mb-4">
              <Camera className="w-10 h-10 text-[#8f8578]" />
            </div>
            <p className="text-[#cfc3b3] text-center text-sm">{error || 'Escanea el QR del cliente'}</p>
          </div>
        )}

        {isScanning && (
          <>
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-[#c79a4e]" />
              <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-[#c79a4e]" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-[#c79a4e]" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-[#c79a4e]" />
            </div>
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#c79a4e80] animate-scan-line" />
            </div>
            <button
              onClick={stopScanning}
              className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-[#0f151ccc] flex items-center justify-center bf-focus"
            >
              <X className="w-5 h-5 text-[#f3eee7]" />
            </button>
            <div className="absolute bottom-4 left-4 right-4 bg-[#0c1117cc] rounded-lg p-2 text-center border border-[var(--line-0)]">
              <p className="text-[#f3eee7] text-xs">Apunta el QR al cuadro</p>
            </div>
          </>
        )}
      </div>

      {!isScanning && (
        <div className="space-y-3 mt-4">
          <button
            onClick={startScanning}
            disabled={isLoading}
            className="w-full py-4 px-6 rounded-xl font-bold text-sm bg-[#c79a4e] hover:bg-[#dcb87d] disabled:opacity-50 text-[#12171d] transition-all flex items-center justify-center gap-2 bf-focus"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-[#12171d55] border-t-[#12171d] rounded-full animate-spin" />
            ) : (
              <Camera className="w-5 h-5" />
            )}
            Escanear QR
          </button>

          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            id="qr-file"
          />
          <label
            htmlFor="qr-file"
            className="w-full py-3 px-6 rounded-xl font-medium text-sm bf-btn-secondary transition-all flex items-center justify-center gap-2 cursor-pointer bf-focus"
            tabIndex={0}
          >
            <Upload className="w-4 h-4" />
            Subir foto del QR
          </label>

          <button
            onClick={() => {
              setShowManualInput(true)
              setError(null)
            }}
            className="w-full py-3 px-6 rounded-xl font-medium text-sm bf-btn-secondary transition-all flex items-center justify-center gap-2 bf-focus"
          >
            <Keyboard className="w-4 h-4" />
            Ingresar ID manual
          </button>
        </div>
      )}

      {error && !isScanning && (
        <div className="mt-4 bg-[#e26e6e1a] border border-[#e26e6e55] rounded-xl p-4">
          <p className="text-[#f1b6b6] text-sm mb-3">{error}</p>
          <button
            onClick={() => {
              if (isInvalidQrError(error)) {
                void handleResetScanner()
              } else {
                setError(null)
                void startScanning()
              }
            }}
            className="w-full py-2 px-4 rounded-lg font-medium text-sm bg-[#e26e6e2d] hover:bg-[#e26e6e40] text-[#f1b6b6] transition-all flex items-center justify-center gap-2 bf-focus"
          >
            <RefreshCw className="w-4 h-4" />
            {isInvalidQrError(error) ? 'Volver a escanear' : 'Reintentar'}
          </button>
        </div>
      )}

      <div className="mt-4 bf-panel-soft rounded-xl p-4">
        <p className="text-[#a89f93] text-xs">
          Si la camara no funciona, usa &quot;Subir foto del QR&quot; o ingresa el ID manualmente.
        </p>
      </div>
    </div>
  )
}
