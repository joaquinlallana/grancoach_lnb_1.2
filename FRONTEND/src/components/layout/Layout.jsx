import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'
import { ErrorBoundary } from '../ui/ErrorBoundary'

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-surface-50 dark:bg-surface-950">
      <Navbar />
      <main className="flex-1 page-container">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  )
}
