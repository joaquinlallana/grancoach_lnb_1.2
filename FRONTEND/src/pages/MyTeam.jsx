import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Users, Save, AlertTriangle, Crown, Star, RefreshCw, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTeam, useUpdateLineup, useTransfers } from '../hooks/useTeam'
import { useSellPlayer } from '../hooks/useMarket'
import { useCurrentGameweek } from '../hooks/useRankings'
import { CourtView } from '../components/team/CourtView'
import { BudgetBar } from '../components/market/BudgetBar'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PageSpinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'

const MAX_STARTERS = 5
const MAX_BENCH = 5
const PERIMETRALES = ['base', 'escolta', 'alero']
const INTERNOS = ['ala-pivot', 'pivot']

function normalizeLineup(jugadores) {
  const posTomadas = new Set()
  let nTitulares = 0
  const cambios = []
  const normalizados = jugadores.map((p) => {
    if (p.es_titular) {
      if (nTitulares < MAX_STARTERS && !posTomadas.has(p.posicion)) {
        posTomadas.add(p.posicion)
        nTitulares++
        return p
      }
      cambios.push(p.nombre)
      return { ...p, es_titular: false, es_capitan: false }
    }
    return p
  })
  return { normalizados, cambios }
}

function validarLineup(players) {
  const titulares = players.filter((p) => p.es_titular)
  const suplentes = players.filter((p) => !p.es_titular)
  if (players.length !== 10) return null
  const errores = []

  for (const pos of ['base', 'escolta', 'alero', 'ala-pivot', 'pivot']) {
    const count = titulares.filter((p) => p.posicion === pos).length
    if (count !== 1) {
      const label = pos.charAt(0).toUpperCase() + pos.slice(1)
      errores.push(`Necesitás exactamente 1 ${label} titular (tenés ${count})`)
    }
  }

  const perim = suplentes.filter((p) => PERIMETRALES.includes(p.posicion)).length
  const inter = suplentes.filter((p) => INTERNOS.includes(p.posicion)).length
  if (perim < 2) errores.push(`El banco necesita al menos 2 perimetrales (tenés ${perim})`)
  if (inter < 2) errores.push(`El banco necesita al menos 2 internos (tenés ${inter})`)

  return errores.length > 0 ? errores : null
}

const RULES = [
  { icon: Crown,    title: 'Capitán × 2',          desc: 'Su puntaje se duplica' },
  { icon: Star,     title: 'Titular × 1',          desc: 'Suplente × 0,5' },
  { icon: RefreshCw, title: '2 transferencias',     desc: 'Gratis por jornada' },
]

