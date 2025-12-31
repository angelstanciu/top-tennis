import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AvailabilityDto, CourtDto, SportType } from '../types'
import { fetchAvailability } from '../api'
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
  const [courtId, setCourtId] = useState<number | ''>('')
  const [text, setText] = useState('')
  const [copied, setCopied] = useState(false)
  const copyTimer = useRef<number | null>(null)
  const dateInputRef = useRef<HTMLInputElement | null>(null)

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
    setLoading(true)
    fetchAvailability(date, sport)
      .then(setData)
      .finally(() => setLoading(false))
  }, [date, sport])

  useEffect(() => () => { if (copyTimer.current) window.clearTimeout(copyTimer.current) }, [])
  useEffect(() => () => {
    try { if (toastShowTimer.current) clearTimeout(toastShowTimer.current) } catch {}
    try { if (toastHideTimer.current) clearTimeout(toastHideTimer.current) } catch {}
  }, [])

  const courts = useMemo(() => data.map(d => d.court), [data])
  const selectedCourt: CourtDto | null = useMemo(() => {
    if (!courtId) return null
    return courts.find(c => c.id === courtId) || null
  }, [courtId, courts])

  function formatHeader(s: SportType, court?: CourtDto | null) {
    const head = `POZITII LIBERE ${sportLabelUpper(s)} ${court?.name ?? ''}`
    return `${head}\n`
  }

  function showMissingCourtToast() {
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

      const header = formatHeader(sport, row.court)
      const body = merged.map(seg => `${fmtHHmm(seg.start)}-${fmtHHmm(seg.end)}`).join('\n')
      setText(`${header}\n${body}`.trim())
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
      copyTimer.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Generare pozitii libere</h1>
        <button
          type="button"
          className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
          onClick={() => { try { localStorage.removeItem('adminAuth'); localStorage.removeItem('adminAuthTS') } catch {}; nav('/login', { replace: true }) }}
        >Delogare</button>
      </div>

      <div className="rounded border border-sky-200 bg-sky-50 p-3 shadow-md">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="text-xs text-slate-600 mb-1">Sport</div>
            <SportPicker value={sport} onChange={(v) => { setSport(v); setCourtId('') }} />
          </div>
          <div>
            <div className="text-xs text-slate-600 mb-1">Teren</div>
            <select className="border rounded px-2 py-1.5 w-full" value={courtId as any} onChange={e => setCourtId(Number(e.target.value) as any)}>
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
        <div className="mt-3 flex gap-2">
          <button className="px-4 py-2 rounded border bg-white hover:bg-slate-50" onClick={generate} disabled={loading}>Genereaza</button>
          <button className="px-4 py-2 rounded border" onClick={copy} disabled={!text}>Copiaza pozitiile</button>
          {copied && <span className="text-emerald-700 text-sm">Copiat!</span>}
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
              style={{ transitionDuration: '2000ms', height: '33vh' }}
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
              <div className="h-full flex flex-col items-center justify-center text-center gap-2 px-4">
                <span className="text-2xl" aria-hidden>{'\u26A0'}</span>
                <div className="text-base sm:text-lg text-rose-900">Selecteaza un teren inainte</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
