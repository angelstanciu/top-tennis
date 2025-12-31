import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const title = useMemo(() => 'Autentificare administrator', [])

  async function onLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const enc = btoa(`${username}:${password}`)
      const url = new URL((import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8080/api')
      url.pathname = '/api/admin/bookings'
      url.searchParams.set('date', new Date().toISOString().slice(0,10))
      const res = await fetch(url.toString(), { headers: { Authorization: `Basic ${enc}` } })
      if (!res.ok) throw new Error('Autentificare esuata')
      try {
        localStorage.setItem('adminAuth', enc)
        localStorage.setItem('adminAuthTS', String(Date.now()))
      } catch {}
      navigate('/admin', { replace: true })
    } catch (err: any) {
      setError(err?.message || 'Autentificare esuata')
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <div className="text-xs text-slate-500">Secțiune securizată</div>
      </div>
      <div className="max-w-sm rounded border border-sky-200 bg-sky-50 p-4 shadow-md">
        <form onSubmit={onLogin} className="space-y-3">
          {error && <div className="p-2 bg-rose-100 text-rose-700 border border-rose-200 rounded text-sm">{error}</div>}
          <div>
            <label className="block text-sm">Utilizator</label>
            <input className="w-full border rounded px-3 py-2" value={username} onChange={e => setUsername(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm">Parola</label>
            <input type="password" className="w-full border rounded px-3 py-2" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button className="btn" type="submit" disabled={!username || !password || loading}>{loading ? 'Se incarca...' : 'Autentificare'}</button>
        </form>
      </div>
    </div>
  )
}
