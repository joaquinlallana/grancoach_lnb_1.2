export function Spinner({ size = 'md', className = '' }) {
  const sizes = { xs: 'h-3 w-3', sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-10 w-10' }
  return (
    <svg
      className={`animate-spin text-brand-500 ${sizes[size] || sizes.md} ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label="Cargando"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export function PageSpinner({ label = 'Cargando…' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-64 gap-3" role="status" aria-live="polite">
      <Spinner size="lg" />
      <p className="text-sm text-surface-500 dark:text-surface-400">{label}</p>
    </div>
  )
}
