import { useAuthStore } from '../store/authStore'

export function useAuth() {
  const { token, user, login, logout, updateUser } = useAuthStore()
  return {
    token,
    user,
    isAuthenticated: !!token,
    isAdmin: user?.es_admin === true,
    login,
    logout,
    updateUser,
  }
}
