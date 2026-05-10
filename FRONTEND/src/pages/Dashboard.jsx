import { Link } from 'react-router-dom'
import { Trophy, Users, DollarSign, Calendar, AlertTriangle } from 'lucide-react'
import { useTeam } from '../hooks/useTeam'
import { useMyScore, useCurrentGameweek } from '../hooks/useRankings'
import { useGlobalRanking } from '../hooks/useRankings'
import { useAuth } from '../hooks/useAuth'
import { Card, CardHeader } from '../components/ui/Card'
import { BudgetBar } from '../components/market/BudgetBar'
import { PageSpinner } from '../components/ui/Spinner'
import { Button } from '../components/ui/Button'

const fmt = (n) => `$${(n / 1_000_000).toFixed(1)}M`

function StatCard({ icon: Icon, label, value, sub, color = 'brand' }) {
  const colors = {
    brand:  'bg-brand-900/30 text-brand-400',
    green:  'bg-green-900/30 text-green-400',
    yellow: 'bg-yellow-900/30 text-yellow-400',
    purple: 'bg-purple-900/30 text-purple-400',
  }
  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${colors[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-white mt-0.5">{value ?? '—'}</p>
          {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
      </div>
    </Card>
  )
}

export function Dashboard() {
  const { user } = useAuth()
  const { data: team, isLoading: loadingTeam } = useTeam()
  const { data: myScore } = useMyScore()
  const { data: gameweek } = useCurrentGameweek()
  const { data: ranking } = useGlobalRanking({ limit: 100 })

  if (loadingTeam) return <PageSpinner />

  // Find user rank in global ranking
  const myRank = ranking?.ranking?.findIndex((r) => r.email === user?.email)
  const myPosition = myRank != null && myRank >= 0 ? myRank + 1 : null

  // Last gameweek score
  const lastScore = myScore?.scores?.[0]

  const playerCount = team?.jugadores?.length || 0
  const isGameweekLocked = gameweek?.cerrada

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          {team?.nombre || `Equipo de ${user?.nombre}`}
        </h1>
        <p className="text-gray-400 mt-1">Bienvenido de vuelta, {user?.nombre}</p>
      </div>

      {/* Gameweek banner */}
      {gameweek && (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${
          isGameweekLocked
            ? 'bg-red-900/20 border-red-800 text-red-300'
            : 'bg-brand-900/20 border-brand-800 text-brand-300'
        }`}>
          <Calendar className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold">Jornada {gameweek.numero}</span>
            {isGameweekLocked
              ? ' — Mercado CERRADO. No podés hacer transferencias.'
              : ' — Mercado ABIERTO. Podés realizar transferencias.'}
          </div>
          {isGameweekLocked && <AlertTriangle className="h-5 w-5 shrink-0" />}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Jugadores en plantilla"
          value={`${playerCount}/10`}
          sub="Máximo 10 jugadores"
          color="brand"
        />
        <StatCard
          icon={DollarSign}
          label="Presupuesto restante"
          value={team?.presupuesto_restante != null ? fmt(team.presupuesto_restante) : '—'}
          color="green"
        />
        <StatCard
          icon={Trophy}
          label="Posición en el ranking"
          value={myPosition ? `#${myPosition}` : '—'}
          sub="Ranking global"
          color="yellow"
        />
        <StatCard
          icon={Calendar}
          label="Última jornada"
          value={lastScore?.total_puntos != null ? `${Number(lastScore.total_puntos).toFixed(1)} pts` : '—'}
          sub={lastScore ? `Jornada ${lastScore.numero}` : 'Sin datos'}
          color="purple"
        />
      </div>

      {/* Budget bar */}
      {team?.presupuesto_restante != null && (
        <Card>
          <CardHeader title="Estado del presupuesto" />
          <BudgetBar remaining={team.presupuesto_restante} initial={team.presupuesto_inicial || 100_000_000} />
        </Card>
      )}

      {/* Score history */}
      {myScore?.scores?.length > 0 && (
        <Card>
          <CardHeader title="Puntaje por jornada" />
          <div className="space-y-2">
            {myScore.scores.slice(0, 5).map((s) => (
              <div key={s.jornada_id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <span className="text-sm text-gray-400">Jornada {s.numero}</span>
                <div className="flex items-center gap-4">
                  {s.penalizacion_puntos > 0 && (
                    <span className="text-xs text-red-400">-{s.penalizacion_puntos} penalización</span>
                  )}
                  <span className="font-bold text-white">{Number(s.total_puntos).toFixed(1)} pts</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/market">
          <Card className="hover:border-gray-700 transition-colors cursor-pointer text-center">
            <div className="text-3xl mb-2">🛒</div>
            <p className="font-semibold text-white">Mercado</p>
            <p className="text-xs text-gray-500 mt-1">Comprá jugadores</p>
          </Card>
        </Link>
        <Link to="/my-team">
          <Card className="hover:border-gray-700 transition-colors cursor-pointer text-center">
            <div className="text-3xl mb-2">👥</div>
            <p className="font-semibold text-white">Mi Equipo</p>
            <p className="text-xs text-gray-500 mt-1">Gestioná tu plantilla</p>
          </Card>
        </Link>
        <Link to="/rankings">
          <Card className="hover:border-gray-700 transition-colors cursor-pointer text-center">
            <div className="text-3xl mb-2">🏆</div>
            <p className="font-semibold text-white">Ranking</p>
            <p className="text-xs text-gray-500 mt-1">Ver la tabla</p>
          </Card>
        </Link>
      </div>
    </div>
  )
}
