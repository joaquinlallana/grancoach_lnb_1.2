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

  // PointerSensor con activationConstraint para que clicks en botones no inicien drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  const starters = players
    .filter((p) => p.es_titular)
    .sort(
      (a, b) =>
        POSITION_ORDER.indexOf(a.posicion) - POSITION_ORDER.indexOf(b.posicion)
    )

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

    // Dropping on a court slot
    if (targetId.startsWith('slot-')) {
      const targetPos = targetId.slice(5)

      if (dragged.posicion !== targetPos) {
        const labelDragged =
          dragged.posicion.charAt(0).toUpperCase() +
          dragged.posicion.slice(1).replace('-', ' ')
        const labelTarget =
          targetPos.charAt(0).toUpperCase() + targetPos.slice(1).replace('-', ' ')
        toast.error(`Un ${labelDragged} no puede jugar de ${labelTarget}`)
        return
      }

      if (sourceType === 'court') return // mismo slot, ignorar

      // sourceType === 'bench': mover/swappear
      const currentStarter = players.find(
        (p) => p.es_titular && p.posicion === targetPos
      )
      if (currentStarter) {
        // SWAP: el del banco se vuelve titular, el de la cancha se va al banco
        const otherId = currentStarter.jugador_id || currentStarter.id
        if (onSwapPlayers) {
          onSwapPlayers(draggedId, otherId)
        }
      } else {
        // Slot vacío: simplemente promover
        onToggleStarter(draggedId)
      }
      return
    }

    // Dropping on bench area
    if (targetId === 'bench') {
      if (sourceType === 'court') {
        // Pasar a banco (solo válido si hay espacio; el handler lo valida)
        onToggleStarter(draggedId)
      }
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
      <div className="space-y-4">
        {/* Layout: bench izquierda, cancha derecha */}
        <div className="flex gap-3">
          {/* LEFT: Bench */}
          <div className="w-24 shrink-0">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 text-center">
              Banco {bench.length}/5
            </div>
            <BenchDropZone
              bench={bench}
              onToggleStarter={onToggleStarter}
              onSetCaptain={onSetCaptain}
              onSell={onSell}
              marketLocked={marketLocked}
            />
          </div>

          {/* RIGHT: Cancha (con max-width para reducir tamaño) */}
          <div className="flex-1 max-w-lg mx-auto">
            <div
              className="relative w-full bg-gradient-to-b from-amber-900 via-yellow-800 to-amber-900 border border-amber-950 rounded-xl shadow-xl"
              style={{ paddingBottom: '70%' }}
            >
              <CourtSVG />

              {/* Slots de titulares */}
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
              <div className="mt-3 p-3 rounded-xl bg-red-950/40 border border-red-900 text-red-400 text-xs space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" /> Formación inválida:
                </p>
                {lineupErrors.map((e, i) => (
                  <p key={i} className="pl-5">· {e}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDraggedPlayer ? (
          <div className="opacity-90 rotate-3 scale-105">
            <PlayerChip
              player={activeDraggedPlayer}
              position={activeDraggedPlayer.posicion}
              isBench={!activeDraggedPlayer.es_titular}
              onToggleStarter={() => {}}
              onSetCaptain={() => {}}
              marketLocked={true}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

/* ------------------------------------------------------------------ */
/* SVG simplificado: solo paint + aro + tablero + arco de 3pt          */
/* ------------------------------------------------------------------ */
function CourtSVG() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 400 280"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Paint */}
      <rect
        x="150" y="8" width="100" height="110"
        fill="rgba(255,255,255,0.06)"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.5"
      />
      {/* Tablero */}
      <line
        x1="170" y1="20" x2="230" y2="20"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="2.5"
      />
      {/* Aro */}
      <circle
        cx="200" cy="28" r="7"
        fill="rgba(255,140,0,0.6)"
        stroke="rgba(255,180,40,0.95)"
        strokeWidth="2"
      />
      {/* 3pt: tramos rectos + arco concéntrico con el aro */}
      <line
        x1="44" y1="8" x2="44" y2="62"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.5"
      />
      <line
        x1="356" y1="8" x2="356" y2="62"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.5"
      />
      <path
        d="M 44 62 A 160 160 0 0 1 356 62"
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.5"
      />
    </svg>
  )
}

/* ------------------------------------------------------------------ */
/* Slot con droppable + draggable chip                                 */
/* ------------------------------------------------------------------ */
function CourtSlot({
  posicion,
  player,
  pos,
  onToggleStarter,
  onSetCaptain,
  onSell,
  marketLocked,
}) {
  return (
    <div
      className="absolute"
      style={{
        top: pos.top,
        left: pos.left,
        transform: 'translate(-50%, -50%)',
        zIndex: player ? 10 : 5,
      }}
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
            tooltipAlign={
              posicion === 'escolta'
                ? 'left'
                : posicion === 'ala-pivot'
                  ? 'left'
                  : 'right'
            }
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
      className={`transition-all rounded-lg ${isOver ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-amber-900 scale-105' : ''}`}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Bench (columna izquierda) - drop zone para devolver al banco        */
/* ------------------------------------------------------------------ */
function BenchDropZone({ bench, onToggleStarter, onSetCaptain, onSell, marketLocked }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'bench' })

  return (
    <div
      ref={setNodeRef}
      className={`space-y-2 p-2 rounded-lg border-2 border-dashed transition-colors ${isOver ? 'border-yellow-400 bg-yellow-900/10' : 'border-gray-800/60'}`}
    >
      {bench.map((player) => (
        <DraggablePlayerChip
          key={player.jugador_id || player.id}
          player={player}
          position={player.posicion}
          sourceType="bench"
          isBench={true}
          onToggleStarter={() => onToggleStarter(player.jugador_id || player.id)}
          onSetCaptain={() => onSetCaptain(player.jugador_id || player.id)}
          onSell={onSell ? () => onSell(player.jugador_id || player.id, player.nombre) : undefined}
          marketLocked={marketLocked}
          tooltipAlign="auto"
        />
      ))}

      {[...Array(Math.max(0, 5 - bench.length))].map((_, i) => (
        <EmptyBenchSlot key={`bench-empty-${i}`} />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Draggable wrapper                                                   */
/* ------------------------------------------------------------------ */
function DraggablePlayerChip({
  player,
  position,
  sourceType,
  onToggleStarter,
  onSetCaptain,
  onSell,
  marketLocked,
  isBench = false,
  tooltipAlign = 'right',
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
/* Slots vacíos                                                        */
/* ------------------------------------------------------------------ */
function EmptyCourtSlot({ posicion }) {
  const navigate = useNavigate()
  const posLabel =
    posicion.charAt(0).toUpperCase() + posicion.slice(1).replace('-', ' ')

  const colors = {
    base: 'border-blue-400/40 text-blue-300/70 bg-blue-900/10 hover:bg-blue-900/30',
    escolta: 'border-purple-400/40 text-purple-300/70 bg-purple-900/10 hover:bg-purple-900/30',
    alero: 'border-green-400/40 text-green-300/70 bg-green-900/10 hover:bg-green-900/30',
    'ala-pivot': 'border-orange-400/40 text-orange-300/70 bg-orange-900/10 hover:bg-orange-900/30',
    pivot: 'border-red-400/40 text-red-300/70 bg-red-900/10 hover:bg-red-900/30',
  }

  return (
    <button
      type="button"
      onClick={() => navigate(`/market?posicion=${posicion}`)}
      className={`w-24 h-16 flex flex-col items-center justify-center border-2 border-dashed rounded-lg ${colors[posicion]} text-center transition cursor-pointer group`}
      title={`Comprar un ${posLabel} en el mercado`}
    >
      <ShoppingBag className="h-3 w-3 mb-0.5 opacity-70 group-hover:opacity-100" />
      <p className="text-[10px] font-semibold uppercase">{posLabel}</p>
      <p className="text-[9px] mt-0.5 opacity-80">Comprar</p>
    </button>
  )
}

function EmptyBenchSlot() {
  return (
    <div className="w-20 h-16 flex items-center justify-center border-2 border-dashed border-gray-700/40 rounded-lg text-gray-600/50">
      <span className="text-xs">–</span>
    </div>
  )
}
