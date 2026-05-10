import api from './axios'

export const authApi = {
  register: (data) => api.post('/auth/register', data).then(r => r.data),
  login: (data) => api.post('/auth/login', data).then(r => r.data),
  getProfile: () => api.get('/auth/profile').then(r => r.data),
  updateProfile: (data) => api.patch('/auth/profile', data).then(r => r.data),
  changePassword: (data) => api.post('/auth/change-password', data).then(r => r.data),
}
