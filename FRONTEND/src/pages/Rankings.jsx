import { useState } from 'react'
import { ChevronLeft, ChevronRight, Trophy } from 'lucide-react'
import { useGlobalRanking, useCurrentGameweek } from '../hooks/useRankings'
import { RankingTable } from '../components/rankings/RankingTable'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { SkeletonRow } from '../components/ui/Skeleton'

export function Rankings() {
  const [page, setPage] = useState(1)
  const limit = 20
  const { data, isLoading } = useGlobalRanking({ page, limit })
  const { data: gameweek } = useCurrentGameweek()

  const rows = data?.ranking || []
  const total = data?.total ?? data?.pagination?.total ?? 0
  const totalPages = data?.totalPages ?? Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-surface-900 dark:text-surface-50">
            Ranking global
          </h1>
          {gameweek && (
            <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
              Jornada {gameweek.numero} · {total.toLocaleString('es-AR')} equipos
            </p>
          )}
        </div>
        <div className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 ring-1 ring-inset ring-brand-500/20">
          <Trophy className="h-5 w-5 text-brand-600 dark:text-brand-400" aria-hidden="true" />
        </div>
      </header>

      <Card padding="md">
        <CardHeader title="Tabla de posiciones" subtitle="Puntos acumulados en la temporada" />

        {isLoading ? (
          <div className="space-y-1">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={4} />)}
          </div>
        ) : (
          <RankingTable rows={rows} />
        )}

        {!isLoading && totalPages > 1 && (
          <nav
            className="flex items-center justify-center gap-3 pt-5 mt-4 border-t border-surface-200 dark:border-surface-800"
            aria-label="Paginación del ranking"
          >
            <Button
              variant="outline"
              size="sm"
              iconLeft={ChevronLeft}
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1}
            >
              Anterior
            </Button>
            <span className="text-sm text-surface-600 dark:text-surface-400 tabular-nums">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              iconRight={ChevronRight}
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
            >
              Siguiente
            </Button>
          </nav>
        )}
      </Card>
    </div>
  )
}
