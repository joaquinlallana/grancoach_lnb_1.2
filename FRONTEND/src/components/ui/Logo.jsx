/**
 * Logo isótipo Gran Coach LNB.
 * - Diseño minimalista: círculo + ejes que evocan la geometría de una pelota,
 *   con líneas curvas internas. Sobrio, escalable, no usa emoji.
 * - Por defecto el trazo usa el color brand (currentColor) y se adapta al tema.
 */
export function Logo({ size = 32, className = '', withMark = false, variant = 'mark' }) {
  // variant: 'mark' (sin fondo) | 'filled' (con fondo oscuro y trazo dorado)
  if (variant === 'filled') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        className={className}
        aria-hidden={!withMark}
        role={withMark ? 'img' : undefined}
      >
        {withMark && <title>Gran Coach LNB</title>}
        <rect width="64" height="64" rx="14" className="fill-surface-950 dark:fill-surface-900" />
        <circle cx="32" cy="32" r="18" stroke="currentColor" strokeWidth="2.5" className="text-brand-500" />
        <path d="M14 32 H50" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-brand-500" />
        <path d="M32 14 V50" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-brand-500" />
        <path d="M19.5 19.5 Q32 32 19.5 44.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-brand-500" />
        <path d="M44.5 19.5 Q32 32 44.5 44.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-brand-500" />
      </svg>
    )
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={`text-brand-500 ${className}`}
      aria-hidden={!withMark}
      role={withMark ? 'img' : undefined}
    >
      {withMark && <title>Gran Coach LNB</title>}
      <circle cx="32" cy="32" r="22" stroke="currentColor" strokeWidth="3" />
      <path d="M10 32 H54" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 10 V54" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M17 17 Q32 32 17 47" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M47 17 Q32 32 47 47" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function Wordmark({ className = '' }) {
  return (
    <span className={`font-display font-bold tracking-tight ${className}`}>
      Gran Coach <span className="text-brand-500">LNB</span>
    </span>
  )
}
