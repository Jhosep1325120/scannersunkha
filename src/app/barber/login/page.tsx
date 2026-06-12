// Comentario: Presenta el formulario de acceso para barberos.
import { OwnerLoginForm } from '@/components/OwnerLoginForm'

export default function BarberLoginPage() {
  return (
    <OwnerLoginForm
      apiPath="/api/barber/login"
      defaultNextPath="/barber"
      title="Panel Barbero"
      subtitle="Inicia sesion para escanear y marcar sellos"
      placeholder="barbero@tu-barberia.com"
    />
  )
}
