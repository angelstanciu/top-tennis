import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SportType, BookingDto, CourtDto } from '../types'
import AdminHeader from '../components/AdminHeader'
import SportPicker from '../components/SportPicker'
import { fetchAvailability } from '../api'
import fastCat from '../assets/fast-cat.svg'

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
  if (!res.ok) throw new Error('Nu am putut incarca rezervarile')
  return res.json()
}

async function adminPatch(path: string, auth: string) {
  const base = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8080/api'
  const res = await fetch(`${base}${path}`, { method: 'PATCH', headers: { Authorization: `Basic ${auth}` } })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || 'Actiunea a esuat')
  }
}

export default function AdminPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [auth, setAuth] = useState<string | null>(null)
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0,10))
  const [sport, setSport] = useState<SportType | ''>('TENNIS')
  const [courtId, setCourtId] = useState<number | ''>('')
  const [bookings, setBookings] = useState<BookingDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cancellingIds, setCancellingIds] = useState<Set<number>>(new Set())
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'restore' | null>(null)
  const [restoringIds, setRestoringIds] = useState<Set<number>>(new Set())
  const [availabilityCourts, setAvailabilityCourts] = useState<CourtDto[]>([])
  const [unavailableVisible, setUnavailableVisible] = useState(false)
  const [unavailableMessage, setUnavailableMessage] = useState('')
  const dateInputRef = React.useRef<HTMLInputElement | null>(null)

  const logged = !!auth
  const title = useMemo(() => 'Administrare rezervari', [])
  const backgroundBySport: Record<SportType, string> = {
    TENNIS: '/tennis-background.png',
    PADEL: '/padel-background.png',
    BEACH_VOLLEY: '/volley-ball-background.png',
    BASKETBALL: '/basketball-background.png',
    FOOTVOLLEY: '/soccer-background.png',
    TABLE_TENNIS: '/ping-pong-background.png',
  }
  const bg = sport ? backgroundBySport[sport as SportType] : undefined
  const pageBgStyle = bg
    ? { backgroundImage: `url('${bg}')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundAttachment: 'fixed' }
    : undefined

  // Preload admin token and avoid re-login on child routes (1h expiration)
  React.useEffect(() => {
    try {
      const token = localStorage.getItem('adminAuth')
      const ts = Number(localStorage.getItem('adminAuthTS') || 0)
      const valid = token && ts && (Date.now() - ts) <= 3600000
      if (!valid) {
        try { localStorage.removeItem('adminAuth'); localStorage.removeItem('adminAuthTS') } catch {}
        navigate('/login', { replace: true })
      } else if (!auth) {
        setAuth(token)
      }
    } catch {}
  }, [])

  function sportLabel(s?: SportType) {
    switch (s) {
      case 'TENNIS': return 'Tenis'
      case 'PADEL': return 'Padel'
      case 'BEACH_VOLLEY': return 'Volei pe plaja'
      case 'BASKETBALL': return 'Baschet'
      case 'FOOTVOLLEY': return 'Tenis de picior'
      case 'TABLE_TENNIS': return 'Tenis de masa'
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
      const months = ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie']
      const y = d.getFullYear()
      const day = d.getDate()
      const month = months[d.getMonth()] || ''
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      return `${day} ${month} ${y} - ${hh}:${mm}`
    } catch { return dt }
  }

  function shiftDate(delta: number) {
    try {
      const d = new Date(date)
      d.setDate(d.getDate() + delta)
      setDate(d.toISOString().slice(0, 10))
    } catch {}
  }

  function formatDateDisplay(iso?: string) {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    if (!y || !m || !d) return iso
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const monthIdx = Math.max(0, Math.min(11, Number(m) - 1))
    const dd = String(Number(d))
    return `${dd} ${months[monthIdx]} ${y}`
  }

  function formatDateShortRo(iso?: string) {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    if (!y || !m || !d) return iso
    const months = ['Ian','Feb','Mar','Apr','Mai','Iun','Iul','Aug','Sep','Oct','Noi','Dec']
    const monthIdx = Math.max(0, Math.min(11, Number(m) - 1))
    const dd = String(Number(d))
    return `${dd} ${months[monthIdx]} ${y}`
  }

  function formatTime(t?: string) {
    if (!t) return ''
    return t.length >= 5 ? t.slice(0, 5) : t
  }

  useEffect(() => {
    fetchAvailability(date, sport || undefined)
      .then(res => setAvailabilityCourts(res.map(r => r.court)))
      .catch(() => setAvailabilityCourts([]))
  }, [date, sport])

  const filteredBookings = courtId ? bookings.filter(b => b.court?.id === courtId) : bookings

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
      try { localStorage.setItem('adminAuth', enc) } catch {}
    } catch (e: any) {
      setError(e.message || 'Autentificare esuata')
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
  function showUnavailable(message: string) {
    setUnavailableMessage(message)
    setUnavailableVisible(true)
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
        } catch (e: any) {
            setError(e?.message || 'Eroare la incarcare')
        } finally {
            setLoading(false)
        }
    }

  // Confirm action removed; bookings are auto-confirmed on creation
  async function cancel(id: number) {
    if (!auth) return
    setCancellingIds(prev => new Set(prev).add(id))
    try {
      await adminPatch(`/admin/bookings/${id}/cancel`, auth)
      broadcastUpdate()
      await reload()
    } finally {
      setCancellingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }
  async function restore(id: number) {
    if (!auth) return
    setRestoringIds(prev => new Set(prev).add(id))
    try {
      await adminPatch(`/admin/bookings/${id}/restore`, auth)
      broadcastUpdate()
      await reload()
    } catch {
      showUnavailable('Ups, teren ocupat! Alt juc\u0103tor a fost mai iute de lab\u0103! \uD83D\uDC31')
    } finally {
      setRestoringIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  return (
    <div className="min-h-screen w-full" style={pageBgStyle}><div className="max-w-6xl mx-auto p-4 space-y-4">
      <AdminHeader active="bookings" />
      {!logged ? (
        <div className="max-w-sm rounded border border-sky-200 bg-sky-50 p-4 shadow-md">
          <form onSubmit={login} className="space-y-3">
            {error && <div className="p-2 bg-rose-100 text-rose-700 border border-rose-200 rounded">{error}</div>}
            <div>
              <label className="block text-sm">Utilizator</label>
              <input className="w-full border rounded px-3 py-2" value={username} onChange={e => setUsername(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm">Parola</label>
              <input type="password" className="w-full border rounded px-3 py-2" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button className="btn" type="submit" disabled={!username || !password}>Autentificare</button>
          </form>
        </div>
      ) : (
        <div className="space-y-3">
          
          <div className="rounded border border-sky-200 bg-sky-50 p-4 shadow-md">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-slate-500 mb-1">Sport</div>
                <SportPicker value={sport} onChange={setSport} includeAll />
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Teren</div>
                <select
                  className="border rounded px-2 py-1.5 w-full"
                  value={courtId as any}
                  onChange={e => setCourtId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Toate</option>
                  {availabilityCourts.map(c => {
                    const label = /^teren/i.test(c.name) ? c.name : `Teren ${c.name}`
                    return <option key={c.id} value={c.id}>{label}</option>
                  })}
                </select>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Data</div>
                <div className="relative flex items-stretch border rounded bg-white overflow-hidden">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center px-2.5 text-lg leading-none text-slate-600 hover:bg-sky-50 hover:text-slate-800 border-r border-slate-200 focus:outline-none"
                    aria-label="Ziua anterioara"
                    title="Ziua anterioara"
                    onClick={() => shiftDate(-1)}
                  >
                    {'\u2039'}
                  </button>
                  <div className="relative flex-1 min-w-0">
                    <div className="px-2 pr-8 py-1.5 text-sm text-slate-800 text-center select-none truncate">
                      {formatDateDisplay(date)}
                    </div>
                    <input
                      ref={dateInputRef}
                      className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                      type="date"
                      lang="ro-RO"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      aria-label="Data"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-black/70 hover:text-black focus:outline-none z-10"
                      aria-label="Deschide calendarul"
                      title="Deschide calendarul"
                      onClick={() => {
                        const el = dateInputRef.current
                        if (!el) return
                        try {
                          // @ts-ignore
                          if (typeof el.showPicker === 'function') { (el as any).showPicker(); return }
                        } catch {}
                        try { el.focus() } catch {}
                        try { el.click() } catch {}
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                    </button>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center px-2.5 text-lg leading-none text-slate-600 hover:bg-sky-50 hover:text-slate-800 border-l border-slate-200 focus:outline-none"
                    aria-label="Ziua urmatoare"
                    onClick={() => shiftDate(1)}
                    title="Ziua urmatoare"
                  >
                    {'\u203A'}
                  </button>
                </div>
              </div>
              <div className="flex items-end">
                <button className="btn w-full sm:w-auto" onClick={reload} disabled={loading}>Incarca</button>
              </div>
            </div>
          </div>{error && <div className="p-2 bg-rose-100 text-rose-700 border border-rose-200 rounded">{error}</div>}
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {filteredBookings.map(b => (
              <div key={b.id} className="rounded border border-sky-200 bg-sky-50 p-3 shadow-md">
                <div className="flex justify-between items-center">
                  <div className="font-semibold">{b.customerName} • {b.customerPhone}</div>
                  <div className="font-semibold text-slate-700">#{b.id}</div>
                </div>
                <div className="mt-1 text-sm text-slate-700">Sport - Teren: {sportLabel(b.court?.sportType)} - {b.court.name}</div>
                <div className="text-sm text-slate-700">Interval Rezervat: {formatTime(b.startTime)} - {formatTime(b.endTime)} / {formatDateShortRo(b.bookingDate)}</div>
                <div className="text-sm text-slate-700">Total (RON): {(b.price as unknown as number)?.toFixed?.(2)}</div>
                {b.customerEmail && <div className="text-sm text-slate-700">Email: {b.customerEmail}</div>}
                <div className="mt-2 flex items-center justify-between gap-2">

                  {b.status === 'CANCELLED' ? (
                    <button
                      className={`px-4 py-2 rounded border ${restoringIds.has(b.id) ? 'opacity-50 cursor-not-allowed' : 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'}`}
                      onClick={() => { setConfirmId(b.id); setConfirmAction('restore') }}
                      disabled={restoringIds.has(b.id)}
                    >
                      Restabileste rezervarea
                    </button>
                  ) : (
                    <button
                      className={`px-4 py-2 rounded border ${cancellingIds.has(b.id) ? 'opacity-50 cursor-not-allowed' : 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200'}`}
                      onClick={() => { setConfirmId(b.id); setConfirmAction('cancel') }}
                      disabled={cancellingIds.has(b.id)}
                    >
                      Anuleaza
                    </button>
                  )}
                
  <span className={statusChipClass(b.status)}>{statusLabel(b.status)}</span>
