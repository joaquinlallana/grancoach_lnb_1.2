import { Link } from 'react-router-dom'
import {
  Trophy,
  Users,
  DollarSign,
  Calendar,
  AlertTriangle,
  ShoppingBag,
  ArrowRight,
} from 'lucide-react'
import { useTeam } from '../hooks/useTeam'
import { useMyScore, useCurrentGameweek, useGlobalRanking } from '../hooks/useRankings'
import { useAuth } from '../hooks/useAuth'
import { Card, CardHeader } from '../components/ui/Card'
import { BudgetBar } from '../components/market/BudgetBar'
import { SkeletonCard } from '../components/ui/Skeleton'
import { StatCard } from '../components/dashboard/StatCard'

const fmt = (n) => `$${(n / 1_000_000).toFixed(1)}M`

const QUICK_ACTIONS = [
  { to: '/market',    label: 'Mercado',  desc: 'Comprá y vendé jugadores', icon: ShoppingBag },
  { to: '/my-team',   label: 'Mi Equipo', desc: 'Gestioná tu plantilla',    icon: Users },
  { to: '/rankings',  label: 'Ranking',   desc: 'Ver tabla de posiciones',  icon: Trophy },
]

export function Dashboard() {
  const { user } = useAuth()
  const { data: team, isLoading: loadingTeam } = useTeam()
  const { data: myScore } = useMyScore()
  const { data: gameweek } = useCurrentGameweek()
  const { data: ranking } = useGlobalRanking({ limit: 100 })

  const myRank = ranking?.ranking?.findIndex((r) => r.email === user?.email)
  const myPosition = myRank != null && myRank >= 0 ? myRank + 1 : null
  const lastScore = myScore?.scores?.[0]
  const playerCount = team?.jugadores?.length || 0
  const isGameweekLocked = gameweek?.cerrada

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-surface-900 dark:text-surface-50">
          {team?.nombre || (user?.nombre ? `Equipo de ${user.nombre}` : 'Tu equipo')}
        </h1>
        <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
          Bienvenido de vuelta{user?.nombre ? `, ${user.nombre}` : ''}.
        </p>
      </header>

      {/* Gameweek banner */}
      {gameweek && (
        <div
          className={`flex items-start sm:items-center gap-3 p-4 rounded-2xl border ${
            isGameweekLocked
              ? 'bg-rose-500/5 border-rose-500/20 text-rose-700 dark:text-rose-300'
              : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
          }`}
          role="status"
        >
          {isGameweekLocked
            ? <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
            : <Calendar className="h-5 w-5 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />}
          <div className="flex-1 text-sm">
            <span className="font-semibold">Jornada {gameweek.numero}</span>
            <span className="text-surface-600 dark:text-surface-400">
              {isGameweekLocked
                ? ' — Mercado cerrado. No podés hacer transferencias.'
                : ' — Mercado abierto. Podés realizar transferencias.'}
            </span>
          </div>
        </div>
      )}

      {/* Stats */}
      {loadingTeam ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Jugadores en plantilla"
            value={`${playerCount}/10`}
            sub="Máximo 10 jugadores"
          />
          <StatCard
            icon={DollarSign}
            label="Presupuesto restante"
            value={team?.presupuesto_restante != null ? fmt(team.presupuesto_restante) : '—'}
          />
          <StatCard
            icon={Trophy}
            label="Posición en el ranking"
            value={myPosition ? `#${myPosition}` : '—'}
            sub="Ranking global"
          />
          <StatCard
            icon={Calendar}
            label="Última jornada"
            value={lastScore?.total_puntos != null ? `${Number(lastScore.total_puntos).toFixed(1)} pts` : '—'}
            sub={lastScore ? `Jornada ${lastScore.numero}` : 'Sin datos'}
          />
        </div>
      )}

      {/* Budget bar */}
      {team?.presupuesto_restante != null && (
        <Card>
          <CardHeader title="Estado del presupuesto" />
          <BudgetBar
            remaining={team.presupuesto_restante}
            initial={team.presupuesto_inicial || 100_000_000}
          />
        </Card>
      )}

      {/* Score history */}
      {myScore?.scores?.length > 0 && (
        <Card>
          <CardHeader title="Puntaje por jornada" subtitle="Últimas 5 jornadas" />
          <ul className="divide-y divide-surface-200 dark:divide-surface-800">
            {myScore.scores.slice(0, 5).map((s) => (
              <li
                key={s.jornada_id}
                className="flex items-center justify-between py-2.5"
              >
                <span className="text-sm text-surface-600 dark:text-surface-400">
                  Jornada {s.numero}
                </span>
                <div className="flex items-center gap-4">
                  {s.penalizacion_puntos > 0 && (
                    <span className="text-xs text-rose-600 dark:text-rose-400">
                      −{s.penalizacion_puntos} penalización
                    </span>
                  )}
                  <span className="font-semibold tabular-nums text-surface-900 dark:text-surface-50">
                    {Number(s.total_puntos).toFixed(1)} pts
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider mb-3">
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {QUICK_ACTIONS.map(({ to, label, desc, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="group block bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-5 transition-all hover:border-surface-300 dark:hover:border-surface-700 hover:shadow-soft"
            >
              <div className="flex items-center gap-3">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 ring-1 ring-inset ring-brand-500/20">
                  <Icon className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-surface-900 dark:text-surface-50">{label}</p>
                  <p className="text-xs text-surface-500 dark:text-surface-400 truncate">{desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-surface-400 group-hover:text-surface-700 dark:group-hover:text-surface-200 transition-colors" aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
