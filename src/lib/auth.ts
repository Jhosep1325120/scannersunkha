// Comentario: Centraliza validaciones y cookies de autenticacion.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export type OwnerRole = 'ADMIN' | 'BARBER'

async function requireOwnerRole(allowedRoles: OwnerRole[], emptyRoleMessage: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data.user?.email) {
    return {
      user: null,
      owner: null,
      unauthorizedResponse: NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      ),
    }
  }

  const owner = await prisma.owner.findUnique({
    where: { email: data.user.email },
    select: {
      id: true,
      email: true,
      businessId: true,
      name: true,
      role: true,
      business: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  })

  if (!owner || !allowedRoles.includes(owner.role as OwnerRole)) {
    return {
      user: null,
      owner: null,
      unauthorizedResponse: NextResponse.json(
        { error: emptyRoleMessage },
        { status: 403 }
      ),
    }
  }

  return { user: data.user, owner, unauthorizedResponse: null }
}

export async function requireBarberAuth() {
  return requireOwnerRole(['BARBER'], 'Barbero no registrado para marcar sellos')
}

export async function requireAdminAuth() {
  return requireOwnerRole(['ADMIN'], 'Administrador no registrado para este negocio')
}
