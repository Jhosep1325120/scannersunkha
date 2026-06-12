// Comentario: Aplica cambios de stock y registra su trazabilidad de forma atomica.
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export type InventoryChange =
  | { mode: 'IN' | 'OUT'; quantity: number }
  | { mode: 'ADJUST'; targetStock: number }

export type InventoryChangeResult =
  | { ok: true; movementType: 'IN' | 'OUT' | null; quantity: number; newStock: number }
  | { ok: false; reason: 'NOT_FOUND' | 'INSUFFICIENT_STOCK' }

export async function applyInventoryChange({
  businessId,
  productId,
  userId,
  change,
}: {
  businessId: string
  productId: string
  userId: string
  change: InventoryChange
}): Promise<InventoryChangeResult> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const product = await tx.product.findFirst({
          where: { id: productId, businessId },
          select: { stock: true, priceCents: true },
        })

        if (!product) return { ok: false, reason: 'NOT_FOUND' } as const

        const previousStock = product.stock ?? 0
        let movementType: 'IN' | 'OUT'
        let quantity: number
        let newStock: number
        let reason: 'SALE' | 'SUPPLY' | 'ADJUSTMENT'

        if (change.mode === 'ADJUST') {
          if (change.targetStock === previousStock) {
            return { ok: true, movementType: null, quantity: 0, newStock: previousStock } as const
          }
          movementType = change.targetStock > previousStock ? 'IN' : 'OUT'
          quantity = Math.abs(change.targetStock - previousStock)
          newStock = change.targetStock
          reason = 'ADJUSTMENT'
        } else {
          movementType = change.mode
          quantity = change.quantity
          reason = movementType === 'IN' ? 'SUPPLY' : 'SALE'
          newStock = movementType === 'IN'
            ? previousStock + quantity
            : previousStock - quantity
        }

        if (newStock < 0) {
          return { ok: false, reason: 'INSUFFICIENT_STOCK' } as const
        }

        await tx.product.update({
          where: { id: productId },
          data: { stock: newStock },
        })

        await tx.inventoryMovement.create({
          data: {
            businessId,
            productId,
            userId,
            type: movementType,
            reason,
            quantity,
            previousStock,
            newStock,
            unitPriceCents: reason === 'SALE' ? product.priceCents : null,
            totalCents: reason === 'SALE' ? product.priceCents * quantity : null,
          },
        })

        return { ok: true, movementType, quantity, newStock } as const
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (error) {
      const canRetry = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034'
      if (!canRetry || attempt === 2) throw error
    }
  }

  throw new Error('No se pudo completar el movimiento de inventario')
}
