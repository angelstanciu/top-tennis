import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminHeader from '../components/AdminHeader'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const navigate = useNavigate()
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
      try {
        localStorage.setItem('adminAuth', enc)
        localStorage.setItem('adminAuthTS', String(Date.now()))
      } catch {}
      navigate('/admin', { replace: true })
    } catch (err: any) {
      setError(err?.message || 'Autentificare esuată.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 antialiased">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg mb-6 rotate-3">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Panou de Control</h1>
          <p className="text-slate-500 mt-2 font-medium">Star Arena Bascov</p>
        </div>

        <Card className="border-slate-100 shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden">
          <CardHeader className="bg-white pb-4 border-b border-slate-50 pt-8 px-8">
            <CardTitle className="text-xl">Autentificare</CardTitle>
            <CardDescription className="text-slate-500 mt-1">Introduceți detaliile pentru a vă accesa contul</CardDescription>
          </CardHeader>
          <CardContent className="bg-white px-8 py-6">
            <form onSubmit={onLogin} className="space-y-5">
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start space-x-3">
                  <svg className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm font-medium text-rose-800 leading-tight">{error}</p>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Nume Utilizator</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                  <input 
                    className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pl-10 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all font-medium text-slate-900 shadow-sm"
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    placeholder="ex: admin"
                    autoComplete="username"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-700">Parolă</label>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  </div>
                  <input 
                    type="password" 
                    className="flex h-12 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 pl-10 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all font-medium text-slate-900 shadow-sm font-sans tracking-widest"
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] mt-2 text-base"
                disabled={!username || !password || loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white/70" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Se verifică...
                  </span>
                ) : 'Conectare Secure'}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        <p className="text-center text-xs font-semibold text-slate-400 mt-8">
          &copy; {new Date().getFullYear()} Star Arena Bascov. Toate drepturile rezervate.
        </p>
      </div>
    </div>
  )
}


