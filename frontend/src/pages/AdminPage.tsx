import React, { useMemo, useState } from 'react'
import { SportType, BookingDto } from '../types'

function b64(u: string, p: string) {
  if (typeof window === 'undefined') return ''
  return btoa(`${u}:${p}`)
}

async function adminFetchBookings(date: string, sportType: SportType | '' , auth: string): Promise<BookingDto[]> {
  const url = new URL((import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8080/api')
  url.pathname = '/api/admin/bookings'
  url.searchParams.set('date', date)
  if (sportType) url.searchParams.set('sportType', sportType)
  const res = await fetch(url.toString(), { headers: { Authorization: `Basic ${auth}` } })
  if (!res.ok) throw new Error('Failed to load bookings')
  return res.json()
}

async function adminPatch(path: string, auth: string) {
  const base = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8080/api'
  const res = await fetch(`${base}${path}`, { method: 'PATCH', headers: { Authorization: `Basic ${auth}` } })
  if (!res.ok) throw new Error('Action failed')
}

export default function AdminPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [auth, setAuth] = useState<string | null>(null)
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10))
  const [sport, setSport] = useState<SportType | ''>('')
  const [bookings, setBookings] = useState<BookingDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const logged = !!auth
  const title = useMemo(() => 'Admin Rezervări', [])

  function sportLabel(s?: SportType) {
    switch (s) {
      case 'TENNIS': return 'Tenis'
      case 'PADEL': return 'Padel'
      case 'BEACH_VOLLEY': return 'Volei pe plajă'
      case 'BASKETBALL': return 'Baschet'
      case 'FOOTVOLLEY': return 'Footvolley'
      default: return s || ''
    }
  }

  function statusLabel(s?: BookingDto['status']) {
    switch (s) {
      case 'CONFIRMED': return 'Confirmat'
      case 'CANCELLED': return 'Anulat'
      case 'BLOCKED': return 'Blocat'
      default: return s || ''
    }
  }

  function statusChipClass(s?: BookingDto['status']) {
    // Minimal, readable chips
    const base = 'text-xs px-2 py-0.5 rounded border inline-flex items-center'
    switch (s) {
      case 'CONFIRMED':
        return `${base} bg-emerald-50 text-emerald-700 border-emerald-300`
      case 'CANCELLED':
        return `${base} bg-rose-100 text-rose-800 border-rose-300`
      case 'BLOCKED':
        return `${base} bg-slate-100 text-slate-700 border-slate-300`
      default:
        return `${base} bg-slate-100 text-slate-700 border-slate-300`
    }
  }

  function formatDateTime(dt?: string) {
    if (!dt) return ''
    try {
      const d = new Date(dt)
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      return `${y}-${m}-${day} ${hh}:${mm}`
    } catch { return dt }
  }

  async function login(e: React.FormEvent) {
    e.preventDefault()
    const enc = b64(username, password)
    setAuth(enc)
    setError(null)
    try {
      setLoading(true)
      const data = await adminFetchBookings(date, sport, enc)
      const sorted = [...data].sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
        if (tb !== ta) return tb - ta
        return (b.id || 0) - (a.id || 0)
      })
      setBookings(sorted)
    } catch (e: any) {
      setError(e.message || 'Autentificare eșuată')
      setAuth(null)
    } finally { setLoading(false) }
  }

  function broadcastUpdate() {
    try {
      // BroadcastChannel for modern browsers
      const BC: any = (window as any).BroadcastChannel
      if (BC) {
        const ch = new BC('bookingUpdates')
        try { ch.postMessage({ type: 'changed', date }) } catch {}
        try { (ch as any).close?.() } catch {}
      }
      // Fallback via storage event
      localStorage.setItem('bookingUpdate', JSON.stringify({ ts: Date.now(), date }))
      // Optionally clean up key to avoid clutter
      setTimeout(() => { try { localStorage.removeItem('bookingUpdate') } catch {} }, 0)
    } catch {}
  }

  async function reload() {
    if (!auth) return
    setLoading(true)
    setError(null)
    try {
      const data = await adminFetchBookings(date, sport, auth)
      const sorted = [...data].sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
        if (tb !== ta) return tb - ta
        return (b.id || 0) - (a.id || 0)
      })
      setBookings(sorted)
    } catch (e: any) { setError(e.message || 'Eroare la încărcare') }
    finally { setLoading(false) }
  }

  // Confirm action removed; bookings are auto-confirmed on creation
  async function cancel(id: number) { if (!auth) return; await adminPatch(`/admin/bookings/${id}/cancel`, auth); broadcastUpdate(); await reload() }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold border-l-4 border-sky-500 pl-3">{title}</h1>
      {!logged ? (
        <div className="max-w-sm rounded border border-sky-200 bg-sky-50 p-4 shadow-md">
          <form onSubmit={login} className="space-y-3">
            {error && <div className="p-2 bg-rose-100 text-rose-700 border border-rose-200 rounded">{error}</div>}
            <div>
              <label className="block text-sm">Utilizator</label>
              <input className="w-full border rounded px-3 py-2" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm">Parolă</label>
              <input type="password" className="w-full border rounded px-3 py-2" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button className="btn" type="submit" disabled={!username || !password}>Autentificare</button>
          </form>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded border border-sky-200 bg-sky-50 p-3 shadow-md">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <div className="text-xs text-slate-500 mb-1">Data</div>
                <input type="date" className="border rounded px-3 py-2" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Sport</div>
                <select className="border rounded px-3 py-2" value={sport} onChange={e => setSport(e.target.value as SportType | '')}>
                  <option value=''>Toate</option>
                  <option value='TENNIS'>Tenis</option>
                  <option value='PADEL'>Padel</option>
                  <option value='BEACH_VOLLEY'>Volei pe plajă</option>
                  <option value='BASKETBALL'>Baschet</option>
                  <option value='FOOTVOLLEY'>Footvolley</option>
                </select>
              </div>
              <button className="btn" onClick={reload} disabled={loading}>Încarcă</button>
            </div>
          </div>
          {error && <div className="p-2 bg-rose-100 text-rose-700 border border-rose-200 rounded">{error}</div>}
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {bookings.map(b => (
              <div key={b.id} className="rounded border border-sky-200 bg-sky-50 p-3 shadow-md">
                <div className="flex justify-between items-center">
                  <div className="font-semibold">#{b.id} • {sportLabel(b.court?.sportType)}</div>
                  <span className={statusChipClass(b.status)}>{statusLabel(b.status)}</span>
                </div>
                <div className="mt-1 text-sm text-slate-700">Număr Teren: {b.court.name}</div>
                <div className="text-sm text-slate-700">Data Rezervării: {formatDateTime(b.createdAt)}</div>
                <div className="text-sm text-slate-700">Interval Rezervat: {b.startTime} - {b.endTime}</div>
                <div className="text-sm text-slate-700">Total (RON): {(b.price as unknown as number)?.toFixed?.(2)}</div>
                <div className="text-sm text-slate-700">Client: {b.customerName} / {b.customerPhone}{b.customerEmail ? ` / ${b.customerEmail}` : ''}</div>
                <div className="mt-2 flex gap-2">
                  <button
                    className={`px-4 py-2 rounded border ${b.status === 'CANCELLED' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => cancel(b.id)}
                    disabled={b.status === 'CANCELLED'}
                  >
                    Anulează
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-auto rounded border border-sky-200 bg-white shadow-md">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 border-b">ID</th>
                  <th className="text-left px-3 py-2 border-b">Sport</th>
                  <th className="text-left px-3 py-2 border-b">Număr Teren</th>
                  <th className="text-left px-3 py-2 border-b">Data Rezervării</th>
                  <th className="text-left px-3 py-2 border-b">Interval Rezervat</th>
                  <th className="text-left px-3 py-2 border-b">Total (RON)</th>
                  <th className="text-left px-3 py-2 border-b">Client</th>
                  <th className="text-left px-3 py-2 border-b">Status</th>
                  <th className="text-left px-3 py-2 border-b">Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(b => (
                  <tr key={b.id} className="odd:bg-white even:bg-slate-50">
                    <td className="px-3 py-2 border-b">{b.id}</td>
                    <td className="px-3 py-2 border-b">{sportLabel(b.court?.sportType)}</td>
                    <td className="px-3 py-2 border-b">{b.court.name}</td>
                    <td className="px-3 py-2 border-b">{formatDateTime(b.createdAt)}</td>
                    <td className="px-3 py-2 border-b">{b.startTime} - {b.endTime}</td>
                    <td className="px-3 py-2 border-b">{(b.price as unknown as number)?.toFixed?.(2)}</td>
                    <td className="px-3 py-2 border-b">{b.customerName} / {b.customerPhone}{b.customerEmail ? ` / ${b.customerEmail}` : ''}</td>
                    <td className="px-3 py-2 border-b">
                      <span className={statusChipClass(b.status)}>{statusLabel(b.status)}</span>
                    </td>
                    <td className="px-3 py-2 border-b">
                      <div className="flex gap-2">
                        <button
                          className={`px-4 py-2 rounded border ${b.status === 'CANCELLED' ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={() => cancel(b.id)}
                          disabled={b.status === 'CANCELLED'}
                        >
                          Anulează
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
