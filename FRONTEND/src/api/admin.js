import api from './axios'

const syncPayload = (leagueId, season) => ({
  leagueId: leagueId || 18,
  season: season || '2024-2025',
})

export const adminApi = {
  getApiStatus: () => api.get('/admin/api-status').then(r => r.data),
  searchLeagues: (params) => api.get('/admin/leagues/search', { params }).then(r => r.data),
  syncTeams: (leagueId, season) => api.post('/admin/sync/teams', syncPayload(leagueId, season)).then(r => r.data),
  syncPlayers: (leagueId, season) => api.post('/admin/sync/players', syncPayload(leagueId, season)).then(r => r.data),
  syncGames: (leagueId, season) => api.post('/admin/sync/games', syncPayload(leagueId, season)).then(r => r.data),
  syncAllStats: (leagueId, season) => api.post('/admin/sync/all-stats', syncPayload(leagueId, season)).then(r => r.data),
  syncAll: (leagueId, season) => api.post('/admin/sync/all', syncPayload(leagueId, season)).then(r => r.data),
  advanceWeek: () => api.post('/gameweeks/admin/advance-week').then(r => r.data),
}
