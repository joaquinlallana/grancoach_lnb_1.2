import { Crown, Star, StarOff, Trash2 } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useSellPlayer } from '../../hooks/useMarket'

const fmt = (n) => `$${(n / 1_000_000).toFixed(1)}M`

export function RosterPlayer({ player, onToggleStarter, onSetCaptain, marketLocked }) {
  const sell = useSellPlayer()

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
      player.es_titular
        ? 'bg-gray-900 border-gray-700'
        : 'bg-gray-950 border-gray-800 opacity-75'
    }`}>
      {/* Captain crown */}
      <div className="w-6 flex justify-center">
        {player.es_capitan && <Crown className="h-4 w-4 text-yellow-400" />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{player.nombre}</p>
        <p className="text-xs text-gray-500 truncate">{player.equipo_nombre}</p>
      </div>

      <Badge label={player.posicion} />
      <span className="text-xs text-gray-400 hidden sm:block">{fmt(player.precio)}</span>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {/* Captain toggle */}
        <button
          onClick={() => onSetCaptain(player.jugador_id || player.id)}
          disabled={!player.es_titular}
          className="p-1.5 rounded hover:bg-gray-800 text-gray-500 hover:text-yellow-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title={player.es_capitan ? 'Quitar capitán' : 'Hacer capitán'}
        >
          <Crown className="h-4 w-4" />
        </button>

        {/* Starter toggle */}
        <button
          onClick={() => onToggleStarter(player.jugador_id || player.id)}
          className="p-1.5 rounded hover:bg-gray-800 text-gray-500 hover:text-brand-400 transition-colors"
          title={player.es_titular ? 'Pasar a suplente' : 'Poner de titular'}
        >
          {player.es_titular ? <Star className="h-4 w-4 text-brand-400" /> : <StarOff className="h-4 w-4" />}
        </button>

        {/* Sell */}
        {!marketLocked && (
          <button
            onClick={() => sell.mutate(player.jugador_id || player.id)}
            disabled={sell.isPending}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-500 hover:text-red-400 transition-colors"
            title="Vender jugador"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
