// Comentario: Crea y consulta usuarios del programa de fidelidad.
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  isValidBusinessSlug,
  normalizePhone,
  sanitizeName,
  validateSameOriginRequest,
} from '@/lib/security'
import { toCanonicalBusinessSlug } from '@/lib/businessSlug'
import { requireBarberAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// GET /api/users - Listar usuarios del negocio (requiere auth de barbero)
export async function GET() {
  try {
    const auth = await requireBarberAuth()
    if (auth.unauthorizedResponse) {
      return auth.unauthorizedResponse
    }

    const users = await prisma.user.findMany({
      where: { businessId: auth.owner.businessId },
      select: {
        id: true,
        name: true,
        phone: true,
        stamps: true,
        totalCuts: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error obteniendo usuarios:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST /api/users - Crear nuevo usuario
export async function POST(request: NextRequest) {
  try {
    const originError = validateSameOriginRequest(request)
    if (originError) return originError

    const body = await request.json()
    const name = sanitizeName(String(body?.name ?? ''))
    const phone = normalizePhone(String(body?.phone ?? ''))
    const businessSlug = toCanonicalBusinessSlug(String(body?.businessSlug ?? ''))

    if (!name || !phone || !businessSlug) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    if (!isValidBusinessSlug(businessSlug)) {
      return NextResponse.json(
        { error: 'Slug de negocio invalido' },
        { status: 400 }
      )
    }

    if (name.length < 2 || name.length > 80) {
      return NextResponse.json(
        { error: 'El nombre debe tener entre 2 y 80 caracteres' },
        { status: 400 }
      )
    }

    const phoneRegex = /^9\d{8}$/
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: 'El celular debe tener 9 digitos y empezar con 9' },
        { status: 400 }
      )
    }

    const business = await prisma.business.findUnique({
      where: { slug: businessSlug }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Negocio no encontrado' },
        { status: 404 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        phone_businessId: {
          phone,
          businessId: business.id
        }
      }
    })

    if (existingUser) {
      return NextResponse.json(
        {
          error: 'Ya existe una cuenta con este telefono',
          user: {
            id: existingUser.id,
            name: existingUser.name,
            stamps: existingUser.stamps
          }
        },
        { status: 409 }
      )
    }

    const user = await prisma.user.create({
      data: {
        name,
        phone,
        businessId: business.id,
        stamps: 0,
        totalCuts: 0
      }
    })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        stamps: user.stamps,
        totalCuts: user.totalCuts
      },
      message: 'Cuenta creada exitosamente'
    }, { status: 201 })

  } catch (error) {
    console.error('Error creando usuario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
