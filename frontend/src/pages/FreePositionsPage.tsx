import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AvailabilityDto, CourtDto, SportType } from '../types'
import { fetchAvailability } from '../api'

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

  const courts = useMemo(() => data.map(d => d.court), [data])
  const selectedCourt: CourtDto | null = useMemo(() => {
    if (!courtId) return null
    return courts.find(c => c.id === courtId) || null
  }, [courtId, courts])

  function formatHeader(s: SportType, court?: CourtDto | null) {
    const head = `POZITII LIBERE ${sportLabelUpper(s)} ${court?.name ?? ''}`
    return `${head}\n`
  }

  function generate() {
    if (!selectedCourt) { setText(''); return }
    const row = data.find(d => d.court.id === selectedCourt.id)
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

    const header = formatHeader(sport, selectedCourt)
    const body = merged.map(seg => `${fmtHHmm(seg.start)}-${fmtHHmm(seg.end)}`).join('\n')
    setText(`${header}\n${body}`.trim())
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
            <select className="border rounded px-2 py-1.5 w-full" value={sport} onChange={e => { setSport(e.target.value as SportType); setCourtId('') }}>
              <option value="TENNIS">Tenis</option>
              <option value="PADEL">Padel</option>
              <option value="BEACH_VOLLEY">Volei pe plaja</option>
              <option value="BASKETBALL">Baschet</option>
              <option value="FOOTVOLLEY">Tenis de picior</option>
              <option value="TABLE_TENNIS">Tenis de masa</option>
            </select>
          </div>
          <div>
            <div className="text-xs text-slate-600 mb-1">Teren</div>
            <select className="border rounded px-2 py-1.5 w-full" value={courtId as any} onChange={e => setCourtId(Number(e.target.value) as any)}>
              <option value="">Selecteaza</option>
              {courts.map(c => (
                <option key={c.id} value={c.id}>{`${c.name} (${c.sportType})`}</option>
              ))}
            </select>
          </div>
          <div>
            <div className="text-xs text-slate-600 mb-1">Data</div>
            <div className="relative">
              <input ref={dateInputRef} type="date" className="border rounded px-2 py-1.5 w-full pr-8" value={date} onChange={e => setDate(e.target.value)} />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-700 hover:text-black"
                aria-label="Deschide calendarul"
                onClick={() => {
                  const el = dateInputRef.current; if (!el) return
                  // @ts-ignore
                  if (typeof (el as any).showPicker === 'function') { (el as any).showPicker(); return }
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
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button className="px-4 py-2 rounded border bg-white hover:bg-slate-50" onClick={generate} disabled={loading || !courtId}>Genereaza</button>
          <button className="px-4 py-2 rounded border" onClick={copy} disabled={!text}>Copiaza pozitiile</button>
          {copied && <span className="text-emerald-700 text-sm">Copiat!</span>}
        </div>
      </div>

      <div className="rounded border border-slate-300 bg-white p-3 shadow">
        <div className="text-xs text-slate-600 mb-1">Previzualizare</div>
        <pre className="text-sm whitespace-pre-wrap font-mono min-h-[120px]">{loading ? 'Se incarca…' : (text || 'Alege sportul, terenul si data apoi apasa Genereaza.')}</pre>
      </div>
    </div>
  )
}

