import { useState, useEffect } from 'react'
import { Users, AlertTriangle, Save } from 'lucide-react'
import toast from 'react-hot-toast'

const MAX_STARTERS = 5
const MAX_BENCH = 5
import { useTeam, useUpdateLineup, useTransfers } from '../hooks/useTeam'
import { useCurrentGameweek } from '../hooks/useRankings'
import { LineupGrid } from '../components/team/LineupGrid'
import { BudgetBar } from '../components/market/BudgetBar'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PageSpinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { Link } from 'react-router-dom'

export function MyTeam() {
  const { data: team, isLoading } = useTeam()
  const { data: gameweek } = useCurrentGameweek()
  const { data: transfers } = useTransfers()
  const updateLineup = useUpdateLineup()

  const [players, setPlayers] = useState([])
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (team?.jugadores) {
      setPlayers(team.jugadores)
      setDirty(false)
    }
  }, [team])

  const isLocked = gameweek?.cerrada

  const penalizedTransfers = (transfers || []).filter(
    (t) => t.es_penalizada && t.jornada_id === gameweek?.id
  ).length

  const handleToggleStarter = (jugadorId) => {
    const player = players.find((p) => (p.jugador_id || p.id) === jugadorId)
    if (!player) return

    const currentStarters = players.filter((p) => p.es_titular).length
    const currentBench = players.filter((p) => !p.es_titular).length

    if (!player.es_titular && currentStarters >= MAX_STARTERS) {
      toast.error(`Ya tenés ${MAX_STARTERS} titulares. Pasá uno a suplente primero.`)
      return
    }
    if (player.es_titular && currentBench >= MAX_BENCH) {
      toast.error(`Ya tenés ${MAX_BENCH} suplentes. Vendé un jugador primero.`)
      return
    }

    setPlayers((prev) =>
      prev.map((p) => {
        if ((p.jugador_id || p.id) !== jugadorId) return p
        const newTitular = !p.es_titular
        return { ...p, es_titular: newTitular, es_capitan: newTitular ? p.es_capitan : false }
      })
    )
    setDirty(true)
  }

  const handleSetCaptain = (jugadorId) => {
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        es_capitan: (p.jugador_id || p.id) === jugadorId && p.es_titular ? !p.es_capitan : false,
      }))
    )
    setDirty(true)
  }

  const handleSave = () => {
    const jugadores = players.map((p) => ({
      jugadorId: p.jugador_id || p.id,
      esTitular: p.es_titular,
      esCapitan: p.es_capitan,
    }))
    updateLineup.mutate(jugadores, { onSuccess: () => setDirty(false) })
  }

  if (isLoading) return <PageSpinner />

  const starters = players.filter((p) => p.es_titular).length
  const bench = players.filter((p) => !p.es_titular).length

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{team?.nombre || 'Mi Equipo'}</h1>
          <p className="text-gray-400 text-sm mt-1">
            {players.length}/10 jugadores · <span className={starters >= MAX_STARTERS ? 'text-yellow-400' : ''}>{starters}/5 titulares</span> · <span className={bench >= MAX_BENCH ? 'text-yellow-400' : ''}>{bench}/5 suplentes</span>
          </p>
        </div>
        {dirty && !isLocked && (
          <Button onClick={handleSave} loading={updateLineup.isPending} variant="primary">
            <Save className="h-4 w-4" />
            Guardar cambios
          </Button>
        )}
      </div>

      {/* Transfer warning */}
      {penalizedTransfers > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-900/20 border border-yellow-800 text-yellow-300 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>
            Tenés <strong>{penalizedTransfers}</strong> transferencia(s) penalizada(s) esta jornada.
            Se descontarán <strong>{penalizedTransfers * 20} puntos</strong> al cierre.
          </span>
        </div>
      )}

      {/* Locked */}
      {isLocked && (
        <div className="p-4 rounded-xl bg-red-900/20 border border-red-800 text-red-300 text-sm">
          🔒 La jornada está cerrada. No podés hacer cambios hasta la próxima jornada.
        </div>
      )}

      {/* Budget */}
      {team?.presupuesto_restante != null && (
        <Card>
          <BudgetBar remaining={team.presupuesto_restante} initial={team.presupuesto_inicial || 100_000_000} />
        </Card>
      )}

      {/* Rules reminder */}
      <div className="grid grid-cols-3 gap-3 text-center text-xs text-gray-500">
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
          <div className="text-lg mb-1">👑</div>
          Capitán = ×2 puntos
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
          <div className="text-lg mb-1">⭐</div>
          Titular = ×1 · Suplente = ×0.5
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-3">
          <div className="text-lg mb-1">🔄</div>
          1 transferencia gratis por jornada
        </div>
      </div>

      {/* Roster */}
      {players.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Tu equipo está vacío"
          description="Comprá jugadores en el mercado para comenzar"
          action={<Link to="/market"><Button variant="primary">Ir al mercado</Button></Link>}
        />
      ) : (
        <Card>
          <CardHeader title="Plantilla" />
          <LineupGrid
            players={players}
            onToggleStarter={handleToggleStarter}
            onSetCaptain={handleSetCaptain}
            marketLocked={isLocked}
          />
        </Card>
      )}
    </div>
  )
}
