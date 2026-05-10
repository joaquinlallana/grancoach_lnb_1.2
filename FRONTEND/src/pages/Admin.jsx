import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { adminApi } from '../api/admin'
import { gameweeksApi } from '../api/gameweeks'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import toast from 'react-hot-toast'
import { Shield, RefreshCw, FastForward, Wifi } from 'lucide-react'

function SyncButton({ label, onSync, description }) {
  const [result, setResult] = useState(null)
  const mut = useMutation({
    mutationFn: onSync,
    onSuccess: (data) => {
      setResult(data)
      toast.success(`${label} completado`)
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || `Error en ${label}`)
    },
  })

  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-gray-950 border border-gray-800">
      <div>
        <p className="font-medium text-white text-sm">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
        {result && (
          <p className="text-xs text-green-400 mt-1">✓ {JSON.stringify(result?.data?.resumen || 'OK')}</p>
        )}
      </div>
      <Button variant="secondary" size="sm" loading={mut.isPending} onClick={() => mut.mutate()}>
        <RefreshCw className="h-4 w-4" />
        Sincronizar
      </Button>
    </div>
  )
}

export function Admin() {
  const advanceWeek = useMutation({
    mutationFn: adminApi.advanceWeek,
    onSuccess: () => toast.success('Semana avanzada exitosamente'),
    onError: (err) => toast.error(err.response?.data?.message || 'Error al avanzar semana'),
  })

  const { data: apiStatus } = useQuery({
    queryKey: ['api-status'],
    queryFn: adminApi.getApiStatus,
    select: (d) => d.data,
    refetchInterval: 30000,
  })

  const { data: currentWeek } = useQuery({
    queryKey: ['gameweek', 'current'],
    queryFn: gameweeksApi.getCurrent,
    select: (d) => d.data,
  })

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Shield className="h-7 w-7 text-brand-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Panel de Administración</h1>
          <p className="text-gray-400 text-sm">Solo accesible para administradores</p>
        </div>
      </div>

      {/* API Status */}
      <Card>
        <CardHeader title="Estado de la API Externa" icon={Wifi} />
        {apiStatus ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-950 rounded-lg p-3 border border-gray-800">
              <p className="text-gray-500 text-xs mb-1">Requests restantes hoy</p>
              <p className="text-xl font-bold text-white">{apiStatus.requests_remaining ?? '—'}</p>
            </div>
            <div className="bg-gray-950 rounded-lg p-3 border border-gray-800">
              <p className="text-gray-500 text-xs mb-1">Límite diario</p>
              <p className="text-xl font-bold text-white">{apiStatus.requests_limit ?? '100'}</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Cargando estado...</p>
        )}
      </Card>

      {/* Current gameweek */}
      {currentWeek && (
        <Card>
          <CardHeader title="Jornada actual" />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-white">Jornada {currentWeek.numero}</p>
              <p className={`text-sm mt-1 ${currentWeek.cerrada ? 'text-red-400' : 'text-green-400'}`}>
                {currentWeek.cerrada ? 'Cerrada' : 'Activa'}
              </p>
            </div>
            <Button
              variant="secondary"
              loading={advanceWeek.isPending}
              onClick={() => {
                if (confirm('¿Avanzar a la siguiente jornada? Esto cerrará la jornada actual.')) {
                  advanceWeek.mutate()
                }
              }}
            >
              <FastForward className="h-4 w-4" />
              Avanzar jornada
            </Button>
          </div>
        </Card>
      )}

      {/* Sync operations */}
      <Card>
        <CardHeader
          title="Sincronización de datos"
          subtitle="Liga Nacional de Básquet — Temporada 2024-2025"
        />
        <div className="space-y-3">
          <SyncButton
            label="Sincronizar equipos LNB"
            description="Actualiza la lista de equipos de la liga (1 request)"
            onSync={() => adminApi.syncTeams()}
          />
          <SyncButton
            label="Sincronizar jugadores"
            description="Trae todos los jugadores de la liga (~20 requests)"
            onSync={() => adminApi.syncPlayers()}
          />
          <SyncButton
            label="Sincronizar partidos"
            description="Actualiza el calendario de partidos (1 request)"
            onSync={() => adminApi.syncGames()}
          />
          <SyncButton
            label="Sincronizar estadísticas de todos los partidos"
            description="⚠️ Usa muchos requests. Solo usar si es necesario."
            onSync={() => adminApi.syncAllStats()}
          />
        </div>

        <div className="mt-4 pt-4 border-t border-gray-800">
          <SyncButton
            label="Sincronización completa"
            description="Equipos + Jugadores + Partidos en cadena"
            onSync={() => adminApi.syncAll()}
          />
        </div>
      </Card>
    </div>
  )
}
