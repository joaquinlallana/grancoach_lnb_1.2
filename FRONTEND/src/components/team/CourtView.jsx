import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { PlayerChip } from './PlayerChip'
import { AlertTriangle, ShoppingBag } from 'lucide-react'
import toast from 'react-hot-toast'

// Posiciones de los 5 titulares en la cancha (% del contenedor)
const COURT_POSITIONS = {
  pivot:       { top: '20%', left: '50%' },
  'ala-pivot': { top: '42%', left: '70%' },
  alero:       { top: '58%', left: '22%' },
  escolta:     { top: '58%', left: '78%' },
  base:        { top: '78%', left: '50%' },
}

const POSITION_ORDER = ['base', 'escolta', 'alero', 'ala-pivot', 'pivot']

export function CourtView({
  players,
  onToggleStarter,
  onSetCaptain,
  onSwapPlayers,
  onSell,
  marketLocked,
  lineupErrors,
  dirty,
}) {
  const [activeId, setActiveId] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  )

  const starters = players
    .filter((p) => p.es_titular)
    .sort((a, b) => POSITION_ORDER.indexOf(a.posicion) - POSITION_ORDER.indexOf(b.posicion))

  const bench = players.filter((p) => !p.es_titular)

  const startersByPos = {}
  POSITION_ORDER.forEach((pos) => {
    startersByPos[pos] = starters.find((p) => p.posicion === pos) || null
  })

  function handleDragStart(event) {
    setActiveId(event.active.id)
  }

  function handleDragEnd(event) {
    setActiveId(null)
    const { active, over } = event
    if (!over) return

    const draggedId = active.data.current?.playerId
    const sourceType = active.data.current?.sourceType
    if (!draggedId) return

    const targetId = String(over.id)
    const dragged = players.find((p) => (p.jugador_id || p.id) === draggedId)
    if (!dragged) return

    if (targetId.startsWith('slot-')) {
      const targetPos = targetId.slice(5)

      if (dragged.posicion !== targetPos) {
        const labelDragged = dragged.posicion.charAt(0).toUpperCase() + dragged.posicion.slice(1).replace('-', ' ')
        const labelTarget = targetPos.charAt(0).toUpperCase() + targetPos.slice(1).replace('-', ' ')
        toast.error(`Un ${labelDragged} no puede jugar de ${labelTarget}`)
        return
      }

      if (sourceType === 'court') return

      const currentStarter = players.find((p) => p.es_titular && p.posicion === targetPos)
      if (currentStarter) {
        const otherId = currentStarter.jugador_id || currentStarter.id
        if (onSwapPlayers) onSwapPlayers(draggedId, otherId)
      } else {
        onToggleStarter(draggedId)
      }
      return
    }

    if (targetId === 'bench' && sourceType === 'court') {
      onToggleStarter(draggedId)
    }
  }

  const activeDraggedPlayer = activeId
    ? players.find((p) => (p.jugador_id || p.id) === activeId)
    : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col-reverse md:flex-row md:items-start gap-4 md:gap-6">
        {/* Banco — izquierda en desktop, abajo en mobile */}
        <aside className="md:w-28 md:shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-surface-500 dark:text-surface-400 mb-2 text-center">
            Banco {bench.length}/5
          </p>
          <BenchDropZone
            bench={bench}
            onToggleStarter={onToggleStarter}
            onSetCaptain={onSetCaptain}
            onSell={onSell}
            marketLocked={marketLocked}
          />
        </aside>

        {/* Cancha */}
        <div className="flex-1 max-w-2xl mx-auto w-full">
          <div
            className="relative w-full rounded-2xl border border-surface-200 dark:border-surface-800 overflow-hidden bg-amber-50 dark:bg-stone-800"
            style={{ paddingBottom: '70%' }}
          >
            <CourtSVG />

            {POSITION_ORDER.map((posicion) => {
              const player = startersByPos[posicion]
              const pos = COURT_POSITIONS[posicion]
              return (
                <CourtSlot
                  key={posicion}
                  posicion={posicion}
                  player={player}
                  pos={pos}
                  onToggleStarter={onToggleStarter}
                  onSetCaptain={onSetCaptain}
                  onSell={onSell}
                  marketLocked={marketLocked}
                />
              )
            })}
          </div>

          {lineupErrors && dirty && (
            <div
              role="alert"
              className="mt-3 p-3 rounded-2xl bg-rose-500/5 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs space-y-1"
            >
              <p className="font-semibold flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                Formación inválida
              </p>
              {lineupErrors.map((e, i) => (
                <p key={i} className="pl-5">· {e}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDraggedPlayer ? (
          <div className="opacity-95 rotate-2 scale-105 pointer-events-none">
            <PlayerChip
              player={activeDraggedPlayer}
              position={activeDraggedPlayer.posicion}
              isBench={!activeDraggedPlayer.es_titular}
              onToggleStarter={() => {}}
              onSetCaptain={() => {}}
              marketLocked
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

/* ------------------------------------------------------------------ */
/* SVG simplificado: paint + aro + tablero + arco de 3pt                */
/* ------------------------------------------------------------------ */
function CourtSVG() {
  return (
    <svg
      className="absolute inset-0 w-full h-full text-amber-700/40 dark:text-stone-500/60"
      viewBox="0 0 400 280"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <rect x="150" y="8" width="100" height="110" fill="currentColor" opacity="0.18" stroke="currentColor" strokeWidth="1.5" />
      <line x1="170" y1="20" x2="230" y2="20" stroke="currentColor" strokeWidth="2.5" />
      <circle cx="200" cy="28" r="7" fill="rgb(245 158 11 / 0.55)" stroke="rgb(245 158 11 / 0.9)" strokeWidth="2" />
      <line x1="44" y1="8" x2="44" y2="62" stroke="currentColor" strokeWidth="1.5" />
      <line x1="356" y1="8" x2="356" y2="62" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 44 62 A 160 160 0 0 1 356 62" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Slot con droppable + draggable chip                                  */
/* ------------------------------------------------------------------ */
function CourtSlot({ posicion, player, pos, onToggleStarter, onSetCaptain, onSell, marketLocked }) {
  return (
    <div
      className="absolute"
      style={{ top: pos.top, left: pos.left, transform: 'translate(-50%, -50%)', zIndex: player ? 10 : 5 }}
    >
      <CourtDropZone posicion={posicion}>
        {player ? (
          <DraggablePlayerChip
            player={player}
            position={posicion}
            sourceType="court"
            onToggleStarter={() => onToggleStarter(player.jugador_id || player.id)}
            onSetCaptain={() => onSetCaptain(player.jugador_id || player.id)}
            onSell={onSell ? () => onSell(player.jugador_id || player.id, player.nombre) : undefined}
            marketLocked={marketLocked}
            tooltipAlign={posicion === 'escolta' || posicion === 'ala-pivot' ? 'left' : 'right'}
          />
        ) : (
          <EmptyCourtSlot posicion={posicion} />
        )}
      </CourtDropZone>
    </div>
  )
}

function CourtDropZone({ posicion, children }) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${posicion}` })
  return (
    <div
      ref={setNodeRef}
      className={`transition-all rounded-lg ${isOver ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-amber-50 dark:ring-offset-stone-800 scale-105' : ''}`}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Banco                                                                */
/* ------------------------------------------------------------------ */
function BenchDropZone({ bench, onToggleStarter, onSetCaptain, onSell, marketLocked }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'bench' })

  return (
    <div
      ref={setNodeRef}
      className={`
        p-2 rounded-xl border-2 border-dashed transition-colors
        grid grid-cols-5 md:grid-cols-1 gap-2
        ${isOver
          ? 'border-brand-500/60 bg-brand-500/5'
          : 'border-surface-200 dark:border-surface-700'}
      `}
    >
      {bench.map((player) => (
        <DraggablePlayerChip
          key={player.jugador_id || player.id}
          player={player}
          position={player.posicion}
          sourceType="bench"
          isBench
          onToggleStarter={() => onToggleStarter(player.jugador_id || player.id)}
          onSetCaptain={() => onSetCaptain(player.jugador_id || player.id)}
          onSell={onSell ? () => onSell(player.jugador_id || player.id, player.nombre) : undefined}
          marketLocked={marketLocked}
          tooltipAlign="auto"
        />
      ))}

      {Array.from({ length: Math.max(0, 5 - bench.length) }).map((_, i) => (
        <EmptyBenchSlot key={`bench-empty-${i}`} />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Draggable wrapper                                                    */
/* ------------------------------------------------------------------ */
function DraggablePlayerChip({
  player, position, sourceType, onToggleStarter, onSetCaptain, onSell,
  marketLocked, isBench = false, tooltipAlign = 'right',
}) {
  const playerId = player.jugador_id || player.id
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: playerId,
    data: { playerId, sourceType, position },
    disabled: marketLocked,
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`${marketLocked ? '' : 'cursor-grab active:cursor-grabbing'} touch-none`}
    >
      <PlayerChip
        player={player}
        position={position}
        onToggleStarter={onToggleStarter}
        onSetCaptain={onSetCaptain}
        onSell={onSell}
        marketLocked={marketLocked}
        isBench={isBench}
        tooltipAlign={tooltipAlign}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Slots vacíos                                                         */
/* ------------------------------------------------------------------ */
function EmptyCourtSlot({ posicion }) {
  const navigate = useNavigate()
  const posLabel = posicion.charAt(0).toUpperCase() + posicion.slice(1).replace('-', ' ')

  return (
    <button
      type="button"
      onClick={() => navigate(`/market?posicion=${posicion}`)}
      className="w-20 sm:w-24 h-14 sm:h-16 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-surface-300/80 dark:border-surface-600/60 bg-white/70 dark:bg-surface-900/30 text-surface-600 dark:text-surface-300 hover:border-brand-500/60 hover:bg-brand-500/5 transition-colors text-center"
      title={`Comprar un ${posLabel} en el mercado`}
      aria-label={`Comprar un ${posLabel} en el mercado`}
    >
      <ShoppingBag className="h-3 w-3 mb-0.5 opacity-70" aria-hidden="true" />
      <p className="text-[10px] font-semibold uppercase tracking-wide">{posLabel}</p>
      <p className="text-[9px] mt-0.5 opacity-80">Comprar</p>
    </button>
  )
}

function EmptyBenchSlot() {
  return (
    <div
      className="w-full h-14 md:h-16 flex items-center justify-center rounded-lg border border-dashed border-surface-200 dark:border-surface-700/60 text-surface-400 dark:text-surface-600"
      aria-hidden="true"
    >
      <span className="text-xs">–</span>
    </div>
  )
}
