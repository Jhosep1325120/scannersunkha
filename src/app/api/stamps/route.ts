// Comentario: Lista registros de sellos y actividad de fidelidad.
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function buildDeprecatedResponse() {
  return NextResponse.json(
    {
      error: 'Endpoint deprecado',
      message: 'Usa /api/users/[id]/stamp, /api/users/[id]/redeem y /api/users/[id].',
    },
    { status: 410 }
  )
}

export async function GET() {
  return buildDeprecatedResponse()
}

export async function POST() {
  return buildDeprecatedResponse()
}
