import { Link } from 'react-router-dom'
import { ShoppingCart, Trash2, TrendingUp, Lock } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { useBuyPlayer, useSellPlayer } from '../../hooks/useMarket'

const fmt = (n) => `$${(n / 1_000_000).toFixed(1)}M`

export function PlayerCard({ player, owned, budget, marketLocked }) {
  const buy = useBuyPlayer()
  const sell = useSellPlayer()

  const canAfford = budget >= player.precio
  const isLoading = buy.isPending || sell.isPending

  const disabledReason = marketLocked
    ? 'Mercado cerrado durante la jornada'
    : !canAfford
      ? 'Presupuesto insuficiente'
      : ''

  return (
    <article className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl p-4 flex flex-col gap-3 transition-colors hover:border-surface-300 dark:hover:border-surface-700">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            to={`/players/${player.id}`}
            className="font-semibold text-surface-900 dark:text-surface-50 hover:text-brand-600 dark:hover:text-brand-400 transition-colors truncate block"
          >
            {player.nombre}
          </Link>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 truncate">
            {player.equipo_nombre || 'Sin equipo'}
          </p>
        </div>
        <Badge label={player.posicion} type="position" />
      </header>

      <div className="flex items-center justify-between">
        <span className="text-lg font-bold tabular-nums text-surface-900 dark:text-surface-50">
          {fmt(player.precio)}
        </span>
        {player.puntos_promedio != null && (
          <span className="flex items-center gap-1 text-xs text-surface-500 dark:text-surface-400">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="tabular-nums">{Number(player.puntos_promedio).toFixed(1)} pts</span>
          </span>
        )}
      </div>

      {owned ? (
        <Button
          variant="outline"
          size="sm"
          iconLeft={Trash2}
          loading={sell.isPending}
          disabled={isLoading || marketLocked}
          onClick={() => sell.mutate(player.id)}
          className="w-full"
          title={marketLocked ? 'Mercado cerrado' : undefined}
        >
          Vender
        </Button>
      ) : (
        <Button
          variant="primary"
          size="sm"
          iconLeft={marketLocked ? Lock : ShoppingCart}
          loading={buy.isPending}
          disabled={isLoading || !canAfford || marketLocked}
          onClick={() => buy.mutate(player.id)}
          className="w-full"
          title={disabledReason || undefined}
        >
          {marketLocked ? 'Mercado cerrado' : !canAfford ? 'Sin fondos' : 'Comprar'}
        </Button>
      )}
    </article>
  )
}
