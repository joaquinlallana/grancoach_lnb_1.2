import { Crown, Trash2 } from 'lucide-react'

/**
 * Paleta de posiciones unificada con Badge (misma estructura: 10% opacity + ring 20%).
 * Acentos de hue diferentes pero saturación equivalente — diferenciación tenue, no gritona.
 */
const POS_STYLES = {
  base: {
    chip: 'bg-sky-500/10 ring-sky-500/30 text-sky-700 dark:text-sky-300',
    dot:  'bg-sky-500',
  },
  escolta: {
    chip: 'bg-indigo-500/10 ring-indigo-500/30 text-indigo-700 dark:text-indigo-300',
    dot:  'bg-indigo-500',
  },
  alero: {
    chip: 'bg-emerald-500/10 ring-emerald-500/30 text-emerald-700 dark:text-emerald-300',
    dot:  'bg-emerald-500',
  },
  'ala-pivot': {
    chip: 'bg-amber-500/10 ring-amber-500/30 text-amber-700 dark:text-amber-300',
    dot:  'bg-amber-500',
  },
  pivot: {
    chip: 'bg-rose-500/10 ring-rose-500/30 text-rose-700 dark:text-rose-300',
    dot:  'bg-rose-500',
  },
}

function getLastName(fullName) {
  if (!fullName) return ''
  const parts = fullName.trim().split(/\s+/)
  return parts[parts.length - 1]
}

const fmtPrice = (n) =>
  typeof n === 'number' ? `$${(n / 1_000_000).toFixed(1)}M` : '—'

export function PlayerChip({
  player,
  position,
  onToggleStarter,
  onSetCaptain,
  onSell,
  marketLocked,
  isBench = false,
  tooltipAlign = 'right',
}) {
  const styles = POS_STYLES[position] || POS_STYLES.base
  const posLabel = position.charAt(0).toUpperCase() + position.slice(1).replace('-', ' ')
  const apellido = getLastName(player.nombre)
  const isCaptain = !!player.es_capitan

  const tooltipPos =
    tooltipAlign === 'left'
      ? 'right-full mr-2 top-1/2 -translate-y-1/2'
      : tooltipAlign === 'auto'
        ? 'left-1/2 -translate-x-1/2 bottom-full mb-2'
        : 'left-full ml-2 top-1/2 -translate-y-1/2'

  // Detener propagación para no interferir con drag listeners
  const stopAnd = (fn) => (e) => {
    e.stopPropagation()
    e.preventDefault()
    fn()
  }

  return (
    <div className="group relative">
      <div
        className={`
          ${styles.chip}
          ring-1 ring-inset rounded-lg p-2 transition-all
          ${isBench ? 'w-20' : 'w-24 sm:w-28'}
          ${isCaptain ? 'ring-2 ring-brand-500/70 shadow-soft' : ''}
        `}
      >
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className="flex items-center gap-1 min-w-0">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} />
            <span className="text-[10px] font-semibold uppercase tracking-wide truncate">
              {isBench ? position.slice(0, 3) : posLabel}
            </span>
          </div>
          {isCaptain && (
            <Crown className="h-3 w-3 text-brand-500 shrink-0" fill="currentColor" aria-label="Capitán" />
          )}
        </div>

        <p
          className="text-xs font-semibold text-surface-900 dark:text-surface-50 truncate"
          title={player.nombre}
        >
          {apellido || '—'}
        </p>

        <div
          className="flex gap-1 mt-1.5 pointer-events-auto"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={stopAnd(() => !marketLocked && onSetCaptain && onSetCaptain())}
            disabled={marketLocked || !player.es_titular}
            className={`p-0.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
              isCaptain
                ? 'bg-brand-500/20 text-brand-600 dark:text-brand-400'
                : 'text-surface-500 hover:text-surface-700 hover:bg-surface-200/60 dark:text-surface-400 dark:hover:text-surface-200 dark:hover:bg-surface-700/40'
            }`}
            title={isCaptain ? 'Quitar capitán' : (player.es_titular ? 'Hacer capitán' : 'Solo titulares pueden ser capitán')}
            aria-label={isCaptain ? 'Quitar capitán' : 'Hacer capitán'}
          >
            <Crown className="h-3 w-3" fill={isCaptain ? 'currentColor' : 'none'} />
          </button>
          {onSell && (
            <button
              type="button"
              onClick={stopAnd(() => !marketLocked && onSell())}
              disabled={marketLocked}
              className="p-0.5 rounded text-surface-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed dark:text-surface-400 dark:hover:text-rose-400"
              title="Vender jugador"
              aria-label="Vender jugador"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Tooltip detalle */}
      <div
        role="tooltip"
        className={`absolute ${tooltipPos} hidden group-hover:block z-50 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-xl p-3 w-52 shadow-soft-lg pointer-events-none`}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className={`w-2.5 h-2.5 rounded-full ${styles.dot}`} />
          <span className={`text-xs font-semibold uppercase tracking-wide ${styles.chip.split(' ').find((c) => c.startsWith('text-')) || ''}`}>
            {posLabel}
          </span>
          {isCaptain && (
            <Crown className="h-3.5 w-3.5 text-brand-500" fill="currentColor" aria-hidden="true" />
          )}
        </div>

        <p className="text-sm font-semibold text-surface-900 dark:text-surface-50 mb-0.5">
          {player.nombre}
        </p>
        <p className="text-xs text-surface-500 dark:text-surface-400 mb-2">
          {player.equipo_nombre || player.nombre_equipo || player.equipo || '—'}
        </p>

        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold tabular-nums text-surface-900 dark:text-surface-50">
            {fmtPrice(player.precio)}
          </span>
          {player.puntos_promedio != null && (
            <span className="text-surface-500 dark:text-surface-400 tabular-nums">
              {Number(player.puntos_promedio).toFixed(1)} pts
            </span>
          )}
        </div>

        {marketLocked ? (
          <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-2 text-center">
            Jornada cerrada
          </p>
        ) : (
          <p className="text-[10px] text-surface-500 dark:text-surface-500 mt-2 text-center italic">
            Arrastrá para reubicar
          </p>
        )}
      </div>
    </div>
  )
}
