import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, TrendingUp } from 'lucide-react'
import { marketApi } from '../api/market'
import { rankingsApi } from '../api/rankings'
import { Badge } from '../components/ui/Badge'
import { Card, CardHeader } from '../components/ui/Card'
import { PageSpinner } from '../components/ui/Spinner'

const fmt = (n) => `$${(n / 1_000_000).toFixed(1)}M`

function StatRow({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-800 last:border-0">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm font-medium text-white">{value ?? '—'}</span>
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

  if (loadingPlayer) return <PageSpinner />
  if (!playerData) return <div className="text-gray-400 py-16 text-center">Jugador no encontrado</div>

  const p = playerData.jugador || playerData

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Link to="/market" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Volver al mercado
      </Link>

      {/* Header */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">{p.nombre}</h1>
            <p className="text-gray-400 mt-1">{p.equipo_nombre || p.equipo?.nombre || 'Sin equipo'}</p>
            <div className="flex items-center gap-3 mt-3">
              <Badge label={p.posicion} />
              <span className="text-brand-400 font-bold text-lg">{fmt(p.precio)}</span>
            </div>
          </div>
          {fantasyPoints?.promedio_puntos != null && (
            <div className="text-center">
              <div className="flex items-center gap-1.5 text-green-400">
                <TrendingUp className="h-5 w-5" />
                <span className="text-2xl font-bold">{Number(fantasyPoints.promedio_puntos).toFixed(1)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">pts promedio</p>
            </div>
          )}
        </div>

        {p.altura_cm && (
          <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-3 gap-4 text-center">
            {p.altura_cm && <div><p className="text-xs text-gray-500">Altura</p><p className="font-medium text-white">{p.altura_cm} cm</p></div>}
            {p.numero_camiseta != null && <div><p className="text-xs text-gray-500">N°</p><p className="font-medium text-white">#{p.numero_camiseta}</p></div>}
            {p.nacionalidad && <div><p className="text-xs text-gray-500">Nación</p><p className="font-medium text-white">{p.nacionalidad}</p></div>}
          </div>
        )}
      </Card>

      {/* Fantasy points breakdown */}
      {fantasyPoints && (
        <Card>
          <CardHeader title="Fórmula de puntaje fantasy" />
          <div className="grid grid-cols-2 gap-x-8">
            <StatRow label="Puntos" value={`×1.0 por punto`} />
            <StatRow label="Rebotes" value={`×1.2 por rebote`} />
            <StatRow label="Asistencias" value={`×1.5 por asistencia`} />
            <StatRow label="Robos" value={`×2.0 por robo`} />
            <StatRow label="Tapas" value={`×2.0 por tapa`} />
            <StatRow label="Triples" value={`+0.5 por triple`} />
            <StatRow label="Pérdidas" value={`−1.0 por pérdida`} />
            <StatRow label="Tiros fallados" value={`−0.5 por tiro`} />
          </div>
        </Card>
      )}

      {/* Recent stats */}
      <Card>
        <CardHeader title="Estadísticas recientes" subtitle="Últimos partidos" />
        {loadingStats ? (
          <PageSpinner />
        ) : !stats?.estadisticas?.length ? (
          <p className="text-gray-500 text-sm text-center py-8">Sin estadísticas disponibles</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-800">
                  <th className="pb-2 pr-4">Partido</th>
                  <th className="pb-2 pr-3 text-right">PTS</th>
                  <th className="pb-2 pr-3 text-right">REB</th>
                  <th className="pb-2 pr-3 text-right">AST</th>
                  <th className="pb-2 pr-3 text-right">ROB</th>
                  <th className="pb-2 text-right">TAP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {stats.estadisticas.map((s, i) => (
                  <tr key={i} className="hover:bg-gray-900">
                    <td className="py-2 pr-4 text-gray-400 text-xs">{s.partido || `Partido ${i + 1}`}</td>
                    <td className="py-2 pr-3 text-right font-medium text-white">{s.puntos ?? 0}</td>
                    <td className="py-2 pr-3 text-right text-gray-300">{s.rebotes ?? 0}</td>
                    <td className="py-2 pr-3 text-right text-gray-300">{s.asistencias ?? 0}</td>
                    <td className="py-2 pr-3 text-right text-gray-300">{s.robos ?? 0}</td>
                    <td className="py-2 text-right text-gray-300">{s.tapas ?? 0}</td>
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
