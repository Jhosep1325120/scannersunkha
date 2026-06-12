// Comentario: Exporta el historial de inventario en formato XML compatible con Excel.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminAuth } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function textCell(value: string) {
  return `<Cell><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`
}

function numberCell(value: number) {
  return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`
}

export async function GET() {
  const { owner, unauthorizedResponse } = await requireAdminAuth()
  if (unauthorizedResponse) return unauthorizedResponse
  if (!owner) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const movements = await prisma.inventoryMovement.findMany({
    where: { businessId: owner.businessId },
    orderBy: { createdAt: 'desc' },
    select: {
      type: true,
      reason: true,
      quantity: true,
      previousStock: true,
      newStock: true,
      createdAt: true,
      unitPriceCents: true,
      totalCents: true,
      product: { select: { name: true, stock: true } },
      user: { select: { name: true } },
    },
  })

  const rows = movements.map((movement) => {
    const entries = movement.type === 'IN' ? movement.quantity : 0
    const exits = movement.type === 'OUT' ? movement.quantity : 0
    const movementLabel = movement.reason === 'SALE'
      ? 'VENTA'
      : movement.reason === 'ADJUSTMENT'
        ? 'AJUSTE'
        : movement.type === 'IN'
          ? 'ENTRADA'
          : 'SALIDA'
    return `<Row>
      ${textCell(movement.product.name)}
      ${numberCell(movement.product.stock ?? 0)}
      ${numberCell(entries)}
      ${numberCell(exits)}
      ${numberCell(movement.previousStock)}
      ${numberCell(movement.newStock)}
      ${movement.unitPriceCents === null ? textCell('') : numberCell(movement.unitPriceCents / 100)}
      ${movement.totalCents === null ? textCell('') : numberCell(movement.totalCents / 100)}
      ${textCell(movementLabel)}
      ${textCell(movement.user?.name ?? 'Sistema')}
      ${textCell(movement.createdAt.toLocaleString('es-PE', { timeZone: 'America/Lima' }))}
    </Row>`
  }).join('\n')

  const workbook = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#D9EAD3" ss:Pattern="Solid"/></Style>
 </Styles>
 <Worksheet ss:Name="Inventario">
  <Table>
   <Row ss:StyleID="Header">
    ${textCell('Nombre del producto')}
    ${textCell('Stock actual')}
    ${textCell('Entradas')}
    ${textCell('Salidas o ventas')}
    ${textCell('Stock anterior')}
    ${textCell('Stock final')}
    ${textCell('Precio unitario S/')}
    ${textCell('Total venta S/')}
    ${textCell('Tipo de movimiento')}
    ${textCell('Usuario responsable')}
    ${textCell('Fecha del movimiento')}
   </Row>
   ${rows}
  </Table>
 </Worksheet>
</Workbook>`

  const date = new Date().toISOString().slice(0, 10)
  return new NextResponse(workbook, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
      'Content-Disposition': `attachment; filename="inventario-sunkha-${date}.xls"`,
      'Cache-Control': 'no-store',
    },
  })
}
