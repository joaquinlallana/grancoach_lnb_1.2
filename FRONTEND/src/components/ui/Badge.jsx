/**
 * Badge — paleta sobria y unificada.
 * - Posiciones: misma estructura visual, diferenciadas por matiz tenue (no saturación).
 * - Status del mercado: semánticos (verde/rojo/ámbar) atenuados.
 * - Tonos en base a brand (dorado) y surface (neutros).
 */
const POSITION_STYLES = {
  base:        'bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-1 ring-inset ring-sky-500/20',
  escolta:     'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-500/20',
  alero:       'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/20',
  'ala-pivot': 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/20',
  pivot:       'bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-1 ring-inset ring-rose-500/20',
}

const STATUS_STYLES = {
  ABIERTO:    'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/20',
  CERRADO:    'bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-1 ring-inset ring-rose-500/20',
  EN_CURSO:   'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/20',
  PROGRAMADO: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-1 ring-inset ring-sky-500/20',
  FINALIZADO: 'bg-surface-200 text-surface-700 dark:bg-surface-800 dark:text-surface-300 ring-1 ring-inset ring-surface-300/50 dark:ring-surface-700/50',
}

const VARIANT_STYLES = {
  neutral:  'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-300 ring-1 ring-inset ring-surface-200 dark:ring-surface-700',
  brand:    'bg-brand-500/15 text-brand-700 dark:text-brand-300 ring-1 ring-inset ring-brand-500/30',
  success:  'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/20',
  danger:   'bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-1 ring-inset ring-rose-500/20',
  warning:  'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/20',
}

const SIZES = {
  xs: 'px-1.5 py-0.5 text-[10px]',
  sm: 'px-2   py-0.5 text-xs',
  md: 'px-2.5 py-1   text-xs',
}

export function Badge({ label, type, variant = 'neutral', size = 'sm', className = '', children }) {
  let style = VARIANT_STYLES[variant] || VARIANT_STYLES.neutral
  const key = (label ?? '').toString()
  const keyLower = key.toLowerCase()

  if (type === 'position' && POSITION_STYLES[keyLower]) {
    style = POSITION_STYLES[keyLower]
  } else if (type === 'status' && STATUS_STYLES[key]) {
    style = STATUS_STYLES[key]
  } else if (POSITION_STYLES[keyLower]) {
    style = POSITION_STYLES[keyLower]
  } else if (STATUS_STYLES[key]) {
    style = STATUS_STYLES[key]
  }

  return (
    <span className={`inline-flex items-center font-medium rounded-md capitalize ${SIZES[size]} ${style} ${className}`}>
      {children ?? label}
    </span>
  )
}
