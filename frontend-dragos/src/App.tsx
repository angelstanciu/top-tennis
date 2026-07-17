import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import SportPicker from './components/SportPicker'
import TimelineGrid from './components/TimelineGrid'
import { AvailabilityDto, SportType, CourtDto, LOCATION_TAGS } from './types'
import { fetchAvailability, fetchActiveCourts, isTokenExpired, clearPlayerAuth } from './api'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { Toaster } from 'sonner'
import fastCat from './assets/fast-cat.svg'
import { useSeo } from './seo'
import { PartnersPromoModal } from './openmatch/OpenMatchModals'
import Navbar from './components/Navbar'
import { useTheme } from './ThemeContext'


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

// h-dvh can briefly report a taller-than-visible height right after a full
// reload inside the installed (standalone) app window, before the window
// chrome has finished settling. Nothing forces a re-measure on its own
// because the grid card below clips overflow instead of scrolling, so a
// stale-tall reading leaves its bottom edge (the legend) cut off. Track the
// real height in JS and re-check shortly after mount so it self-corrects.
function useViewportHeight() {
  const [vh, setVh] = useState(() => (typeof window === 'undefined' ? 0 : window.innerHeight))
  useEffect(() => {
    const measure = () => setVh(window.innerHeight)
    measure()
    const raf = requestAnimationFrame(measure)
    const timer = setTimeout(measure, 300)
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
      window.removeEventListener('resize', measure)
    }
  }, [])
  return vh
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

const SPORT_EMOJI: Record<SportType, string> = {
  TENNIS: '🎾',
  PADEL: '🏓',
  BEACH_VOLLEY: '🏐',
  BASKETBALL: '🏀',
  FOOTVOLLEY: '⚽',
  TABLE_TENNIS: '🏓',
}

const SPORT_OPTIONS: { value: SportType; label: string }[] = [
  { value: 'TENNIS', label: '🎾 Tenis' },
  { value: 'PADEL', label: '🏓 Padel' },
  { value: 'BEACH_VOLLEY', label: '🏐 Volei' },
  { value: 'BASKETBALL', label: '🏀 Baschet' },
  { value: 'FOOTVOLLEY', label: '⚽ Tenis de picior' },
  { value: 'TABLE_TENNIS', label: '🏓 Tenis de Masă' },
]

// Promo "Găsește parteneri" la selectarea Padel — nu-l arătăm la nesfârșit.
const PARTNERS_PROMO_KEY = 'padelPartnersPromo'
const PARTNERS_PROMO_MAX_SHOWS = 3

// Poster turneu Padel — afișat o dată pe zi la selectarea sportului Padel,
// doar până în 31 iulie 2026 inclusiv (ziua dinaintea turneului).
const PADEL_TOURNAMENT_POSTER_KEY = 'padelTournamentPosterLastShown'
const PADEL_TOURNAMENT_POSTER_CUTOFF = '2026-07-31'
const PADEL_TOURNAMENT_POSTER_SRC = '/turneu-padel-1-august.jpeg'

function readPartnersPromoState(): { count: number; dismissedPermanently: boolean } {
  try {
    const raw = localStorage.getItem(PARTNERS_PROMO_KEY)
    if (!raw) return { count: 0, dismissedPermanently: false }
    const parsed = JSON.parse(raw)
    return { count: parsed.count || 0, dismissedPermanently: !!parsed.dismissedPermanently }
  } catch {
    return { count: 0, dismissedPermanently: false }
  }
}

function writePartnersPromoState(state: { count: number; dismissedPermanently: boolean }) {
  try {
    localStorage.setItem(PARTNERS_PROMO_KEY, JSON.stringify({ ...state, lastShownAt: Date.now() }))
  } catch {}
}

function maxDateISO() {
  const d = new Date()
  d.setMonth(d.getMonth() + 13)
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

  const dayNames = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm']
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d))
  const dayName = dayNames[dateObj.getDay()]

  return `${Number(d)}.${m} ${dayName}`
}

