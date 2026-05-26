import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Trophy, ShoppingCart, Users, BarChart2, Shield, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { Logo, Wordmark } from '../ui/Logo'
import { ThemeToggle } from '../ui/ThemeToggle'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: BarChart2 },
  { to: '/market',    label: 'Mercado',   icon: ShoppingCart },
  { to: '/my-team',   label: 'Mi Equipo', icon: Users },
  { to: '/rankings',  label: 'Ranking',   icon: Trophy },
]

const linkClass = ({ isActive }) =>
  `inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-surface-100 text-surface-900 dark:bg-surface-800 dark:text-surface-50'
      : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100 dark:text-surface-400 dark:hover:text-surface-50 dark:hover:bg-surface-800'
  }`

export function Navbar() {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white/80 dark:bg-surface-950/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-surface-950/60 border-b border-surface-200 dark:border-surface-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo + Wordmark */}
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2.5 text-surface-900 dark:text-surface-50 rounded-md"
            aria-label="Gran Coach LNB — ir al dashboard"
          >
            <Logo size={28} withMark />
            <Wordmark className="hidden sm:inline text-base" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={linkClass}>
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink to="/admin" className={linkClass}>
                <Shield className="h-4 w-4" aria-hidden="true" />
                <span>Admin</span>
              </NavLink>
            )}
          </div>

          {/* User actions */}
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            {user?.nombre && (
              <span className="text-sm text-surface-600 dark:text-surface-400 max-w-[10rem] truncate">
                {user.nombre}
              </span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-surface-600 hover:text-surface-900 hover:bg-surface-100 dark:text-surface-400 dark:hover:text-surface-50 dark:hover:bg-surface-800 transition-colors"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Salir</span>
            </button>
          </div>

          {/* Mobile actions */}
          <div className="md:hidden flex items-center gap-1">
            <ThemeToggle />
            <button
              type="button"
              className="p-2 rounded-lg text-surface-600 hover:text-surface-900 hover:bg-surface-100 dark:text-surface-400 dark:hover:text-surface-50 dark:hover:bg-surface-800 transition-colors"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={open}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="md:hidden py-3 border-t border-surface-200 dark:border-surface-800 space-y-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} className={linkClass} onClick={() => setOpen(false)}>
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{label}</span>
              </NavLink>
            ))}
            {isAdmin && (
              <NavLink to="/admin" className={linkClass} onClick={() => setOpen(false)}>
                <Shield className="h-4 w-4" aria-hidden="true" />
                <span>Admin</span>
              </NavLink>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-surface-600 hover:text-surface-900 hover:bg-surface-100 dark:text-surface-400 dark:hover:text-surface-50 dark:hover:bg-surface-800 transition-colors"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span>Cerrar sesión</span>
            </button>
            {user?.nombre && (
              <div className="px-3 pt-2 text-xs text-surface-500 dark:text-surface-500">
                Conectado como <span className="text-surface-700 dark:text-surface-300">{user.nombre}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
