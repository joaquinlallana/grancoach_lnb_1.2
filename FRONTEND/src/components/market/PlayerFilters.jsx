import { Search } from 'lucide-react'
import { useLnbTeams, usePositions } from '../../hooks/useMarket'

export function PlayerFilters({ filters, onChange }) {
  const { data: teams = [] } = useLnbTeams()
  const { data: positions = [] } = usePositions()

  const set = (key, value) => onChange({ ...filters, [key]: value || undefined, page: 1 })

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <input
          type="text"
          placeholder="Buscar jugador..."
          value={filters.q || ''}
          onChange={(e) => set('q', e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Position filter */}
      <select
        value={filters.posicion || ''}
        onChange={(e) => set('posicion', e.target.value)}
        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <option value="">Todas las posiciones</option>
        {positions.map((p) => (
          <option key={p.nombre || p} value={p.nombre || p}>
            {p.nombre || p}
          </option>
        ))}
      </select>

      {/* Team filter */}
      <select
        value={filters.equipo_id || ''}
        onChange={(e) => set('equipo_id', e.target.value)}
        className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        <option value="">Todos los equipos</option>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>{t.nombre}</option>
        ))}
      </select>
    </div>
  )
}
