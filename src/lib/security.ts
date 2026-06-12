// Comentario: Aplica controles comunes de seguridad para respuestas HTTP.
import { NextRequest, NextResponse } from 'next/server'

const BUSINESS_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function normalizePhone(value: string) {
  return value.replace(/\D/g, '')
}

export function isValidBusinessSlug(slug: string) {
  return BUSINESS_SLUG_REGEX.test(slug)
}

export function sanitizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ')
}

function isSameOrigin(request: NextRequest, candidate: string | null) {
  if (!candidate) return false
  try {
    const parsed = new URL(candidate)
    return parsed.host === request.nextUrl.host
  } catch {
    return false
  }
}

export function validateSameOriginRequest(request: NextRequest) {
  const requestedWith = request.headers.get('x-requested-with')
  if (requestedWith === 'barber-fidelity') {
    return null
  }

  const origin = request.headers.get('origin')
  if (origin && isSameOrigin(request, origin)) {
    return null
  }

  const referer = request.headers.get('referer')
  if (referer && isSameOrigin(request, referer)) {
    return null
  }

  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite && ['same-origin', 'same-site', 'none'].includes(fetchSite)) {
    return null
  }

  if (process.env.NODE_ENV !== 'production' && !origin && !referer) {
    return null
  }

  return NextResponse.json(
    { error: 'Origen no permitido' },
    { status: 403 }
  )
}
