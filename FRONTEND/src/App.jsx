import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { PrivateRoute, AdminRoute } from './components/layout/PrivateRoute'
import { ErrorBoundary } from './components/ui/ErrorBoundary'
import { Landing }      from './pages/Landing'
import { Login }        from './pages/Login'
import { Register }     from './pages/Register'
import { Dashboard }    from './pages/Dashboard'
import { Market }       from './pages/Market'
import { MyTeam }       from './pages/MyTeam'
import { Rankings }     from './pages/Rankings'
import { PlayerDetail } from './pages/PlayerDetail'
import { Admin }        from './pages/Admin'

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected — todas dentro del Layout (navbar + error boundary local) */}
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard"    element={<Dashboard />} />
            <Route path="/market"       element={<Market />} />
            <Route path="/my-team"      element={<MyTeam />} />
            <Route path="/rankings"     element={<Rankings />} />
            <Route path="/players/:id"  element={<PlayerDetail />} />
          </Route>
        </Route>

        {/* Admin */}
        <Route element={<AdminRoute />}>
          <Route element={<Layout />}>
            <Route path="/admin" element={<Admin />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  )
}
