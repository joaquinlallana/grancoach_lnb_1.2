export function BudgetBar({ remaining, initial = 100_000_000 }) {
  const pct = Math.max(0, Math.min(100, (remaining / initial) * 100))
  const fmt = (n) => `$${(n / 1_000_000).toFixed(1)}M`

  const color =
    pct > 50 ? 'bg-green-500' :
    pct > 20 ? 'bg-yellow-500' :
    'bg-red-500'

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400">
        <span>Presupuesto restante</span>
        <span className="font-medium text-white">{fmt(remaining)}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-500">{pct.toFixed(0)}% del presupuesto inicial ({fmt(initial)})</p>
    </div>
  )
}
