import { Search, X } from 'lucide-react'
import { useLnbTeams } from '../../hooks/useMarket'
import { Input, Select } from '../ui/Input'

const POSICIONES = [
  { value: 'base',       label: 'Base' },
  { value: 'escolta',    label: 'Escolta' },
  { value: 'alero',      label: 'Alero' },
  { value: 'ala-pivot',  label: 'Ala-Pivot' },
  { value: 'pivot',      label: 'Pívot' },
]

export function PlayerFilters({ filters, onChange }) {
  const { data: teams = [] } = useLnbTeams()

  const set = (key, value) => onChange({ ...filters, [key]: value || undefined, page: 1 })

  const hasActive = !!(filters.q || filters.posicion || filters.equipo_id)
  const clearAll = () => onChange({ page: 1, limit: filters.limit })

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-stretch">
      <div className="flex-1">
        <Input
          type="search"
          iconLeft={Search}
          placeholder="Buscar jugador por nombre…"
          value={filters.q || ''}
          onChange={(e) => set('q', e.target.value)}
          aria-label="Buscar jugador"
        />
      </div>

      <div className="grid grid-cols-2 sm:flex sm:items-stretch gap-3 sm:gap-3">
        <Select
          value={filters.posicion || ''}
          onChange={(e) => set('posicion', e.target.value)}
          aria-label="Filtrar por posición"
        >
          <option value="">Todas las posiciones</option>
          {POSICIONES.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </Select>

        <Select
          value={filters.equipo_id || ''}
          onChange={(e) => set('equipo_id', e.target.value)}
          aria-label="Filtrar por equipo"
        >
          <option value="">Todos los equipos</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.nombre}</option>
          ))}
        </Select>
      </div>

      {hasActive && (
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-surface-600 hover:text-surface-900 hover:bg-surface-100 dark:text-surface-400 dark:hover:text-surface-50 dark:hover:bg-surface-800 transition-colors"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          <span>Limpiar</span>
        </button>
      )}
    </div>
  )
}
