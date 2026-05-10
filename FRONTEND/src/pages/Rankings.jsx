import { useState } from 'react'
import { Trophy, ChevronLeft, ChevronRight } from 'lucide-react'
import { useGlobalRanking } from '../hooks/useRankings'
import { useCurrentGameweek } from '../hooks/useRankings'
import { RankingTable } from '../components/rankings/RankingTable'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { PageSpinner } from '../components/ui/Spinner'

export function Rankings() {
  const [page, setPage] = useState(1)
  const limit = 20
  const { data, isLoading } = useGlobalRanking({ page, limit })
  const { data: gameweek } = useCurrentGameweek()

  const rows = data?.ranking || []
  const total = data?.pagination?.total || 0
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Ranking Global</h1>
          {gameweek && (
            <p className="text-sm text-gray-400 mt-1">Jornada {gameweek.numero} — {total} equipos</p>
          )}
        </div>
        <Trophy className="h-8 w-8 text-yellow-500" />
      </div>

      <Card>
        <CardHeader title="Tabla de posiciones" subtitle="Puntos acumulados en la temporada" />
        {isLoading ? (
          <PageSpinner />
        ) : (
          <>
            <RankingTable rows={rows} />

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 pt-6 mt-4 border-t border-gray-800">
                <Button variant="secondary" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <span className="text-sm text-gray-400">
                  {page} / {totalPages}
                </span>
                <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
