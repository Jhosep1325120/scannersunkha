// Comentario: Renderiza la pagina inicial publica del sistema de fidelidad.
import Link from 'next/link'
import { ArrowRight, BadgeCheck, Info, QrCode, Scissors, ShieldCheck } from 'lucide-react'

const pillars = [
  {
    icon: Scissors,
    title: 'Programa 5+1',
    text: 'Cinco cortes pagados desbloquean un corte gratis.',
  },
  {
    icon: QrCode,
    title: 'QR Temporal',
    text: 'Token dinamico para validar y minimizar fraude por captura.',
  },
  {
    icon: ShieldCheck,
    title: 'Seguridad Real',
    text: 'Autorizacion por negocio con rutas y endpoints protegidos.',
  },
  {
    icon: BadgeCheck,
    title: 'Operacion Fluida',
    text: 'Registro, sellado y canje en un flujo rapido y claro.',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bf-shell text-[#f3eee7]">
      <main className="relative z-10 bf-container py-10 sm:py-14 lg:py-16">
        <section className="bf-panel rounded-[2rem] p-5 sm:p-7 lg:p-10 mb-6 sm:mb-7 bf-fade-up">
          <div className="flex items-start justify-between gap-4 mb-7 sm:mb-10">
            <div>
              <p className="text-[10px] sm:text-xs uppercase tracking-[0.24em] text-[#a89f93] mb-2">SUNKHA</p>
              <p className="text-xs text-[#b8ada0] uppercase tracking-[0.12em]">Barberia de lujo</p>
            </div>
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bf-panel-soft flex items-center justify-center text-[#c79a4e] bf-float-slow">
              <Scissors className="w-5 h-5" />
            </div>
          </div>

          <div className="grid xl:grid-cols-[1.35fr_0.65fr] gap-6 lg:gap-8 items-end">
            <div>
              <h1 className="font-display text-[2.45rem] leading-[0.9] sm:text-6xl lg:text-7xl text-[#f3eee7] max-w-4xl">
                SUNKHA
                <span className="block text-[#e4c083]">club de fidelidad premium</span>
              </h1>
              <p className="text-[#cfc3b3] text-sm sm:text-base max-w-2xl mt-4 sm:mt-5 leading-relaxed">
                Elegancia, precision y recompensas en cada visita.
              </p>

              <div className="mt-6 sm:mt-7 flex flex-wrap gap-3">
                <Link
                  href="/barberia-centro"
                  className="w-full sm:w-auto sm:min-w-[280px] justify-center px-6 sm:px-8 py-4 rounded-2xl text-sm sm:text-base font-semibold inline-flex items-center gap-2 bf-btn-primary bf-focus bf-interactive bf-sheen shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
                >
                  Quiero mi tarjeta SUNKHA
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/barber/login"
                  className="w-full sm:w-auto sm:min-w-[280px] justify-center px-6 sm:px-8 py-4 rounded-2xl text-sm sm:text-base font-semibold inline-flex items-center gap-2 bf-btn-secondary bf-focus bf-interactive shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
                >
                  Acceso barbero
                </Link>
                <Link
                  href="/admin/login"
                  className="w-full sm:w-auto sm:min-w-[280px] justify-center px-6 sm:px-8 py-4 rounded-2xl text-sm sm:text-base font-semibold inline-flex items-center gap-2 bf-btn-secondary bf-focus bf-interactive shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
                >
                  Acceso admin
                </Link>
              </div>

              <div className="mt-4 max-w-xl rounded-2xl border border-[#c79a4e45] bg-[#c79a4e14] px-3 py-2.5 flex items-start gap-2">
                <Info className="w-4 h-4 text-[#e4c083] mt-0.5 shrink-0" />
                <p className="text-[#e8dcc8] text-xs leading-relaxed">
                  Si ya tienes cuenta, usa el mismo numero de telefono y abriremos tu tarjeta automaticamente.
                </p>
              </div>
            </div>

            <div className="bf-panel-soft rounded-3xl p-4 sm:p-5 bf-fade-up bf-fade-up-delay-1">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#a89f93] mb-3">Ritmo operativo</p>
              <div className="space-y-3">
                <div className="rounded-2xl border border-[var(--line-0)] bg-[#10161dcc] px-3 py-3">
                  <p className="font-data text-[#f3eee7] text-sm">01. Registro por QR</p>
                  <p className="text-xs text-[#9e9488] mt-1">En segundos</p>
                </div>
                <div className="rounded-2xl border border-[var(--line-0)] bg-[#10161dcc] px-3 py-3">
                  <p className="font-data text-[#f3eee7] text-sm">02. Sellado seguro</p>
                  <p className="text-xs text-[#9e9488] mt-1">Con QR temporal</p>
                </div>
                <div className="rounded-2xl border border-[var(--line-0)] bg-[#10161dcc] px-3 py-3">
                  <p className="font-data text-[#f3eee7] text-sm">03. Canje inmediato</p>
                  <p className="text-xs text-[#9e9488] mt-1">Al completar 5/5</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 bf-fade-up bf-fade-up-delay-2">
          {pillars.map((item) => {
            const Icon = item.icon
            return (
              <article key={item.title} className="bf-panel rounded-2xl p-4 sm:p-5 bf-interactive">
                <div className="w-9 h-9 rounded-xl bf-panel-soft flex items-center justify-center mb-3 text-[#c79a4e]">
                  <Icon className="w-4 h-4" />
                </div>
                <h2 className="text-[#f3eee7] font-semibold">{item.title}</h2>
              </article>
            )
          })}
        </section>
      </main>
    </div>
  )
}
