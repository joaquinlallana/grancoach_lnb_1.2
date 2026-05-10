import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fantasyTeamApi } from '../api/fantasyTeam'
import { useAuth } from './useAuth'
import toast from 'react-hot-toast'

export function useTeam() {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: ['team'],
    queryFn: fantasyTeamApi.getTeam,
    enabled: isAuthenticated,
    select: (data) => data.data,
  })
}

export function useUpdateLineup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: fantasyTeamApi.updateLineup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] })
      toast.success('Formación actualizada')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Error al actualizar la formación')
    },
  })
}

export function useTransfers() {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: ['transfers'],
    queryFn: fantasyTeamApi.getTransfers,
    enabled: isAuthenticated,
    select: (data) => data.data,
  })
}
