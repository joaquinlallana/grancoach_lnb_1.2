import { useQuery } from '@tanstack/react-query'
import { rankingsApi } from '../api/rankings'
import { gameweeksApi } from '../api/gameweeks'
import { useAuth } from './useAuth'

export function useGlobalRanking(params) {
  return useQuery({
    queryKey: ['rankings', 'global', params],
    queryFn: () => rankingsApi.getGlobal(params),
    select: (data) => data.data,
    keepPreviousData: true,
  })
}

export function useMyScore() {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: ['rankings', 'my-score'],
    queryFn: rankingsApi.getMyScore,
    enabled: isAuthenticated,
    select: (data) => data.data,
  })
}

export function useCurrentGameweek() {
  return useQuery({
    queryKey: ['gameweek', 'current'],
    queryFn: gameweeksApi.getCurrent,
    select: (data) => data.data,
    refetchInterval: 120_000,
  })
}
