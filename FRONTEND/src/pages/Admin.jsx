import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  Shield, RefreshCw, FastForward, Wifi, Database, AlertTriangle, CheckCircle2,
} from 'lucide-react'
import { adminApi } from '../api/admin'
import { gameweeksApi } from '../api/gameweeks'
import { Card, CardHeader } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

function SyncRow({ label, description, dangerous, onSync }) {
  const [result, setResult] = useState(null)
  const mut = useMutation({
    mutationFn: onSync,
    onSuccess: (data) => {
      setResult(data)
      toast.success(`${label} completado`)
    },
    onError: (err) => toast.error(err.response?.data?.message || `Error en ${label}`),
  })

  return (
    <div className="flex items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-surface-50 dark:bg-surface-950 border border-surface-200 dark:border-surface-800">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-medium text-surface-900 dark:text-surface-50 text-sm">{label}</p>
          {dangerous && <Badge variant="warning" size="xs">Costoso</Badge>}
        </div>
        {description && (
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">{description}</p>
        )}
        {result && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="truncate max-w-md">
              {JSON.stringify(result?.data?.resumen || 'OK')}
            </span>
          </p>
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        iconLeft={RefreshCw}
        loading={mut.isPending}
        onClick={() => mut.mutate()}
      >
        Sincronizar
      </Button>
    </div>
  )
}

export function Admin() {
  const advanceWeek = useMutation({
    mutationFn: adminApi.advanceWeek,
    onSuccess: () => toast.success('Semana avanzada exitosamente'),
    onError: (err) => toast.error(err.response?.data?.message || 'Error al avanzar la semana'),
  })

  const { data: apiStatus } = useQuery({
    queryKey: ['api-status'],
    queryFn: adminApi.getApiStatus,
    select: (d) => d.data,
    refetchInterval: 30_000,
  })

  const { data: currentWeek } = useQuery({
    queryKey: ['gameweek', 'current'],
    queryFn: gameweeksApi.getCurrent,
    select: (d) => d.data,
  })

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <header className="flex items-center gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 ring-1 ring-inset ring-brand-500/20">
          <Shield className="h-5 w-5 text-brand-600 dark:text-brand-400" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-surface-50">
            Panel de administración
          </h1>
          <p className="text-sm text-surface-600 dark:text-surface-400">
            Sincronización de datos, jornadas y monitoreo de la API externa.
          </p>
        </div>
      </header>

      {/* API status */}
      <Card>
        <CardHeader
          title="Estado de la API externa"
          subtitle="Consumo de la fuente de datos LNB"
          action={<Wifi className="h-5 w-5 text-surface-400" aria-hidden="true" />}
        />
        {apiStatus ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-surface-50 dark:bg-surface-950 rounded-xl p-4 border border-surface-200 dark:border-surface-800">
              <p className="text-xs text-surface-500 dark:text-surface-500">Requests restantes hoy</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-surface-900 dark:text-surface-50">
                {apiStatus.requests_remaining ?? '—'}
              </p>
            </div>
            <div className="bg-surface-50 dark:bg-surface-950 rounded-xl p-4 border border-surface-200 dark:border-surface-800">
              <p className="text-xs text-surface-500 dark:text-surface-500">Límite diario</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-surface-900 dark:text-surface-50">
                {apiStatus.requests_limit ?? '100'}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-surface-500 dark:text-surface-400 text-sm">Cargando estado…</p>
        )}
      </Card>

      {/* Jornada actual */}
      {currentWeek && (
        <Card>
          <CardHeader title="Jornada actual" />
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-2xl font-bold tabular-nums text-surface-900 dark:text-surface-50">
                Jornada {currentWeek.numero}
              </p>
              <div className="mt-1">
                <Badge
                  variant={currentWeek.cerrada ? 'danger' : 'success'}
                  size="sm"
                >
                  {currentWeek.cerrada ? 'Cerrada' : 'Activa'}
                </Badge>
              </div>
            </div>
            <Button
              variant="primary"
              iconLeft={FastForward}
              loading={advanceWeek.isPending}
              onClick={() => {
                if (confirm('¿Avanzar a la siguiente jornada? Esto cerrará la jornada actual.')) {
                  advanceWeek.mutate()
                }
              }}
            >
              Avanzar jornada
            </Button>
          </div>
        </Card>
      )}

      {/* Sync */}
      <Card>
        <CardHeader
          title="Sincronización de datos"
          subtitle="Liga Nacional de Básquet — Temporada actual"
          action={<Database className="h-5 w-5 text-surface-400" aria-hidden="true" />}
        />
        <div className="space-y-3">
          <SyncRow
            label="Equipos LNB"
            description="Actualiza la lista de equipos de la liga (≈1 request)"
            onSync={() => adminApi.syncTeams()}
          />
          <SyncRow
            label="Jugadores"
            description="Trae todos los jugadores de la liga (≈20 requests)"
            onSync={() => adminApi.syncPlayers()}
          />
          <SyncRow
            label="Partidos"
            description="Actualiza el calendario de partidos (≈1 request)"
            onSync={() => adminApi.syncGames()}
          />
          <SyncRow
            label="Estadísticas de todos los partidos"
            description="Usa muchos requests. Solo cuando sea necesario."
            dangerous
            onSync={() => adminApi.syncAllStats()}
          />
        </div>

        <div className="mt-5 pt-5 border-t border-surface-200 dark:border-surface-800">
          <SyncRow
            label="Sincronización completa"
            description="Equipos + Jugadores + Partidos en cadena"
            onSync={() => adminApi.syncAll()}
          />
        </div>
      </Card>

      <div className="flex items-start gap-2 text-xs text-surface-500 dark:text-surface-500">
        <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
        <span>Las operaciones de sincronización consumen requests del proveedor externo. Usar con prudencia.</span>
      </div>
    </div>
  )
}
