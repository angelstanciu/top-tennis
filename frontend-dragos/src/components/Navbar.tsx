import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import ThemeSwitcher from './ThemeSwitcher'
import { useTheme } from '../ThemeContext'

type NavbarProps = {
  // 'floating': fixed peste conținut, fundalul apare treptat la scroll (hero pe homepage)
  // 'static': bară normală, în flow-ul paginii, rămâne mereu transparentă
  //           (pagini fără scroll la nivel de document, ex. grila de rezervare)
  variant?: 'floating' | 'static'
  showReserveButton?: boolean
  // Folosite de AdminHeader ca să reutilizeze exact aceeași bară (padding, logo, theme switcher)
  // în loc de un component separat — doar butonul de back și eticheta admin diferă.
  showAccountButton?: boolean
  backTo?: string
  badge?: string
  rightExtra?: React.ReactNode
}

export default function Navbar({ variant = 'floating', showReserveButton = true, showAccountButton = true, backTo, badge, rightExtra }: NavbarProps) {
  const nav = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [scrollProgress, setScrollProgress] = useState(0)
  const [player, setPlayer] = useState<any>(null)

  useEffect(() => {
    if (variant !== 'floating') return
    const handleScroll = () => {
      setScrollProgress(Math.min(1, Math.max(0, window.scrollY / 120)))
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [variant])

  useEffect(() => {
    function syncAuth() {
      try {
        const token = localStorage.getItem('playerToken')
        const data = localStorage.getItem('playerData')
        setPlayer(token && data ? JSON.parse(data) : null)
      } catch { setPlayer(null) }
    }
    syncAuth()
    window.addEventListener('storage', syncAuth)
    window.addEventListener('auth-change', syncAuth)
    return () => {
      window.removeEventListener('storage', syncAuth)
      window.removeEventListener('auth-change', syncAuth)
    }
  }, [])

  function handleAccountClick() {
    if (localStorage.getItem('playerToken')) nav('/profile')
    else nav('/cont')
  }

  return (
    <nav
      className={variant === 'floating' ? 'fixed top-0 inset-x-0 z-50' : 'shrink-0 z-20'}
      style={{
        padding: variant === 'floating' ? '8px 16px' : '6px 16px 2px',
        backgroundColor: isDark ? `rgba(2, 6, 23, ${0.9 * scrollProgress})` : `rgba(255, 255, 255, ${0.9 * scrollProgress})`,
        backdropFilter: `blur(${24 * scrollProgress}px)`,
        WebkitBackdropFilter: `blur(${24 * scrollProgress}px)`,
        borderBottom: `1px solid ${isDark ? `rgba(30, 41, 59, ${scrollProgress})` : `rgba(226, 232, 240, ${scrollProgress})`}`,
        boxShadow: `0 1px 2px 0 rgba(0, 0, 0, ${0.05 * scrollProgress})`,
        transition: 'background-color 120ms linear, backdrop-filter 120ms linear, box-shadow 120ms linear, border-color 120ms linear',
      }}
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2.5 min-w-0">
          {backTo && (
            <button
              onClick={() => nav(backTo)}
              aria-label="Înapoi"
              className="shrink-0 flex items-center justify-center rounded-full transition-all active:scale-95"
              style={{
                width: 36,
                height: 36,
                background: isDark ? '#a3e635' : '#84cc16',
                color: isDark ? '#020617' : '#0f172a',
                boxShadow: isDark ? '0 4px 14px rgba(163,230,53,0.3)' : '0 4px 14px rgba(132,204,22,0.3)',
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => nav('/')}
            className="font-extrabold truncate active:scale-95 transition-transform"
            style={{ fontFamily: 'Outfit, sans-serif', fontSize: 18, letterSpacing: '-0.04em', color: isDark ? '#fff' : '#0f172a' }}
            aria-label="Înapoi acasă"
          >
            STAR<span style={{ color: isDark ? '#a3e635' : '#65a30d' }}>ARENA</span>
          </button>
          {badge && (
            <span
              className="shrink-0 font-black uppercase"
              style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999, letterSpacing: '0.1em', background: 'rgba(163,230,53,0.12)', color: isDark ? '#a3e635' : '#65a30d', fontFamily: "'Outfit', sans-serif" }}
            >
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {rightExtra}
          {showReserveButton && (
            <button
              onClick={() => nav('/rezerva')}
              className="active:scale-95 transition-all whitespace-nowrap inline-flex items-center justify-center shrink-0"
              style={{
                fontFamily: 'Outfit, sans-serif',
                color: isDark ? '#020617' : '#0f172a',
                background: isDark ? '#a3e635' : '#84cc16',
                fontWeight: 800,
                fontSize: 13,
                borderRadius: 999,
                height: 36,
                padding: '0 18px',
                boxShadow: isDark ? '0 4px 14px rgba(163,230,53,0.3)' : '0 4px 14px rgba(132,204,22,0.3)',
              }}
            >
              Rezervă
            </button>
          )}
          <ThemeSwitcher size="xl" />
          {showAccountButton && (
          <button
            onClick={handleAccountClick}
            aria-label="Contul Meu"
            className="relative flex items-center justify-center rounded-full transition-all active:scale-95 shrink-0"
            style={{
              width: 36,
              height: 36,
              background: isDark ? '#a3e635' : '#84cc16',
              color: isDark ? '#020617' : '#0f172a',
              boxShadow: isDark ? '0 4px 14px rgba(163,230,53,0.3)' : '0 4px 14px rgba(132,204,22,0.3)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {player && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 border-2 rounded-full" style={{ borderColor: isDark ? '#020617' : '#fff' }}></span>
            )}
          </button>
          )}
        </div>
      </div>
    </nav>
  )
}
