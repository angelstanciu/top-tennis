import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { SportType, BookingDto, CourtDto } from '../types'
import AdminHeader from '../components/AdminHeader'
import CalendarDemo from '../components/ui/calendar-1'
import { fetchAvailability, fetchActiveCourts } from '../api'
import TimelineGrid from '../components/TimelineGrid'
import fastCat from '../assets/fast-cat.svg'
import { CalendarIcon, TrendingUp, DollarSign, Percent, Search, X, BarChart3, List, Award } from 'lucide-react'
import { RevenueChart } from '../components/RevenueChart'

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
    const msg = await res.text()
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
  const [searchTerm, setSearchTerm] = useState('')
  const [showCancelled, setShowCancelled] = useState(false)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
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
      const token = localStorage.getItem('adminAuth')
      const ts = Number(localStorage.getItem('adminAuthTS') || 0)
      const valid = token && ts && (Date.now() - ts) <= 3600000
      if (!valid) {
        try { localStorage.removeItem('adminAuth'); localStorage.removeItem('adminAuthTS') } catch { }
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

  function statusChipClass(s?: BookingDto['status']) {
    // Minimal, readable chips
    const base = 'text-xs px-2 py-0.5 rounded border inline-flex items-center'
    switch (s) {
      case 'CONFIRMED':
        return `${base} bg-emerald-50 text-emerald-700 border-emerald-300`
      case 'CANCELLED':
        return `${base} bg-rose-100 text-rose-800 border-rose-300`
      case 'NO_SHOW':
        return `${base} bg-slate-800 text-white border-slate-900`
      case 'BLOCKED':
        return `${base} bg-slate-100 text-slate-700 border-slate-300`
      case 'PENDING_APPROVAL':
        return `${base} bg-amber-100 text-amber-700 border-amber-300 animate-pulse`
      default:
        return `${base} bg-slate-100 text-slate-700 border-slate-300`
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
        // Task 1: Remove Padel Court 4 if it exists and clean labels
        items = items.filter(r => !(r.court.sportType === 'PADEL' && r.court.name === '4'))
        // Hide Temporarily TENNIS 1-5
        items = items.filter(r => !(r.court.sportType === 'TENNIS' && ['1', '2', '3', '4', '5'].includes(r.court.name)))
        
        items.forEach(item => {
          if (item.court.sportType === 'PADEL' && (item.court.name === '2' || item.court.name === '3')) {
            // Force only Indoor label
            item.court.indoor = true
            item.court.notes = undefined
          }
        })

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
    if (!showCancelled) {
      list = list.filter(b => b.status !== 'CANCELLED')
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
  }, [bookings, courtId, searchTerm, date])

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
      try { localStorage.setItem('adminAuth', enc) } catch { }
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

  return (
    <div className="min-h-screen relative font-sans text-slate-900 bg-slate-50 selection:bg-sky-100 selection:text-sky-900">
      {/* Persistent Background Layer to fix mobile resizing jump */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none transition-all duration-700"
        style={{ 
          backgroundImage: bg ? `url('${bg}')` : 'none', 
          backgroundSize: 'cover', 
          backgroundPosition: 'center', 
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-slate-100/40 backdrop-blur-[1px]" />
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-4 relative z-10">
        <AdminHeader active="bookings" />
      {!logged ? (
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="w-full max-w-sm rounded-[2.5rem] border border-sky-100 bg-white/80 backdrop-blur-xl p-10 shadow-2xl shadow-sky-900/10 flex flex-col items-center animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-emerald-500/30 rotate-3 group hover:rotate-6 transition-all">
              <TrendingUp className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase mb-2">Panou Admin</h2>
            <p className="text-slate-400 text-sm font-bold mb-8 uppercase tracking-widest text-[10px]">Acces Securizat Star-Arena</p>

            <form onSubmit={login} className="w-full space-y-5">
              {error && <div className="p-4 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl text-[11px] font-black uppercase text-center backdrop-blur-sm">{error}</div>}
              
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Utilizator</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    className="w-full bg-slate-50 border-slate-100 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 transition-all outline-none" 
                    value={username} 
                    onChange={e => setUsername(e.target.value)} 
                    placeholder="ex: admin"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parola</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  </div>
                  <input 
                    type="password" 
                    className="w-full bg-slate-50 border-slate-100 rounded-2xl pl-11 pr-4 py-3.5 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-sky-500 transition-all outline-none" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button 
                className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-2xl py-4 font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-slate-200 transition-all active:scale-95 disabled:opacity-50 mt-4" 
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
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1 bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 border border-sky-100 shadow-xl shadow-sky-900/5 flex items-center gap-5">
                <div className="bg-emerald-500 text-white p-4 rounded-3xl shadow-lg shadow-emerald-500/20 rotate-3">
                  <DollarSign className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Încasări Azi</div>
                  <div className="text-3xl font-black text-slate-800 tracking-tighter">
                    {stats.totalRevenue.toFixed(0)} <span className="text-sm font-bold text-slate-300 italic">RON</span>
                  </div>
                  <div className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1 mt-1">
                    <TrendingUp className="w-2 h-2" />
                    + {stats.collectedRevenue.toFixed(0)} colectat
                  </div>
                </div>
              </div>

              <div className="flex-1 bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 border border-sky-100 shadow-xl shadow-sky-900/5 flex items-center gap-5">
                <div className="bg-sky-500 text-white p-4 rounded-3xl shadow-lg shadow-sky-500/20 -rotate-3">
                  <Percent className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Grad Ocupare</div>
                  <div className="text-3xl font-black text-slate-800 tracking-tighter">
                    {stats.occupancyRate}%
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-sky-500 transition-all duration-1000" style={{ width: `${stats.occupancyRate}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-sky-100 bg-white/80 backdrop-blur-md p-6 shadow-xl shadow-sky-900/5">
              <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full relative">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Sport</div>
                <select 
                  className="w-full h-11 bg-slate-50 border-slate-100 rounded-2xl px-4 py-2 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all appearance-none shadow-sm" 
                  value={sport} 
                  onChange={e => setSport(e.target.value as SportType | '')}
                >
                  <option value="">Toate Sporturile</option>
                  <option value="TENNIS" disabled={disabledSports.includes('TENNIS')}>Tenis</option>
                  <option value="PADEL" disabled={disabledSports.includes('PADEL')}>Padel</option>
                  <option value="BASKETBALL" disabled={disabledSports.includes('BASKETBALL')}>Baschet</option>
                  <option value="FOOTVOLLEY" disabled={disabledSports.includes('FOOTVOLLEY')}>Tenis de picior</option>
                  <option value="BEACH_VOLLEY" disabled={disabledSports.includes('BEACH_VOLLEY')}>Volei pe Plajă</option>
                  <option value="TABLE_TENNIS" disabled={disabledSports.includes('TABLE_TENNIS')}>Tenis de Masă</option>
                </select>
                <div className="absolute right-4 bottom-3.5 pointer-events-none text-slate-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
              <div className="flex-1 w-full relative">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Teren</div>
                <select
                  className="w-full h-11 bg-slate-50 border-slate-100 rounded-2xl px-4 py-2 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all appearance-none shadow-sm"
                  value={courtId as any}
                  onChange={e => setCourtId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">Toate Terenurile</option>
                  {availabilityCourts.map(c => {
                    const label = /^teren/i.test(c.name) ? c.name : `Teren ${c.name}`
                    return <option key={c.id} value={c.id}>{label}</option>
                  })}
                </select>
                <div className="absolute right-4 bottom-3.5 pointer-events-none text-slate-400">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
              </div>
              <div className="flex-1 w-full">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data</div>
                <div className="relative flex items-stretch bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden h-11 shadow-sm focus-within:ring-4 focus-within:ring-sky-500/10 focus-within:border-sky-500 transition-all">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center px-4 text-xl leading-none text-slate-400 hover:bg-white hover:text-sky-600 border-r border-slate-100 focus:outline-none transition-all"
                    onClick={() => shiftDate(-1)}
                  >
                    {'\u2039'}
                  </button>
                  <CalendarDemo value={date} onChange={newDate => setDate(newDate)}>
                    <div className="relative flex-1 min-w-0 flex items-center justify-center cursor-pointer group px-4">
                      <div className="text-sm font-black text-slate-700 text-center select-none truncate group-hover:text-sky-600 transition-colors uppercase tracking-tight">
                        {formatDateDisplay(date)}
                      </div>
                    </div>
                  </CalendarDemo>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center px-4 text-xl leading-none text-slate-400 hover:bg-white hover:text-sky-600 border-l border-slate-100 focus:outline-none transition-all"
                    onClick={() => shiftDate(1)}
                  >
                    {'\u203A'}
                  </button>
                </div>
              </div>
              <div className="w-full md:w-auto">
                <button
                  className="bg-slate-800 hover:bg-slate-900 text-white px-8 w-full md:w-auto h-11 rounded-2xl shadow-xl shadow-slate-800/20 font-black uppercase tracking-widest text-[11px] flex items-center justify-center transition-all disabled:opacity-50 active:scale-95"
                  onClick={reload}
                  disabled={loading}
                >
                  {loading ? '...' : 'ÎNCARCĂ'}
                </button>
              </div>
            </div>

            {/* Sub-bar for Search & View Toggle */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pt-4 border-t border-slate-100 mt-4">
              <div className="relative w-full sm:max-w-xs group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-sky-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Cauta nume sau telefon..." 
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-2xl bg-white text-sm focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all shadow-sm"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              
              <div className="flex bg-slate-100/50 p-1.5 rounded-2xl shadow-inner w-full sm:w-auto border border-slate-100 items-center justify-between sm:justify-start gap-4 mr-2">
                 <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-500 pl-2">
                    <input 
                      type="checkbox" 
                      className="rounded text-sky-500 focus:ring-sky-500" 
                      checked={showCancelled} 
                      onChange={e => setShowCancelled(e.target.checked)} 
                    />
                    Arată Anulate
                 </label>
              </div>

              <div className="flex bg-slate-100/50 p-1.5 rounded-2xl shadow-inner w-full sm:w-auto border border-slate-100">
                <button 
                  onClick={() => setViewMode('list')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'list' ? 'bg-white text-sky-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <List className="w-4 h-4" />
                  Lista
                </button>
                <button 
                  onClick={() => setViewMode('calendar')}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'calendar' ? 'bg-white text-emerald-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <CalendarIcon className="w-4 h-4" />
                  Calendar
                </button>
              </div>
            </div>
          </div>

          {error && <div className="p-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-2xl text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-2">
            <X className="w-4 h-4 text-rose-500" />
            {error}
          </div>}

          {viewMode === 'list' ? (
            <>
              <div className="space-y-3 md:hidden">
                {filteredBookings.map(b => {
                  const nowStr = new Date().toTimeString().slice(0, 5)
                  const todayStr = new Date().toISOString().slice(0, 10)
                  const isPassed = (b.bookingDate < todayStr) || (b.bookingDate === todayStr && b.endTime <= nowStr) || b.status === 'CANCELLED'
                  const endDate = new Date(`${b.bookingDate}T${b.endTime === '24:00' ? '23:59' : b.endTime}`)
                  const hoursSinceEnd = (new Date().getTime() - endDate.getTime()) / (1000 * 60 * 60)
                  const isOld = hoursSinceEnd >= 2
                  
                  return (
                    <div key={b.id} className={`rounded-3xl border border-sky-100 bg-white/80 backdrop-blur-sm p-4 shadow-lg relative overflow-hidden group ${isPassed ? 'grayscale-[0.8] opacity-70 bg-slate-50/50' : ''}`}>
                    {b.status === 'CANCELLED' && <div className="absolute top-0 right-0 bg-rose-500 text-white text-[10px] px-3 py-1 rounded-bl-xl font-black uppercase tracking-widest shadow-md">ANULAT</div>}
                    <div className="flex justify-between items-center pr-12">
                      <div>
                        <div className="font-black text-slate-800 uppercase tracking-tight">{b.customerName}</div>
                        <div className="text-[11px] font-bold text-slate-400 tracking-wider flex items-center gap-1">
                           <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                           {b.customerPhone}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-500">
                      <span className="bg-slate-100 px-2 py-1 rounded-lg">{sportLabel(b.court?.sportType)}</span>
                      <span className="bg-sky-50 text-sky-600 px-2 py-1 rounded-lg">Teren {b.court.name}</span>
                    </div>
                    <div className="mt-2 text-[13px] font-black text-slate-700 flex items-center gap-2">
                       <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                       {formatTime(b.startTime)} — {formatTime(b.endTime)}
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-3">
                      <div className="text-sm font-black text-emerald-700 italic">{(b.price as unknown as number)?.toFixed?.(0)} RON</div>
                      <div className="flex gap-2">
                        {b.status === 'CANCELLED' || b.status === 'NO_SHOW' ? (
                          <button
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${restoringIds.has(b.id) ? 'opacity-50' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95'}`}
                            onClick={() => { setConfirmId(b.id); setConfirmAction('restore') }}
                            disabled={restoringIds.has(b.id)}
                          >
                            Restabileste
                          </button>
                        ) : (
                          <>
                            {!isOld && (
                              <button
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${cancellingIds.has(b.id) ? 'opacity-50' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 hover:scale-105 active:scale-95'}`}
                                onClick={() => { setConfirmId(b.id); setConfirmAction('cancel') }}
                                disabled={cancellingIds.has(b.id)}
                              >
                                Anuleaza
                              </button>
                            )}
                            {(b.status === 'CONFIRMED' || isPassed) && (
                               <button
                                 className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${cancellingIds.has(b.id) ? 'opacity-50' : 'bg-slate-800 text-white shadow-lg shadow-slate-800/20 hover:scale-105 active:scale-95'}`}
                                 onClick={() => { setConfirmId(b.id); setConfirmAction('noshow') }}
                                 disabled={cancellingIds.has(b.id)}
                               >
                                 Neprezentat
                               </button>
                            )}
                          </>
                        )}
                         {!b.status.includes('CANCELLED') && b.status !== 'PENDING_APPROVAL' && b.status !== 'NO_SHOW' && <span className={statusChipClass(b.status)}>{statusLabel(b.status)}</span>}
                        {b.status === 'PENDING_APPROVAL' && (
                          <div className="flex flex-col gap-2 items-end">
                            <div className="flex gap-1">
                               <button onClick={() => approve(b.id)} className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 active:scale-90 transition-all font-bold">✓</button>
                               <button onClick={() => reject(b.id)} className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20 active:scale-90 transition-all font-bold">✗</button>
                            </div>
                            {((b.playerCancellationsCount ?? 0) > 0 || (b.playerNoShowCount ?? 0) > 0) && (
                               <div className="flex gap-2">
                                 {(b.playerCancellationsCount ?? 0) > 0 && (
                                   <div className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                     {b.playerCancellationsCount} ANULĂRI
                                   </div>
                                 )}
                                 {(b.playerNoShowCount ?? 0) > 0 && (
                                   <div className="text-[10px] font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                     {b.playerNoShowCount} NEPREZENTĂRI
                                   </div>
                                 )}
                               </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    </div>
                  )
                }) }
                {filteredBookings.length === 0 && (
                  <div className="text-center py-16 bg-white/40 rounded-3xl border-2 border-dashed border-slate-200">
                    <div className="text-slate-300 font-black uppercase tracking-[0.2em] text-sm">Nicio rezervare filtrata</div>
                  </div>
                )}
              </div>

              <div className="hidden md:block overflow-hidden rounded-3xl border border-sky-100 bg-white/90 backdrop-blur-md shadow-2xl">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="text-left px-5 py-4 font-black uppercase tracking-widest text-[9px] border-b border-white/10 rounded-tl-2xl">Sport</th>
                      <th className="text-left px-5 py-4 font-black uppercase tracking-widest text-[9px] border-b border-white/10">Teren</th>
                      <th className="text-left px-5 py-4 font-black uppercase tracking-widest text-[9px] border-b border-white/10">Data</th>
                      <th className="text-left px-5 py-4 font-black uppercase tracking-widest text-[9px] border-b border-white/10">Interval</th>
                      <th className="text-left px-5 py-4 font-black uppercase tracking-widest text-[9px] border-b border-white/10">Suma</th>
                      <th className="text-left px-5 py-4 font-black uppercase tracking-widest text-[9px] border-b border-white/10">Client</th>
                      <th className="text-left px-5 py-4 font-black uppercase tracking-widest text-[9px] border-b border-white/10">Stare</th>
                      <th className="text-center px-5 py-4 font-black uppercase tracking-widest text-[9px] border-b border-white/10 rounded-tr-2xl">Actiuni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map(b => {
                      const nowStr = new Date().toTimeString().slice(0, 5)
                      const todayStr = new Date().toISOString().slice(0, 10)
                      const isPassed = (b.bookingDate < todayStr) || (b.bookingDate === todayStr && b.endTime <= nowStr) || b.status === 'CANCELLED'
                      const endDate = new Date(`${b.bookingDate}T${b.endTime === '24:00' ? '23:59' : b.endTime}`)
                      const hoursSinceEnd = (new Date().getTime() - endDate.getTime()) / (1000 * 60 * 60)
                      const isOld = hoursSinceEnd >= 2
                      
                      return (
                        <tr key={b.id} className={`hover:bg-sky-50/50 transition-colors group ${isPassed ? 'grayscale-[0.8] opacity-70 bg-slate-50/30' : ''}`}>
                        <td className="px-5 py-4 border-b border-slate-50 font-bold text-slate-700">{sportLabel(b.court?.sportType)}</td>
                        <td className="px-5 py-4 border-b border-slate-50">
                          <div className="flex items-center gap-2">
                             <span className="font-extrabold text-slate-800">{b.court.name}</span>
                             {b.court?.sportType === 'PADEL' && (
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black tracking-widest ${b.court.indoor ? 'bg-amber-100 text-amber-600' : 'bg-sky-100 text-sky-600'}`}>
                                   {b.court.indoor ? 'IN' : 'EXT'}
                                </span>
                             )}
                          </div>
                        </td>
                        <td className="px-5 py-4 border-b border-slate-50 text-slate-400 font-bold">{formatDateShortRo(b.bookingDate)}</td>
                        <td className="px-5 py-4 border-b border-slate-50 font-black text-slate-800 tracking-tight">{formatTime(b.startTime)} - {formatTime(b.endTime)}</td>
                        <td className="px-5 py-4 border-b border-slate-50 font-black text-emerald-700 italic">{(b.price as unknown as number)?.toFixed?.(0)} RON</td>
                        <td className="px-5 py-4 border-b border-slate-50 pr-8">
                          <div className="flex items-center gap-2">
                             <div className="font-black text-slate-800 uppercase tracking-tight text-[13px]">{b.customerName}</div>
                             {getRankBadge(b.playerMatchesCount)}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 tracking-wider lowercase">tel: {b.customerPhone}{b.customerEmail ? ` • ${b.customerEmail}` : ''}</div>
                        </td>
                        <td className="px-5 py-4 border-b border-slate-50">
                          <span className={statusChipClass(b.status)}>{statusLabel(b.status)}</span>
                        </td>
                        <td className="px-5 py-4 border-b border-slate-50">
                         <div className="flex justify-center flex-wrap gap-2">
                             {b.status === 'CANCELLED' || b.status === 'NO_SHOW' ? (
                               <button
                                 className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
                                 onClick={() => { setConfirmId(b.id); setConfirmAction('restore') }}
                                 disabled={restoringIds.has(b.id)}
                               >
                                 Restabileste
                               </button>
                             ) : b.status === 'PENDING_APPROVAL' ? (
                               <div className="flex flex-col gap-2 items-center">
                                 <div className="flex gap-2">
                                   <button onClick={() => approve(b.id)} className="h-9 px-4 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all font-black text-[11px] uppercase tracking-widest">Aprobă</button>
                                   <button onClick={() => reject(b.id)} className="h-9 px-4 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20 hover:scale-105 active:scale-95 transition-all font-black text-[11px] uppercase tracking-widest">Respinge</button>
                                 </div>
                                 {((b.playerCancellationsCount ?? 0) > 0 || (b.playerNoShowCount ?? 0) > 0) && (
                                   <div className="flex gap-2">
                                     {(b.playerCancellationsCount ?? 0) > 0 && (
                                       <div className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                         {b.playerCancellationsCount} ANULĂRI
                                       </div>
                                     )}
                                     {(b.playerNoShowCount ?? 0) > 0 && (
                                       <div className="text-[10px] font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
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
                                     className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-rose-500 text-white shadow-lg shadow-rose-500/20 hover:scale-105 active:scale-95 transition-all"
                                     onClick={() => { setConfirmId(b.id); setConfirmAction('cancel') }}
                                     disabled={cancellingIds.has(b.id)}
                                   >
                                     Anuleaza
                                   </button>
                                 )}
                                 {(b.status === 'CONFIRMED' || isPassed) && (
                                   <button
                                     className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-slate-800 text-white shadow-lg shadow-slate-800/20 hover:scale-105 active:scale-95 transition-all"
                                     onClick={() => { setConfirmId(b.id); setConfirmAction('noshow') }}
                                     disabled={cancellingIds.has(b.id)}
                                   >
                                     Neprezentare
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
                     <div className="text-slate-200 font-black uppercase tracking-[0.4em] text-2xl">Nicio rezervare</div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white/90 backdrop-blur-md rounded-[2.5rem] border border-sky-100 shadow-2xl overflow-hidden min-h-[700px] animate-in zoom-in-95 duration-300">
               <div className="p-5 bg-sky-50/50 border-b border-sky-100 flex items-center justify-between">
                  <h3 className="font-black text-slate-800 uppercase tracking-widest text-[11px] flex items-center gap-3">
                    <CalendarIcon className="w-5 h-5 text-emerald-500" />
                    Orar Terenuri — {formatDateDisplay(date)}
                  </h3>
                  <div className="text-[9px] text-slate-400 font-black bg-white px-3 py-1.5 rounded-full border border-slate-100 shadow-sm uppercase tracking-widest">
                    Apasă pe o rezervare pentru Control
                  </div>
               </div>
               <TimelineGrid 
                  data={availabilityData} 
                  date={date} 
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
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-sky-200 to-transparent" />
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-sky-500" />
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">Analiză Performanță {sport ? sportLabel(sport) : 'Global'}</h3>
              </div>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-sky-200 to-transparent" />
            </div>

            <div className="mb-8">
               <RevenueChart data={chartData} title={`Evoluție Venituri ${sport ? sportLabel(sport) : 'Total'}`} total={stats.totalRevenue} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-20">
              {/* Total Revenue Card */}
              <div className="bg-white/80 backdrop-blur-xl border border-white p-6 rounded-[2.5rem] shadow-xl shadow-sky-900/5 flex flex-col group hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-emerald-500/10 p-3 rounded-2xl text-emerald-600 transition-colors group-hover:bg-emerald-500 group-hover:text-white">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Confirmat</span>
                </div>
                <div className="text-3xl font-black text-slate-800 tracking-tight">{stats.totalRevenue.toFixed(0)} <span className="text-sm font-bold text-slate-300 italic">RON</span></div>
                <div className="mt-2 text-[11px] text-slate-400 font-bold italic line-clamp-1 opacity-70">Suma totală a rezervărilor active</div>
              </div>

              {/* Collected Revenue Card */}
              <div className="bg-white/80 backdrop-blur-xl border border-white p-6 rounded-[2.5rem] shadow-xl shadow-sky-900/5 flex flex-col group hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-sky-500/10 p-3 rounded-2xl text-sky-600 transition-colors group-hover:bg-sky-500 group-hover:text-white">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {stats.isToday ? 'Incasat (Până acum)' : 'Total Incasat'}
                  </span>
                </div>
                <div className="text-3xl font-black text-slate-800 tracking-tight">{stats.collectedRevenue.toFixed(0)} <span className="text-sm font-bold text-slate-300 italic">RON</span></div>
                <div className="mt-2 text-[11px] text-slate-400 font-bold italic line-clamp-1 opacity-70">Venit din intervale orare consumate</div>
              </div>

              {/* Occupancy Card */}
              <div className="bg-white/80 backdrop-blur-xl border border-white p-6 rounded-[2.5rem] shadow-xl shadow-sky-900/5 flex flex-col group hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-amber-500/10 p-3 rounded-2xl text-amber-600 transition-colors group-hover:bg-amber-500 group-hover:text-white">
                    <Percent className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Grad Ocupare</span>
                </div>
                <div className="flex items-end gap-3 h-9">
                  <div className="text-4xl font-black text-slate-800 tracking-tighter shrink-0">{stats.occupancyRate}%</div>
                  <div className="flex-1 h-3 bg-slate-100 rounded-full mb-1 overflow-hidden border border-slate-50">
                    <div 
                      className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                      style={{ width: `${stats.occupancyRate}%` }}
                    />
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-slate-400 font-bold italic line-clamp-1 opacity-70">Utilizare terenuri pe parcursul zilei</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmId !== null && confirmAction !== null && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-sm overflow-hidden bg-white rounded-[2rem] shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className={`p-8 flex flex-col items-center text-center ${confirmAction === 'restore' ? 'bg-emerald-50' : confirmAction === 'noshow' ? 'bg-slate-100' : 'bg-rose-50'}`}>
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-5 rotate-3 shadow-xl ${confirmAction === 'restore' ? 'bg-emerald-500 text-white shadow-emerald-500/30' : confirmAction === 'noshow' ? 'bg-slate-800 text-white shadow-slate-800/30' : 'bg-rose-500 text-white shadow-rose-500/30'}`}>
                {confirmAction === 'restore' ? <CalendarIcon className="w-10 h-10" /> : <X className="w-10 h-10" />}
              </div>
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-widest tracking-tighter">{confirmAction === 'restore' ? 'Restabilire' : confirmAction === 'noshow' ? 'Neprezentare' : 'Anulare'}</h3>
              <p className="text-sm text-slate-500 mt-3 leading-relaxed font-semibold">
                {confirmAction === 'restore'
                  ? 'Ești sigur că vrei să restabilești această rezervare? Va apărea imediat ca activă.'
                  : confirmAction === 'noshow'
                  ? 'Ești sigur că acest client nu s-a prezentat? Va primi automat O PENALIZARE MAJORĂ (+10 anulări)!'
                  : 'Ești sigur că vrei să anulezi acest interval? Locul va deveni disponibil publicului.'}
              </p>
            </div>
            
            <div className="p-6 grid grid-cols-2 gap-4 bg-white">
              <button
                className="w-full py-4 rounded-2xl border border-slate-100 text-slate-400 font-black hover:bg-slate-50 active:scale-95 transition-all text-[11px] uppercase tracking-widest"
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
        <div className="fixed inset-0 w-screen h-screen z-[10010] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-[2rem] border border-amber-100 bg-white shadow-2xl animate-in zoom-in-95">
            <div className="p-6 bg-amber-50 rounded-t-[2rem] border-b border-amber-100 flex items-center gap-4">
               <div className="bg-amber-100 p-3 rounded-2xl">
                  <img src={fastCat} alt="Pisica" className="w-10 h-10" />
               </div>
               <div>
                  <div className="text-amber-900 font-black uppercase tracking-widest text-xs">Eroare Intervenție</div>
                  <div className="text-[11px] text-amber-700 font-bold">Conflict detectat în calendar</div>
               </div>
            </div>
            <div className="p-6">
              <div className="text-sm text-slate-600 font-semibold leading-relaxed">{unavailableMessage}</div>
              <button
                className="w-full mt-6 py-4 rounded-2xl bg-amber-500 text-white font-black uppercase tracking-widest text-[11px] shadow-lg shadow-amber-500/30 hover:bg-amber-600 transition-all active:scale-95"
                onClick={() => setUnavailableVisible(false)}
              >
                Am înțeles, verific din nou
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
)
}










































