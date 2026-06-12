// Comentario: Comparte la logica de login para roles internos.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import type { OwnerRole } from '@/lib/auth'

const roleLabels: Record<OwnerRole, string> = {
  ADMIN: 'panel admin',
  BARBER: 'panel de barbero',
}

export async function loginOwnerWithRole(request: NextRequest, role: OwnerRole) {
  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!email || !password) {
      return NextResponse.json({ error: 'Faltan credenciales' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.user?.email) {
      console.warn(`Error de Supabase Auth en ${roleLabels[role]}:`, error?.message ?? 'Usuario sin email')

      const message = error?.message?.toLowerCase() ?? ''
      const userMessage = message.includes('email not confirmed')
        ? 'Debes confirmar el correo en Supabase Auth antes de ingresar'
        : message.includes('invalid login credentials')
          ? 'Email o password incorrectos en Supabase Auth'
          : 'No se pudo validar la cuenta en Supabase Auth'

      return NextResponse.json(
        { error: userMessage },
        { status: 401 }
      )
    }

    const owner = await prisma.owner.findFirst({
      where: { email: { equals: data.user.email, mode: 'insensitive' } },
      select: { id: true, role: true },
    })

    if (!owner || owner.role !== role) {
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: `Esta cuenta no tiene acceso al ${roleLabels[role]}` },
        { status: 403 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`Error inesperado en login de ${roleLabels[role]}:`, error)
    return NextResponse.json(
      { error: 'Error al iniciar sesion. Intenta nuevamente.' },
      { status: 500 }
    )
  }
}
