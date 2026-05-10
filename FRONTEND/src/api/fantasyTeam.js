import api from './axios'

export const fantasyTeamApi = {
  getTeam: () => api.get('/fantasy-team').then(r => r.data),
  renameteam: (nombre) => api.patch('/fantasy-team/nombre', { nombre }).then(r => r.data),
  updateLineup: (jugadores) => api.patch('/fantasy-team/lineup', { jugadores }).then(r => r.data),
  getTransfers: () => api.get('/fantasy-team/transfers').then(r => r.data),
  getBudgetHistory: () => api.get('/fantasy-team/budget-history').then(r => r.data),
}
