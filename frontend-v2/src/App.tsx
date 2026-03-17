import React, { useEffect, useMemo, useState } from 'react'
import SportPicker from './components/SportPicker'
import TimelineGrid from './components/TimelineGrid'
import { AvailabilityDto, SportType, CourtDto, getPricePerHour, LOCATION_TAGS } from './types'
import { fetchAvailability, fetchActiveCourts } from './api'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import fastCat from './assets/fast-cat.svg'


type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isIOS() {
  if (typeof window === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
}

function isAppInstalled() {
  if (typeof window === 'undefined') return false
  const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches
  const iOSStandalone = (window.navigator as any).standalone === true
  return !!(standalone || iOSStandalone)
}

function shouldShowInstallPrompt() {
  if (typeof window === 'undefined') return false
  if (isAppInstalled()) return false
  try {
    const last = Number(localStorage.getItem('pwaInstallLastShownAt') || 0)
    const tenMinutesMs = 10 * 60 * 1000
    return !last || (Date.now() - last) >= tenMinutesMs
  } catch {
    return true
  }
}

function markInstallPromptShown() {
  if (typeof window === 'undefined') return
  try { localStorage.setItem('pwaInstallLastShownAt', String(Date.now())) } catch {}
}

function todayISO(offsetDays = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}


function timeToMinutes(t: string) {
  if (t === '24:00' || t === '23:59') return 24 * 60
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function maxDateISO() {
  const d = new Date()
  d.setMonth(d.getMonth() + 3)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function formatDateDisplay(iso?: string) {
  if (!iso) return ''
  const today = todayISO()
  const tomorrow = todayISO(1)
  
  if (iso === today) return 'Azi'
  if (iso === tomorrow) return 'Mâine'

  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  
  const months = [
    'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 
    'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
  ]
  const monthIdx = Math.max(0, Math.min(11, Number(m) - 1))
  const dd = String(Number(d))
  const currentYear = new Date().getFullYear().toString()
  
  return y === currentYear ? `${dd} ${months[monthIdx]}` : `${dd} ${months[monthIdx]} ${y}`
}

export default function App() {
  const [searchParams] = useSearchParams()
  const lsSport = (typeof window !== 'undefined' ? (localStorage.getItem('lastSport') as SportType | null) : null)
  const paramDate = searchParams.get('date')
  const paramSport = searchParams.get('sport') as SportType
  const initialSport = paramSport || lsSport || 'TENNIS'
  const initialDate = paramDate || todayISO()
  const [sport, setSport] = useState<SportType>(initialSport)

  // React to sport query parameter changes from external navigation (e.g. homepage cards)
  useEffect(() => {
    if (paramSport && paramSport !== sport) {
      setSport(paramSport)
    }
  }, [paramSport])
  const [date, setDate] = useState<string>(initialDate)
  const [data, setData] = useState<AvailabilityDto[]>([])
  const [activeCourts, setActiveCourts] = useState<CourtDto[]>([])
  const [loading, setLoading] = useState(false)
  const [hover, setHover] = useState<string>('')
  const nav = useNavigate()
  const gridScrollRef = React.useRef<HTMLDivElement | null>(null)
  const dateInputRef = React.useRef<HTMLInputElement | null>(null)
  const [selCourtId, setSelCourtId] = useState<number | null>(null)
  const [selStart, setSelStart] = useState<string | null>(null)
  const [selEnd, setSelEnd] = useState<string | null>(null)
  const [selValid, setSelValid] = useState<boolean>(false)
  const [selGapInvalid, setSelGapInvalid] = useState<boolean>(false)
  const [player, setPlayer] = useState<any>(null)
  const [gapToastVisible, setGapToastVisible] = useState<boolean>(false)
  const [gapToastMessage, setGapToastMessage] = useState<string>('')
  const [gapToastFading, setGapToastFading] = useState<boolean>(false)
  const gapToastShowTimer = React.useRef<any>(null)
  const gapToastHideTimer = React.useRef<any>(null)
  const [clearTick, setClearTick] = useState<number>(0)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [showIOSInstall, setShowIOSInstall] = useState(false)
  const [unavailableVisible, setUnavailableVisible] = useState(false)
  const [unavailableMessage, setUnavailableMessage] = useState('')

  const selectedCourtName = useMemo(() => {
    if (!selCourtId) return null
    const row = data.find(d => d.court.id === selCourtId)
    return row?.court.name ?? null
  }, [selCourtId, data])

  const displayDate = useMemo(() => formatDateDisplay(date), [date])
  const activeSports = useMemo(() => new Set(activeCourts.map(c => c.sportType)), [activeCourts])
  const disabledSports = useMemo(() => {
    const all: SportType[] = ['TENNIS','PADEL','BEACH_VOLLEY','BASKETBALL','FOOTVOLLEY','TABLE_TENNIS']
    return all.filter(s => !activeSports.has(s))
  }, [activeSports])

  useEffect(() => {
    async function syncAuth() {
      const token = localStorage.getItem('playerToken')
      const data = localStorage.getItem('playerData')
      
      if (data) {
        try { setPlayer(JSON.parse(data)) } catch { setPlayer(null) }
      } else if (token) {
        // Data missing but token exists - fetch it
        try {
          const { fetchPlayerMe } = await import('./api')
          const userData = await fetchPlayerMe(token)
          setPlayer(userData)
          localStorage.setItem('playerData', JSON.stringify(userData))
        } catch { setPlayer(null) }
      } else {
        setPlayer(null)
      }
    }
    syncAuth()
    window.addEventListener('storage', syncAuth)
    window.addEventListener('auth-change', syncAuth)
    return () => {
      window.removeEventListener('storage', syncAuth)
      window.removeEventListener('auth-change', syncAuth)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchAvailability(date, sport)
      .then(originalData => {
        // Apply seasonal rules, price overrides and sort by availability
        const filteredData = originalData.filter(row => {
          const isPadel = row.court.sportType === 'PADEL'
          const courtName = row.court.name.trim()
          // Padel Teren 4 is removed as per user request
          if (isPadel && courtName === '4') return false
          // Support only 1 Basketball court as per user request (Round 21.5)
          if (row.court.sportType === 'BASKETBALL' && courtName !== '1') return false
          return true
        })

        const processed = filteredData.map(row => {
          const newRow = { ...row }
          const isPadel = row.court.sportType === 'PADEL'
          const isBasketball = row.court.sportType === 'BASKETBALL'
          const isTennis = row.court.sportType === 'TENNIS'
          const isFootVolley = row.court.sportType === 'FOOTVOLLEY'
          const isTableTennis = row.court.sportType === 'TABLE_TENNIS'
          const isVolley = row.court.sportType === 'BEACH_VOLLEY'
          const isOutdoor = !row.court.indoor

          // Pricing logic from types.ts
          newRow.court.pricePerHour = getPricePerHour(row.court.sportType, row.court.indoor, date)

          // Seasonal unavailability
          let forceUnavailable = false
          if (isOutdoor && isTennis && date < '2026-04-01') {
             forceUnavailable = true
          }

          if (forceUnavailable) {
             newRow.free = []
             newRow.booked = [{ start: '00:00', end: '24:00', status: 'BLOCKED' } as any]
          }

          // PADEL COURTS - Location Tagging
          if (isPadel) {
            const courtName = row.court.name.trim()
            if (courtName === '2' || courtName === '3') {
              newRow.court.notes = LOCATION_TAGS.STAR_ARENA
            } else {
              newRow.court.notes = LOCATION_TAGS.COSMIN
            }
          }

          return newRow
        })
        
        setData(processed)
      })
      .finally(() => setLoading(false))
  }, [date, sport])

  const activeData = useMemo(() => {
    // 1. Filter out fully-blocked seasonal courts from grid
    const isBeforeApril15 = date < '2026-04-15'
    const filtered = data.filter(row => {
      // Scoate din grid ORICE teren complet blocat (BLOCKED 00:00-24:00)
      const isAllBlocked = row.booked.length === 1 && 
                           row.booked[0].start === '00:00' && 
                           row.booked[0].end === '24:00' && 
                           (row.booked[0] as any).status === 'BLOCKED'
      return !isAllBlocked
    })

    // 2. Sort by availability (most free time first)
    return [...filtered].sort((a, b) => {
      const freeA = a.free.reduce((acc, f) => {
        const start = timeToMinutes(f.start)
        const end = timeToMinutes(f.end)
        return acc + (end - start)
      }, 0)
      const freeB = b.free.reduce((acc, f) => {
        const start = timeToMinutes(f.start)
        const end = timeToMinutes(f.end)
        return acc + (end - start)
      }, 0)
      
      if (freeB !== freeA) return freeB - freeA
      if (a.court.indoor !== b.court.indoor) return a.court.indoor ? -1 : 1
      return a.court.id - b.court.id
    })
  }, [data, date])

  const hasSeasonalOutdoor = useMemo(() => {
    const isBeforeApril15 = date < '2026-04-15'
    return isBeforeApril15 && data.some(row => {
      const isAllBlocked = row.booked.length === 1 && 
                           row.booked[0].start === '00:00' && 
                           row.booked[0].end === '24:00' && 
                           (row.booked[0] as any).status === 'BLOCKED'
      return isAllBlocked
    })
  }, [data, date])

  useEffect(() => {
    fetchActiveCourts()
      .then(setActiveCourts)
      .catch(() => setActiveCourts([]))
  }, [])

  useEffect(() => {
    return () => {
      try { if (gapToastShowTimer.current) clearTimeout(gapToastShowTimer.current) } catch {}
      try { if (gapToastHideTimer.current) clearTimeout(gapToastHideTimer.current) } catch {}
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('lastSport', sport)
    } catch {}
  }, [sport])

  useEffect(() => {
    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      const deferred = e as BeforeInstallPromptEvent
      setInstallPrompt(deferred)
      if (shouldShowInstallPrompt()) {
        markInstallPromptShown()
        setShowInstall(true)
      }
    }
    function onAppInstalled() {
      setShowInstall(false)
      setInstallPrompt(null)
      markInstallPromptShown()
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  useEffect(() => {
    if (installPrompt) return
    if (isIOS() && shouldShowInstallPrompt()) {
      markInstallPromptShown()
      setShowIOSInstall(true)
    }
  }, [installPrompt])

  function shiftDate(days: number) {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    setDate(d.toISOString().slice(0, 10))
  }

  function handleSelectionChange(courtId: number | null, start: string | null, end: string | null, valid: boolean, gapInvalid?: boolean | string) {
    setSelCourtId(courtId)
    setSelStart(start)
    setSelEnd(end)
    setSelValid(valid)
    const gi = !!gapInvalid
    setSelGapInvalid(gi)
    if (gi) {
      setGapToastMessage(typeof gapInvalid === 'string' ? gapInvalid : 'Rezervarea curentă lasă o pauză de 30 de minute lângă o altă rezervare pe același teren. Extinde sau mută selecția pentru a elimina golul.')
      setGapToastVisible(true)
      setGapToastFading(false)
      if (gapToastShowTimer.current) clearTimeout(gapToastShowTimer.current)
      if (gapToastHideTimer.current) clearTimeout(gapToastHideTimer.current)
      gapToastShowTimer.current = setTimeout(() => setGapToastFading(true), 5000)
      gapToastHideTimer.current = setTimeout(() => setGapToastVisible(false), 7000)
    } else {
      if (gapToastShowTimer.current) clearTimeout(gapToastShowTimer.current)
      if (gapToastHideTimer.current) clearTimeout(gapToastHideTimer.current)
      setGapToastFading(false)
      setGapToastVisible(false)
    }
  }

  function openBooking() {
    if (!selCourtId || !selStart || !selEnd || !selValid) return
    nav(`/book/${selCourtId}/${date}/${selStart}/${selEnd}?sport=${encodeURIComponent(sport)}`)
  }

  function clearSelection() {
    setSelCourtId(null)
    setSelStart(null)
    setSelEnd(null)
    setSelValid(false)
    setSelGapInvalid(false)
    setClearTick(t => t + 1)
  }

  function showUnavailable(message: string) {
    setUnavailableMessage(message)
    setUnavailableVisible(true)
  }

  function isSelectionStillFree() {
    if (!selCourtId || !selStart || !selEnd) return true
    if (selEnd < selStart) return true
    const row = data.find(d => d.court.id === selCourtId)
    if (!row) return true
    const startMin = timeToMinutes(selStart)
    const endMin = timeToMinutes(selEnd)
    return row.free.some(range => {
      const rangeStart = timeToMinutes(range.start)
      const rangeEnd = timeToMinutes(range.end)
      return startMin >= rangeStart && endMin <= rangeEnd
    })
  }

  useEffect(() => {
    if (!selCourtId || !selStart || !selEnd) return
    if (!isSelectionStillFree()) {
      clearSelection()
      showUnavailable('Ups, teren ocupat! Alt juc\u0103tor a fost mai iute de lab\u0103! \uD83D\uDC31')
    }
  }, [data, selCourtId, selStart, selEnd])

  async function handleInstall() {
    if (!installPrompt) return
    try {
      await installPrompt.prompt()
      await installPrompt.userChoice
    } catch {}
    setShowInstall(false)
    setInstallPrompt(null)
  }

  function handleDismissInstall() {
    setShowInstall(false)
  }

  function handleDismissIOSInstall() {
    setShowIOSInstall(false)
  }

  useEffect(() => {
    function refetch() {
      setLoading(true)
      fetchAvailability(date, sport).then(setData).finally(() => setLoading(false))
    }
    let ch: BroadcastChannel | null = null
    try {
      ch = new BroadcastChannel('bookingUpdates')
      ch.onmessage = (ev) => {
        if (!ev?.data) return
        refetch()
      }
    } catch {}
    function onStorage(e: StorageEvent) {
      if (e.key === 'bookingUpdate') refetch()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
      try { ch?.close() } catch {}
    }
  }, [date, sport])

  const backgroundBySport: Record<SportType, string> = {
    TENNIS: '/tennis-background.png',
    PADEL: '/padel-background.png',
    BEACH_VOLLEY: '/volley-ball-background.png',
    BASKETBALL: '/basketball-background.png',
    FOOTVOLLEY: '/soccer-background.png',
    TABLE_TENNIS: '/ping-pong-background.png',
  }
  const bg = backgroundBySport[sport]

  return (
    <div className="min-h-dvh relative font-sans text-slate-100 selection:bg-emerald-500 selection:text-white">
      {/* Fixed Background Layer */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none transition-all duration-700"
        style={{ 
          backgroundImage: bg ? `url('${bg}')` : 'none', 
          backgroundSize: 'cover', 
          backgroundPosition: 'center', 
          backgroundRepeat: 'no-repeat'
        }}
      >
        <div className="absolute inset-0 bg-slate-950/20 backdrop-blur-[1px]" />
      </div>

      <div className="max-w-7xl mx-auto px-0 pt-0 h-dvh overflow-hidden flex flex-col gap-1.5 relative z-10">
      {showInstall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-[90vw] max-w-md rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 shadow-xl">
            <div className="text-lg font-semibold">Instaleaza aplicatia Star Arena</div>
            <div className="mt-1 text-sm text-emerald-800">Acces rapid din ecranul principal.</div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="px-4 py-2 rounded border border-emerald-300 text-emerald-800" onClick={handleDismissInstall}>Renunta</button>
              <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={handleInstall}>Instaleaza</button>
            </div>
          </div>
        </div>
      )}
      {showIOSInstall && !showInstall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-[90vw] max-w-md rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-xl">
            <div className="text-lg font-semibold">Instalare pe iPhone</div>
            <div className="mt-1 text-sm text-amber-800">Apasa Partajeaza si apoi Adauga pe ecranul principal pentru a instala aplicatia.</div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="px-4 py-2 rounded border border-amber-300 text-amber-800" onClick={handleDismissIOSInstall}>Am inteles</button>
            </div>
          </div>
        </div>
      )}
      {/* Navbar compact - lipit de varf */}
      <nav className="shrink-0 flex items-center justify-between bg-white/15 backdrop-blur-xl border-b border-white/20 px-4 py-2 z-20 shadow-sm">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => nav('/')}
            className="bg-black/20 hover:bg-black/40 text-white p-1.5 rounded-full backdrop-blur-md transition-all active:scale-95 flex items-center justify-center"
            aria-label="Înapoi acasă"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <span className="font-extrabold text-base md:text-lg tracking-tighter text-white drop-shadow-md" style={{ fontFamily: 'Outfit, sans-serif' }}>
            STAR<span className="text-emerald-400">ARENA</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:block">
            <h2 className="text-xs font-bold text-white uppercase tracking-widest bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-400/30">
              {sport === 'TENNIS' ? 'Tenis' : 
               sport === 'PADEL' ? 'Padel' : 
               sport === 'BEACH_VOLLEY' ? 'Volei' : 
               sport === 'BASKETBALL' ? 'Baschet' : 
               sport === 'FOOTVOLLEY' ? 'Tenis de picior' : 
               sport === 'TABLE_TENNIS' ? 'Tenis de Masă' : 'Sport'}
            </h2>
          </div>
          <button
            onClick={() => {
              if (player) nav('/profile');
              else nav('/cont');
            }}
            className={`p-1.5 rounded-full backdrop-blur-md transition-all active:scale-95 flex items-center justify-center shadow-lg border ${player ? 'bg-amber-500 border-amber-400/50' : 'bg-emerald-500 border-emerald-400/50'} text-white`}
            aria-label="Contul Meu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {player && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-lime-400 border-2 border-white rounded-full"></span>
            )}
          </button>
          {player && (
            <button
               onClick={() => {
                 localStorage.removeItem('playerToken');
                 localStorage.removeItem('playerData');
                 window.dispatchEvent(new Event('auth-change'));
                 nav('/');
               }}
               className="bg-white/10 hover:bg-white/20 text-white/70 hover:text-white p-1.5 rounded-full transition-all flex items-center justify-center"
               title="Ieșire"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            </button>
          )}
        </div>
      </nav>

      <section className="flex-1 min-h-0 flex flex-col px-2 pb-2 pt-1 relative z-10 w-full">
        {/* Compact Toolbar: Sport Dropdown + Date - ONE ROW */}
        <div className="bg-white/85 backdrop-blur-2xl px-3 py-2 rounded-2xl shadow-lg border border-white flex flex-row items-center gap-2 w-full mb-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <select
              value={sport}
              onChange={e => setSport(e.target.value as SportType)}
              className="flex-1 min-w-0 bg-emerald-500 text-white font-bold text-sm rounded-xl px-3 py-2 border-0 outline-none cursor-pointer appearance-none text-center"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              {([
                { value: 'TENNIS', label: '🎾 Tenis' },
                { value: 'PADEL', label: '🏓 Padel' },
                { value: 'BEACH_VOLLEY', label: '🏐 Volei' },
                { value: 'BASKETBALL', label: '🏀 Baschet' },
                { value: 'FOOTVOLLEY', label: '⚽ Tenis de picior' },
                { value: 'TABLE_TENNIS', label: '🏓 Tenis de Masă' },
              ] as { value: SportType; label: string }[]).map(({ value, label }) => {
                const hasActive = activeCourts.some(c => c.sportType === value)
                return (
                  <option key={value} value={value} disabled={!hasActive}
                    style={!hasActive ? { color: '#94a3b8', background: '#f1f5f9' } : {}}
                  >
                    {label}{!hasActive ? ' (Indisponibil)' : ''}
                  </option>
                )
              })}
            </select>
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-slate-200 shrink-0" />

          {/* Date compact */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              className="w-7 h-8 flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors text-lg font-bold"
              onClick={() => shiftDate(-1)}
              aria-label="Ziua anterioară"
            >
              ‹
            </button>
            <button
              type="button"
              className="relative flex items-center gap-1 px-2 py-1.5 hover:bg-emerald-50 rounded-xl transition-colors group"
              onClick={() => {
                const el = dateInputRef.current
                if (!el) return
                try { if (typeof (el as any).showPicker === 'function') { (el as any).showPicker(); return } } catch {}
                try { el.click() } catch {}
              }}
            >
              <span className="text-sm font-bold text-slate-800 whitespace-nowrap min-w-[70px] text-center group-hover:text-emerald-600 transition-colors">
                {displayDate}
              </span>
              <div className="text-slate-400 group-hover:text-emerald-500 transition-colors flex items-center justify-center w-6 h-6">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <input
                ref={dateInputRef}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 opacity-0 pointer-events-none"
                type="date"
                min={todayISO()}
                max={maxDateISO()}
                value={date}
                onChange={e => setDate(e.target.value)}
              />
            </button>
            <button
              type="button"
              className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors text-lg font-bold"
              onClick={() => shiftDate(1)}
              aria-label="Ziua următoare"
            >
              ›
            </button>
          </div>
        </div>
        <div className="mt-1 flex-1 min-h-0 flex flex-col glass-card p-2 md:p-6 rounded-[2rem]">
          {loading ? (
             <div className="flex-1 flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                <div className="mt-4 text-emerald-800 font-medium">Se încarcă terenurile...</div>
             </div>
          ) : (
            <>
                    <div className="-mx-2 flex-1 min-h-0">
                      <TimelineGrid flat data={activeData} date={date} onHover={setHover} onSelectionChange={handleSelectionChange} onReserve={openBooking} clearSignal={clearTick} scrollContainerRef={gridScrollRef} player={player} />
                    </div>
                    {hasSeasonalOutdoor && (
                      <div className="mx-1 mt-1.5 px-4 py-2.5 bg-amber-50/80 backdrop-blur-sm border border-amber-200 rounded-2xl flex items-center gap-3">
                        <span className="text-xl">🌿</span>
                        <div>
                          <div className="font-bold text-sm text-amber-800">Terenuri Exterioare</div>
                          <div className="text-xs text-amber-600">Disponibile din <span className="font-semibold">15 Aprilie 2026</span></div>
                        </div>
                      </div>
                    )}
              <div className="flex justify-center mt-1 mb-1">
                <div className="flex gap-4 items-center opacity-40">
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded bg-emerald-200 border border-emerald-300"></span>
                    <span className="text-[9px] text-slate-500 font-medium">Liber</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded bg-rose-200 border border-rose-300"></span>
                    <span className="text-[9px] text-slate-500 font-medium">Ocupat</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-2.5 h-2.5 rounded bg-slate-200 border border-slate-300" style={{ backgroundImage: 'repeating-linear-gradient(45deg, rgba(148,163,184,0.5) 0, rgba(148,163,184,0.5) 2px, transparent 2px, transparent 5px)' }}></span>
                    <span className="text-[9px] text-slate-500 font-medium">Indisponibil</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
      {gapToastVisible && (
        <div className="fixed inset-x-0 bottom-0 z-[20000] pointer-events-none">
          <div className="max-w-7xl mx-auto px-4">
            <div
              className={`relative rounded border border-rose-300 bg-rose-50 text-rose-800 shadow pointer-events-auto ${gapToastFading ? 'opacity-0' : 'opacity-100'} transition-opacity w-full mb-4`}
              style={{ transitionDuration: '2000ms', height: '33vh' }}
              role="alert"
            >
              <button
                aria-label="Inchide"
                className="absolute top-2 right-2 text-rose-800/70 hover:text-rose-900"
                onClick={() => {
                  if (gapToastShowTimer.current) clearTimeout(gapToastShowTimer.current)
                  if (gapToastHideTimer.current) clearTimeout(gapToastHideTimer.current)
                  setGapToastFading(false)
                  setGapToastVisible(false)
                }}
              >{'\u00D7'}</button>
              <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-4">
                <span className="text-3xl" aria-hidden>{'\u26A0'}</span>
                <div className="text-lg sm:text-xl text-rose-900">
                  {gapToastMessage}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {unavailableVisible && (
        <div className="fixed inset-0 w-screen h-screen z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-[90vw] max-w-sm rounded border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Rezervare indisponibila</div>
              <button
                aria-label="Inchide"
                className="text-amber-900/70 hover:text-amber-900"
                onClick={() => {
                  setUnavailableVisible(false)
                }}
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
                onClick={() => {
                  setUnavailableVisible(false)
                }}
              >
                Am inteles!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}




