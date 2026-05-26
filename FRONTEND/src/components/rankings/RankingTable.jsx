import { useAuth } from '../../hooks/useAuth'

const fmt = (n) => `$${(n / 1_000_000).toFixed(1)}M`

function RankCell({ pos }) {
  // Top 3 con fondo dorado sutil — sin emojis. El resto con número plano.
  const isTop3 = pos >= 1 && pos <= 3
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold tabular-nums ${
        isTop3
          ? 'bg-brand-500/15 ring-1 ring-inset ring-brand-500/30 text-brand-700 dark:text-brand-300'
          : 'text-surface-500 dark:text-surface-400'
      }`}
      aria-label={`Posición ${pos}`}
    >
      {pos}
    </span>
  )
}

export function RankingTable({ rows = [] }) {
  const { user } = useAuth()

  return (
    <div className="overflow-x-auto -mx-2 sm:mx-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wider border-b border-surface-200 dark:border-surface-800">
            <th className="px-2 sm:px-3 py-3 w-12">#</th>
            <th className="px-2 sm:px-3 py-3">Equipo</th>
            <th className="px-2 sm:px-3 py-3 hidden sm:table-cell">Usuario</th>
            <th className="px-2 sm:px-3 py-3 text-right">Puntos</th>
            <th className="px-2 sm:px-3 py-3 text-right hidden md:table-cell">Presupuesto</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-200 dark:divide-surface-800">
          {rows.map((row) => {
            const pos = row.posicion || row.rank
            const isMe = row.email === user?.email
            return (
              <tr
                key={row.equipo_id || row.id}
                className={`group transition-colors ${
                  isMe
                    ? 'bg-brand-500/5 hover:bg-brand-500/10 border-l-2 border-l-brand-500'
                    : 'hover:bg-surface-100 dark:hover:bg-surface-900/60'
                }`}
              >
                <td className="px-2 sm:px-3 py-3">
                  <RankCell pos={pos} />
                </td>
                <td className="px-2 sm:px-3 py-3">
                  <span className={`font-medium ${isMe ? 'text-brand-700 dark:text-brand-300' : 'text-surface-900 dark:text-surface-50'}`}>
                    {row.equipo_nombre || row.nombre_equipo}
                  </span>
                  {isMe && (
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-brand-600 dark:text-brand-400 font-semibold">
                      Tú
                    </span>
                  )}
                </td>
                <td className="px-2 sm:px-3 py-3 text-surface-600 dark:text-surface-400 hidden sm:table-cell">
                  {row.usuario || row.nombre_usuario}
                </td>
                <td className="px-2 sm:px-3 py-3 text-right font-bold tabular-nums text-surface-900 dark:text-surface-50">
                  {Number(row.puntos_totales ?? row.total_puntos ?? 0).toFixed(1)}
                </td>
                <td className="px-2 sm:px-3 py-3 text-right text-surface-500 dark:text-surface-400 tabular-nums hidden md:table-cell">
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
