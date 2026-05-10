import { Outlet } from 'react-router-dom'
import { Navbar } from './Navbar'

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <main className="page-container">
        <Outlet />
      </main>
    </div>
  )
}
