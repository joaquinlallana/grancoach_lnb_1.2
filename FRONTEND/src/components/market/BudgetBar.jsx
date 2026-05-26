const fmt = (n) => `$${(n / 1_000_000).toFixed(1)}M`

export function BudgetBar({ remaining, initial = 100_000_000 }) {
  const pct = Math.max(0, Math.min(100, (remaining / initial) * 100))

  const barCls =
    pct > 50 ? 'bg-emerald-500' :
    pct > 20 ? 'bg-amber-500' :
    'bg-rose-500'

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-xs sm:text-sm text-surface-600 dark:text-surface-400">
          Presupuesto restante
        </span>
        <span className="font-semibold tabular-nums text-surface-900 dark:text-surface-50">
          {fmt(remaining)}
        </span>
      </div>
      <div
        className="h-2 bg-surface-200 dark:bg-surface-800 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Porcentaje de presupuesto restante"
      >
        <div
          className={`h-full ${barCls} rounded-full transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-surface-500 dark:text-surface-500 tabular-nums">
        {pct.toFixed(0)}% del presupuesto inicial ({fmt(initial)})
      </p>
    </div>
  )
}
