// Comentario: Define la estructura raiz y metadatos compartidos de la app.
import type { Metadata } from 'next'
import './globals.css'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { AppIntroSplash } from '@/components/ui/AppIntroSplash'

export const metadata: Metadata = {
  title: 'Barber Fidelity',
  description: 'Sistema de fidelizacion para barberias con sellos digitales',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        <ToastProvider>
          <AppIntroSplash />
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
