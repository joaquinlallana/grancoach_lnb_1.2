import axios from 'axios'

// Si VITE_API_URL está definido (producción), apuntamos directo al backend.
// En desarrollo (sin VITE_API_URL), usamos `/api` que Vite proxea a localhost:3000.
const apiBaseUrl = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api'

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (!payload.exp) return false
    return Date.now() >= payload.exp * 1000
  } catch {
    return true
  }
}

const clearSessionAndRedirect = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    if (isTokenExpired(token)) {
      clearSessionAndRedirect()
      return Promise.reject(new axios.Cancel('Token expirado'))
    }
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearSessionAndRedirect()
    }
    return Promise.reject(error)
  }
)

export default api
