import { forwardRef } from 'react'

const SIZES = {
  sm: 'px-3 py-1.5 text-sm rounded-md',
  md: 'px-3.5 py-2 text-sm rounded-lg',
  lg: 'px-4 py-2.5 text-base rounded-lg',
}

export const Input = forwardRef(function Input(
  { size = 'md', invalid = false, iconLeft: IconLeft, iconRight: IconRight, className = '', ...props },
  ref,
) {
  const base = 'block w-full bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 border outline-none transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed'
  const borderCls = invalid
    ? 'border-rose-500 dark:border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/30'
    : 'border-surface-300 dark:border-surface-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30'

  const withIcons = IconLeft || IconRight
  if (!withIcons) {
    return <input ref={ref} className={`${base} ${borderCls} ${SIZES[size]} ${className}`} {...props} />
  }

  return (
    <div className="relative">
      {IconLeft && (
        <IconLeft className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 dark:text-surface-500" aria-hidden="true" />
      )}
      <input
        ref={ref}
        className={`${base} ${borderCls} ${SIZES[size]} ${IconLeft ? 'pl-9' : ''} ${IconRight ? 'pr-9' : ''} ${className}`}
        {...props}
      />
      {IconRight && (
        <IconRight className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 dark:text-surface-500" aria-hidden="true" />
      )}
    </div>
  )
})

export const Select = forwardRef(function Select(
  { size = 'md', invalid = false, className = '', children, ...props },
  ref,
) {
  const base = 'block w-full bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 border outline-none transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed appearance-none bg-no-repeat bg-right pr-9'
  const borderCls = invalid
    ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/30'
    : 'border-surface-300 dark:border-surface-700 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30'

  return (
    <div className="relative">
      <select ref={ref} className={`${base} ${borderCls} ${SIZES[size]} ${className}`} {...props}>
        {children}
      </select>
      <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 dark:text-surface-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
      </svg>
    </div>
  )
})
