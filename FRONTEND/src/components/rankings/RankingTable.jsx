import { useAuth } from '../../hooks/useAuth'

const fmt = (n) => `$${(n / 1_000_000).toFixed(1)}M`

function Medal({ pos }) {
  if (pos === 1) return <span title="1°">🥇</span>
  if (pos === 2) return <span title="2°">🥈</span>
  if (pos === 3) return <span title="3°">🥉</span>
  return <span className="text-gray-500 text-sm">{pos}</span>
}

export function RankingTable({ rows = [] }) {
  const { user } = useAuth()

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-800">
            <th className="pb-3 pr-4">#</th>
            <th className="pb-3 pr-4">Equipo</th>
            <th className="pb-3 pr-4">Usuario</th>
            <th className="pb-3 pr-4 text-right">Puntos</th>
            <th className="pb-3 text-right">Presupuesto</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {rows.map((row) => {
            const isMe = row.email === user?.email
            return (
              <tr
                key={row.equipo_id || row.id}
                className={`transition-colors ${isMe ? 'bg-brand-900/20' : 'hover:bg-gray-900'}`}
              >
                <td className="py-3 pr-4">
                  <Medal pos={row.posicion || row.rank} />
                </td>
                <td className="py-3 pr-4">
                  <span className={`font-medium ${isMe ? 'text-brand-400' : 'text-white'}`}>
                    {row.nombre_equipo}
                  </span>
                  {isMe && <span className="ml-2 text-xs text-brand-500">(tú)</span>}
                </td>
                <td className="py-3 pr-4 text-gray-400">{row.nombre_usuario}</td>
                <td className="py-3 pr-4 text-right font-bold text-white">
                  {Number(row.total_puntos || 0).toFixed(1)}
                </td>
                <td className="py-3 text-right text-gray-400">
                  {row.presupuesto_restante != null ? fmt(row.presupuesto_restante) : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
