import { create } from 'zustand'

const STORAGE_KEY = 'theme'

const getInitialTheme = () => {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'dark' || stored === 'light') return stored
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'dark' // default = dark si no hay preferencia explícita
}

const applyThemeToDOM = (theme) => {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
}

const initialTheme = getInitialTheme()
applyThemeToDOM(initialTheme)

export const useThemeStore = create((set, get) => ({
  theme: initialTheme,

  setTheme: (theme) => {
    localStorage.setItem(STORAGE_KEY, theme)
    applyThemeToDOM(theme)
    set({ theme })
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem(STORAGE_KEY, next)
    applyThemeToDOM(next)
    set({ theme: next })
  },
}))
