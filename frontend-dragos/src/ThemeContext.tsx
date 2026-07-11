import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

type ThemeContextValue = {
  theme: Theme
  toggleTheme: () => void
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

// Tema default a devenit 'light'; utilizatorii care aveau deja 'dark' salvat
// din versiunea anterioară sunt migrați o singură dată la 'light', apoi orice
// alegere ulterioară (inclusiv revenirea la dark) este respectată normal.
const THEME_MIGRATION_KEY = 'themeDefaultMigratedToLightV1'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  try {
    if (!localStorage.getItem(THEME_MIGRATION_KEY)) {
      localStorage.setItem(THEME_MIGRATION_KEY, '1')
      localStorage.setItem('theme', 'light')
      return 'light'
    }
    const stored = localStorage.getItem('theme')
    if (stored === 'light' || stored === 'dark') return stored
  } catch {}
  return 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
    try { localStorage.setItem('theme', theme) } catch {}
  }, [theme])

  function setTheme(t: Theme) {
    setThemeState(t)
  }

  function toggleTheme() {
    setThemeState(t => (t === 'dark' ? 'light' : 'dark'))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
