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

  const getSportImage = (s: SportType | '') => {
    switch (s) {
      case 'TENNIS': return '/img-tenis-premium-night.jpg'
      case 'PADEL': return '/img-padel-real-court.jpg'
      case 'BASKETBALL': return '/img-basketball-top-view.jpg'
      case 'BEACH_VOLLEY': return '/img-volley-real.jpg'
      case 'FOOTVOLLEY': return '/img-foot-tennis-real.jpg'
      case 'TABLE_TENNIS': return '/img-pingpong.png'
      default: return '/img-padel-premium.png'
    }
  }

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
    setTableLoading(true)
    const base = import.meta.env.VITE_API_BASE_URL || '/api'
    const url = new URL(`${window.location.origin}${base}/availability`)
    url.searchParams.set('date', date)
    url.searchParams.set('sportType', sport)
    url.searchParams.set('_', String(Date.now()))
    
    fetch(url.toString(), { cache: 'no-store' })
      .then(res => res.json())
      .then(async all => {
         const fresh = all.filter((d: any) => {
           if (d.court.sportType === 'TENNIS' && !d.court.indoor) return false
           if (d.court.sportType === 'PADEL' && d.court.name.trim() === '4') return false
           return true
         })
         setData(fresh)
      })
      .catch(console.error)
      .finally(() => setTableLoading(false))
  }, [date, sport])

  useEffect(() => {
    if (data.length === 0) {
      setText('')
      return
    }
    const header = formatHeader(sport, courtId ? data.find(d => d.court.id === Number(courtId))?.court : null)
    
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
      return merged.map(seg => `✅ *${fmtHHmm(seg.start)} - ${fmtHHmm(seg.end)}*`).join('\n')
    }

    if (courtId) {
      const row = data.find(d => d.court.id === Number(courtId))
      if (!row) { setText(''); return }
      body = processRow(row)
    } else {
      const parts: string[] = []
      for (const row of data) {
        const slotsText = processRow(row)
        if (slotsText) {
          const rawName = String(row.court.name)
          const label = rawName.toUpperCase().startsWith('TEREN') ? rawName : `Teren ${rawName}`
          parts.push(`🏟️ ${label}:\n${slotsText}`)
        }
      }
      body = parts.join('\n\n')
    }

    const formatIntroDate = (isoStart: string) => {
      try {
        const tz = 'Europe/Bucharest'
        const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
        const tDate = new Date()
        tDate.setDate(tDate.getDate() + 1)
        const tomorrowStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(tDate)
        
        if (isoStart === todayStr) return 'de astăzi'
        if (isoStart === tomorrowStr) return 'de mâine'
        
        const [y, m, d] = isoStart.split('-')
        return `pentru ${d}.${m}.${y}`
      } catch {
        return `pentru ${isoStart}`
      }
    }

    const intro = `Salut! 👋\nAcestea sunt pozițiile libere ${formatIntroDate(date)} la ${sportLabelUpper(sport)}.\n`
    const footer = `\n🎾 Pentru rezervări rapide, accesați: www.star-arena.ro ! Vă așteptăm cu drag! 🚀`
    setText(`${intro}\n${body}\n${footer}`.trim())
  }, [data, courtId, sport, date])

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
      ctx.fillText('INTERVALE ORARE DISPONIBILE', W/2, 210)

      ctx.fillStyle = '#bef264'
      ctx.font = 'bold 48px Outfit, Arial, sans-serif'
      ctx.fillText(sportLabelUpper(sport), W/2, 275)

      // Separator line
      ctx.strokeStyle = '#bef264'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(W * 0.2, 295)
      ctx.lineTo(W * 0.8, 295)
      ctx.stroke()

      // ----- Date -----
      const weekdays = ['DUMINICA', 'LUNI', 'MARTI', 'MIERCURI', 'JOI', 'VINERI', 'SAMBATA']
      const ds = new Date(date)
      const dayName = weekdays[ds.getDay()]
      ctx.fillStyle = '#e2e8f0'
      ctx.font = 'bold 38px Outfit, Arial, sans-serif'
      ctx.fillText(`${dayName} (${formatDateShort(date)})`, W/2, 350)

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
      const contentStartY = 410

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
    <div className="min-h-screen relative font-sans text-slate-900 bg-slate-50 selection:bg-sky-100 selection:text-sky-900 overflow-x-hidden">
      {/* Premium Dark Background Image */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none transition-all duration-1000 bg-slate-900"
        style={{ 
          backgroundImage: "url('/img-padel-premium.png')", 
          backgroundSize: 'cover', 
          backgroundPosition: 'center', 
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed'
        }}
      >
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[3px]" />
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-6 relative z-10">
      <AdminHeader active="free" />

      <div className="bg-white/80 backdrop-blur-xl border border-sky-100 rounded-[2rem] p-6 shadow-xl shadow-sky-900/5 transition-all">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Sport</div>
            <select className="w-full h-11 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all appearance-none shadow-sm cursor-pointer" value={sport} onChange={e => { setSport(e.target.value as SportType); setCourtId(''); }}>
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
          <div className="relative">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Teren</div>
            <select className={`w-full h-11 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all appearance-none shadow-sm cursor-pointer ${highlightCourt ? "animate-pulse ring-2 ring-rose-300" : ""}`} value={courtId as any} onChange={e => setCourtId(Number(e.target.value) as any)}>
              <option value="">Selecteaza terenul</option>
              {courts.map(c => {
                const label = /^teren/i.test(c.name) ? c.name : `Teren ${c.name}`
                return <option key={c.id} value={c.id}>{label}</option>
              })}
            </select>
            <div className="absolute right-4 bottom-3.5 pointer-events-none text-slate-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </div>
          </div>
          <div className="relative">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Data</div>
            <div className="relative flex items-stretch border border-slate-100 bg-slate-50 rounded-2xl overflow-hidden h-11 shadow-sm focus-within:ring-4 focus-within:ring-sky-500/10 focus-within:border-sky-500 transition-all">
              <button
                type="button"
                className="inline-flex items-center justify-center px-4 text-xl leading-none text-slate-400 hover:bg-white hover:text-sky-600 border-r border-slate-100 focus:outline-none transition-all"
                aria-label="Ziua anterioara"
                title="Ziua anterioara"
                onClick={() => shiftDate(-1)}
              >
                {'\u2039'}
              </button>
              <div className="relative flex-1 min-w-0">
                <div className="flex items-center justify-center h-full text-sm font-bold text-slate-700 select-none truncate">
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
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center px-4 text-xl leading-none text-slate-400 hover:bg-white hover:text-sky-600 border-l border-slate-100 focus:outline-none transition-all"
                aria-label="Ziua urmatoare"
                onClick={() => shiftDate(1)}
                title="Ziua urmatoare"
              >
                {'\u203A'}
              </button>
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-2">
          <button className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl transition-all disabled:opacity-50 active:scale-95 ${copiedImage ? 'bg-sky-500 text-white shadow-sky-500/20 ring-2 ring-sky-300' : 'bg-slate-800 text-white shadow-slate-800/20 hover:bg-slate-700'}`} onClick={copyAsImage} disabled={!data.length || imageCopying}>
            {imageCopying ? 'Se genereaza imaginea...' : (copiedImage ? 'Imagine Copiată!' : 'Copiaza Poster (Imagine)')}
          </button>
        </div>
      </div>

      {/* Visual Poster Preview */}
      {data.length > 0 && (
        <div className="flex flex-col items-center gap-4 mt-6">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">Previzualizare Poster</div>
          <div 
            ref={posterRef}
            className="w-full max-w-[480px] rounded-[2rem] shadow-2xl p-6 flex flex-col items-center text-center overflow-hidden relative border-2 border-white/10"
            style={{ 
              backgroundImage: `linear-gradient(rgba(10, 35, 66, 0.75), rgba(15, 76, 92, 0.85)), url(${getSportImage(sport)})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              fontFamily: 'Outfit, sans-serif',
              aspectRatio: '1 / 1'
            }}
          >
            {/* Logo */}
            <div className="bg-lime-400 w-14 h-14 rounded-2xl rotate-3 flex items-center justify-center mb-3 shadow-lg flex-shrink-0 border border-white/20">
               <span className="text-2xl">🎾</span>
            </div>

            <h2 className="text-white font-extrabold text-base tracking-tight leading-tight mb-0.5 uppercase">
              Intervale Orare Disponibile:
            </h2>
            <div className="text-lime-300 font-black text-lg uppercase tracking-wider mb-2">
              {sportLabelUpper(sport)}
            </div>

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

      {/* Text Template Section */}
      <div className="bg-white/80 backdrop-blur-md rounded-[2rem] border border-sky-100 shadow-xl overflow-hidden mt-6 flex flex-col items-stretch relative z-10 transition-all">
        <div className="p-5 bg-sky-50/50 border-b border-sky-100 flex items-center justify-between">
           <h3 className="font-black text-slate-800 uppercase tracking-widest text-[11px] flex items-center gap-3">
              PREVIZUALIZARE TEXT (SOCIAL MEDIA)
           </h3>
           <button className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 ${highlightCopy ? "bg-emerald-500 text-white shadow-emerald-500/20" : "bg-white text-slate-700 border border-slate-200 hover:border-sky-300 hover:text-sky-600"}`} onClick={copy} disabled={!text}>
             {copiedText ? 'Copiat' : 'Copiaza Text'}
           </button>
        </div>
        <div className="p-6 bg-slate-100/50 flex justify-center">
           <div className="w-full max-w-sm">
             <div className="bg-gradient-to-br from-[#E8F5E9] to-[#E0F2F1] rounded-3xl rounded-tl-sm shadow-sm border border-teal-100/50 p-5 relative">
                <div className="text-[14.5px] font-sans font-medium text-[#1A2F33] leading-relaxed whitespace-pre-wrap break-words pb-4">
                  {tableLoading ? 'Se incarca…' : (text || 'Nicio poziție liberă identificată.')}
                </div>
                <div className="absolute right-4 bottom-2 text-[10px] font-bold text-teal-700 opacity-50 select-none tracking-widest uppercase">Acum</div>
             </div>
           </div>
        </div>
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




