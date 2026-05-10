import api from './axios'

export const rankingsApi = {
  getGlobal: (params) => api.get('/rankings/global', { params }).then(r => r.data),
  getMyScore: () => api.get('/rankings/my-score').then(r => r.data),
  getPlayerStats: (jugadorId, params) =>
    api.get(`/rankings/players/${jugadorId}/stats`, { params }).then(r => r.data),
  getPlayerFantasyPoints: (jugadorId) =>
    api.get(`/rankings/players/${jugadorId}/fantasy-points`).then(r => r.data),
}
