import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { marketApi } from '../api/market'
import toast from 'react-hot-toast'

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
    onSuccess: (response) => {
      // El backend decide titular/suplente según el roster actual
      const esTitular = response?.data?.esTitular
      queryClient.invalidateQueries({ queryKey: ['team'] })
      queryClient.invalidateQueries({ queryKey: ['players'] })
      const ubicacion = esTitular ? 'titular ⭐' : 'suplente 🪑'
      toast.success(`Jugador agregado como ${ubicacion}`)
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
