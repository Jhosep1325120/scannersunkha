// Comentario: Presenta el formulario de acceso para administradores.
import { OwnerLoginForm } from '@/components/OwnerLoginForm'

export default function AdminLoginPage() {
  return (
    <OwnerLoginForm
      apiPath="/api/admin/login"
      defaultNextPath="/admin/dashboard"
      title="Panel Admin"
      subtitle="Reportes, stock, ingresos y clientes"
      placeholder="admin@tu-barberia.com"
    />
  )
}
