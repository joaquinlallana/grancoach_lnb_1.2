import { RosterPlayer } from './RosterPlayer'

const MAX_STARTERS = 5
const MAX_BENCH = 5

export function LineupGrid({ players, onToggleStarter, onSetCaptain, marketLocked }) {
  const starters = players.filter((p) => p.es_titular)
  const bench = players.filter((p) => !p.es_titular)

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Titulares
          </h3>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            starters.length >= MAX_STARTERS
              ? 'bg-yellow-900/40 text-yellow-400'
              : 'bg-gray-800 text-gray-400'
          }`}>
            {starters.length}/{MAX_STARTERS}
          </span>
        </div>
        <div className="space-y-2">
          {starters.length === 0 && (
            <p className="text-sm text-gray-600 text-center py-4">Sin titulares asignados</p>
          )}
          {starters.map((p) => (
            <RosterPlayer
              key={p.jugador_id || p.id}
              player={p}
              onToggleStarter={onToggleStarter}
              onSetCaptain={onSetCaptain}
              marketLocked={marketLocked}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Suplentes <span className="text-gray-600 font-normal normal-case">— ×0.5 pts</span>
          </h3>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            bench.length >= MAX_BENCH
              ? 'bg-yellow-900/40 text-yellow-400'
              : 'bg-gray-800 text-gray-400'
          }`}>
            {bench.length}/{MAX_BENCH}
          </span>
        </div>
        <div className="space-y-2">
          {bench.length === 0 && (
            <p className="text-sm text-gray-600 text-center py-4">Sin suplentes</p>
          )}
          {bench.map((p) => (
            <RosterPlayer
              key={p.jugador_id || p.id}
              player={p}
              onToggleStarter={onToggleStarter}
              onSetCaptain={onSetCaptain}
              marketLocked={marketLocked}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