</div>

              </div>
            ))}
          </div>{/* Desktop table */}
          <div className="hidden md:block overflow-auto rounded border border-sky-200 bg-white shadow-md">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 border-b">ID</th>
                  <th className="text-left px-3 py-2 border-b">Sport</th>
                  <th className="text-left px-3 py-2 border-b">Numar Teren</th>
                  <th className="text-left px-3 py-2 border-b">Data Rezervarii</th>
                  <th className="text-left px-3 py-2 border-b">Interval Rezervat</th>
                  <th className="text-left px-3 py-2 border-b">Total (RON)</th>
                  <th className="text-left px-3 py-2 border-b">Client</th>
                  <th className="text-left px-3 py-2 border-b">Stare</th>
                  <th className="text-left px-3 py-2 border-b">Actiuni</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map(b => (
                  <tr key={b.id} className="odd:bg-white even:bg-slate-50">
                    <td className="px-3 py-2 border-b">{b.id}</td>
                    <td className="px-3 py-2 border-b">{sportLabel(b.court?.sportType)}</td>
                    <td className="px-3 py-2 border-b">{b.court.name}</td>
                    <td className="px-3 py-2 border-b">{formatDateShortRo(b.bookingDate)}</td>
                    <td className="px-3 py-2 border-b">{formatTime(b.startTime)} - {formatTime(b.endTime)} / {formatDateShortRo(b.bookingDate)}</td>
                    <td className="px-3 py-2 border-b">{(b.price as unknown as number)?.toFixed?.(2)}</td>
                    <td className="px-3 py-2 border-b">{b.customerName} • {b.customerPhone}{b.customerEmail ? ` / ${b.customerEmail}` : ''}</td>
                    <td className="px-3 py-2 border-b">
                      <span className={statusChipClass(b.status)}>{statusLabel(b.status)}</span>
                    </td>
                    <td className="px-3 py-2 border-b">
                      <div className="flex gap-2">
                        {b.status === 'CANCELLED' ? (
                          <button
                            className={`px-4 py-2 rounded border ${restoringIds.has(b.id) ? 'opacity-50 cursor-not-allowed' : 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'}`}
                            onClick={() => { setConfirmId(b.id); setConfirmAction('restore') }}
                            disabled={restoringIds.has(b.id)}
                          >
                            Restabileste rezervarea
                          </button>
                        ) : (
                          <button
                            className={`px-4 py-2 rounded border ${cancellingIds.has(b.id) ? 'opacity-50 cursor-not-allowed' : 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200'}`}
                            onClick={() => { setConfirmId(b.id); setConfirmAction('cancel') }}
                            disabled={cancellingIds.has(b.id)}
                          >
                            Anuleaza
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {confirmId !== null && confirmAction !== null && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-[90vw] max-w-sm rounded border border-slate-200 bg-white p-4 shadow-lg">
            <div className="text-sm text-slate-600 mb-2">Confirmare</div>
            <div className="text-base text-slate-900 mb-4">
              {confirmAction === 'restore'
                ? 'Esti sigur ca vrei sa restabilesti aceasta rezervare?'
                : 'Esti sigur ca vrei sa stergi aceasta rezervare?'}
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
                onClick={() => { setConfirmId(null); setConfirmAction(null) }}
              >
                Nu
              </button>
              <button
                className={`px-3 py-1.5 rounded border ${confirmAction === 'restore' ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200' : 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200'}`}
                onClick={async () => {
                  const id = confirmId
                  const action = confirmAction
                  setConfirmId(null)
                  setConfirmAction(null)
                  if (id != null && action === 'restore') await restore(id)
                  if (id != null && action === 'cancel') await cancel(id)
                }}
              >
                Da
              </button>
            </div>
          </div>
        </div>
      )}
      {unavailableVisible && (
        <div className="fixed inset-0 w-screen h-screen z-[10010] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-[90vw] max-w-sm rounded border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Rezervare indisponibila</div>
              <button
                aria-label="Inchide"
                className="text-amber-900/70 hover:text-amber-900"
                onClick={() => setUnavailableVisible(false)}
              >
                {'\u00D7'}
              </button>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <img src={fastCat} alt="Pisica grabita" className="w-16 h-16" />
              <div className="text-sm">{unavailableMessage}</div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                className="px-3 py-1.5 rounded border border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                onClick={() => setUnavailableVisible(false)}
              >
                Am inteles!
              </button>
            </div>
          </div>
        </div>
      )}    </div>
    </div>
  )
}







































