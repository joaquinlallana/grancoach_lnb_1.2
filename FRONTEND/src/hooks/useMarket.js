import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { marketApi } from '../api/market'
import { fantasyTeamApi } from '../api/fantasyTeam'
import toast from 'react-hot-toast'

const MAX_STARTERS = 5

export function usePlayers(filters) {
  return useQuery({
    queryKey: ['players', filters],
    queryFn: () => marketApi.getPlayers(filters),
    select: (data) => data.data,
    keepPreviousData: true,
  })
}

export function usePlayer(id) {
  return useQuery({
    queryKey: ['player', id],
    queryFn: () => marketApi.getPlayer(id),
    select: (data) => data.data,
    enabled: !!id,
  })
}

export function useMarketStatus() {
  return useQuery({
    queryKey: ['market-status'],
    queryFn: marketApi.getStatus,
    select: (data) => data.data,
    refetchInterval: 60000,
  })
}

export function useLnbTeams() {
  return useQuery({
    queryKey: ['lnb-teams'],
    queryFn: marketApi.getTeams,
    select: (data) => data.data,
    staleTime: Infinity,
  })
}

export function usePositions() {
  return useQuery({
    queryKey: ['positions'],
    queryFn: marketApi.getPositions,
    select: (data) => data.data,
    staleTime: Infinity,
  })
}

export function useBuyPlayer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: marketApi.buy,
    onMutate: async () => {
      // Capturar cantidad de titulares ANTES de la compra
      const teamData = queryClient.getQueryData(['team'])
      const jugadores = teamData?.data?.jugadores ?? []
      const currentStarters = jugadores.filter((j) => j.es_titular).length
      return { currentStarters }
    },
    onSuccess: async (data, jugadorId, context) => {
      const { currentStarters } = context
      const isTitular = currentStarters < MAX_STARTERS

      // Refetch para obtener el nuevo jugador en el equipo
      await queryClient.refetchQueries({ queryKey: ['team'] })
      const freshTeam = queryClient.getQueryData(['team'])
      const jugadores = freshTeam?.data?.jugadores ?? []

      if (jugadores.length > 0) {
        const lineup = jugadores.map((j) => {
          const pid = j.jugador_id || j.id
          return {
            jugadorId: pid,
            esTitular: pid === jugadorId ? isTitular : j.es_titular,
            esCapitan: j.es_capitan || false,
          }
        })
        try {
          await fantasyTeamApi.updateLineup(lineup)
          await queryClient.invalidateQueries({ queryKey: ['team'] })
        } catch {
          // La asignación falló, la compra igual fue exitosa
        }
      }

      queryClient.invalidateQueries({ queryKey: ['players'] })
      toast.success(`Jugador agregado como ${isTitular ? 'titular ⭐' : 'suplente'}`)
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Error al comprar jugador')
    },
  })
}

export function useSellPlayer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: marketApi.sell,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] })
      queryClient.invalidateQueries({ queryKey: ['players'] })
      toast.success('Jugador vendido exitosamente')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Error al vender jugador')
    },
  })
}
