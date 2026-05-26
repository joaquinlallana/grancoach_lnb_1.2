import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'
// Inicializa el tema antes del primer render (lee localStorage + prefers-color-scheme).
import './store/themeStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            className: '!font-sans !text-sm',
            style: {
              background: 'rgb(24 24 27)',
              color: 'rgb(244 244 245)',
              border: '1px solid rgb(63 63 70)',
              borderRadius: '0.75rem',
              padding: '0.625rem 0.875rem',
              boxShadow: '0 10px 20px -5px rgb(0 0 0 / 0.35)',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#f4f4f5' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#f4f4f5' } },
          }}
        />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
)
