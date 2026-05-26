import { forwardRef } from 'react'

const VARIANTS = {
  primary:   'bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-surface-950 dark:text-surface-950 shadow-soft-sm hover:shadow-soft',
  secondary: 'bg-surface-100 hover:bg-surface-200 active:bg-surface-300 text-surface-900 border border-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 dark:active:bg-surface-600 dark:text-surface-100 dark:border-surface-700',
  ghost:     'bg-transparent hover:bg-surface-100 active:bg-surface-200 text-surface-700 hover:text-surface-900 dark:hover:bg-surface-800 dark:active:bg-surface-700 dark:text-surface-300 dark:hover:text-surface-50',
  outline:   'bg-transparent border border-surface-300 hover:bg-surface-100 text-surface-900 dark:border-surface-700 dark:hover:bg-surface-800 dark:text-surface-100',
  danger:    'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-soft-sm',
  success:   'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-soft-sm',
}

const SIZES = {
  xs: 'px-2.5 py-1   text-xs  gap-1.5 rounded-md',
  sm: 'px-3   py-1.5 text-sm  gap-1.5 rounded-lg',
  md: 'px-4   py-2   text-sm  gap-2   rounded-lg',
  lg: 'px-5   py-2.5 text-base gap-2  rounded-lg',
  xl: 'px-6   py-3   text-base gap-2.5 rounded-xl',
}

const ICON_SIZES = {
  xs: 'h-3.5 w-3.5',
  sm: 'h-4 w-4',
  md: 'h-4 w-4',
  lg: 'h-4.5 w-4.5',
  xl: 'h-5 w-5',
}

export const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    iconLeft: IconLeft,
    iconRight: IconRight,
    className = '',
    type = 'button',
    ...props
  },
  ref,
) {
  const base = 'inline-flex items-center justify-center font-medium select-none transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none'
  const cls = `${base} ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size] || SIZES.md} ${className}`
  const iconCls = ICON_SIZES[size] || ICON_SIZES.md

  return (
    <button ref={ref} type={type} className={cls} disabled={loading || disabled} {...props}>
      {loading ? (
        <svg className={`animate-spin ${iconCls}`} fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : IconLeft ? (
        <IconLeft className={iconCls} aria-hidden="true" />
      ) : null}
      {children}
      {!loading && IconRight && <IconRight className={iconCls} aria-hidden="true" />}
    </button>
  )
})
