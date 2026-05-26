import { Card } from '../ui/Card'

/**
 * StatCard — métrica única con icono, etiqueta, valor y subtítulo.
 * Paleta unificada (mismo acento brand para todas), la diferenciación
 * se da por la tipografía y el icono, no por color saturado.
 */
export function StatCard({ icon: Icon, label, value, sub, hint, className = '' }) {
  return (
    <Card className={className} padding="md">
      <div className="flex items-start gap-4">
        {Icon && (
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 ring-1 ring-inset ring-brand-500/20">
            <Icon className="h-5 w-5 text-brand-600 dark:text-brand-400" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-medium text-surface-600 dark:text-surface-400 truncate">
            {label}
          </p>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-surface-900 dark:text-surface-50 tracking-tight">
            {value ?? '—'}
          </p>
          {sub && (
            <p className="mt-0.5 text-xs text-surface-500 dark:text-surface-500 truncate">
              {sub}
            </p>
          )}
          {hint && (
            <p className="mt-1 text-xs text-surface-500 dark:text-surface-500">{hint}</p>
          )}
        </div>
      </div>
    </Card>
  )
}
