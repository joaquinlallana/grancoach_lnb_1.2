import { Link } from 'react-router-dom'
import { ShoppingCart, Trash2, TrendingUp } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useBuyPlayer, useSellPlayer } from '../../hooks/useMarket'

const fmt = (n) => `$${(n / 1_000_000).toFixed(1)}M`

export function PlayerCard({ player, owned, budget, marketLocked }) {
  const buy = useBuyPlayer()
  const sell = useSellPlayer()

  const canAfford = budget >= player.precio
  const isLoading = buy.isPending || sell.isPending

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-3 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            to={`/players/${player.id}`}
            className="font-semibold text-white hover:text-brand-400 transition-colors truncate block"
          >
            {player.nombre}
          </Link>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{player.equipo_nombre || 'Sin equipo'}</p>
        </div>
        <Badge label={player.posicion} />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-lg font-bold text-brand-400">{fmt(player.precio)}</span>
        {player.puntos_promedio != null && (
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <TrendingUp className="h-3 w-3" />
            {Number(player.puntos_promedio).toFixed(1)} pts
          </span>
        )}
      </div>

      {owned ? (
        <Button
          variant="danger"
          size="sm"
          loading={sell.isPending}
          disabled={isLoading || marketLocked}
          onClick={() => sell.mutate(player.id)}
          className="w-full"
        >
          <Trash2 className="h-4 w-4" />
          Vender
        </Button>
      ) : (
        <Button
          variant="primary"
          size="sm"
          loading={buy.isPending}
          disabled={isLoading || !canAfford || marketLocked}
          onClick={() => buy.mutate(player.id)}
          className="w-full"
          title={marketLocked ? 'Mercado cerrado' : !canAfford ? 'Presupuesto insuficiente' : ''}
        >
          <ShoppingCart className="h-4 w-4" />
          {marketLocked ? 'Cerrado' : !canAfford ? 'Sin fondos' : 'Comprar'}
        </Button>
      )}
    </div>
  )
}
