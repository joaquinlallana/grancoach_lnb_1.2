import api from './axios'

export const gameweeksApi = {
  getAll: () => api.get('/gameweeks').then(r => r.data),
  getCurrent: () => api.get('/gameweeks/current').then(r => r.data),
  getById: (id) => api.get(`/gameweeks/${id}`).then(r => r.data),
  getMatches: (id) => api.get(`/gameweeks/${id}/matches`).then(r => r.data),
  getRanking: (id, params) => api.get(`/gameweeks/${id}/ranking`, { params }).then(r => r.data),
  getSnapshot: (id) => api.get(`/gameweeks/${id}/snapshot`).then(r => r.data),
  getMatchStats: (id, partidoId) => api.get(`/gameweeks/${id}/matches/${partidoId}/stats`).then(r => r.data),
  lock: (id) => api.post(`/gameweeks/${id}/lock`).then(r => r.data),
  advanceWeek: () => api.post('/gameweeks/admin/advance-week').then(r => r.data),
}
