// Comentario: Muestra una pagina de prueba para validar permisos de camara.
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CameraTestPageClient from '@/components/CameraTestPageClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function CameraTestPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()

  if (!data.user?.email) {
    redirect('/barber/login?next=/barber/camera-test')
  }

  return <CameraTestPageClient />
}
