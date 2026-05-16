import { Crown, Star, StarOff, Trash2, AlertTriangle } from 'lucide-react'
import { useSellPlayer } from '../../hooks/useMarket'

const fmt = (n) => `$${(n / 1_000_000).toFixed(1)}M`

const POSICION_LABEL = {
  base: 'Base',
  escolta: 'Escolta',
  alero: 'Alero',
  'ala-pivot': 'Ala-Pivot',
  pivot: 'Pivot',
}

const POSICION_COLOR = {
  base:       'bg-blue-900/40 text-blue-300 border-blue-800',
  escolta:    'bg-purple-900/40 text-purple-300 border-purple-800',
  alero:      'bg-green-900/40 text-green-300 border-green-800',
  'ala-pivot':'bg-orange-900/40 text-orange-300 border-orange-800',
  pivot:      'bg-red-900/40 text-red-300 border-red-800',
}

const SLOT_COLOR = {
  base:       'border-l-blue-500',
  escolta:    'border-l-purple-500',
  alero:      'border-l-green-500',
  'ala-pivot':'border-l-orange-500',
  pivot:      'border-l-red-500',
}

// Titulares: 1 slot por posición
const STARTER_SLOTS = ['base', 'escolta', 'alero', 'ala-pivot', 'pivot']

// Tipos de slots de suplentes
const BENCH_SLOTS = [
  { label: 'Perimetral', tipo: 'perimetral', posiciones: ['base', 'escolta', 'alero'] },
  { label: 'Perimetral', tipo: 'perimetral', posiciones: ['base', 'escolta', 'alero'] },
  { label: 'Interno',    tipo: 'interno',    posiciones: ['ala-pivot', 'pivot'] },
  { label: 'Interno',    tipo: 'interno',    posiciones: ['ala-pivot', 'pivot'] },
  { label: 'Comodín',   tipo: 'comodin',    posiciones: ['base', 'escolta', 'alero', 'ala-pivot', 'pivot'] },
]

