// Comentario: Controla rutas protegidas y redirecciones antes de cargar paginas.
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const protectedApiPath =
  /^\/api\/users\/[^/]+\/(stamp|redeem)$|^\/api\/scan\/resolve$/

function applySecurityHeaders(response: NextResponse) {
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'same-origin')
  return response
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const { pathname } = request.nextUrl

  const needsAuth = protectedApiPath.test(pathname)

  if (!needsAuth) {
    return applySecurityHeaders(response)
  }

  if (!user) {
    return applySecurityHeaders(
      NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    )
  }

  return applySecurityHeaders(response)
}

export const config = {
  matcher: ['/api/:path*'],
}
