import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, TrendingUp } from 'lucide-react'
import { marketApi } from '../api/market'
import { rankingsApi } from '../api/rankings'
import { Badge } from '../components/ui/Badge'
import { Card, CardHeader } from '../components/ui/Card'
import { PageSpinner } from '../components/ui/Spinner'
import { EmptyState } from '../components/ui/EmptyState'

const fmt = (n) => `$${(n / 1_000_000).toFixed(1)}M`

function StatRow({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-surface-200 dark:border-surface-800 last:border-0">
      <span className="text-sm text-surface-600 dark:text-surface-400">{label}</span>
      <span className="text-sm font-medium text-surface-900 dark:text-surface-50">{value ?? '—'}</span>
    </div>
  )
}

function InfoBlock({ label, value }) {
  if (value == null) return null
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-surface-500 dark:text-surface-500">{label}</p>
      <p className="font-medium text-surface-900 dark:text-surface-50 mt-0.5">{value}</p>
    </div>
  )
}

export function PlayerDetail() {
  const { id } = useParams()

  const { data: playerData, isLoading: loadingPlayer } = useQuery({
    queryKey: ['player', id],
    queryFn: () => marketApi.getPlayer(id),
    select: (d) => d.data,
  })

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['player-stats', id],
    queryFn: () => rankingsApi.getPlayerStats(id, { limit: 10 }),
    select: (d) => d.data,
  })

  const { data: fantasyPoints } = useQuery({
    queryKey: ['player-fantasy', id],
    queryFn: () => rankingsApi.getPlayerFantasyPoints(id),
    select: (d) => d.data,
  })

  if (loadingPlayer) return <PageSpinner label="Cargando jugador…" />
  if (!playerData) {
    return (
      <EmptyState
        title="Jugador no encontrado"
        description="No pudimos cargar los datos de este jugador."
      />
    )
  }

  const p = playerData.jugador || playerData

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Link
        to="/market"
        className="inline-flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-50 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver al mercado
      </Link>

      {/* Header */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-50 truncate">
              {p.nombre}
            </h1>
            <p className="text-surface-600 dark:text-surface-400 mt-1">
              {p.equipo_nombre || p.equipo?.nombre || 'Sin equipo'}
            </p>
            <div className="flex items-center gap-3 mt-3">
              <Badge label={p.posicion} type="position" />
              <span className="text-brand-600 dark:text-brand-400 font-bold tabular-nums">
                {fmt(p.precio)}
              </span>
            </div>
          </div>
          {fantasyPoints?.promedio_puntos != null && (
            <div className="text-right shrink-0">
              <div className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-5 w-5" aria-hidden="true" />
                <span className="text-2xl font-bold tabular-nums">
                  {Number(fantasyPoints.promedio_puntos).toFixed(1)}
                </span>
              </div>
              <p className="text-xs text-surface-500 dark:text-surface-500 mt-0.5">pts promedio</p>
            </div>
          )}
        </div>

        {(p.altura_cm || p.numero_camiseta != null || p.nacionalidad) && (
          <div className="mt-5 pt-5 border-t border-surface-200 dark:border-surface-800 grid grid-cols-3 gap-4 text-center">
            <InfoBlock label="Altura" value={p.altura_cm ? `${p.altura_cm} cm` : null} />
            <InfoBlock label="N°" value={p.numero_camiseta != null ? `#${p.numero_camiseta}` : null} />
            <InfoBlock label="Nación" value={p.nacionalidad} />
          </div>
        )}
      </Card>

      {/* Fórmula de puntaje */}
      {fantasyPoints && (
        <Card>
          <CardHeader title="Fórmula de puntaje fantasy" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            <StatRow label="Puntos" value="×1.0 por punto" />
            <StatRow label="Rebotes" value="×1.2 por rebote" />
            <StatRow label="Asistencias" value="×1.5 por asistencia" />
            <StatRow label="Robos" value="×2.0 por robo" />
            <StatRow label="Tapas" value="×2.0 por tapa" />
            <StatRow label="Triples" value="+0.5 por triple" />
            <StatRow label="Pérdidas" value="−1.0 por pérdida" />
            <StatRow label="Tiros fallados" value="−0.5 por tiro" />
          </div>
        </Card>
      )}

      {/* Estadísticas recientes */}
      <Card>
        <CardHeader title="Estadísticas recientes" subtitle="Últimos partidos" />
        {loadingStats ? (
          <PageSpinner label="Cargando estadísticas…" />
        ) : !stats?.estadisticas?.length ? (
          <p className="text-surface-500 dark:text-surface-400 text-sm text-center py-8">
            Sin estadísticas disponibles
          </p>
        ) : (
          <div className="overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-surface-500 dark:text-surface-400 uppercase tracking-wider border-b border-surface-200 dark:border-surface-800">
                  <th className="px-2 py-2 pr-4">Partido</th>
                  <th className="px-2 py-2 text-right">PTS</th>
                  <th className="px-2 py-2 text-right">REB</th>
                  <th className="px-2 py-2 text-right">AST</th>
                  <th className="px-2 py-2 text-right">ROB</th>
                  <th className="px-2 py-2 text-right">TAP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
                {stats.estadisticas.map((s, i) => (
                  <tr
                    key={i}
                    className="hover:bg-surface-100 dark:hover:bg-surface-900/60 transition-colors"
                  >
                    <td className="px-2 py-2 pr-4 text-surface-600 dark:text-surface-400 text-xs">
                      {s.partido || `Partido ${i + 1}`}
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-surface-900 dark:text-surface-50 tabular-nums">
                      {s.puntos ?? 0}
                    </td>
                    <td className="px-2 py-2 text-right text-surface-600 dark:text-surface-300 tabular-nums">{s.rebotes ?? 0}</td>
                    <td className="px-2 py-2 text-right text-surface-600 dark:text-surface-300 tabular-nums">{s.asistencias ?? 0}</td>
                    <td className="px-2 py-2 text-right text-surface-600 dark:text-surface-300 tabular-nums">{s.robos ?? 0}</td>
                    <td className="px-2 py-2 text-right text-surface-600 dark:text-surface-300 tabular-nums">{s.tapas ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
