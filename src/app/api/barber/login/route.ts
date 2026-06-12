// Comentario: Procesa el acceso del barbero al panel operativo.
import { NextRequest } from 'next/server'
import { loginOwnerWithRole } from '@/lib/ownerLogin'

export async function POST(request: NextRequest) {
  return loginOwnerWithRole(request, 'BARBER')
}
