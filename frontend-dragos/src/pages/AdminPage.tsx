import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { SportType, BookingDto, CourtDto } from '../types'
import AdminHeader from '../components/AdminHeader'
import CalendarDemo from '../components/ui/calendar-1'
import { fetchAvailability, fetchActiveCourts } from '../api'
import TimelineGrid from '../components/TimelineGrid'
import { CalendarIcon, TrendingUp, DollarSign, Percent, Search, X, BarChart3, List, Award, Phone, Check, Hourglass } from 'lucide-react'
import { RevenueChart } from '../components/RevenueChart'
import FilterBar from '../components/admin/FilterBar'
import SegmentedControl from '../components/admin/SegmentedControl'

type BookingStatusFilter = 'ALL' | 'CONFIRMED' | 'PENDING_APPROVAL' | 'CANCELLED'

function statusChipStyle(s?: BookingDto['status']) {
  switch (s) {
    case 'CONFIRMED': return { bg: 'rgba(16,185,129,0.14)', color: '#34d399' }
    case 'PENDING_APPROVAL': return { bg: 'rgba(245,158,11,0.14)', color: '#fbbf24' }
    case 'CANCELLED': return { bg: 'rgba(244,63,94,0.14)', color: '#fb7185' }
    default: return { bg: 'rgba(148,163,184,0.16)', color: '#cbd5e1' }
  }
}

function StatusIcon({ status, label }: { status?: BookingDto['status']; label: string }) {
  let bg = '#94a3b8'
  let Icon = Hourglass
  switch (status) {
    case 'CONFIRMED': bg = '#10b981'; Icon = Check; break
    case 'PENDING_APPROVAL': bg = '#f59e0b'; Icon = Hourglass; break
    case 'CANCELLED': bg = '#f43f5e'; Icon = X; break
    case 'NO_SHOW': bg = '#64748b'; Icon = X; break
    case 'BLOCKED': bg = '#64748b'; Icon = X; break
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-full shrink-0"
      style={{ width: 16, height: 16, background: bg }}
      title={label}
    >
      <Icon className="w-2.5 h-2.5" style={{ color: '#fff' }} strokeWidth={3} />
    </span>
  )
}

// Rank Config (same as ProfilePage)
const RANKS = [
  { name: 'Bronze', min: 0, max: 6, color: 'bg-orange-400/10 text-orange-600 border-orange-400/20' },
  { name: 'Silver', min: 7, max: 19, color: 'bg-slate-200 text-slate-600 border-slate-300' },
  { name: 'Gold', min: 20, max: 49, color: 'bg-amber-100 text-amber-600 border-amber-200' },
  { name: 'Diamond', min: 50, max: 99, color: 'bg-cyan-100 text-cyan-600 border-cyan-200' },
  { name: 'Platinum', min: 100, max: Infinity, color: 'bg-purple-100 text-purple-600 border-purple-200' }
];

function getRankBadge(matches?: number) {
  if (matches === undefined || matches === null) return null;
  const r = RANKS.find(rank => matches >= rank.min && matches <= rank.max) || RANKS[0];
  return (
    <span className={`text-[8px] px-2 py-0.5 rounded-full font-black tracking-widest uppercase border ${r.color}`}>
      {r.name}
    </span>
  );
}

function b64(u: string, p: string) {
  if (typeof window === 'undefined') return ''
  return btoa(`${u}:${p}`)
}

async function adminFetchBookings(date: string, sportType: SportType | '', auth: string): Promise<BookingDto[]> {
  const base = import.meta.env.VITE_API_BASE_URL || '/api'
  const url = new URL(`${window.location.origin}${base}/admin/bookings`)
  url.searchParams.set('date', date)
  if (sportType) url.searchParams.set('sportType', sportType)
  const res = await fetch(url.toString(), { headers: { Authorization: `Basic ${auth}` } })
  if (!res.ok) throw new Error('Nu am putut incarca rezervarile')
  return res.json()
}

async function adminPatch(path: string, auth: string) {
  const base = import.meta.env.VITE_API_BASE_URL || '/api'
  const res = await fetch(`${base}${path.startsWith('/api') ? path.substring(4) : path}`, { method: 'PATCH', headers: { Authorization: `Basic ${auth}` } })
  if (!res.ok) {
    let msg = ''
    try {
      const data = await res.json()
      msg = data?.message || ''
    } catch {
      msg = await res.text()
    }
    throw new Error(msg || 'Actiunea a esuat')
  }
}

