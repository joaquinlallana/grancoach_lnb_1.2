import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '../../store/themeStore'

export function ThemeToggle({ className = '' }) {
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggleTheme)
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      title={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-surface-600 hover:text-surface-900 hover:bg-surface-100 dark:text-surface-400 dark:hover:text-surface-50 dark:hover:bg-surface-800 transition-colors ${className}`}
    >
      {isDark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
    </button>
  )
}
