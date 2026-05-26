import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ShoppingBag, Lock } from 'lucide-react'
import { usePlayers, useMarketStatus } from '../hooks/useMarket'
import { useTeam } from '../hooks/useTeam'
import { PlayerCard } from '../components/market/PlayerCard'
import { PlayerFilters } from '../components/market/PlayerFilters'
import { BudgetBar } from '../components/market/BudgetBar'
import { Card } from '../components/ui/Card'
import { SkeletonCard } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

export function Market() {
  const [searchParams] = useSearchParams()
  const initialPosicion = searchParams.get('posicion') || undefined
  const [filters, setFilters] = useState({ page: 1, limit: 20, posicion: initialPosicion })
  const { data: playersData, isLoading, isFetching } = usePlayers(filters)
  const { data: marketStatus } = useMarketStatus()
  const { data: team } = useTeam()

  const players = playersData?.jugadores || []
  const pagination = playersData?.pagination || {}
  const ownedIds = new Set((team?.jugadores || []).map((j) => j.jugador_id || j.id))
  const budget = team?.presupuesto_restante ?? 0
  const isLocked = marketStatus?.estado === 'CERRADO'

  const goTo = (page) => setFilters((f) => ({ ...f, page }))

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-surface-900 dark:text-surface-50">
            Mercado de jugadores
          </h1>
          {marketStatus && (
            <div className="mt-2 flex items-center gap-2">
              <Badge label={marketStatus.estado} type="status" />
              <span className="text-xs text-surface-500 dark:text-surface-400">
                {isLocked ? 'Sin transferencias hasta el cierre' : 'Transferencias habilitadas'}
              </span>
            </div>
          )}
        </div>
      </header>

      {team && (
        <Card>
          <BudgetBar remaining={budget} initial={team.presupuesto_inicial || 100_000_000} />
        </Card>
      )}

      {isLocked && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-sm">
          <Lock className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            El mercado está cerrado durante la jornada activa.
            No podés realizar transferencias hasta que termine.
          </p>
        </div>
      )}

      <PlayerFilters filters={filters} onChange={setFilters} />

      {isLoading ? (
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${isFetching ? 'opacity-90' : ''}`}
        >
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : players.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Sin resultados"
          description="No encontramos jugadores con esos filtros. Probá ajustar la búsqueda."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {players.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                owned={ownedIds.has(p.id)}
                budget={budget}
                marketLocked={isLocked}
              />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <nav
              className="flex items-center justify-center gap-3 pt-2"
              aria-label="Paginación del mercado"
            >
              <Button
                variant="outline"
                size="sm"
                iconLeft={ChevronLeft}
                onClick={() => goTo(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                Anterior
              </Button>
              <span className="text-sm text-surface-600 dark:text-surface-400 tabular-nums">
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                iconRight={ChevronRight}
                onClick={() => goTo(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                Siguiente
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  )
}
