import React, { useEffect, useMemo, useState } from 'react'
import SportPicker from './components/SportPicker'
import TimelineGrid from './components/TimelineGrid'
import { AvailabilityDto, SportType, CourtDto } from './types'
import { fetchAvailability, fetchActiveCourts } from './api'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
  return d.toISOString().slice(0, 10)
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

function timeToMinutes(t: string) {
  if (t === '24:00') return 24 * 60
  if (t === '23:59') return 24 * 60
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export default function App() {
  const [searchParams] = useSearchParams()
  const lsSport = (typeof window !== 'undefined' ? (localStorage.getItem('lastSport') as SportType | null) : null)
  const paramDate = searchParams.get('date')
  const initialSport = lsSport || (searchParams.get('sport') as SportType) || 'TENNIS'
  const initialDate = paramDate || todayISO()
  const [sport, setSport] = useState<SportType>(initialSport)
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
  const [gapToastVisible, setGapToastVisible] = useState<boolean>(false)
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
    try {
      const s = localStorage.getItem('lastSport') as SportType | null
      if (s) setSport(s)
    } catch {}
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchAvailability(date, sport)
      .then(setData)
      .finally(() => setLoading(false))
  }, [date, sport])

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

  function handleSelectionChange(courtId: number | null, start: string | null, end: string | null, valid: boolean, gapInvalid?: boolean) {
    setSelCourtId(courtId)
    setSelStart(start)
    setSelEnd(end)
    setSelValid(valid)
    const gi = !!gapInvalid
    setSelGapInvalid(gi)
    if (gi) {
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
  const pageBgStyle = backgroundBySport[sport]
    ? { backgroundImage: `url('${backgroundBySport[sport]}')`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundAttachment: 'fixed' }
    : undefined

  return (
    <div className="min-h-screen w-full" style={pageBgStyle}><div className="max-w-7xl mx-auto p-4 space-y-3 h-dvh overflow-hidden flex flex-col">
      {showInstall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-[90vw] max-w-md rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 shadow-xl">
            <div className="text-lg font-semibold">Instaleaza aplicatia Star Arena</div>
            <div className="mt-1 text-sm text-emerald-800">Acces rapid din ecranul principal.</div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="px-4 py-2 rounded border border-emerald-300 text-emerald-800" onClick={handleDismissInstall}>
                Renunta
              </button>
              <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={handleInstall}>
                Instaleaza
              </button>
            </div>
          </div>
        </div>
      )}
      {showIOSInstall && !showInstall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-[90vw] max-w-md rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-xl">
            <div className="text-lg font-semibold">Instalare pe iPhone</div>
            <div className="mt-1 text-sm text-amber-800">
              Apasa Partajeaza si apoi Adauga pe ecranul principal pentru a instala aplicatia.
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="px-4 py-2 rounded border border-amber-300 text-amber-800" onClick={handleDismissIOSInstall}>
                Am inteles
              </button>
            </div>
          </div>
        </div>
      )}
      <section className="rounded border border-sky-200 bg-sky-50 px-3 pt-3 shadow-md flex-1 min-h-0 flex flex-col">
        <div className="flex items-end gap-4 w-full">
          <div className="flex flex-col shrink-0">
            <div className="text-xs text-slate-500 mb-1">Alege sportul</div>
            <SportPicker value={sport} onChange={(v) => setSport(v as SportType)} disabledSports={disabledSports} />
          </div>
          <div className="flex flex-col flex-1 min-w-0 ml-2">
            <div className="text-xs text-slate-500 mb-1">Data</div>
            <div className="inline-flex items-stretch bg-white border border-slate-300 rounded overflow-hidden w-full">
              <button
                type="button"
                className="inline-flex items-center justify-center px-2.5 text-lg leading-none text-slate-600 hover:bg-sky-50 hover:text-slate-800 border-r border-slate-200 focus:outline-none focus:bg-sky-50 shrink-0"
                aria-label="Ziua anterioara"
                onClick={() => shiftDate(-1)}
                title="Ziua anterioara"
              >
                {'\u2039'}
              </button>
              <div className="relative flex-1 min-w-0">
                <div className="px-2 pr-8 py-1.5 text-sm text-slate-800 text-center select-none truncate">
                  {displayDate}
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
                      if (typeof (el as any).showPicker === 'function') { (el as any).showPicker(); return }
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
                className="inline-flex items-center justify-center px-2.5 text-lg leading-none text-slate-600 hover:bg-sky-50 hover:text-slate-800 border-l border-slate-200 focus:outline-none focus:bg-sky-50 shrink-0"
                aria-label="Ziua urmatoare"
                onClick={() => shiftDate(1)}
                title="Ziua urmatoare"
              >
                {'\u203A'}
              </button>
            </div>
          </div>
        </div>
        <div className="mt-3 flex-1 min-h-0 flex flex-col">
          {loading ? <div>{'Se incarca\u2026'}</div> : (
            <>
              <div className="-mx-3 flex-1 min-h-0">
                <div className="border-y border-slate-300 h-full" ref={gridScrollRef}>
                  <TimelineGrid flat data={data} date={date} onHover={setHover} onSelectionChange={handleSelectionChange} onReserve={openBooking} clearSignal={clearTick} scrollContainerRef={gridScrollRef} />
                </div>
              </div>
              <div className="flex justify-center">
                <div className="px-2 py-1 text-xs text-slate-700 flex gap-3 items-center">
                  <div className="flex items-center gap-1"><span className="inline-block w-3 h-3 border border-emerald-400 bg-emerald-100"></span><span>disponibil</span></div>
                  <div className="flex items-center gap-1"><span className="inline-block w-3 h-3 border bg-rose-200"></span><span>indisponibil</span></div>
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
                  Rezervarea curenta lasa o pauza de 30 de minute langa o alta rezervare pe acelasi teren. Extinde sau muta selectia pentru a elimina golul.
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








