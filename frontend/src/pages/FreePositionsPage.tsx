import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AvailabilityDto, CourtDto, SportType } from '../types'
import { fetchAvailability, fetchActiveCourts } from '../api'
import AdminHeader from '../components/AdminHeader'
import SportPicker from '../components/SportPicker'

function todayISOinTZ(tz: string) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

function fmtHHmm(mins: number) {
  if (mins === 24 * 60) return '24:00'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function parseHHmm(s: string) {
  const [hh, mm] = s.split(':').map(Number)
  return (hh || 0) * 60 + (mm || 0)
}

function sportLabelUpper(s: SportType) {
  switch (s) {
    case 'TENNIS': return 'TENIS'
    case 'PADEL': return 'PADEL'
    case 'BEACH_VOLLEY': return 'VOLEI PE PLAJA'
    case 'BASKETBALL': return 'BASCHET'
    case 'FOOTVOLLEY': return 'TENIS DE PICIOR'
    case 'TABLE_TENNIS': return 'TENIS DE MASA'
    default: return String(s)
  }
}

export default function FreePositionsPage() {
  const nav = useNavigate()
  const [sport, setSport] = useState<SportType>('TENNIS')
  const [date, setDate] = useState<string>(() => todayISOinTZ('Europe/Bucharest'))
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AvailabilityDto[]>([])
  const [activeCourts, setActiveCourts] = useState<CourtDto[]>([])
  const [courtId, setCourtId] = useState<number | ''>('')
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const [highlightCopy, setHighlightCopy] = useState(false)
  const [highlightCourt, setHighlightCourt] = useState(false)
  const copyTimer = useRef<number | null>(null)
  const highlightTimer = useRef<number | null>(null)
  const highlightCourtTimer = useRef<number | null>(null)
  const dateInputRef = useRef<HTMLInputElement | null>(null)
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
  // Compact toast for missing court selection
  const [missingToastVisible, setMissingToastVisible] = useState(false)
  const [missingToastFading, setMissingToastFading] = useState(false)
  const toastShowTimer = useRef<any>(null)
  const toastHideTimer = useRef<any>(null)

  // Guard: redirect to /login if token missing/expired (>1h)
  useEffect(() => {
    try {
      const token = localStorage.getItem('adminAuth')
      const ts = Number(localStorage.getItem('adminAuthTS') || 0)
      const valid = token && ts && (Date.now() - ts) <= 3600000
      if (!valid) {
        try { localStorage.removeItem('adminAuth'); localStorage.removeItem('adminAuthTS') } catch {}
        nav('/login')
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetchActiveCourts()
      .then(setActiveCourts)
      .catch(() => setActiveCourts([]))
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchAvailability(date, sport)
      .then(setData)
      .finally(() => setLoading(false))
  }, [date, sport])

  useEffect(() => {
    if (!text) return
    setHighlightCopy(true)
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current)
    highlightTimer.current = window.setTimeout(() => setHighlightCopy(false), 5000)
  }, [text])

  useEffect(() => () => { if (copyTimer.current) window.clearTimeout(copyTimer.current); if (highlightTimer.current) window.clearTimeout(highlightTimer.current); if (highlightCourtTimer.current) window.clearTimeout(highlightCourtTimer.current) }, [])
  useEffect(() => () => {
    try { if (toastShowTimer.current) clearTimeout(toastShowTimer.current) } catch {}
    try { if (toastHideTimer.current) clearTimeout(toastHideTimer.current) } catch {}
  }, [])

  const activeSports = useMemo(() => new Set(activeCourts.map(c => c.sportType)), [activeCourts])
  const disabledSports = useMemo(() => ([
    'TENNIS',
    'PADEL',
    'BEACH_VOLLEY',
    'BASKETBALL',
    'FOOTVOLLEY',
    'TABLE_TENNIS',
  ].filter(s => !activeSports.has(s as SportType)) as SportType[]), [activeSports])

  const courts = useMemo(() => data.map(d => d.court), [data])
  const selectedCourt: CourtDto | null = useMemo(() => {
    if (!courtId) return null
    return courts.find(c => c.id === courtId) || null
  }, [courtId, courts])

  function formatHeader(s: SportType, court?: CourtDto | null) {
    const sport = sportLabelUpper(s)
    const rawCourt = court?.name ? String(court.name) : ''
    const courtLabel = rawCourt.replace(/^Teren\s*/i, '')
    return `💙💙 POZITII LIBERE - ${sport} - TEREN ${courtLabel} 💙💙`
  }

  function formatDateLine(iso?: string) {
    if (!iso) return ''
    const [y, m, d] = iso.split('-').map(Number)
    if (!y || !m || !d) return iso
    const months = ['Ian','Feb','Mar','Apr','Mai','Iun','Iul','Aug','Sep','Oct','Noi','Dec']
    const weekdays = ['DUMINICA','LUNI','MARTI','MIERCURI','JOI','VINERI','SAMBATA']
    const dt = new Date(y, m - 1, d)
    const dayLabel = weekdays[dt.getDay()] ?? ''
    const monthLabel = months[m - 1] ?? ''
    return `🩵 ${d} ${monthLabel} ${y} - ${dayLabel} 🩵`
  }

  function showMissingCourtToast() {
    setHighlightCourt(true)
    if (highlightCourtTimer.current) clearTimeout(highlightCourtTimer.current)
    highlightCourtTimer.current = window.setTimeout(() => setHighlightCourt(false), 2000)
    setMissingToastVisible(true)
    setMissingToastFading(false)
    try {
      if (toastShowTimer.current) clearTimeout(toastShowTimer.current)
      if (toastHideTimer.current) clearTimeout(toastHideTimer.current)
    } catch {}
    toastShowTimer.current = setTimeout(() => setMissingToastFading(true), 3000)
    toastHideTimer.current = setTimeout(() => setMissingToastVisible(false), 4500)
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

  // Always fetch fresh availability (no cache) before generating
  async function fetchAvailabilityFresh(dateISO: string, s: SportType): Promise<AvailabilityDto[]> {
    const base = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8080/api'
    const url = new URL(`${base}/availability`)
    url.searchParams.set('date', dateISO)
    url.searchParams.set('sportType', s)
    url.searchParams.set('_', String(Date.now()))
    const res = await fetch(url.toString(), { cache: 'no-store' })
    if (!res.ok) throw new Error('Nu am putut incarca disponibilitatea')
    return res.json()
  }

  async function generate() {
    if (!courtId) { showMissingCourtToast(); return }
    setLoading(true)
    try {
      const fresh = await fetchAvailabilityFresh(date, sport)
      setData(fresh)
      const row = fresh.find(d => d.court.id === Number(courtId))
      if (!row) { setText(''); return }

      // Free ranges clipped to [08:00, 24:00)
      const dayStart = 8 * 60, dayEnd = 24 * 60
      const raw: Array<{ start: number, end: number }> = []
      for (const fr of row.free || []) {
        const s = Math.max(dayStart, parseHHmm(fr.start))
        const e = Math.min(dayEnd, parseHHmm(fr.end))
        if (e > s) raw.push({ start: s, end: e })
      }
      // Merge overlapping/touching
      raw.sort((a, b) => a.start - b.start)
      const merged: typeof raw = []
      for (const r of raw) {
        const last = merged[merged.length - 1]
        if (!last || r.start > last.end) merged.push({ ...r })
        else last.end = Math.max(last.end, r.end)
      }

      function splitRange(start: number, end: number) {
        const out: Array<{ start: number, end: number }> = []
        let cursor = start
        let remaining = end - start
        while (remaining > 240) {
          out.push({ start: cursor, end: cursor + 120 })
          cursor += 120
          remaining -= 120
        }
        let chunks: number[] = []
        switch (remaining) {
          case 240: chunks = [120, 120]; break
          case 210: chunks = [120, 90]; break
          case 180: chunks = [90, 90]; break
          case 150: chunks = [90, 60]; break
          case 120: chunks = [120]; break
          case 90: chunks = [90]; break
          case 60: chunks = [60]; break
          default: chunks = remaining > 0 ? [remaining] : []; break
        }
        for (const chunk of chunks) {
          out.push({ start: cursor, end: cursor + chunk })
          cursor += chunk
          remaining -= chunk
        }
        return out
      }

      const expanded: Array<{ start: number, end: number }> = []
      for (const seg of merged) {
        const endIsEod = seg.end === (23 * 60 + 59)
        const effectiveEnd = endIsEod ? 24 * 60 : seg.end
        expanded.push(...splitRange(seg.start, effectiveEnd))
      }

      const header = formatHeader(sport, row.court)
      const dateLine = formatDateLine(date)
      const body = expanded.map(seg => `💙 ${fmtHHmm(seg.start)}-${fmtHHmm(seg.end)} 💙`).join('\n')
      setText(`${header}\n\n${dateLine}\n\n${body}`.trim())
    } finally {
      setLoading(false)
    }
  }

  async function copy() {
    try {
      if (!text) return
      await navigator.clipboard.writeText(text)
      setCopied(true)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), 5000)
    } catch {}
  }

  return (
    <div className="min-h-screen w-full" style={pageBgStyle}><div className="max-w-3xl mx-auto p-4 space-y-4">
      <AdminHeader active="free" />

      <div className="rounded border border-sky-200 bg-sky-50 p-3 shadow-md">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-slate-600 mb-1">Sport</div>
            <SportPicker value={sport} onChange={(v) => { setSport(v as SportType); setCourtId('') }} disabledSports={disabledSports} />
          </div>
          <div>
            <div className="text-xs text-slate-600 mb-1">Teren</div>
            <select className={`border rounded px-2 py-1.5 w-full ${highlightCourt ? "animate-pulse ring-2 ring-rose-300" : ""}`} value={courtId as any} onChange={e => setCourtId(Number(e.target.value) as any)}>
              <option value="">Selecteaza terenul</option>
              {courts.map(c => {
                const label = /^teren/i.test(c.name) ? c.name : `Teren ${c.name}`
                return <option key={c.id} value={c.id}>{label}</option>
              })}
            </select>
          </div>
          <div>
            <div className="text-xs text-slate-600 mb-1">Data</div>
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
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2">
          <button className="btn w-full" onClick={generate} disabled={loading}>Genereaza</button>
          <button className={`px-3 py-1.5 rounded border w-full ${highlightCopy ? "animate-pulse ring-2 ring-emerald-300" : ""}`} onClick={copy} disabled={!text}>
            {copied ? 'Copiat' : 'Copiaza pozitiile'}
          </button>
        </div>
      </div>

      <div className="rounded border border-slate-300 bg-white p-3 shadow">
        <div className="text-xs text-slate-600 mb-1">Previzualizare</div>
        <pre className="text-sm whitespace-pre-wrap font-mono min-h-[120px]">{loading ? 'Se incarca…' : (text || 'Alege sportul, terenul si data apoi apasa Genereaza.')}</pre>
      </div>

      {missingToastVisible && (
        <div className="fixed inset-x-0 bottom-0 z-[20000] pointer-events-none">
          <div className="max-w-3xl mx-auto px-4">
            <div
              className={`relative rounded border border-rose-300 bg-rose-50 text-rose-800 shadow pointer-events-auto ${missingToastFading ? 'opacity-0' : 'opacity-100'} transition-opacity w-full mb-4`}
              style={{ transitionDuration: '2000ms', height: '16.5vh' }}
              role="alert"
            >
              <button
                aria-label="Inchide"
                className="absolute top-2 right-2 text-rose-800/70 hover:text-rose-900"
                onClick={() => {
                  try { if (toastShowTimer.current) clearTimeout(toastShowTimer.current) } catch {}
                  try { if (toastHideTimer.current) clearTimeout(toastHideTimer.current) } catch {}
                  setMissingToastFading(false)
                  setMissingToastVisible(false)
                }}
              >{'\u00D7'}</button>
              <div className="h-full flex flex-col items-center justify-center text-center gap-2 px-3">
                <span className="text-lg" aria-hidden>{'\u26A0'}</span>
                <div className="text-sm text-rose-900">Selecteaza un teren inainte</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}




