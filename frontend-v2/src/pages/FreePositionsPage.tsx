import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AvailabilityDto, CourtDto, SportType } from '../types'
import { fetchAvailability, fetchActiveCourts } from '../api'
import AdminHeader from '../components/AdminHeader'
import SportPicker from '../components/SportPicker'
import TimelineGrid from '../components/TimelineGrid'

function todayISOinTZ(tz: string) {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

function formatDateShort(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}.${m}`
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
    case 'BEACH_VOLLEY': return 'VOLEI PE PLAJĂ'
    case 'BASKETBALL': return 'BASCHET'
    case 'FOOTVOLLEY': return 'TENIS DE PICIOR'
    case 'TABLE_TENNIS': return 'TENIS DE MASĂ'
    default: return String(s)
  }
}

function splitRange(startMins: number, endMins: number) {
  const out: Array<{ start: number, end: number }> = []
  let cursor = startMins
  let remaining = endMins - startMins
  
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
    default: if (remaining > 0) chunks = [remaining]; break
  }
  for (const chunk of chunks) {
    out.push({ start: cursor, end: cursor + chunk })
    cursor += chunk
  }
  return out
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
  const [tableLoading, setTableLoading] = useState(false)
  const [copiedText, setCopiedText] = useState(false)
  const [copiedImage, setCopiedImage] = useState(false)
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
        try { localStorage.removeItem('adminAuth'); localStorage.removeItem('adminAuthTS') } catch { }
        nav('/login')
      }
    } catch { }
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
    try { if (toastShowTimer.current) clearTimeout(toastShowTimer.current) } catch { }
    try { if (toastHideTimer.current) clearTimeout(toastHideTimer.current) } catch { }
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

  const filteredData = useMemo(() => {
    return data.filter(d => {
      if (d.court.sportType === 'TENNIS' && !d.court.indoor) return false
      // Padel court 4 not open yet
      if (d.court.sportType === 'PADEL' && d.court.name.trim() === '4') return false
      return true
    })
  }, [data])

  const courts = useMemo(() => filteredData.map(d => d.court), [filteredData])
  const selectedCourt: CourtDto | null = useMemo(() => {
    if (!courtId) return null
    return courts.find(c => c.id === courtId) || null
  }, [courtId, courts])

  function formatHeader(s: SportType, court?: CourtDto | null) {
    const sportName = sportLabelUpper(s)
    if (!court) {
      return `💙💙 POZITII LIBERE - ${sportName} 💙💙`
    }
    const rawCourt = court.name ? String(court.name) : ''
    const courtLabel = rawCourt.replace(/^Teren\s*/i, '')
    return `💙💙 POZITII LIBERE - ${sportName} - TEREN ${courtLabel} 💙💙`
  }

  function formatDateLine(iso?: string) {
    if (!iso) return ''
    const [y, m, d] = iso.split('-').map(Number)
    if (!y || !m || !d) return iso
    const months = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec']
    const weekdays = ['DUMINICA', 'LUNI', 'MARTI', 'MIERCURI', 'JOI', 'VINERI', 'SAMBATA']
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
    } catch { }
    toastShowTimer.current = setTimeout(() => setMissingToastFading(true), 3000)
    toastHideTimer.current = setTimeout(() => setMissingToastVisible(false), 4500)
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

  // Always fetch fresh availability (no cache) before generating
  async function fetchAvailabilityFresh(dateISO: string, s: SportType): Promise<AvailabilityDto[]> {
    const base = import.meta.env.VITE_API_BASE_URL || '/api'
    const url = new URL(`${window.location.origin}${base}/availability`)
    url.searchParams.set('date', dateISO)
    url.searchParams.set('sportType', s)
    url.searchParams.set('_', String(Date.now()))
    const res = await fetch(url.toString(), { cache: 'no-store' })
    if (!res.ok) throw new Error('Nu am putut incarca disponibilitatea')
    return res.json()
  }

  async function generate() {
    setLoading(true)
    try {
      const all = await fetchAvailabilityFresh(date, sport)
      const fresh = all.filter(d => {
        if (d.court.sportType === 'TENNIS' && !d.court.indoor) return false
        if (d.court.sportType === 'PADEL' && d.court.name.trim() === '4') return false
        return true
      })
      setData(fresh)
      
      const header = formatHeader(sport, courtId ? fresh.find(d => d.court.id === Number(courtId))?.court : null)
      const dateLine = formatDateLine(date)
      
      let body = ''
      const dayStart = 8 * 60, dayEnd = 24 * 60

      const processRow = (row: AvailabilityDto) => {
        const raw: Array<{ start: number, end: number }> = []
        for (const fr of row.free || []) {
          const s = Math.max(dayStart, parseHHmm(fr.start))
          const e = Math.min(dayEnd, parseHHmm(fr.end))
          if (e > s) raw.push({ start: s, end: e })
        }
        raw.sort((a, b) => a.start - b.start)
        const merged: typeof raw = []
        for (const r of raw) {
          const last = merged[merged.length - 1]
          if (!last || r.start > last.end) merged.push({ ...r })
          else last.end = Math.max(last.end, r.end)
        }
        const expanded: Array<{ start: number, end: number }> = []
        for (const seg of merged) {
          expanded.push(...splitRange(seg.start, seg.end))
        }
        return expanded.map(seg => `✅ *${fmtHHmm(seg.start)} - ${fmtHHmm(seg.end)}*`).join('\n')
      }

      if (courtId) {
        const row = fresh.find(d => d.court.id === Number(courtId))
        if (!row) { setText(''); return }
        body = processRow(row)
      } else {
        // Multi-court
        const parts: string[] = []
        for (const row of fresh) {
          const slotsText = processRow(row)
          if (slotsText) {
            parts.push(`🏟️ ${row.court.name}:\n${slotsText}`)
          }
        }
        body = parts.join('\n\n')
      }

      const footer = `\n\n🚀 Rezervă acum pe site sau în aplicație!`
      setText(`${header}\n\n${dateLine}\n\n${body}${footer}`.trim())
    } finally {
      setLoading(false)
    }
  }

  async function handleLoadTable() {
    setTableLoading(true)
    try {
      const all = await fetchAvailabilityFresh(date, sport)
      const fresh = all.filter(d => {
        if (d.court.sportType === 'TENNIS' && !d.court.indoor) return false
        if (d.court.sportType === 'PADEL' && d.court.name.trim() === '4') return false
        return true
      })
      setData(fresh)
    } finally {
      setTableLoading(false)
    }
  }

  async function copy() {
    try {
      if (!text) return
      await navigator.clipboard.writeText(text)
      setCopiedText(true)
      if (copyTimer.current) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopiedText(false), 3000)
    } catch { }
  }

  const [imageCopying, setImageCopying] = useState(false)
  const posterRef = useRef<HTMLDivElement>(null)

  async function copyAsImage() {
    if (imageCopying) return
    setImageCopying(true)
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Square format - fits better on WhatsApp and Instagram
      const W = 1080, H = 1080
      canvas.width = W
      canvas.height = H

      // ----- Background: dark blue-teal gradient -----
      const grad = ctx.createLinearGradient(0, 0, W, H)
      grad.addColorStop(0, '#0a2342')   // dark navy
      grad.addColorStop(0.5, '#0f4c5c') // deep teal
      grad.addColorStop(1, '#0a2342')   // dark navy
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      // ----- Decorative horizontal stripe -----
      ctx.strokeStyle = 'rgba(190,242,100,0.2)'
      ctx.lineWidth = 2
      for (let i = 0; i < 8; i++) {
        ctx.beginPath()
        ctx.moveTo(0, 120 + i * 4)
        ctx.lineTo(W, 120 + i * 4)
        ctx.stroke()
      }

      // ----- Logo box -----
      ctx.fillStyle = '#bef264'
      ctx.beginPath()
      ctx.roundRect(W/2 - 52, 40, 104, 104, 28)
      ctx.fill()
      ctx.font = '64px serif'
      ctx.textAlign = 'center'
      ctx.fillStyle = '#0a2342'
      ctx.fillText('\u{1F3BE}', W/2, 120) // 🎾

      // ----- Title -----
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 58px Outfit, Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('INTERVALE ORARE DISPONIBILE', W/2, 220)

      // Separator line
      ctx.strokeStyle = '#bef264'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(W * 0.2, 245)
      ctx.lineTo(W * 0.8, 245)
      ctx.stroke()

      // ----- Date -----
      const weekdays = ['DUMINICA', 'LUNI', 'MARTI', 'MIERCURI', 'JOI', 'VINERI', 'SAMBATA']
      const ds = new Date(date)
      const dayName = weekdays[ds.getDay()]
      ctx.fillStyle = '#e2e8f0'
      ctx.font = 'bold 38px Outfit, Arial, sans-serif'
      ctx.fillText(`${dayName} (${formatDateShort(date)})`, W/2, 310)

      // ----- Court sections -----
      const dayStart = 8 * 60, dayEnd = 24 * 60
      const fresh = data.filter(d => {
        if (d.court.sportType === 'TENNIS' && !d.court.indoor) return false
        if (d.court.sportType === 'PADEL' && d.court.name.trim() === '4') return false
        return true
      })

      // Build data for dynamic layout
      const sections: { label: string; segs: { start: number; end: number }[] }[] = []
      for (const row of fresh) {
        const raw: Array<{ start: number, end: number }> = []
        for (const fr of row.free || []) {
          const s = Math.max(dayStart, parseHHmm(fr.start))
          const e = Math.min(dayEnd, parseHHmm(fr.end))
          if (e > s) raw.push({ start: s, end: e })
        }
        raw.sort((a, b) => a.start - b.start)
        const merged: typeof raw = []
        for (const r of raw) {
          const last = merged[merged.length - 1]
          if (!last || r.start > last.end) merged.push({ ...r })
          else last.end = Math.max(last.end, r.end)
        }
        if (merged.length > 0) {
          const rawName = String(row.court.name).toUpperCase()
          sections.push({ label: rawName.startsWith('TEREN') ? rawName : `TEREN ${rawName}`, segs: merged })
        }
      }

      // ----- Dynamic layout: side by side if <=3 courts, single column if more -----
      const isSideBySide = sections.length <= 3
      const colW = isSideBySide ? Math.floor(W / sections.length) : W
      const contentStartY = 360

      if (isSideBySide && sections.length > 1) {
        // Draw court separators
        for (let i = 1; i < sections.length; i++) {
          ctx.strokeStyle = 'rgba(255,255,255,0.15)'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(colW * i, contentStartY - 10)
          ctx.lineTo(colW * i, H - 80)
          ctx.stroke()
        }
      }

      for (let ci = 0; ci < sections.length; ci++) {
        const sec = sections[ci]
        const cx = isSideBySide ? colW * ci + colW / 2 : W / 2
        let cy = contentStartY

        // Court label
        ctx.fillStyle = 'rgba(255,255,255,0.75)'
        ctx.font = `bold ${isSideBySide ? 28 : 32}px Outfit, Arial, sans-serif`
        ctx.textAlign = 'center'
        ctx.fillText(sec.label, cx, cy)
        cy += 50

        // Intervals (merged - no splitting)
        ctx.fillStyle = '#bef264'
        ctx.font = `bold ${isSideBySide ? 32 : 36}px Outfit, Arial, sans-serif`
        for (const seg of sec.segs) {
          ctx.fillText(`${fmtHHmm(seg.start)} - ${fmtHHmm(seg.end)}`, cx, cy)
          cy += isSideBySide ? 50 : 55
        }
      }

      // ----- Footer -----
      ctx.fillStyle = '#bef264'
      ctx.font = 'bold 28px Outfit, Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('STAR ARENA BASCOV', W/2, H - 48)
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.font = '18px Outfit, Arial, sans-serif'
      ctx.fillText('stararenabascov.ro', W/2, H - 22)

      canvas.toBlob(blob => {
        if (!blob) return
        const item = new ClipboardItem({ 'image/png': blob })
        navigator.clipboard.write([item]).then(() => {
          setCopiedImage(true)
          if (copyTimer.current) window.clearTimeout(copyTimer.current)
          copyTimer.current = window.setTimeout(() => setCopiedImage(false), 3000)
        }).catch(() => {})
        setImageCopying(false)
      })
    } catch {
      setImageCopying(false)
    }
  }

  function getCourtLabel(c: CourtDto) {
    const raw = String(c.name).toUpperCase()
    return raw.startsWith('TEREN') ? raw : `TEREN ${raw}`
  }

  return (
    <div className="min-h-screen w-full" style={pageBgStyle}><div className="max-w-3xl mx-auto p-4 space-y-4">
      <AdminHeader active="free" />

      <div className="rounded border border-sky-200 bg-sky-50 p-3 shadow-md">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-slate-600 mb-1">Sport</div>
            <select className="border rounded px-2 py-1.5 w-full bg-white h-9" value={sport} onChange={e => { setSport(e.target.value as SportType); setCourtId(''); }}>
              <option value="TENNIS" disabled={disabledSports.includes('TENNIS')}>Tenis</option>
              <option value="PADEL" disabled={disabledSports.includes('PADEL')}>Padel</option>
              <option value="BASKETBALL" disabled={disabledSports.includes('BASKETBALL')}>Baschet</option>
              <option value="FOOTVOLLEY" disabled={disabledSports.includes('FOOTVOLLEY')}>Tenis de picior</option>
              <option value="BEACH_VOLLEY" disabled={disabledSports.includes('BEACH_VOLLEY')}>Volei pe Plajă</option>
              <option value="TABLE_TENNIS" disabled={disabledSports.includes('TABLE_TENNIS')}>Tenis de Masă</option>
            </select>
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
                    } catch { }
                    try { el.focus() } catch { }
                    try { el.click() } catch { }
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
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button className="btn w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleLoadTable} disabled={tableLoading}>
            {tableLoading ? 'Se incarcă...' : 'Încarcă Tabel'}
          </button>
          <button className="btn w-full bg-sky-600 hover:bg-sky-700 text-white" onClick={generate} disabled={loading}>
            {loading ? 'Se generează...' : 'Generează Mesaj'}
          </button>
          <button className={`px-3 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-all sm:col-span-2 ${highlightCopy ? "ring-2 ring-emerald-400" : ""}`} onClick={copy} disabled={!text}>
            {copiedText ? 'Text Copiat!' : 'Copiaza Text'}
          </button>
          <button className={`px-3 py-1.5 rounded border border-lime-300 bg-lime-50 hover:bg-lime-100 text-lime-800 font-bold transition-all sm:col-span-2 ${copiedImage ? "ring-2 ring-lime-400" : ""}`} onClick={copyAsImage} disabled={!data.length || imageCopying}>
            {imageCopying ? 'Se randeaza...' : (copiedImage ? 'Imagine Copiata!' : 'Copiaza Imagine (Poster)')}
          </button>
        </div>
      </div>

      {/* Visual Poster Preview */}
      {data.length > 0 && (
        <div className="flex flex-col items-center gap-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Previzualizare Poster</div>
          <div 
            ref={posterRef}
            className="w-full max-w-[480px] rounded-2xl shadow-2xl p-6 flex flex-col items-center text-center overflow-hidden relative border-2 border-white/10"
            style={{ 
              background: 'linear-gradient(135deg, #0a2342 0%, #0f4c5c 50%, #0a2342 100%)',
              fontFamily: 'Outfit, sans-serif',
              aspectRatio: '1 / 1'
            }}
          >
            {/* Logo */}
            <div className="bg-lime-300 w-14 h-14 rounded-2xl rotate-3 flex items-center justify-center mb-3 shadow-lg flex-shrink-0">
               <span className="text-2xl">🎾</span>
            </div>

            <h2 className="text-white font-extrabold text-base tracking-tight leading-tight mb-0.5 uppercase">
              Intervale Orare Disponibile:
            </h2>

            {/* Separator */}
            <div className="w-2/3 border-b-2 border-lime-300/60 mb-2 mt-1"></div>

            <div className="text-slate-300 font-bold text-sm mb-3 tracking-wide">
              {(() => {
                const weekdays = ['DUMINICA', 'LUNI', 'MARTI', 'MIERCURI', 'JOI', 'VINERI', 'SAMBATA']
                const d = new Date(date)
                return `${weekdays[d.getDay()]} (${formatDateShort(date)})`
              })()}
            </div>

            {/* Courts grid - side by side if <= 3 */}
            <div className={`w-full flex-1 ${filteredData.filter(r => {
              const segs = (() => {
                const dayStart = 8*60, dayEnd = 24*60
                const raw: {start:number,end:number}[] = []
                for (const fr of r.free||[]) { const s=Math.max(dayStart,parseHHmm(fr.start)),e=Math.min(dayEnd,parseHHmm(fr.end)); if(e>s) raw.push({start:s,end:e}) }
                return raw
              })()
              return segs.length > 0
            }).length <= 3 ? 'grid grid-cols-' + filteredData.filter(r => {
              const dayStart = 8*60, dayEnd = 24*60
              const raw: {start:number,end:number}[] = []
              for (const fr of r.free||[]) { const s=Math.max(dayStart,parseHHmm(fr.start)),e=Math.min(dayEnd,parseHHmm(fr.end)); if(e>s) raw.push({start:s,end:e}) }
              return raw.length > 0
            }).length : 'flex flex-col'} gap-x-2 gap-y-3`}>
              {filteredData.map(row => {
                const dayStart = 8 * 60, dayEnd = 24 * 60
                const raw: Array<{ start: number, end: number }> = []
                for (const fr of row.free || []) {
                  const s = Math.max(dayStart, parseHHmm(fr.start))
                  const e = Math.min(dayEnd, parseHHmm(fr.end))
                  if (e > s) raw.push({ start: s, end: e })
                }
                raw.sort((a, b) => a.start - b.start)
                const merged: typeof raw = []
                for (const r of raw) {
                  const last = merged[merged.length - 1]
                  if (!last || r.start > last.end) merged.push({ ...r })
                  else last.end = Math.max(last.end, r.end)
                }

                if (merged.length === 0) return null

                return (
                  <div key={row.court.id} className="space-y-0.5">
                    <div className="text-white/70 font-black text-[10px] uppercase tracking-widest">{getCourtLabel(row.court)}</div>
                    <div className="flex flex-col gap-0">
                      {merged.map((seg, i) => (
                        <div key={i} className="text-lime-300 font-extrabold text-base leading-tight">
                          {fmtHHmm(seg.start)} - {fmtHHmm(seg.end)}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-2 text-lime-300 font-bold text-xs tracking-[0.2em] uppercase">
              STAR ARENA BASCOV
            </div>
          </div>
        </div>
      )}

      {data.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
             <h3 className="text-sm font-bold text-slate-800">Vizualizare Grila (Admin)</h3>
             <span className="text-[10px] text-slate-500 font-medium">Data: {formatDateDisplay(date)}</span>
          </div>
          <div className="p-1">
            <TimelineGrid data={data} date={date} flat />
          </div>
        </div>
      )}

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
                  try { if (toastShowTimer.current) clearTimeout(toastShowTimer.current) } catch { }
                  try { if (toastHideTimer.current) clearTimeout(toastHideTimer.current) } catch { }
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




