import { useState } from 'react'
import { ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react'
import { usePlayers, useMarketStatus } from '../hooks/useMarket'
import { useTeam } from '../hooks/useTeam'
import { PlayerCard } from '../components/market/PlayerCard'
import { PlayerFilters } from '../components/market/PlayerFilters'
import { BudgetBar } from '../components/market/BudgetBar'
import { Card, CardHeader } from '../components/ui/Card'
import { PageSpinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'
import { Button } from '../components/ui/Button'

export function Market() {
  const [filters, setFilters] = useState({ page: 1, limit: 20 })
  const { data: playersData, isLoading } = usePlayers(filters)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Mercado de Jugadores</h1>
          {marketStatus && (
            <p className={`text-sm mt-1 ${isLocked ? 'text-red-400' : 'text-green-400'}`}>
              Mercado {marketStatus.estado}
            </p>
          )}
        </div>
      </div>

      {/* Budget */}
      {team && (
        <Card>
          <BudgetBar remaining={budget} initial={team.presupuesto_inicial || 100_000_000} />
        </Card>
      )}

      {/* Locked warning */}
      {isLocked && (
        <div className="p-4 rounded-xl bg-red-900/20 border border-red-800 text-red-300 text-sm">
          ⚠️ El mercado está cerrado durante la jornada activa. No podés realizar transferencias hasta que termine.
        </div>
      )}

      {/* Filters */}
      <PlayerFilters filters={filters} onChange={setFilters} />

      {/* Grid */}
      {isLoading ? (
        <PageSpinner />
      ) : players.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No se encontraron jugadores"
          description="Probá con otros filtros de búsqueda"
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

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => goTo(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <span className="text-sm text-gray-400">
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => goTo(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
