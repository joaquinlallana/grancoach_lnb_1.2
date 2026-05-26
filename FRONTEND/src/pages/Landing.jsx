import { Link } from 'react-router-dom'
import { Trophy, Users, ShoppingCart, BarChart2, ArrowRight } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Logo, Wordmark } from '../components/ui/Logo'
import { ThemeToggle } from '../components/ui/ThemeToggle'

const features = [
  { icon: Users,        title: 'Armá tu equipo',     desc: 'Comprá jugadores de la LNB con $100M de presupuesto y construí tu plantilla ideal.' },
  { icon: ShoppingCart, title: 'Mercado activo',     desc: 'Comprá, vendé y transferí durante cada jornada. Una transferencia gratis por semana.' },
  { icon: BarChart2,    title: 'Puntaje real',       desc: 'Los puntos se calculan automáticamente con las estadísticas reales de cada partido.' },
  { icon: Trophy,       title: 'Competí y ganá',     desc: 'Escalá el ranking general y demostrá que tenés el mejor ojo para el básquet argentino.' },
]

export function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-surface-50 dark:bg-surface-950">
      {/* Top bar */}
      <header className="border-b border-surface-200 dark:border-surface-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <Logo size={28} withMark />
            <Wordmark className="text-base" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/login" className="hidden sm:inline">
              <Button variant="ghost" size="sm">Iniciar sesión</Button>
            </Link>
            <Link to="/register">
              <Button variant="primary" size="sm" iconRight={ArrowRight}>Empezar</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex items-center">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900 px-3 py-1 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium text-surface-600 dark:text-surface-400">
              Temporada activa — Liga Nacional de Básquet
            </span>
          </div>

          <h1 className="font-display font-extrabold tracking-tight text-surface-900 dark:text-surface-50 text-4xl sm:text-5xl lg:text-6xl leading-[1.05]">
            El <span className="text-brand-500">fantasy basketball</span><br className="hidden sm:block" /> de la LNB argentina.
          </h1>

          <p className="mt-6 text-base sm:text-lg text-surface-600 dark:text-surface-400 max-w-2xl mx-auto">
            Armá tu equipo, manejá tu presupuesto y competí semana a semana con puntajes
            calculados a partir de estadísticas reales de cada partido.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/register">
              <Button variant="primary" size="lg" iconRight={ArrowRight}>Crear mi equipo</Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg">Ya tengo cuenta</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-surface-200 dark:border-surface-800 bg-white dark:bg-surface-900/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="text-center mb-12 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-surface-900 dark:text-surface-50">
              Todo lo que necesitás para competir
            </h2>
            <p className="mt-3 text-sm sm:text-base text-surface-600 dark:text-surface-400">
              Un manager fantasy diseñado específicamente para el básquet argentino.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-left">
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-brand-500/10 ring-1 ring-inset ring-brand-500/20 mb-4">
                  <Icon className="h-5 w-5 text-brand-600 dark:text-brand-400" aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-surface-900 dark:text-surface-50 mb-1.5">{title}</h3>
                <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-surface-200 dark:border-surface-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-surface-500 dark:text-surface-500">
            Gran Coach LNB — Fantasy Basketball Argentina
          </p>
          <p className="text-xs text-surface-400 dark:text-surface-600">
            Datos oficiales de la Liga Nacional de Básquet.
          </p>
        </div>
      </footer>
    </div>
  )
}
