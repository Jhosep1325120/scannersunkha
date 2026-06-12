// Comentario: Procesa el inicio de sesion del administrador.
import { NextRequest } from 'next/server'
import { loginOwnerWithRole } from '@/lib/ownerLogin'

export async function POST(request: NextRequest) {
  return loginOwnerWithRole(request, 'ADMIN')
}
