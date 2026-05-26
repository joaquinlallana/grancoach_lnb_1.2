export function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-14 sm:py-16 text-center px-4 ${className}`}>
      {Icon && (
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-100 dark:bg-surface-800/60 mb-4">
          <Icon className="h-6 w-6 text-surface-500 dark:text-surface-400" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-surface-500 dark:text-surface-400 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
