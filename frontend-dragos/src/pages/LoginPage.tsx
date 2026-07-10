import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useTheme } from '../ThemeContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const enc = btoa(`${username}:${password}`)
      const base = import.meta.env.VITE_API_BASE_URL || '/api'
      let urlStr = `${base}/admin/bookings?date=${new Date().toISOString().slice(0, 10)}`
      const res = await fetch(urlStr, {
        headers: {
          Authorization: `Basic ${enc}`,
          'X-Requested-With': 'XMLHttpRequest' // Double safety to prevent browser popup in edge cases
        }
      })
      if (!res.ok) throw new Error('Autentificare esuată. Vă rugăm verificați utilizatorul și parola.')
      // Create a Spring Security session so all subsequent requests (even old cached JS)
      // automatically carry the JSESSIONID cookie and are recognized as admin.
      try {
        const formData = new URLSearchParams()
        formData.append('username', username)
        formData.append('password', password)
        await fetch('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString()
        })
      } catch {} // best-effort; if it fails the Basic auth header still works for admin endpoints
      try {
        sessionStorage.setItem('adminAuth', enc)
        sessionStorage.setItem('adminAuthTS', String(Date.now()))
      } catch {}
      navigate('/admin', { replace: true })
    } catch (err: any) {
      setError(err?.message || 'Autentificare esuată.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 antialiased relative transition-colors" style={{ background: isDark ? '#020617' : '#f6f7f4', color: isDark ? '#f8fafc' : '#0f172a' }}>
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-[20px] flex items-center justify-center shadow-lg mb-6 rotate-3" style={{ background: isDark ? '#a3e635' : '#84cc16', boxShadow: '0 8px 20px rgba(163,230,53,0.2)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#020617" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-[26px] font-black tracking-tight">Panou de Control</h1>
          <p className="mt-2 font-medium text-[13px]" style={{ color: isDark ? '#64748b' : '#64748b' }}>Star Arena Bascov</p>
        </div>

        <Card className="rounded-[24px] overflow-hidden shadow-xl" style={{ background: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
          <CardHeader className="pb-4 border-b pt-8 px-8" style={{ background: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
            <CardTitle className="text-[17px] font-extrabold" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>Autentificare</CardTitle>
            <CardDescription className="mt-1 text-[12px]" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Introduceți detaliile pentru a vă accesa contul</CardDescription>
          </CardHeader>
          <CardContent className="px-8 py-6" style={{ background: isDark ? '#0f172a' : '#ffffff' }}>
            <form onSubmit={onLogin} className="space-y-5">
              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start space-x-3">
                  <svg className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm font-medium text-rose-400 leading-tight">{error}</p>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: isDark ? '#94a3b8' : '#475569' }}>Nume Utilizator</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" style={{ color: '#94a3b8' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <input
                    className="flex h-[46px] w-full rounded-xl pl-10 pr-3 text-sm placeholder:text-slate-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all font-medium sa-form-input"
                    style={{ background: isDark ? '#0b1120' : '#f8fafc', border: `1.5px solid ${isDark ? '#1e293b' : '#e2e8f0'}`, color: isDark ? '#e2e8f0' : '#0f172a' }}
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="ex: admin"
                    autoComplete="username"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: isDark ? '#94a3b8' : '#475569' }}>Parolă</label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none" style={{ color: '#94a3b8' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <input
                    type="password"
                    className="flex h-[46px] w-full rounded-xl pl-10 pr-3 text-sm placeholder:text-slate-500 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 transition-all font-medium tracking-widest sa-form-input"
                    style={{ background: isDark ? '#0b1120' : '#f8fafc', border: `1.5px solid ${isDark ? '#1e293b' : '#e2e8f0'}`, color: isDark ? '#e2e8f0' : '#0f172a' }}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-12 rounded-xl font-black shadow-lg transition-all active:scale-[0.98] mt-2 text-[15px]"
                style={{ background: isDark ? '#a3e635' : '#84cc16', color: '#020617', boxShadow: '0 8px 24px rgba(163,230,53,0.25)' }}
                disabled={!username || !password || loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Se verifică...
                  </span>
                ) : 'Conectare Secure'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs font-semibold mt-8" style={{ color: isDark ? '#334155' : '#94a3b8' }}>
          &copy; {new Date().getFullYear()} Star Arena Bascov. Toate drepturile rezervate.
        </p>
      </div>
    </div>
  )
}


