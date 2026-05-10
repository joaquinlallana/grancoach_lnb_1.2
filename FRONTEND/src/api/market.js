import api from './axios'

export const marketApi = {
  getPlayers: (params) => api.get('/market/players', { params }).then(r => r.data),
  getPlayer: (id) => api.get(`/market/players/${id}`).then(r => r.data),
  getStatus: () => api.get('/market/status').then(r => r.data),
  getTeams: () => api.get('/market/equipos-lnb').then(r => r.data),
  getPositions: () => api.get('/market/posiciones').then(r => r.data),
  buy: (jugadorId) => api.post(`/market/buy/${jugadorId}`).then(r => r.data),
  sell: (jugadorId) => api.delete(`/market/sell/${jugadorId}`).then(r => r.data),
  transfer: (data) => api.post('/market/transfer', data).then(r => r.data),
}