export default function AdminPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [auth, setAuth] = useState<string | null>(null)
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [sport, setSport] = useState<SportType | ''>('TENNIS')
  const [courtId, setCourtId] = useState<number | ''>('')
  const [bookings, setBookings] = useState<BookingDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cancellingIds, setCancellingIds] = useState<Set<number>>(new Set())
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'restore' | 'noshow' | null>(null)
  const [restoringIds, setRestoringIds] = useState<Set<number>>(new Set())
  const [availabilityCourts, setAvailabilityCourts] = useState<CourtDto[]>([])
  const [availabilityData, setAvailabilityData] = useState<any[]>([]) // For Grid view
  const [activeCourts, setActiveCourts] = useState<CourtDto[]>([])
  const [unavailableVisible, setUnavailableVisible] = useState(false)
  const [unavailableMessage, setUnavailableMessage] = useState('')
  const unavailableHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<BookingStatusFilter>('ALL')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [approvingAll, setApprovingAll] = useState(false)
  const [approveAllResult, setApproveAllResult] = useState<string | null>(null)
  const dateInputRef = React.useRef<HTMLInputElement | null>(null)

  const logged = !!auth
  const title = useMemo(() => 'Administrare rezervari', [])
  const activeSports = useMemo(() => new Set(activeCourts.map(c => c.sportType)), [activeCourts])
  const disabledSports = useMemo(() => {
    const all: SportType[] = ['TENNIS', 'PADEL', 'BEACH_VOLLEY', 'BASKETBALL', 'FOOTVOLLEY', 'TABLE_TENNIS']
    return all.filter(s => !activeSports.has(s))
  }, [activeSports])
  const backgroundBySport: Record<SportType | 'ALL', string> = {
    TENNIS: '/tennis-background.png',
    PADEL: '/padel-background.png',
    BEACH_VOLLEY: '/volley-ball-background.png',
    BASKETBALL: '/basketball-background.png',
    FOOTVOLLEY: '/soccer-background.png',
    TABLE_TENNIS: '/ping-pong-background.png',
    ALL: '/multisport_gallery.png',
  }
  const bg = sport ? backgroundBySport[sport as SportType] : backgroundBySport.ALL

  // Preload admin token and avoid re-login on child routes (1h expiration)
  React.useEffect(() => {
    try {
      const token = sessionStorage.getItem('adminAuth')
      const ts = Number(sessionStorage.getItem('adminAuthTS') || 0)
      const valid = token && ts && (Date.now() - ts) <= 3600000
      if (!valid) {
        try { sessionStorage.removeItem('adminAuth'); sessionStorage.removeItem('adminAuthTS') } catch { }
        navigate('/login', { replace: true })
      } else if (!auth) {
        setAuth(token)
      }
    } catch { }
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
      case 'PENDING_APPROVAL': return 'Aprobare'
      case 'NO_SHOW': return 'Neprezentat'
      default: return s || ''
    }
  }

  function formatDateTime(dt?: string) {
    if (!dt) return ''
    try {
      const d = new Date(dt)
      const months = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie']
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
    } catch { }
  }

  function formatDateDisplay(iso?: string) {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    if (!y || !m || !d) return iso
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthIdx = Math.max(0, Math.min(11, Number(m) - 1))
    const dd = String(Number(d))
    return `${dd} ${months[monthIdx]} ${y}`
  }

  function formatDateShortRo(iso?: string) {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    if (!y || !m || !d) return iso
    const months = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec']
    const monthIdx = Math.max(0, Math.min(11, Number(m) - 1))
    const dd = String(Number(d))
    return `${dd} ${months[monthIdx]} ${y}`
  }

  function formatTime(t?: string) {
    if (!t) return ''
    return t.length >= 5 ? t.slice(0, 5) : t
  }

  function timeToMinutes(t: string) {
    if (t === '24:00' || t === '23:59') return 24 * 60
    const parts = t.split(':').map(Number)
    if (parts.length < 2) return 0
    return parts[0] * 60 + parts[1]
  }

  useEffect(() => {
    fetchAvailability(date, sport || undefined)
      .then(res => {
        let items = res.filter(r => r.court.active !== false)
        setAvailabilityCourts(items.map(r => r.court))
        setAvailabilityData(items)
      })
      .catch(() => {
        setAvailabilityCourts([])
        setAvailabilityData([])
      })
  }, [date, sport])

  useEffect(() => {
    fetchActiveCourts()
      .then(setActiveCourts)
      .catch(() => setActiveCourts([]))
  }, [])

  useEffect(() => {
    if (logged) {
      reload()
    }
  }, [date, sport])

  const filteredBookings = useMemo(() => {
    let list = courtId ? bookings.filter(b => b.court?.id === courtId) : bookings
    if (statusFilter === 'CANCELLED') {
      list = list.filter(b => b.status === 'CANCELLED' || b.status === 'NO_SHOW')
    } else if (statusFilter !== 'ALL') {
      list = list.filter(b => b.status === statusFilter)
    }
    if (searchTerm) {
      const low = searchTerm.toLowerCase()
      list = list.filter(b => 
        (b.customerName?.toLowerCase().includes(low)) || 
        (b.customerPhone?.includes(low)) ||
        (b.id?.toString().includes(low))
      )
    }
    
    const nowStr = new Date().toTimeString().slice(0, 5)
    const todayStr = new Date().toISOString().slice(0, 10)

    return [...list].sort((a, b) => {
      const isAPassed = (a.bookingDate < todayStr) || (a.bookingDate === todayStr && a.endTime <= nowStr) || a.status === 'CANCELLED'
      const isBPassed = (b.bookingDate < todayStr) || (b.bookingDate === todayStr && b.endTime <= nowStr) || b.status === 'CANCELLED'
      
      if (isAPassed !== isBPassed) {
        return isAPassed ? 1 : -1 // Upcoming first, Passed at bottom
      }
      
      if (isAPassed) {
        // Both passed or cancelled: sort descending to have earliest at the bottom
        return b.startTime.localeCompare(a.startTime)
      }
      // Both upcoming: earliest first
      return a.startTime.localeCompare(b.startTime)
    })
  }, [bookings, courtId, searchTerm, date, statusFilter])

  const { stats, chartData } = useMemo(() => {
    // Filter bookings by selected sport if "Toate Sporturile" is NOT selected
    const filteredBySport = sport ? bookings.filter(b => b.court?.sportType === sport) : bookings
    const confirmed = filteredBySport.filter(b => b.status === 'CONFIRMED')
    const totalRevenue = confirmed.reduce((acc, b) => acc + (b.price || 0), 0)
    
    const nowStr = new Date().toTimeString().slice(0, 5)
    const todayStr = new Date().toISOString().slice(0, 10)
    const isToday = date === todayStr
    const isPastDate = date < todayStr
    
    // Revenue from finished bookings (or all if past date)
    const collectedRevenue = confirmed
      .filter(b => isPastDate || b.endTime <= nowStr)
      .reduce((acc, b) => acc + (b.price || 0), 0)

    // Generate chart data: cumulative revenue points every 30 mins
    const chartPoints: { time: string, amount: number }[] = []
    const nowMins = timeToMinutes(nowStr)

    // We calculate the cumulative revenue at each tick
    // A booking from S to E with Price contributes:
    // - 0 before S
    // - Price * (t - S) / (E - S) between S and E
    // - Price after E
    
    for (let m = 0; m <= 24 * 60; m += 30) {
      const h = Math.floor(m / 60)
      const min = m % 60
      const tStr = `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
      
      let totalAtTick = 0
      confirmed.forEach(b => {
        const startM = timeToMinutes(b.startTime)
        const endM = timeToMinutes(b.endTime)
        const price = Number(b.price || 0)
        
        if (m >= endM) {
          totalAtTick += price
        }
        // No proportional progress here - only spikes at the end
      })

      // To show the full 24h axis even for today:
      // If m > now, we stop increasing cumulative revenue if we want to show "actuals" 
      // but we STILL push the point to keep the axis full.
      if (isToday && m > nowMins) {
        // Find revenue strictly up to now (already calculated at this m, but we might want to cap it)
        // Actually, let's just calculate totalAtTick based on what has happened or is happening.
        // If the user wants a full day view, we push all points.
        chartPoints.push({ time: tStr, amount: parseFloat(totalAtTick.toFixed(2)) })
      } else {
        chartPoints.push({ time: tStr, amount: parseFloat(totalAtTick.toFixed(2)) })
      }
    }

    // Occupancy calculation... (unchanged)
    let totalSlots = 0
    let bookedSlots = 0
    
    availabilityData.forEach(courtAvail => {
      // Skip inactive courts or courts of different sports
      if (!courtAvail.court.active) return
      if (sport && courtAvail.court.sportType !== sport) return
      
      const open = courtAvail.court.openTime
      const close = courtAvail.court.closeTime === '23:59' ? '24:00' : courtAvail.court.closeTime
      const [oh, om] = open.split(':').map(Number)
      const [ch, cm] = close.split(':').map(Number)
      const totalMins = (ch * 60 + cm) - (oh * 60 + om)
      totalSlots += Math.floor(totalMins / 30)
      
      // Count all items in 'booked' (Confirmed, Finished, Blocked)
      bookedSlots += (courtAvail.booked || []).length
    })
    
    const occupancyRate = totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0
    
    return { stats: { totalRevenue, collectedRevenue, occupancyRate, isToday }, chartData: chartPoints }
  }, [bookings, availabilityData, date, sport])

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
      try { sessionStorage.setItem('adminAuth', enc) } catch { }
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
        try { ch.postMessage({ type: 'changed', date }) } catch { }
        try { (ch as any).close?.() } catch { }
      }
      // Fallback via storage event
      localStorage.setItem('bookingUpdate', JSON.stringify({ ts: Date.now(), date }))
      // Optionally clean up key to avoid clutter
      setTimeout(() => { try { localStorage.removeItem('bookingUpdate') } catch { } }, 0)
    } catch { }
  }
  function showUnavailable(message: string) {
    setUnavailableMessage(message)
    setUnavailableVisible(true)
    if (unavailableHideTimer.current) clearTimeout(unavailableHideTimer.current)
    unavailableHideTimer.current = setTimeout(() => setUnavailableVisible(false), 4000)
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
    } catch (e: any) {
      showUnavailable(e?.message || 'Eroare la restabilire')
    } finally {
      setRestoringIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function noshow(id: number) {
    if (!auth) return
    setCancellingIds(prev => new Set(prev).add(id))
    try {
      await adminPatch(`/admin/bookings/${id}/no-show`, auth)
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

  async function approve(id: number) {
    if (!auth) return
    setLoading(true)
    try {
      const { approveBooking } = await import('../api')
      await approveBooking(id, auth)
      broadcastUpdate()
      await reload()
    } catch (e: any) {
      showUnavailable(e.message || 'Eroare la aprobare')
    } finally {
      setLoading(false)
    }
  }

  async function reject(id: number) {
    if (!auth) return
    setLoading(true)
    try {
      const { rejectBooking } = await import('../api')
      await rejectBooking(id, auth)
      broadcastUpdate()
      await reload()
    } catch (e: any) {
      showUnavailable(e.message || 'Eroare la respingere')
    } finally {
      setLoading(false)
    }
  }

  async function approveAll() {
    if (!auth) return
    setApprovingAll(true)
    setApproveAllResult(null)
    try {
      const { approveAllPending } = await import('../api')
      const count = await approveAllPending(auth, sport || undefined)
      setApproveAllResult(`${count} rezervări aprobate`)
      broadcastUpdate()
      await reload()
    } catch (e: any) {
      showUnavailable(e.message || 'Eroare la aprobare în masă')
    } finally {
      setApprovingAll(false)
    }
  }

  return (
    <div className="min-h-screen relative font-sans selection:bg-lime-400 selection:text-slate-950" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <AdminHeader active="bookings" />
      <div className="max-w-6xl mx-auto p-4 space-y-4 relative z-10">
      {!logged ? (
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="w-full max-w-sm rounded-[2.5rem] border p-10 shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-500" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-8 shadow-xl rotate-3 group hover:rotate-6 transition-all" style={{ background: 'var(--lime)', boxShadow: '0 8px 20px rgba(163,230,53,0.2)' }}>
              <TrendingUp className="w-10 h-10" style={{ color: 'var(--lime-on)' }} />
            </div>

            <h2 className="text-3xl font-black tracking-tighter uppercase mb-2">Panou Admin</h2>
            <p className="text-sm font-bold mb-8 uppercase tracking-widest text-[10px]" style={{ color: 'var(--muted)' }}>Acces Securizat Star-Arena</p>

            <form onSubmit={login} className="w-full space-y-5">
              {error && <div className="p-4 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl text-[11px] font-black uppercase text-center backdrop-blur-sm">{error}</div>}

              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--muted)' }}>Utilizator</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--faint)' }} />
                  <input
                    className="w-full rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold outline-none transition-all sa-form-input"
                    style={{ background: 'var(--surface2)', border: '1.5px solid var(--border)', color: 'var(--text)' }}
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="ex: admin"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black uppercase tracking-widest ml-1" style={{ color: 'var(--muted)' }}>Parola</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--faint)' }}>
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  </div>
                  <input
                    type="password"
                    className="w-full rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold outline-none transition-all sa-form-input"
                    style={{ background: 'var(--surface2)', border: '1.5px solid var(--border)', color: 'var(--text)' }}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                className="w-full rounded-2xl py-4 font-black uppercase tracking-[0.2em] text-[11px] shadow-xl transition-all active:scale-95 disabled:opacity-50 mt-4"
                style={{ background: 'var(--lime)', color: 'var(--lime-on)', boxShadow: '0 8px 24px rgba(163,230,53,0.25)' }}
                type="submit"
                disabled={!username || !password}
              >
                Autentificare
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
            <FilterBar
              sportValue={sport}
              onSportChange={v => setSport(v)}
              includeAllSport
              disabledSports={disabledSports}
              courtValue={courtId}
              onCourtChange={e => setCourtId(e.target.value ? Number(e.target.value) : '')}
              courtOptions={<>
                <option value="">Toate Terenurile</option>
                {availabilityCourts.map(c => {
                  const label = /^teren/i.test(c.name) ? c.name : `Teren ${c.name}`
                  return <option key={c.id} value={c.id}>{label}</option>
                })}
              </>}
              dateDisplay={formatDateDisplay(date)}
              onDatePrev={() => shiftDate(-1)}
              onDateNext={() => shiftDate(1)}
              dateTrigger={
                <CalendarDemo value={date} onChange={newDate => setDate(newDate)}>
                  <div className="relative flex-1 min-w-0 flex items-center justify-center cursor-pointer group px-2 w-full">
                    <div className="text-[13px] font-extrabold text-center select-none truncate transition-colors" style={{ color: 'var(--text)', fontFamily: "'Outfit', sans-serif" }}>
                      {formatDateDisplay(date)}
                    </div>
                  </div>
                </CalendarDemo>
              }
            >
              <SegmentedControl
                options={[
                  { value: 'ALL', label: 'Toate' },
                  { value: 'CONFIRMED', label: 'Confirmate' },
                  { value: 'PENDING_APPROVAL', label: 'Aprobare' },
                  { value: 'CANCELLED', label: 'Anulate' },
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </FilterBar>

            <div className="flex gap-2">
              <button
                className="px-6 flex-1 md:flex-none h-11 rounded-2xl shadow-xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center transition-all disabled:opacity-50 active:scale-95"
                style={{ background: 'var(--lime)', color: 'var(--lime-on)' }}
                onClick={reload}
                disabled={loading}
              >
                {loading ? '...' : 'Încarcă'}
              </button>
              <button
                className="px-5 flex-1 md:flex-none h-11 rounded-2xl shadow-xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-95 whitespace-nowrap"
                style={{ background: '#f59e0b', color: '#020617' }}
                onClick={approveAll}
                disabled={approvingAll || loading}
                title={`Aprobă toate rezervările pending${sport ? ` pentru ${sportLabel(sport as SportType)}` : ''} din următoarele 13 luni`}
              >
                {approvingAll ? '...' : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    Aprobă tot
                  </>
                )}
              </button>
            </div>
            {approveAllResult && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider animate-in slide-in-from-top-2" style={{ background: 'rgba(16,185,129,0.14)', color: '#34d399' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg>
                {approveAllResult}
                <button onClick={() => setApproveAllResult(null)} className="ml-auto hover:opacity-70">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Sub-bar for Search & View Toggle */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pt-4 border-t mt-4" style={{ borderColor: 'var(--border)' }}>
              <div className="relative w-full sm:max-w-xs group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors" style={{ color: 'var(--faint)' }} />
                <input
                  type="text"
                  placeholder="Caută nume sau telefon..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl text-sm transition-all shadow-sm border"
                  style={{ background: 'var(--surface2)', borderColor: 'var(--border)', color: 'var(--text)' }}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-all hover:opacity-70"
                    style={{ color: 'var(--faint)' }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex p-1.5 rounded-2xl shadow-inner w-full sm:w-auto border" style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}>
                <button
                  onClick={() => setViewMode('list')}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                  style={viewMode === 'list' ? { background: 'var(--lime)', color: 'var(--lime-on)' } : { color: 'var(--muted)' }}
                >
                  <List className="w-4 h-4" />
                  Listă
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                  style={viewMode === 'calendar' ? { background: 'var(--lime)', color: 'var(--lime-on)' } : { color: 'var(--muted)' }}
                >
                  <CalendarIcon className="w-4 h-4" />
                  Calendar
                </button>
              </div>
            </div>

          {error && <div className="p-3 rounded-2xl text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-2" style={{ background: 'rgba(244,63,94,0.14)', color: '#fb7185' }}>
            <X className="w-4 h-4" />
            {error}
          </div>}

          {viewMode === 'list' ? (
            <>
              <div className="md:hidden rounded-[24px] border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)', boxShadow: 'var(--card-shadow)' }}>
                {filteredBookings.map(b => {
                  const nowDate = new Date()
                  const nowStr = nowDate.toTimeString().slice(0, 5)
                  const todayStr = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}-${String(nowDate.getDate()).padStart(2, '0')}`
                  const isPassed = (b.bookingDate < todayStr) || (b.bookingDate === todayStr && b.endTime <= nowStr) || b.status === 'CANCELLED'
                  const endDate = new Date(`${b.bookingDate}T${b.endTime === '24:00' ? '23:59' : b.endTime}`)
                  const hoursSinceEnd = (new Date().getTime() - endDate.getTime()) / (1000 * 60 * 60)
                  const isOld = hoursSinceEnd >= 2
                  const intervalStarted = (b.bookingDate < todayStr) || (b.bookingDate === todayStr && b.startTime <= nowStr)

                  return (
                    <div
                      key={b.id}
                      className="flex items-center gap-3 px-4 py-3.5 border-b last:border-b-0"
                      style={{ borderColor: 'var(--border)', opacity: b.status === 'CANCELLED' ? 0.55 : b.status === 'NO_SHOW' ? 0.7 : 1 }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[15px] font-extrabold truncate" style={{ color: 'var(--text)', fontFamily: "'Outfit', sans-serif" }}>{b.customerName}</span>
                          <StatusIcon status={b.status} label={statusLabel(b.status)} />
                        </div>
                        <div className="text-xs font-semibold mt-1" style={{ color: 'var(--faint)' }}>Teren {b.court.name} · {sportLabel(b.court?.sportType)}</div>
                        <div className="text-xs font-semibold mt-0.5" style={{ color: 'var(--faint)' }}>{formatTime(b.startTime)} – {formatTime(b.endTime)} · {(b.price as unknown as number)?.toFixed?.(0)} RON</div>
                        {b.customerPhone && (
                          <a
                            href={`tel:${b.customerPhone}`}
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1.5 mt-1 text-xs font-bold transition-colors hover:opacity-70"
                            style={{ color: 'var(--lime-link)' }}
                          >
                            <Phone className="w-3 h-3 shrink-0" /> {b.customerPhone}
                          </a>
                        )}
                        {b.status === 'PENDING_APPROVAL' && ((b.playerCancellationsCount ?? 0) > 0 || (b.playerNoShowCount ?? 0) > 0) && (
                          <div className="flex gap-1.5 flex-wrap mt-1.5">
                            {(b.playerCancellationsCount ?? 0) > 0 && (
                              <div className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: 'rgba(244,63,94,0.14)', color: '#fb7185' }}>{b.playerCancellationsCount} ANULĂRI</div>
                            )}
                            {(b.playerNoShowCount ?? 0) > 0 && (
                              <div className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: 'rgba(148,163,184,0.16)', color: 'var(--text2)' }}>{b.playerNoShowCount} NEPREZENTĂRI</div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1.5 shrink-0 items-stretch">
                        {b.status === 'CANCELLED' ? (
                          !intervalStarted && (
                          <button
                            className="rounded-[9px] text-[9px] font-black uppercase tracking-wide text-center transition-opacity disabled:opacity-50"
                            style={{ padding: '6px 11px', fontFamily: "'Outfit', sans-serif", background: '#10b981', color: '#052e16' }}
                            onClick={() => { setConfirmId(b.id); setConfirmAction('restore') }}
                            disabled={restoringIds.has(b.id)}
                          >
                            Restabilește
                          </button>
                          )
                        ) : b.status === 'NO_SHOW' ? null : b.status === 'PENDING_APPROVAL' ? (
                          <>
                            <button
                              className="rounded-[9px] text-[9px] font-black uppercase tracking-wide text-center"
                              style={{ padding: '6px 11px', fontFamily: "'Outfit', sans-serif", background: '#10b981', color: '#052e16' }}
                              onClick={() => approve(b.id)}
                            >
                              Aprobă
                            </button>
                            <button
                              className="rounded-[9px] text-[9px] font-black uppercase tracking-wide text-center"
                              style={{ padding: '6px 11px', fontFamily: "'Outfit', sans-serif", background: '#f43f5e', color: '#fff' }}
                              onClick={() => reject(b.id)}
                            >
                              Respinge
                            </button>
                          </>
                        ) : (
                          <>
                            {!isOld && (
                              <button
                                className="rounded-[9px] text-[9px] font-black uppercase tracking-wide text-center transition-opacity disabled:opacity-50"
                                style={{ padding: '6px 11px', fontFamily: "'Outfit', sans-serif", background: '#f43f5e', color: '#fff' }}
                                onClick={() => { setConfirmId(b.id); setConfirmAction('cancel') }}
                                disabled={cancellingIds.has(b.id)}
                              >
                                Anulează
                              </button>
                            )}
                            {(b.status === 'CONFIRMED' || isPassed) && (
                              <button
                                className="rounded-[9px] text-[9px] font-black uppercase tracking-wide text-center transition-opacity disabled:opacity-50"
                                style={{ padding: '6px 11px', fontFamily: "'Outfit', sans-serif", background: '#334155', color: '#f8fafc' }}
                                onClick={() => { setConfirmId(b.id); setConfirmAction('noshow') }}
                                disabled={cancellingIds.has(b.id)}
                              >
                                Neprezentat
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}
                {filteredBookings.length === 0 && (
                  <div className="text-center py-16">
                    <div className="font-black uppercase tracking-[0.2em] text-sm" style={{ color: 'var(--faint)' }}>Nicio rezervare filtrată</div>
                  </div>
                )}
              </div>


              <div className="hidden md:block overflow-hidden rounded-3xl border shadow-2xl" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                <table className="min-w-full text-sm">
                  <thead>
                    <tr style={{ background: 'var(--surface2)' }}>
                      <th className="text-left px-5 py-4 font-black uppercase tracking-widest text-[9px] border-b rounded-tl-2xl" style={{ borderColor: 'var(--border)', color: 'var(--faint)' }}>Sport</th>
                      <th className="text-left px-5 py-4 font-black uppercase tracking-widest text-[9px] border-b" style={{ borderColor: 'var(--border)', color: 'var(--faint)' }}>Teren</th>
                      <th className="text-left px-5 py-4 font-black uppercase tracking-widest text-[9px] border-b" style={{ borderColor: 'var(--border)', color: 'var(--faint)' }}>Data</th>
                      <th className="text-left px-5 py-4 font-black uppercase tracking-widest text-[9px] border-b" style={{ borderColor: 'var(--border)', color: 'var(--faint)' }}>Interval</th>
                      <th className="text-left px-5 py-4 font-black uppercase tracking-widest text-[9px] border-b" style={{ borderColor: 'var(--border)', color: 'var(--faint)' }}>Sumă</th>
                      <th className="text-left px-5 py-4 font-black uppercase tracking-widest text-[9px] border-b" style={{ borderColor: 'var(--border)', color: 'var(--faint)' }}>Client</th>
                      <th className="text-left px-5 py-4 font-black uppercase tracking-widest text-[9px] border-b" style={{ borderColor: 'var(--border)', color: 'var(--faint)' }}>Stare</th>
                      <th className="text-center px-5 py-4 font-black uppercase tracking-widest text-[9px] border-b rounded-tr-2xl" style={{ borderColor: 'var(--border)', color: 'var(--faint)' }}>Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map(b => {
                      const nowDate = new Date()
                      const nowStr = nowDate.toTimeString().slice(0, 5)
                      const todayStr = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}-${String(nowDate.getDate()).padStart(2, '0')}`
                      const isPassed = (b.bookingDate < todayStr) || (b.bookingDate === todayStr && b.endTime <= nowStr) || b.status === 'CANCELLED'
                      const endDate = new Date(`${b.bookingDate}T${b.endTime === '24:00' ? '23:59' : b.endTime}`)
                      const hoursSinceEnd = (new Date().getTime() - endDate.getTime()) / (1000 * 60 * 60)
                      const isOld = hoursSinceEnd >= 2
                      const intervalStarted = (b.bookingDate < todayStr) || (b.bookingDate === todayStr && b.startTime <= nowStr)
                      const chip = statusChipStyle(b.status)

                      return (
                        <tr key={b.id} className="transition-colors group" style={{ opacity: b.status === 'CANCELLED' ? 0.55 : b.status === 'NO_SHOW' ? 0.7 : 1 }}>
                        <td className="px-5 py-4 border-b font-bold" style={{ borderColor: 'var(--border)', color: 'var(--text2)' }}>{sportLabel(b.court?.sportType)}</td>
                        <td className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                          <div className="flex items-center gap-2">
                             <span className="font-extrabold" style={{ color: 'var(--text)' }}>{b.court.name}</span>
                             {b.court?.sportType === 'PADEL' && (
                                <span
                                  className="text-[9px] px-2 py-0.5 rounded-full font-black tracking-widest"
                                  style={b.court.indoor
                                    ? { background: 'rgba(245,158,11,0.14)', color: '#fbbf24' }
                                    : { background: 'rgba(56,189,248,0.14)', color: '#38bdf8' }}
                                >
                                   {b.court.indoor ? 'IN' : 'EXT'}
                                </span>
                             )}
                          </div>
                        </td>
                        <td className="px-5 py-4 border-b font-bold" style={{ borderColor: 'var(--border)', color: 'var(--faint)' }}>{formatDateShortRo(b.bookingDate)}</td>
                        <td className="px-5 py-4 border-b font-black tracking-tight" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>{formatTime(b.startTime)} - {formatTime(b.endTime)}</td>
                        <td className="px-5 py-4 border-b font-black italic" style={{ borderColor: 'var(--border)', color: 'var(--lime-link)' }}>{(b.price as unknown as number)?.toFixed?.(0)} RON</td>
                        <td className="px-5 py-4 border-b pr-8" style={{ borderColor: 'var(--border)' }}>
                          <div className="flex items-center gap-2">
                             <div className="font-black uppercase tracking-tight text-[13px]" style={{ color: 'var(--text)' }}>{b.customerName}</div>
                             {getRankBadge(b.playerMatchesCount)}
                          </div>
                          <div className="text-[10px] font-bold tracking-wider lowercase" style={{ color: 'var(--faint)' }}>
                            tel: {b.customerPhone ? (
                              <a href={`tel:${b.customerPhone}`} className="hover:underline" style={{ color: 'var(--lime-link)' }}>{b.customerPhone}</a>
                            ) : b.customerPhone}
                            {b.customerEmail ? ` • ${b.customerEmail}` : ''}
                          </div>
                        </td>
                        <td className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                          <span className="text-[9px] font-black uppercase tracking-wide px-2 py-1 rounded-full inline-flex items-center" style={{ background: chip.bg, color: chip.color, fontFamily: "'Outfit', sans-serif" }}>{statusLabel(b.status)}</span>
                        </td>
                        <td className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                         <div className="flex justify-center flex-wrap gap-2">
                             {b.status === 'CANCELLED' ? (
                               !intervalStarted && (
                               <button
                                 className="text-[9px] font-black uppercase tracking-wide rounded-[9px] transition-opacity disabled:opacity-50"
                                 style={{ padding: '6px 11px', fontFamily: "'Outfit', sans-serif", background: '#10b981', color: '#052e16' }}
                                 onClick={() => { setConfirmId(b.id); setConfirmAction('restore') }}
                                 disabled={restoringIds.has(b.id)}
                               >
                                 Restabilește
                               </button>
                               )
                             ) : b.status === 'NO_SHOW' ? null : b.status === 'PENDING_APPROVAL' ? (
                               <div className="flex flex-col gap-1.5 items-center">
                                 <div className="flex gap-1.5">
                                   <button onClick={() => approve(b.id)} className="text-[9px] font-black uppercase tracking-wide rounded-[9px]" style={{ padding: '6px 11px', fontFamily: "'Outfit', sans-serif", background: '#10b981', color: '#052e16' }}>Aprobă</button>
                                   <button onClick={() => reject(b.id)} className="text-[9px] font-black uppercase tracking-wide rounded-[9px]" style={{ padding: '6px 11px', fontFamily: "'Outfit', sans-serif", background: '#f43f5e', color: '#fff' }}>Respinge</button>
                                 </div>
                                 {((b.playerCancellationsCount ?? 0) > 0 || (b.playerNoShowCount ?? 0) > 0) && (
                                   <div className="flex gap-1.5">
                                     {(b.playerCancellationsCount ?? 0) > 0 && (
                                       <div className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: 'rgba(244,63,94,0.14)', color: '#fb7185' }}>
                                         {b.playerCancellationsCount} ANULĂRI
                                       </div>
                                     )}
                                     {(b.playerNoShowCount ?? 0) > 0 && (
                                       <div className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: 'rgba(148,163,184,0.16)', color: 'var(--text2)' }}>
                                         {b.playerNoShowCount} NEPREZENTĂRI
                                       </div>
                                     )}
                                   </div>
                                 )}
                               </div>
                             ) : (
                               <>
                                 {!isOld && (
                                   <button
                                     className="text-[9px] font-black uppercase tracking-wide rounded-[9px] transition-opacity disabled:opacity-50"
                                     style={{ padding: '6px 11px', fontFamily: "'Outfit', sans-serif", background: '#f43f5e', color: '#fff' }}
                                     onClick={() => { setConfirmId(b.id); setConfirmAction('cancel') }}
                                     disabled={cancellingIds.has(b.id)}
                                   >
                                     Anulează
                                   </button>
                                 )}
                                 {(b.status === 'CONFIRMED' || isPassed) && (
                                   <button
                                     className="text-[9px] font-black uppercase tracking-wide rounded-[9px] transition-opacity disabled:opacity-50"
                                     style={{ padding: '6px 11px', fontFamily: "'Outfit', sans-serif", background: '#334155', color: '#f8fafc' }}
                                     onClick={() => { setConfirmId(b.id); setConfirmAction('noshow') }}
                                     disabled={cancellingIds.has(b.id)}
                                   >
                                     Neprezentat
                                   </button>
                                 )}
                               </>
                             )}
                          </div>
                        </td>
                      </tr>
                        )
                      }) }
                  </tbody>
                </table>
                {filteredBookings.length === 0 && (
                  <div className="text-center py-24">
                     <div className="font-black uppercase tracking-[0.4em] text-2xl" style={{ color: 'var(--border)' }}>Nicio rezervare</div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-[2.5rem] border shadow-2xl overflow-hidden min-h-[700px] animate-in zoom-in-95 duration-300" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
               <div className="p-5 border-b flex items-center justify-between" style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}>
                  <h3 className="font-black uppercase tracking-widest text-[11px] flex items-center gap-3" style={{ color: 'var(--text)' }}>
                    <CalendarIcon className="w-5 h-5" style={{ color: 'var(--lime-link)' }} />
                    Orar Terenuri — {formatDateDisplay(date)}
                  </h3>
                  <div className="text-[9px] font-black px-3 py-1.5 rounded-full border shadow-sm uppercase tracking-widest" style={{ color: 'var(--faint)', background: 'var(--surface)', borderColor: 'var(--border)' }}>
                    Apasă pe o rezervare pentru Control
                  </div>
               </div>
               <TimelineGrid
                  data={availabilityData}
                  date={date}
                  isAdmin={true}
                  onAdminClick={(courtId, start, end, booking) => {
                    if (booking) {
                      const fullB = bookings.find(b => b.court.id === courtId && b.startTime <= start && b.endTime >= end && b.status !== 'CANCELLED')
                      if (fullB) {
                        setConfirmId(fullB.id);
                        setConfirmAction('cancel');
                      }
                    }
                  }}
                  onReserve={(cid, s, e) => {
                    navigate(`/admin/weekly?courtId=${cid}&date=${date}&start=${s}&end=${e}&sport=${sport || ''}&once=true`)
                  }}
               />
            </div>
          )}

          <div className="mt-8 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 mb-6 font-semibold">
              <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" style={{ color: 'var(--lime-link)' }} />
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] whitespace-nowrap" style={{ color: 'var(--faint)' }}>Analiză Performanță {sport ? sportLabel(sport) : 'Global'}</h3>
              </div>
              <div className="h-px flex-1" style={{ background: 'var(--border)' }} />
            </div>

            <div className="mb-8">
               <RevenueChart data={chartData} title={`Evoluție Venituri ${sport ? sportLabel(sport) : 'Total'}`} total={stats.totalRevenue} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-20">
              {/* Total Revenue Card */}
              <div className="p-6 rounded-[2.5rem] border shadow-xl flex flex-col group hover:scale-[1.02] transition-all duration-300" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl transition-colors" style={{ background: 'rgba(16,185,129,0.14)', color: '#34d399' }}>
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--faint)' }}>Total Confirmat</span>
                </div>
                <div className="text-3xl font-black tracking-tight" style={{ color: 'var(--text)' }}>{stats.totalRevenue.toFixed(0)} <span className="text-sm font-bold italic" style={{ color: 'var(--muted)' }}>RON</span></div>
                <div className="mt-2 text-[11px] font-bold italic line-clamp-1 opacity-70" style={{ color: 'var(--faint)' }}>Suma totală a rezervărilor active</div>
              </div>

              {/* Collected Revenue Card */}
              <div className="p-6 rounded-[2.5rem] border shadow-xl flex flex-col group hover:scale-[1.02] transition-all duration-300" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl transition-colors" style={{ background: 'rgba(56,189,248,0.14)', color: '#38bdf8' }}>
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--faint)' }}>
                    {stats.isToday ? 'Încasat (Până acum)' : 'Total Încasat'}
                  </span>
                </div>
                <div className="text-3xl font-black tracking-tight" style={{ color: 'var(--text)' }}>{stats.collectedRevenue.toFixed(0)} <span className="text-sm font-bold italic" style={{ color: 'var(--muted)' }}>RON</span></div>
                <div className="mt-2 text-[11px] font-bold italic line-clamp-1 opacity-70" style={{ color: 'var(--faint)' }}>Venit din intervale orare consumate</div>
              </div>

              {/* Occupancy Card */}
              <div className="p-6 rounded-[2.5rem] border shadow-xl flex flex-col group hover:scale-[1.02] transition-all duration-300" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-2xl transition-colors" style={{ background: 'rgba(245,158,11,0.14)', color: '#f59e0b' }}>
                    <Percent className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--faint)' }}>Grad Ocupare</span>
                </div>
                <div className="flex items-end gap-3 h-9">
                  <div className="text-4xl font-black tracking-tighter shrink-0" style={{ color: 'var(--text)' }}>{stats.occupancyRate}%</div>
                  <div className="flex-1 h-3 rounded-full mb-1 overflow-hidden border" style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                      style={{ width: `${stats.occupancyRate}%`, background: '#f59e0b' }}
                    />
                  </div>
                </div>
                <div className="mt-2 text-[11px] font-bold italic line-clamp-1 opacity-70" style={{ color: 'var(--faint)' }}>Utilizare terenuri pe parcursul zilei</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmId !== null && confirmAction !== null && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-sm overflow-hidden rounded-[2rem] shadow-2xl border animate-in zoom-in-95 duration-200" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div
              className="p-8 flex flex-col items-center text-center"
              style={{ background: confirmAction === 'restore' ? 'rgba(16,185,129,0.1)' : confirmAction === 'noshow' ? 'var(--surface2)' : 'rgba(244,63,94,0.1)' }}
            >
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-5 rotate-3 shadow-xl ${confirmAction === 'restore' ? 'bg-emerald-500 text-white shadow-emerald-500/30' : confirmAction === 'noshow' ? 'bg-slate-800 text-white shadow-slate-800/30' : 'bg-rose-500 text-white shadow-rose-500/30'}`}>
                {confirmAction === 'restore' ? <CalendarIcon className="w-10 h-10" /> : <X className="w-10 h-10" />}
              </div>
              <h3 className="text-2xl font-black uppercase tracking-widest tracking-tighter" style={{ color: 'var(--text)' }}>{confirmAction === 'restore' ? 'Restabilire' : confirmAction === 'noshow' ? 'Neprezentare' : 'Anulare'}</h3>
              <p className="text-sm mt-3 leading-relaxed font-semibold" style={{ color: 'var(--text2)' }}>
                {confirmAction === 'restore'
                  ? 'Ești sigur că vrei să restabilești această rezervare? Va apărea imediat ca activă.'
                  : confirmAction === 'noshow'
                  ? 'Ești sigur că acest client nu s-a prezentat? Va primi automat O PENALIZARE MAJORĂ (+10 anulări)!'
                  : 'Ești sigur că vrei să anulezi acest interval? Locul va deveni disponibil publicului.'}
              </p>
            </div>

            <div className="p-6 grid grid-cols-2 gap-4" style={{ background: 'var(--surface)' }}>
              <button
                className="w-full py-4 rounded-2xl border font-black active:scale-95 transition-all text-[11px] uppercase tracking-widest"
                style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                onClick={() => { setConfirmId(null); setConfirmAction(null) }}
              >
                Nu, înapoi
              </button>
              <button
                className={`w-full py-4 rounded-2xl text-white font-black shadow-xl active:scale-95 transition-all text-[11px] uppercase tracking-widest ${confirmAction === 'restore' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' : confirmAction === 'noshow' ? 'bg-slate-800 hover:bg-slate-900 shadow-slate-800/30' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/30'}`}
                onClick={async () => {
                  const id = confirmId; const action = confirmAction
                  setConfirmId(null); setConfirmAction(null)
                  if (id != null && action === 'restore') await restore(id)
                  if (id != null && action === 'cancel') await cancel(id)
                  if (id != null && action === 'noshow') await noshow(id)
                }}
              >
                Da, confirmă
              </button>
            </div>
          </div>
        </div>
      )}

      {unavailableVisible && (
        <div className="fixed inset-x-0 bottom-5 z-[100] flex justify-center px-4 pointer-events-none">
          <div
            className="pointer-events-auto max-w-md w-full flex items-center justify-between gap-3 px-5 py-3 rounded-2xl text-sm font-medium shadow-xl"
            style={{ background: 'rgba(244,63,94,0.14)', color: '#fb7185', border: '1px solid rgba(244,63,94,0.3)', backdropFilter: 'blur(8px)' }}
          >
            <span>{unavailableMessage}</span>
            <button
              type="button"
              onClick={() => {
                if (unavailableHideTimer.current) clearTimeout(unavailableHideTimer.current)
                setUnavailableVisible(false)
              }}
              aria-label="Închide"
              className="shrink-0 text-lg leading-none opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
)
}










































