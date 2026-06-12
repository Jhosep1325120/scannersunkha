// Comentario: Configura el cliente Supabase para uso en el navegador.
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan variables de entorno de Supabase en el cliente.')
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