export function MyTeam() {
  const { data: team, isLoading } = useTeam()
  const { data: gameweek } = useCurrentGameweek()
  const { data: transfers } = useTransfers()
  const updateLineup = useUpdateLineup()
  const sellPlayer = useSellPlayer()

  const [players, setPlayers] = useState([])
  const [dirty, setDirty] = useState(false)
  const dirtyRef = useRef(false)

  const markDirty = (val) => {
    dirtyRef.current = val
    setDirty(val)
  }

  useEffect(() => {
    if (team?.jugadores && !dirtyRef.current) {
      const { normalizados, cambios } = normalizeLineup(team.jugadores)
      setPlayers(normalizados)
      if (cambios.length > 0) {
        toast(
          `Movimos ${cambios.length} jugador(es) al banco para respetar el reglamento. Guardá los cambios.`,
          { duration: 5000 }
        )
        markDirty(true)
      }
    }
  }, [team])

  const isLocked = gameweek?.cerrada
  const penalizedTransfers = (transfers || []).filter(
    (t) => t.es_penalizada && t.jornada_id === gameweek?.id
  ).length

  const handleToggleStarter = (jugadorId) => {
    if (isLocked) return
    const player = players.find((p) => (p.jugador_id || p.id) === jugadorId)
    if (!player) return

    const starters = players.filter((p) => p.es_titular)
    const bench    = players.filter((p) => !p.es_titular)

    if (!player.es_titular) {
      if (starters.length >= MAX_STARTERS) {
        toast.error(`Ya tenés ${MAX_STARTERS} titulares. Pasá uno a suplente primero.`)
        return
      }
      const conflicto = starters.find((s) => s.posicion === player.posicion)
      if (conflicto) {
        const label = player.posicion.charAt(0).toUpperCase() + player.posicion.slice(1)
        toast.error(`Ya tenés un ${label} de titular (${conflicto.nombre}). Primero pasalo a suplente.`)
        return
      }
    } else {
      if (bench.length >= MAX_BENCH) {
        toast.error(`Ya tenés ${MAX_BENCH} suplentes. Vendé un jugador primero.`)
        return
      }
    }

    setPlayers((prev) =>
      prev.map((p) => {
        if ((p.jugador_id || p.id) !== jugadorId) return p
        const newTitular = !p.es_titular
        return { ...p, es_titular: newTitular, es_capitan: newTitular ? p.es_capitan : false }
      })
    )
    markDirty(true)
  }

  const handleSwapPlayers = (idA, idB) => {
    if (isLocked) return
    setPlayers((prev) =>
      prev.map((p) => {
        const id = p.jugador_id || p.id
        if (id === idA || id === idB) {
          const newTitular = !p.es_titular
          return { ...p, es_titular: newTitular, es_capitan: newTitular ? p.es_capitan : false }
        }
        return p
      })
    )
    markDirty(true)
  }

  const handleSellPlayer = (jugadorId, nombre) => {
    if (isLocked) return
    const ok = window.confirm(`¿Vender a ${nombre}? Se devolverá su precio al presupuesto.`)
    if (!ok) return
    sellPlayer.mutate(jugadorId)
  }

  const handleSetCaptain = (jugadorId) => {
    if (isLocked) return
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        es_capitan: (p.jugador_id || p.id) === jugadorId && p.es_titular ? !p.es_capitan : false,
      }))
    )
    markDirty(true)
  }

  const handleSave = () => {
    if (players.length === 10) {
      const errores = validarLineup(players)
      if (errores) {
        errores.forEach((e) => toast.error(e, { duration: 4000 }))
        return
      }
    }
    const jugadores = players.map((p) => ({
      jugadorId: p.jugador_id || p.id,
      esTitular: p.es_titular,
      esCapitan: p.es_capitan,
    }))
    updateLineup.mutate(jugadores, { onSuccess: () => markDirty(false) })
  }

  if (isLoading) return <PageSpinner label="Cargando tu equipo…" />

  const numStarters = players.filter((p) => p.es_titular).length
  const numBench    = players.filter((p) => !p.es_titular).length
  const lineupErrors = players.length === 10 ? validarLineup(players) : null

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-surface-900 dark:text-surface-50">
            {team?.nombre || 'Mi equipo'}
          </h1>
          <p className="text-sm text-surface-600 dark:text-surface-400 mt-1 tabular-nums">
            {players.length}/10 jugadores ·{' '}
            <span className={numStarters >= MAX_STARTERS ? 'text-amber-600 dark:text-amber-400' : ''}>
              {numStarters}/5 titulares
            </span>{' '}·{' '}
            <span className={numBench >= MAX_BENCH ? 'text-amber-600 dark:text-amber-400' : ''}>
              {numBench}/5 suplentes
            </span>
          </p>
        </div>
        {dirty && !isLocked && (
          <Button
            onClick={handleSave}
            loading={updateLineup.isPending}
            variant="primary"
            iconLeft={Save}
            disabled={players.length === 10 && !!lineupErrors}
          >
            Guardar cambios
          </Button>
        )}
      </header>

      {penalizedTransfers > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            Tenés <strong>{penalizedTransfers}</strong> transferencia(s) penalizada(s) esta jornada.
            Se descontarán <strong>{penalizedTransfers * 20} puntos</strong> al cierre.
          </span>
        </div>
      )}

      {isLocked && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-sm">
          <Lock className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
          <span>La jornada está cerrada. No podés hacer cambios hasta la próxima.</span>
        </div>
      )}

      {team?.presupuesto_restante != null && (
        <Card>
          <BudgetBar remaining={team.presupuesto_restante} initial={team.presupuesto_inicial || 100_000_000} />
        </Card>
      )}

      {/* Reglas */}
      <div className="grid grid-cols-3 gap-3">
        {RULES.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-3 text-center"
          >
            <Icon className="h-4 w-4 mx-auto mb-1 text-brand-600 dark:text-brand-400" aria-hidden="true" />
            <p className="text-xs font-semibold text-surface-900 dark:text-surface-100">{title}</p>
            <p className="text-[11px] text-surface-500 dark:text-surface-400 mt-0.5">{desc}</p>
          </div>
        ))}
      </div>

      {/* Roster */}
      {players.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Tu equipo está vacío"
          description="Comprá jugadores en el mercado para armar tu plantel."
          action={
            <Link to="/market">
              <Button variant="primary">Ir al mercado</Button>
            </Link>
          }
        />
      ) : (
        <Card padding="md">
          <CourtView
            players={players}
            onToggleStarter={handleToggleStarter}
            onSetCaptain={handleSetCaptain}
            onSwapPlayers={handleSwapPlayers}
            onSell={handleSellPlayer}
            marketLocked={isLocked}
            lineupErrors={lineupErrors}
            dirty={dirty}
          />
        </Card>
      )}
    </div>
  )
}
