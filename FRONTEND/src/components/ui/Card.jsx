const PADDING = {
  none: '',
  sm:   'p-4',
  md:   'p-5 sm:p-6',
  lg:   'p-6 sm:p-8',
}

export function Card({ children, className = '', padding = 'md', hover = false, as: Tag = 'div', ...props }) {
  const base = 'bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl'
  const hoverCls = hover ? 'transition-colors duration-150 hover:border-surface-300 dark:hover:border-surface-700' : ''
  return (
    <Tag className={`${base} ${PADDING[padding] || PADDING.md} ${hoverCls} ${className}`} {...props}>
      {children}
    </Tag>
  )
}

export function CardHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-start justify-between gap-4 mb-4 ${className}`}>
      <div className="min-w-0">
        <h2 className="text-base sm:text-lg font-semibold text-surface-900 dark:text-surface-50 tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
