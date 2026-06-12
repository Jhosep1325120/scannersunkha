// Comentario: Redirige al administrador segun su estado de autenticacion.
import { redirect } from 'next/navigation'

export default function AdminPage() {
  redirect('/admin/dashboard')
}