export default function App() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const vh = useViewportHeight()
  useSeo({
    path: '/rezerva',
    title: 'Rezervă Teren Online – Padel, Tenis, Baschet | Star Arena Pitești',
    description: 'Vezi disponibilitatea în timp real și rezervă online un teren de padel, tenis, baschet, fotbal-tenis sau volei la Star Arena Bascov, lângă Pitești. Confirmare instant prin SMS.',
  })
  const [searchParams] = useSearchParams()
  const lsSport = (typeof window !== 'undefined' ? (localStorage.getItem('lastSport') as SportType | null) : null)
  const paramDate = searchParams.get('date')
  const paramSport = searchParams.get('sport') as SportType
  const initialSport = paramSport || lsSport || 'TENNIS'
  const initialDate = paramDate || todayISO()
  const [sport, setSport] = useState<SportType>(initialSport)
  const [sportMenuOpen, setSportMenuOpen] = useState(false)


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
  // Notificare "tocmai s-a rezervat" — legată vizual de cardul grid-ului, nu de tot ecranul
  const [bookingToastVisible, setBookingToastVisible] = useState<boolean>(false)
  const [bookingToastMessage, setBookingToastMessage] = useState<string>('')
  const [bookingToastFading, setBookingToastFading] = useState<boolean>(false)
  const bookingToastFadeTimer = React.useRef<any>(null)
  const bookingToastHideTimer = React.useRef<any>(null)
  const [clearTick, setClearTick] = useState<number>(0)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  // Meci deschis: modalul afisat cand utilizatorul apasa pe un bloc „Cautam jucatori" din grila
  const [openMatchInfo, setOpenMatchInfo] = useState<null | { matchId: number; spotsLeft: number; takeover: boolean; courtId: number; start: string; end: string }>(null)
  // Promo "Găsește parteneri" — o singură dată pe încărcare de pagină, respectă istoricul din localStorage
  const [showPartnersPromo, setShowPartnersPromo] = useState(false)
  const partnersPromoShownRef = React.useRef(false)
  // Poster turneu Padel — afișat o singură dată (per browser), la prima selectare a sportului Padel
  const [showTournamentPoster, setShowTournamentPoster] = useState(false)
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
  const courtsById = useMemo(() => new Map(activeCourts.map(c => [c.id, c])), [activeCourts])
  const courtsByIdRef = React.useRef(courtsById)
  useEffect(() => { courtsByIdRef.current = courtsById }, [courtsById])
  const activeSports = useMemo(() => new Set(activeCourts.map(c => c.sportType)), [activeCourts])
  const disabledSports = useMemo(() => {
    const all: SportType[] = ['TENNIS','PADEL','BEACH_VOLLEY','BASKETBALL','FOOTVOLLEY','TABLE_TENNIS']
    return all.filter(s => !activeSports.has(s))
  }, [activeSports])

  useEffect(() => {
    async function syncAuth() {
      const token = localStorage.getItem('playerToken')

      // If token is expired or missing, clear everything and treat as guest
      if (!token || isTokenExpired(token)) {
        if (token) clearPlayerAuth() // token was present but expired - clean up silently
        setPlayer(null)
        return
      }

      const data = localStorage.getItem('playerData')
      if (data) {
        try { setPlayer(JSON.parse(data)) } catch { setPlayer(null) }
      } else {
        // Data missing but token valid - fetch it
        try {
          const { fetchPlayerMe } = await import('./api')
          const userData = await fetchPlayerMe(token)
          setPlayer(userData)
          localStorage.setItem('playerData', JSON.stringify(userData))
        } catch { setPlayer(null) }
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
        // Outdoor padel courts 2 & 3 are available for booking starting May 15, 2026 at 16:00
        const PADEL_NEW_COURTS_DATE = '2026-05-15'
        const filteredData = originalData.filter(row => {
          const isPadel = row.court.sportType === 'PADEL'
          const courtName = row.court.name.trim()
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

          // Seasonal unavailability
          let forceUnavailable = false
          if (isOutdoor && isTennis && date < '2026-04-01') {
             forceUnavailable = true
          }

          // New outdoor padel courts 4 & 5 - coming soon until May 25, 2026
          const courtName = row.court.name.trim()
          const isNewOutdoorPadel = isPadel && !row.court.indoor && (courtName === '2' || courtName === '3')
          if (isNewOutdoorPadel && date < PADEL_NEW_COURTS_DATE) {
            forceUnavailable = true
            ;(newRow.court as any).comingSoon = true
          }

          if (forceUnavailable) {
             newRow.free = []
             newRow.booked = [{ start: '00:00', end: '24:00', status: 'BLOCKED' } as any]
          }

          // PADEL COURTS - Location Tagging
          // 1,2,3 = outdoor Baza Cosmin; 4,5 = Star Arena 2 (different location)
          if (isPadel) {
            const courtName = row.court.name.trim()
            if (courtName === '4' || courtName === '5') {
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
      try { if (bookingToastFadeTimer.current) clearTimeout(bookingToastFadeTimer.current) } catch {}
      try { if (bookingToastHideTimer.current) clearTimeout(bookingToastHideTimer.current) } catch {}
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('lastSport', sport)
    } catch {}
  }, [sport])

  // Promo "Găsește parteneri": o dată pe încărcare de pagină, doar dacă userul
  // n-a confirmat/interacționat deja și nu a atins limita de afișări.
  useEffect(() => {
    if (sport !== 'PADEL' || partnersPromoShownRef.current || showTournamentPoster) return
    const state = readPartnersPromoState()
    if (state.dismissedPermanently || state.count >= PARTNERS_PROMO_MAX_SHOWS) return
    const timer = setTimeout(() => {
      partnersPromoShownRef.current = true
      setShowPartnersPromo(true)
    }, 1500)
    return () => clearTimeout(timer)
  }, [sport, showTournamentPoster])

  function closePartnersPromo(dismissedPermanently: boolean) {
    const state = readPartnersPromoState()
    writePartnersPromoState({ count: state.count + 1, dismissedPermanently })
    setShowPartnersPromo(false)
  }

  // Poster turneu Padel: o dată pe zi când userul ajunge pe sportul Padel,
  // doar până în PADEL_TOURNAMENT_POSTER_CUTOFF inclusiv.
  useEffect(() => {
    if (sport !== 'PADEL') return
    const today = todayISO()
    if (today > PADEL_TOURNAMENT_POSTER_CUTOFF) return
    try {
      if (localStorage.getItem(PADEL_TOURNAMENT_POSTER_KEY) === today) return
      localStorage.setItem(PADEL_TOURNAMENT_POSTER_KEY, today)
    } catch {}
    setShowTournamentPoster(true)
  }, [sport])

  // AnimatePresence rulează animația "exit" a posterului înainte să-l demonteze
  // efectiv, deci aici doar schimbăm starea — nu mai avem nevoie de setTimeout.
  function closeTournamentPoster() {
    setShowTournamentPoster(false)
  }

  useEffect(() => {
    if (!showTournamentPoster) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeTournamentPoster() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showTournamentPoster])

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
    const next = d.toISOString().slice(0, 10)
    // Nu permitem navigarea in trecut (indiferent de sport). Zilele trecute
    // raman inaccesibile: nu se mai vede nivelul de ocupare de ieri.
    if (next < todayISO()) return
    setDate(next)
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

    // Live updates pushed from the backend (other users' bookings) via SSE.
    // BroadcastChannel/storage above only cover tabs in this same browser.
    // Quiet refetch (no setLoading) so the grid doesn't unmount/remount and
    // reset the user's scroll position + selection on every unrelated booking.
    function quietRefetch() {
      fetchAvailability(date, sport).then(setData).catch(() => {})
    }
    const apiBase = (import.meta as any).env.VITE_API_BASE_URL || '/api'
    const es = new EventSource(`${apiBase}/bookings/stream`)
    es.onerror = (e) => console.warn('[SSE] bookings/stream connection error', e)
    const onBookingEvent = () => quietRefetch()
    es.addEventListener('UPDATED', onBookingEvent)
    es.addEventListener('CANCELLED', onBookingEvent)
    es.addEventListener('CREATED', (ev: MessageEvent) => {
      quietRefetch()
      try {
        const info = JSON.parse(ev.data)
        const court = courtsByIdRef.current.get(info.courtId)
        // Anunțăm doar dacă rezervarea e pe sportul și ziua pe care userul le are deschise chiar acum.
        if (court && court.sportType === sport && info.bookingDate === date) {
          setBookingToastMessage(`${SPORT_EMOJI[sport]} Terenul ${court.name} tocmai a fost rezervat: ${String(info.startTime).slice(0, 5)} - ${String(info.endTime).slice(0, 5)}`)
          setBookingToastVisible(true)
          setBookingToastFading(false)
          if (bookingToastFadeTimer.current) clearTimeout(bookingToastFadeTimer.current)
          if (bookingToastHideTimer.current) clearTimeout(bookingToastHideTimer.current)
          bookingToastFadeTimer.current = setTimeout(() => setBookingToastFading(true), 4000)
          bookingToastHideTimer.current = setTimeout(() => setBookingToastVisible(false), 4700)
        }
      } catch {}
    })

    // Plasă de siguranță: dacă SSE e blocat/căzut (proxy de producție care nu
    // lasă streaming-ul să treacă), grid-ul tot se corectează singur în cel
    // mult 20s, indiferent de infra dintre browser și backend.
    const fallbackPoll = setInterval(quietRefetch, 20000)

    return () => {
      window.removeEventListener('storage', onStorage)
      try { ch?.close() } catch {}
      clearInterval(fallbackPoll)
      es.close()
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
    <div
      className="min-h-dvh relative font-sans selection:bg-lime-400 selection:text-slate-950 transition-colors"
      style={{ background: isDark ? '#020617' : '#f6f7f4', color: isDark ? '#f8fafc' : '#0f172a' }}
    >
      {/* Fixed Background Layer per sport */}
      <div
        className="fixed inset-0 z-0 pointer-events-none transition-all duration-700"
        style={{
          backgroundImage: bg ? `url('${bg}')` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0" style={{ background: isDark ? 'rgba(2,6,23,0.82)' : 'rgba(246,247,244,0.85)', backdropFilter: 'blur(1px)' }} />
      </div>

      <div
        className="max-w-7xl mx-auto px-0 pt-0 h-dvh overflow-hidden flex flex-col gap-0.5 relative z-10"
        style={vh ? { height: vh } : undefined}
      >
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
      <Navbar variant="static" showReserveButton={false} />

      <section className="flex-1 min-h-0 flex flex-col px-2 pb-2 relative z-10 w-full">
        {/* Compact Toolbar: Sport Dropdown + Date - ONE ROW */}
        <div
          className="relative grid grid-cols-2 items-center px-2 py-2 rounded-[18px] border w-full"
          style={{ background: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0', boxShadow: isDark ? 'none' : '0 2px 10px rgba(15,23,42,0.04)' }}
        >
          {/* Splitter fix, exact la jumătatea barei, independent de conținut */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1.5px] h-[32px] rounded-full" style={{ background: isDark ? '#334155' : '#cbd5e1' }} />

          {/* Jumătatea stângă: sport picker, centrat, lățime fixă (cât cel mai lung text) */}
          <div className="flex items-center justify-center min-w-0 pr-2">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setSportMenuOpen(o => !o)}
                className="font-extrabold text-sm rounded-xl px-2 py-2 outline-none cursor-pointer flex items-center gap-1 w-[150px] max-w-full active:scale-95 transition-transform"
                style={{ fontFamily: 'Outfit, sans-serif', background: isDark ? '#a3e635' : '#84cc16', color: isDark ? '#ffffff' : '#0f172a' }}
              >
                <span className="flex-1 text-center truncate">{SPORT_OPTIONS.find(o => o.value === sport)?.label}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" style={{ transition: 'transform 150ms', transform: sportMenuOpen ? 'rotate(180deg)' : 'none' }}>
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {sportMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSportMenuOpen(false)} />
                  <div
                    className="absolute top-full left-0 mt-2 min-w-[190px] rounded-2xl border shadow-xl z-50 overflow-hidden py-1"
                    style={{ background: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }}
                  >
                    {SPORT_OPTIONS.map(({ value, label }) => {
                      const hasActive = activeCourts.some(c => c.sportType === value)
                      const isSelected = value === sport
                      return (
                        <button
                          key={value}
                          type="button"
                          disabled={!hasActive}
                          onClick={() => { setSport(value); setSportMenuOpen(false) }}
                          className="w-full text-left px-3.5 py-2.5 text-sm font-bold flex items-center gap-2 transition-colors disabled:cursor-not-allowed"
                          style={isSelected
                            ? { background: isDark ? 'rgba(163,230,53,0.15)' : 'rgba(132,204,22,0.12)', color: isDark ? '#a3e635' : '#4d7c0f' }
                            : { color: hasActive ? (isDark ? '#e2e8f0' : '#0f172a') : (isDark ? '#475569' : '#94a3b8') }}
                        >
                          {label}{!hasActive ? ' (Indisponibil)' : ''}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Jumătatea dreaptă: navigare dată, lățime fixă (cealaltă jumătate) */}
          <div className="flex items-center gap-1 min-w-0 justify-between pl-2">
            <button
              type="button"
              disabled={date <= todayISO()}
              className="w-6 h-7 shrink-0 flex items-center justify-center rounded-lg transition-colors text-lg font-bold disabled:cursor-not-allowed"
              style={{ color: isDark ? '#94a3b8' : '#64748b', opacity: date <= todayISO() ? 0.3 : 1 }}
              onClick={() => shiftDate(-1)}
              aria-label="Ziua anterioară"
              title={date <= todayISO() ? 'Zilele trecute nu sunt disponibile' : 'Ziua anterioară'}
            >
              ‹
            </button>
            <button
              type="button"
              className="relative flex items-center gap-0.5 px-1 py-1.5 rounded-xl transition-colors group min-w-0"
              onClick={() => {
                const el = dateInputRef.current
                if (!el) return
                try { if (typeof (el as any).showPicker === 'function') { (el as any).showPicker(); return } } catch {}
                try { el.click() } catch {}
              }}
            >
              <span className="text-sm font-bold whitespace-nowrap min-w-[68px] text-center transition-colors" style={{ color: isDark ? '#f8fafc' : '#0f172a' }}>
                {displayDate}
              </span>
              <div className="flex items-center justify-center w-5 h-5 shrink-0" style={{ color: isDark ? '#94a3b8' : '#94a3b8' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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
              className="w-6 h-7 shrink-0 flex items-center justify-center rounded-lg transition-colors text-lg font-bold"
              style={{ color: isDark ? '#94a3b8' : '#64748b' }}
              onClick={() => shiftDate(1)}
              aria-label="Ziua următoare"
            >
              ›
            </button>
          </div>
        </div>
        <div
          className="relative mt-1 flex-1 min-h-0 flex flex-col p-2 md:p-6 rounded-[24px] border overflow-hidden"
          style={{ background: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#263349' : '#e2e8f0', boxShadow: isDark ? 'none' : '0 8px 24px rgba(15,23,42,0.06)' }}
        >
          {loading ? (
             <div className="flex-1 flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 rounded-full animate-spin" style={{ border: '4px solid rgba(163,230,53,0.3)', borderTopColor: '#a3e635' }}></div>
                <div className="mt-4 font-medium" style={{ color: isDark ? '#94a3b8' : '#475569' }}>Se încarcă terenurile...</div>
             </div>
          ) : (
            <>
                    <div className="-mx-2 -mt-2 flex-1 min-h-0">
                      <TimelineGrid flat data={activeData} date={date} onHover={setHover} onSelectionChange={handleSelectionChange} onReserve={openBooking} clearSignal={clearTick} player={player} onOpenMatchClick={setOpenMatchInfo} />
                    </div>
                    {hasSeasonalOutdoor && (
                      <div className="mx-1 mt-1.5 px-3 py-2 bg-amber-50/80 backdrop-blur-sm border border-amber-200 rounded-xl flex items-center gap-2">
                        <span className="text-base">🌿</span>
                        <div className="font-bold text-xs text-amber-800">Terenuri Exterioare</div>
                      </div>
                    )}
              <div className="flex justify-center gap-4 items-center" style={{ borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, padding: '6px 0 0' }}>
                <div className="flex items-center gap-[5px]">
                  <span className="inline-block w-2.5 h-2.5 rounded-[3px]" style={{ background: isDark ? 'rgba(163,230,53,0.35)' : 'rgba(132,204,22,0.25)', border: `1px solid ${isDark ? 'rgba(163,230,53,0.7)' : '#84cc16'}` }}></span>
                  <span className="text-[10px] font-semibold" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Liber</span>
                </div>
                <div className="flex items-center gap-[5px]">
                  <span className="inline-block w-2.5 h-2.5 rounded-[3px]" style={{ background: isDark ? 'rgba(244,63,94,0.35)' : 'rgba(244,63,94,0.2)', border: `1px solid ${isDark ? 'rgba(251,113,133,0.6)' : 'rgba(244,63,94,0.5)'}` }}></span>
                  <span className="text-[10px] font-semibold" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Ocupat</span>
                </div>
                <div className="flex items-center gap-[5px]">
                  <span className="inline-block w-2.5 h-2.5 rounded-[3px]" style={{ border: `1px solid ${isDark ? '#475569' : '#cbd5e1'}`, backgroundImage: 'repeating-linear-gradient(45deg, rgba(148,163,184,0.5) 0, rgba(148,163,184,0.5) 2px, transparent 2px, transparent 5px)' }}></span>
                  <span className="text-[10px] font-semibold" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Indisponibil</span>
                </div>
              </div>
            </>
          )}
          {bookingToastVisible && (
            <div className="absolute inset-x-0 bottom-3 md:bottom-5 flex justify-center px-4 pointer-events-none z-30">
              <div
                className={`pointer-events-auto max-w-full px-5 py-3 rounded-[2rem] bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-xs md:text-sm shadow-lg shadow-emerald-900/10 transition-opacity duration-700 ${bookingToastFading ? 'opacity-0' : 'opacity-100'}`}
              >
                {bookingToastMessage}
              </div>
            </div>
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
      {/* Modal meci deschis: apare la click pe un bloc „Cautam jucatori" din grila */}
      {openMatchInfo && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-md" onClick={() => setOpenMatchInfo(null)}>
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="p-7">
              <div className="w-14 h-14 mx-auto rounded-full bg-lime-100 text-lime-700 flex items-center justify-center mb-4">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight text-center mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Meci deschis — se {openMatchInfo.spotsLeft === 1 ? 'caută 1 jucător' : `caută ${openMatchInfo.spotsLeft} jucători`}
              </h3>
              <p className="text-sm text-slate-500 font-medium text-center mb-6">
                În intervalul {openMatchInfo.start} - {openMatchInfo.end}, o echipă incompletă caută parteneri de joc.
                {openMatchInfo.takeover
                  ? ' Meciul e la sub 6 ore de start, așa că o echipă completă poate rezerva intervalul.'
                  : ' Te poți alătura echipei din pagina de meciuri.'}
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => { setOpenMatchInfo(null); nav('/meciuri') }}
                  className="w-full py-3.5 bg-slate-900 text-lime-400 rounded-xl font-bold hover:bg-slate-800 active:scale-95 transition-all"
                >
                  Mă alătur meciului
                </button>
                {openMatchInfo.takeover && (
                  <button
                    onClick={() => {
                      const info = openMatchInfo
                      setOpenMatchInfo(null)
                      const end = info.end === '23:59' ? '24:00' : info.end
                      nav(`/book/${info.courtId}/${date}/${info.start}/${end}?sport=PADEL&takeover=${info.matchId}&spots=${info.spotsLeft}`)
                    }}
                    className="w-full py-3.5 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                  >
                    Am echipa completă — rezervă intervalul
                  </button>
                )}
                <button onClick={() => setOpenMatchInfo(null)} className="w-full py-2 text-slate-400 text-sm font-bold hover:text-slate-600 transition-colors">
                  Închide
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {createPortal(
        <AnimatePresence>
        {showTournamentPoster && (
          <motion.div
            className="fixed inset-0 z-[60000] flex items-center justify-center p-1.5 bg-slate-950 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeTournamentPoster}
            role="dialog"
            aria-modal="true"
            aria-label="Poster turneu Padel"
          >
            {/* Fundal ambient: o copie blurată a posterului umple zona din jur, ca
                spațiul rămas sus/jos (din diferența de aspect ratio) să nu pară gol. */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `url(${PADEL_TOURNAMENT_POSTER_SRC})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(60px) saturate(1.3) brightness(0.5)',
                transform: 'scale(1.3)',
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(60% 35% at 50% 0%, rgba(56,189,248,0.20), transparent 70%), ' +
                  'radial-gradient(65% 40% at 50% 100%, rgba(163,230,53,0.16), transparent 70%), ' +
                  'rgba(2,6,23,0.55)',
              }}
            />

            {/* Inele de undă — posterul "cade" ca o picătură din colțul butonului. */}
            <motion.span
              className="absolute rounded-full border-2 border-lime-300/70 pointer-events-none"
              style={{ width: 220, height: 220, top: 26, right: 26 }}
              initial={{ scale: 0.1, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            />
            <motion.span
              className="absolute rounded-full border-2 border-sky-300/50 pointer-events-none"
              style={{ width: 340, height: 340, top: 26, right: 26 }}
              initial={{ scale: 0.1, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut', delay: 0.14 }}
            />

            <button
              aria-label="Închide"
              className="absolute top-4 right-4 md:top-6 md:right-6 w-10 h-10 rounded-full bg-white/10 border border-white/15 text-white text-xl grid place-items-center hover:bg-white/20 transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); closeTournamentPoster() }}
            >
              {'×'}
            </button>
            <motion.img
              src={PADEL_TOURNAMENT_POSTER_SRC}
              alt="Turneu de Padel — Star Arena"
              className="relative max-w-full max-h-full w-auto h-auto object-contain rounded-xl shadow-2xl"
              style={{ transformOrigin: 'top right' }}
              initial={{ clipPath: 'circle(0% at 100% 0%)', scale: 0.3, opacity: 0 }}
              animate={{ clipPath: 'circle(150% at 100% 0%)', scale: 1, opacity: 1 }}
              exit={{ clipPath: 'circle(0% at 100% 0%)', scale: 0.25, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 160, damping: 16, mass: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
        </AnimatePresence>,
        document.body
      )}
      {showPartnersPromo && (
        <PartnersPromoModal
          onFindPartners={() => { closePartnersPromo(true); nav('/meciuri') }}
          onAcknowledge={() => closePartnersPromo(true)}
          onClose={() => closePartnersPromo(false)}
        />
      )}
      <Toaster richColors theme="dark" position="top-center" />
    </div>
    </div>
  )
}




