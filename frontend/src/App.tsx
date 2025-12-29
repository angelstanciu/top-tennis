import React, { useEffect, useMemo, useState } from 'react'
import SportPicker from './components/SportPicker'
import TimelineGrid from './components/TimelineGrid'
import { AvailabilityDto, SportType } from './types'
import { fetchAvailability } from './api'
import { useNavigate, useSearchParams } from 'react-router-dom'

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
  return d.toISOString().slice(0,10)
}

function formatDateDisplay(iso?: string) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}.${m}.${y}`
}

export default function App() {
  const [searchParams] = useSearchParams()
  const lsSport = (typeof window !== 'undefined' ? (localStorage.getItem('lastSport') as SportType | null) : null)
  const lsDate = (typeof window !== 'undefined' ? localStorage.getItem('lastDate') : null)
  const initialSport = lsSport || (searchParams.get('sport') as SportType) || 'TENNIS'
  const initialDate = lsDate || searchParams.get('date') || todayISO()
  const [sport, setSport] = useState<SportType>(initialSport)
  const [date, setDate] = useState<string>(initialDate)
  const [data, setData] = useState<AvailabilityDto[]>([])
  const [loading, setLoading] = useState(false)
  const [hover, setHover] = useState<string>('')
  const nav = useNavigate()
  const gridScrollRef = React.useRef<HTMLDivElement | null>(null)
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
  const selectedCourtName = useMemo(() => {
    if (!selCourtId) return null
    const row = data.find(d => d.court.id === selCourtId)
    return row?.court.name ?? null
  }, [selCourtId, data])

  const displayDate = useMemo(() => formatDateDisplay(date), [date])

  // State is initialized from query params; no further sync needed

  // On very first mount, ensure we restore last selections from localStorage
  useEffect(() => {
    try {
      const s = localStorage.getItem('lastSport') as SportType | null
      const d = localStorage.getItem('lastDate')
      if (s) setSport(s)
      if (d) setDate(d)
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchAvailability(date, sport)
      .then(setData)
      .finally(() => setLoading(false))
  }, [date, sport])

  // Cleanup toast timers on unmount
  useEffect(() => {
    return () => {
      try { if (gapToastShowTimer.current) clearTimeout(gapToastShowTimer.current) } catch {}
      try { if (gapToastHideTimer.current) clearTimeout(gapToastHideTimer.current) } catch {}
    }
  }, [])

  // Persist last selected sport/date for returning from booking page
  useEffect(() => {
    try {
      localStorage.setItem('lastSport', sport)
      localStorage.setItem('lastDate', date)
    } catch {}
  }, [sport, date])

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
    setDate(d.toISOString().slice(0,10))
  }

  function handleSelectionChange(courtId: number | null, start: string | null, end: string | null, valid: boolean, gapInvalid?: boolean) {
    setSelCourtId(courtId)
    setSelStart(start)
    setSelEnd(end)
    setSelValid(valid)
    const gi = !!gapInvalid
    setSelGapInvalid(gi)
    // Manage detached toast for 30-min gap
    if (gi) {
      setGapToastVisible(true)
      setGapToastFading(false)
      if (gapToastShowTimer.current) clearTimeout(gapToastShowTimer.current)
      if (gapToastHideTimer.current) clearTimeout(gapToastHideTimer.current)
      gapToastShowTimer.current = setTimeout(() => setGapToastFading(true), 5000)
      gapToastHideTimer.current = setTimeout(() => setGapToastVisible(false), 7000)
    } else {
      // Hide immediately on any other selection
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

  // Listen for booking updates from the admin page and refetch availability
  useEffect(() => {
    function refetch() {
      setLoading(true)
      fetchAvailability(date, sport).then(setData).finally(() => setLoading(false))
    }
    let ch: BroadcastChannel | null = null
    try {
      // @ts-ignore
      ch = new BroadcastChannel('bookingUpdates')
      ch.onmessage = (ev) => {
        if (!ev?.data) return
        // If payload has date, refresh only when matching or always
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

  const pageBgStyle = sport === 'TENNIS'
    ? { backgroundImage: "url('/tennis-background.png')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }
    : undefined

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-3 min-h-dvh overflow-hidden flex flex-col" style={pageBgStyle}>
      {showInstall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-[90vw] max-w-md rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-emerald-900 shadow-xl">
            <div className="text-lg font-semibold">Instalează aplicația Star Arena</div>
            <div className="mt-1 text-sm text-emerald-800">Acces rapid din ecranul principal.</div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="px-4 py-2 rounded border border-emerald-300 text-emerald-800" onClick={handleDismissInstall}>
                Renunță
              </button>
              <button className="px-4 py-2 rounded bg-emerald-600 text-white" onClick={handleInstall}>
                Instalează
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
              Apasă Partajează și apoi Adaugă pe ecranul principal pentru a instala aplicația.
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="px-4 py-2 rounded border border-amber-300 text-amber-800" onClick={handleDismissIOSInstall}>
                Am înțeles
              </button>
            </div>
          </div>
        </div>
      )}
      <section className="rounded border border-sky-200 bg-sky-50 px-3 pt-3 shadow-md flex-1 min-h-0 flex flex-col">
        <div className="flex items-end gap-4 w-full">
          <div className="flex flex-col shrink-0">
            <div className="text-xs text-slate-500 mb-1">Alege sportul</div>
            <SportPicker value={sport} onChange={setSport} />
          </div>
          <div className="flex flex-col flex-1 min-w-0 ml-2">
            <div className="text-xs text-slate-500 mb-1">Data</div>
            <div className="inline-flex items-stretch bg-white border border-slate-300 rounded overflow-hidden w-full">
              <button
                type="button"
                className="inline-flex items-center justify-center px-2.5 text-lg leading-none text-slate-600 hover:bg-sky-50 hover:text-slate-800 border-r border-slate-200 focus:outline-none focus:bg-sky-50 shrink-0"
                aria-label="Ziua anterioară"
                onClick={() => shiftDate(-1)}
                title="Ziua anterioară"
              >
                ‹
              </button>
              <div className="relative flex-1 min-w-0">
                <div className="px-2 py-1.5 text-sm text-slate-800 text-center select-none truncate">
                  {displayDate}
                </div>
                <input
                  className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                  type="date"
                  lang="ro-RO"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  aria-label="Data"
                />
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center px-2.5 text-lg leading-none text-slate-600 hover:bg-sky-50 hover:text-slate-800 border-l border-slate-200 focus:outline-none focus:bg-sky-50 shrink-0"
                aria-label="Ziua următoare"
                onClick={() => shiftDate(1)}
                title="Ziua următoare"
              >
                ›
              </button>
            </div>
          </div>
        </div>
        <div className="mt-3 flex-1 min-h-0 flex flex-col">
          {loading ? <div>Se încarcă…</div> : (
            <>
              <div className="-mx-3 flex-1 min-h-0">
                <div className="border-y border-slate-300 h-full overflow-y-auto" ref={gridScrollRef}>
                  <TimelineGrid flat data={data} date={date} onHover={setHover} onSelectionChange={handleSelectionChange} onReserve={openBooking} clearSignal={clearTick} scrollContainerRef={gridScrollRef} />
                </div>
              </div>
              {/* Inline gap error removed; moved to detached toast */}
              <div className="flex justify-center">
                <div className="px-2 py-1 text-xs text-slate-700 flex gap-3 items-center">
                  <div className="flex items-center gap-1"><span className="inline-block w-3 h-3 border border-emerald-400 bg-emerald-100"></span><span>disponibil</span></div>
                  <div className="flex items-center gap-1"><span className="inline-block w-3 h-3 border bg-rose-200"></span><span>indisponibil</span></div>
                  <div className="flex items-center gap-1"><span className="inline-block w-3 h-3 border bg-emerald-300"></span><span>rezervarea dumneavoastră</span></div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
      <footer>
        <div className="rounded border border-sky-200 bg-sky-50 p-3 text-xs text-slate-700 shadow-md">
          <div className="flex items-start gap-2">
            <span aria-hidden className="mt-0.5">i</span>
            <div className="space-y-1">
              <div>
                {selCourtId && selStart && selEnd ? (
                  <>Selecție: Teren {selectedCourtName ?? selCourtId} • {date} • {selStart} - {selEnd}</>
                ) : (
                  <>Selectați cel puțin 1 oră (două intervale continue de 30 min).</>
                )}
              </div>
              <div>Selectați intervalul liber de la care doriți să înceapă rezervarea.</div>
            </div>
          </div>
        </div>
      </footer>
      {/* Detached gap error toast */}
      {gapToastVisible && (
        <div className="fixed inset-x-0 bottom-0 z-50 pointer-events-none">
          <div className="max-w-7xl mx-auto px-4">
            <div
              className={`relative rounded border border-rose-300 bg-rose-50 text-rose-800 shadow pointer-events-auto ${gapToastFading ? 'opacity-0' : 'opacity-100'} transition-opacity w-full mb-4`}
              style={{ transitionDuration: '2000ms', height: '33vh' }}
              role="alert"
            >
              <button
                aria-label="Închide"
                className="absolute top-2 right-2 text-rose-800/70 hover:text-rose-900"
                onClick={() => {
                  if (gapToastShowTimer.current) clearTimeout(gapToastShowTimer.current)
                  if (gapToastHideTimer.current) clearTimeout(gapToastHideTimer.current)
                  setGapToastFading(false)
                  setGapToastVisible(false)
                }}
              >×</button>
              <div className="h-full flex flex-col items-center justify-center text-center gap-3 px-4">
                <span className="text-3xl" aria-hidden>⚠</span>
                <div className="text-lg sm:text-xl text-rose-900">
                  Rezervarea curentă lasă o pauză de 30 de minute lângă o altă rezervare pe același teren. Extindeți sau mutați selecția pentru a elimina golul.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
