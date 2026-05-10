import { Link } from 'react-router-dom'
import { Trophy, Users, ShoppingCart, BarChart2 } from 'lucide-react'
import { Button } from '../components/ui/Button'

const features = [
  { icon: Users,        title: 'Armá tu equipo',   desc: 'Comprá jugadores de la LNB con un presupuesto de $100M y construí tu plantilla ideal.' },
  { icon: ShoppingCart, title: 'Mercado activo',    desc: 'Comprá, vendé y hacé transferencias durante cada jornada. Una transferencia gratis por semana.' },
  { icon: BarChart2,    title: 'Puntaje real',      desc: 'Los puntos se calculan automáticamente con las estadísticas reales de cada partido.' },
  { icon: Trophy,       title: 'Competí y ganá',    desc: 'Escalá el ranking general y demostrá que tenés el mejor ojo para el básquet.' },
]

export function Landing() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        <div className="text-6xl mb-6">🏀</div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
          Gran Coach <span className="text-brand-500">LNB</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-xl mb-10">
          El fantasy basketball de la Liga Nacional de Básquet Argentina. Armá tu equipo, manejá tu presupuesto y competí contra todos.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link to="/register">
            <Button variant="primary" size="lg">Empezar a jugar</Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary" size="lg">Ya tengo cuenta</Button>
          </Link>
        </div>
      </div>

      {/* Features */}
      <div className="bg-gray-900 border-t border-gray-800 py-16 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="text-center p-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-900 mb-4">
                <Icon className="h-6 w-6 text-brand-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-gray-400">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="text-center py-6 text-xs text-gray-600">
        Gran Coach LNB — Fantasy Basketball Argentina
      </footer>
    </div>
  )
}