function PlayerRow({ player, slot, onToggleStarter, onSetCaptain, marketLocked }) {
  const sell = useSellPlayer()
  const id = player.jugador_id || player.id

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border border-l-4 transition-colors bg-gray-900 border-gray-700 ${SLOT_COLOR[player.posicion] || 'border-l-gray-600'}`}>
      {/* Captain crown */}
      <div className="w-5 flex justify-center shrink-0">
        {player.es_capitan && <Crown className="h-3.5 w-3.5 text-yellow-400" />}
      </div>

      {/* Position badge */}
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${POSICION_COLOR[player.posicion] || 'bg-gray-800 text-gray-400 border-gray-700'}`}>
        {POSICION_LABEL[player.posicion] || player.posicion}
      </span>

      {/* Player info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{player.nombre}</p>
        <p className="text-xs text-gray-500 truncate">{player.equipo_nombre}</p>
      </div>

      <span className="text-xs text-gray-400 hidden sm:block shrink-0">{fmt(player.precio)}</span>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onSetCaptain(id)}
          disabled={!player.es_titular || marketLocked}
          className="p-1.5 rounded hover:bg-gray-800 text-gray-500 hover:text-yellow-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title={player.es_capitan ? 'Quitar capitán' : 'Hacer capitán'}
        >
          <Crown className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onToggleStarter(id)}
          disabled={marketLocked}
          className="p-1.5 rounded hover:bg-gray-800 text-gray-500 hover:text-brand-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title={player.es_titular ? 'Pasar a suplente' : 'Poner de titular'}
        >
          {player.es_titular
            ? <Star className="h-3.5 w-3.5 text-brand-400" />
            : <StarOff className="h-3.5 w-3.5" />}
        </button>
        {!marketLocked && (
          <button
            onClick={() => sell.mutate(id)}
            disabled={sell.isPending}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-500 hover:text-red-400 transition-colors"
            title="Vender jugador"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

function EmptySlot({ label, posicion, hint }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border border-l-4 border-dashed border-gray-800 ${posicion ? SLOT_COLOR[posicion] : 'border-l-gray-700'} opacity-50`}>
      <div className="w-5" />
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-gray-900 text-gray-500 border-gray-700 shrink-0">
        {label}
      </span>
      <p className="text-xs text-gray-600 italic">{hint || 'Vacío'}</p>
    </div>
  )
}

export function LineupGrid({ players, onToggleStarter, onSetCaptain, marketLocked }) {
  const starters = players.filter((p) => p.es_titular)
  const bench    = players.filter((p) => !p.es_titular)

  // Asignar titulares a sus slots por posición
  const starterByPos = {}
  for (const pos of STARTER_SLOTS) {
    starterByPos[pos] = starters.find((p) => p.posicion === pos) || null
  }

  // Titulares con posición duplicada o sin slot (error de configuración)
  const conflictos = STARTER_SLOTS.filter(
    (pos) => starters.filter((p) => p.posicion === pos).length > 1
  )

  // Asignar suplentes a los slots del banco
  const perimetralesBench = bench.filter((p) => ['base','escolta','alero'].includes(p.posicion))
  const internosBench     = bench.filter((p) => ['ala-pivot','pivot'].includes(p.posicion))
  const comotin           = bench.find((p) =>
    !perimetralesBench.slice(0, 2).includes(p) && !internosBench.slice(0, 2).includes(p)
  )

  const benchAssigned = [
    perimetralesBench[0] || null,
    perimetralesBench[1] || null,
    internosBench[0]    || null,
    internosBench[1]    || null,
    comotin             || null,
  ]

  // Validaciones de banco
  const pocketWarnings = []
  if (bench.length === 5) {
    if (perimetralesBench.length < 2)
      pocketWarnings.push(`Necesitás al menos 2 perimetrales en el banco (B/E/A). Tenés ${perimetralesBench.length}.`)
    if (internosBench.length < 2)
      pocketWarnings.push(`Necesitás al menos 2 internos en el banco (AP/P). Tenés ${internosBench.length}.`)
  }

  return (
    <div className="space-y-6">

      {/* ── TITULARES ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Titulares</h3>
            <p className="text-[10px] text-gray-600 mt-0.5">1 Base · 1 Escolta · 1 Alero · 1 Ala-Pivot · 1 Pivot</p>
          </div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${starters.length >= 5 ? 'bg-yellow-900/40 text-yellow-400' : 'bg-gray-800 text-gray-400'}`}>
            {starters.length}/5
          </span>
        </div>

        {conflictos.length > 0 && (
          <div className="flex items-start gap-2 mb-3 p-2 rounded-lg bg-red-950/40 border border-red-900 text-red-400 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>Posición duplicada en titulares: <strong>{conflictos.map(p => POSICION_LABEL[p]).join(', ')}</strong>. Pasá uno a suplente.</span>
          </div>
        )}

        <div className="space-y-2">
          {STARTER_SLOTS.map((pos) => {
            const player = starterByPos[pos]
            return player ? (
              <PlayerRow
                key={player.jugador_id || player.id}
                player={player}
                onToggleStarter={onToggleStarter}
                onSetCaptain={onSetCaptain}
                marketLocked={marketLocked}
              />
            ) : (
              <EmptySlot key={pos} label={POSICION_LABEL[pos]} posicion={pos} hint="Asigná un titular" />
            )
          })}
        </div>
      </div>

      {/* ── SUPLENTES ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Suplentes <span className="text-gray-600 font-normal normal-case">— ×0.5 pts</span>
            </h3>
            <p className="text-[10px] text-gray-600 mt-0.5">2 Perimetrales · 2 Internos · 1 Comodín</p>
          </div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${bench.length >= 5 ? 'bg-yellow-900/40 text-yellow-400' : 'bg-gray-800 text-gray-400'}`}>
            {bench.length}/5
          </span>
        </div>

        {pocketWarnings.map((w, i) => (
          <div key={i} className="flex items-start gap-2 mb-2 p-2 rounded-lg bg-yellow-950/40 border border-yellow-900 text-yellow-400 text-xs">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{w}</span>
          </div>
        ))}

        <div className="space-y-2">
          {BENCH_SLOTS.map((slot, i) => {
            const player = benchAssigned[i]
            const slotLabel = slot.label
            return player ? (
              <div key={player.jugador_id || player.id} className="relative">
                <div className="absolute -left-0 top-1/2 -translate-y-1/2 hidden" />
                <PlayerRow
                  player={player}
                  onToggleStarter={onToggleStarter}
                  onSetCaptain={onSetCaptain}
                  marketLocked={marketLocked}
                />
                <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 text-[9px] text-gray-600 whitespace-nowrap hidden xl:block">
                  {slotLabel}
                </span>
              </div>
            ) : (
              <EmptySlot
                key={i}
                label={slotLabel}
                hint={
                  slot.tipo === 'perimetral' ? 'Base, Escolta o Alero' :
                  slot.tipo === 'interno'    ? 'Ala-Pivot o Pivot' :
                  'Cualquier posición'
                }
              />
            )
          })}
        </div>
      </div>

      {/* Jugadores sin slot asignado (perimetrales o internos extra que no cuben slots) */}
      {(() => {
        const allAssigned = new Set(
          [...benchAssigned.filter(Boolean), ...starters].map(p => p.jugador_id || p.id)
        )
        const unassigned = players.filter(p => !allAssigned.has(p.jugador_id || p.id))
        if (unassigned.length === 0) return null
        return (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Sin asignar</h3>
            <div className="space-y-2">
              {unassigned.map(p => (
                <PlayerRow
                  key={p.jugador_id || p.id}
                  player={p}
                  onToggleStarter={onToggleStarter}
                  onSetCaptain={onSetCaptain}
                  marketLocked={marketLocked}
                />
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
