import { Crown, ChevronDown, Trash2 } from 'lucide-react'

// Posición → colores
const POS_COLORS = {
  base: {
    bg: 'bg-blue-600',
    bgLight: 'bg-blue-900/40',
    text: 'text-blue-300',
    ring: 'ring-blue-400/50',
    dot: 'bg-blue-400',
  },
  escolta: {
    bg: 'bg-purple-600',
    bgLight: 'bg-purple-900/40',
    text: 'text-purple-300',
    ring: 'ring-purple-400/50',
    dot: 'bg-purple-400',
  },
  alero: {
    bg: 'bg-green-600',
    bgLight: 'bg-green-900/40',
    text: 'text-green-300',
    ring: 'ring-green-400/50',
    dot: 'bg-green-400',
  },
  'ala-pivot': {
    bg: 'bg-orange-600',
    bgLight: 'bg-orange-900/40',
    text: 'text-orange-300',
    ring: 'ring-orange-400/50',
    dot: 'bg-orange-400',
  },
  pivot: {
    bg: 'bg-red-600',
    bgLight: 'bg-red-900/40',
    text: 'text-red-300',
    ring: 'ring-red-400/50',
    dot: 'bg-red-400',
  },
}

// Devuelve el apellido (última palabra del nombre completo)
function getLastName(fullName) {
  if (!fullName) return ''
  const parts = fullName.trim().split(/\s+/)
  return parts[parts.length - 1]
}

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
  const colors = POS_COLORS[position] || POS_COLORS.base
  const posLabel =
    position.charAt(0).toUpperCase() + position.slice(1).replace('-', ' ')
  const apellido = getLastName(player.nombre)
  const isCaptain = !!player.es_capitan

  const getTooltipClasses = () => {
    if (tooltipAlign === 'left') return 'right-full mr-2'
    if (tooltipAlign === 'auto') return 'left-1/2 -translate-x-1/2 bottom-full mb-2'
    return 'left-full ml-2'
  }

  // Handler común: detiene la propagación para evitar conflicto con drag
  const stopAnd = (fn) => (e) => {
    e.stopPropagation()
    e.preventDefault()
    fn()
  }

  return (
    <div className="group relative">
      {/* Compact Chip */}
      <div
        className={`${colors.bgLight} border ${colors.ring} ring-1 rounded-lg p-2 transition-all ${isBench ? 'w-20' : 'w-28'} ${isCaptain ? 'ring-2 ring-yellow-400/70' : ''}`}
      >
        {/* Header: position + captain badge */}
        <div className="flex items-center justify-between gap-1 mb-1">
          <div className="flex items-center gap-1 min-w-0">
            <div className={`w-2 h-2 rounded-full shrink-0 ${colors.dot}`} />
            <span className={`text-[10px] font-bold uppercase ${colors.text} truncate`}>
              {isBench ? position.slice(0, 3) : posLabel}
            </span>
          </div>
          {isCaptain && (
            <Crown className="h-3 w-3 text-yellow-400 shrink-0" fill="currentColor" />
          )}
        </div>

        {/* Apellido del jugador */}
        <p className="text-xs text-white font-semibold truncate" title={player.nombre}>
          {apellido}
        </p>

        {/* Action buttons - pointer-events-auto para vencer el drag listener */}
        <div className="flex gap-1 mt-1.5 pointer-events-auto" onPointerDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={stopAnd(() => !marketLocked && onSetCaptain && onSetCaptain())}
            disabled={marketLocked || !player.es_titular}
            className={`p-0.5 rounded transition disabled:opacity-30 disabled:cursor-not-allowed ${isCaptain ? 'bg-yellow-400/20' : 'hover:bg-white/10'}`}
            title={isCaptain ? 'Quitar capitán' : (player.es_titular ? 'Hacer capitán' : 'Solo titulares pueden ser capitán')}
          >
            <Crown
              className={`h-3 w-3 ${isCaptain ? 'text-yellow-400' : 'text-gray-500'}`}
              fill={isCaptain ? 'currentColor' : 'none'}
            />
          </button>
          {onSell && (
            <button
              type="button"
              onClick={stopAnd(() => !marketLocked && onSell())}
              disabled={marketLocked}
              className="p-0.5 hover:bg-red-500/20 rounded transition disabled:opacity-30 disabled:cursor-not-allowed"
              title="Vender jugador"
            >
              <Trash2 className="h-3 w-3 text-gray-500 hover:text-red-400" />
            </button>
          )}
        </div>
      </div>

      {/* Tooltip on hover (nombre completo + detalles) */}
      <div
        className={`absolute ${getTooltipClasses()} hidden group-hover:block z-50 bg-gray-900 border border-gray-700 rounded-xl p-3 w-52 shadow-xl pointer-events-none`}
      >
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${colors.dot}`} />
          <span className={`text-xs font-bold uppercase ${colors.text}`}>
            {posLabel}
          </span>
          {isCaptain && (
            <Crown className="h-3.5 w-3.5 text-yellow-400" fill="currentColor" />
          )}
        </div>

        {/* Nombre completo */}
        <p className="text-sm font-semibold text-white mb-1">
          {player.nombre}
        </p>
        <p className="text-xs text-gray-400 mb-2">
          {player.equipo_nombre || player.nombre_equipo || player.equipo || '—'}
        </p>

        <div className="flex items-center justify-between mb-2 text-xs">
          <span className="text-brand-400 font-bold">
            ${(player.precio || 0).toLocaleString('es-AR')}
          </span>
          {player.puntos_promedio != null && (
            <span className="text-gray-400">
              {Number(player.puntos_promedio).toFixed(1)} pts
            </span>
          )}
        </div>

        {marketLocked && (
          <p className="text-xs text-red-400 mt-2 text-center">
            Jornada cerrada
          </p>
        )}
        {!marketLocked && (
          <p className="text-[10px] text-gray-500 mt-1 text-center italic">
            Arrastrá para cambiar de posición
          </p>
        )}
      </div>
    </div>
  )
}
