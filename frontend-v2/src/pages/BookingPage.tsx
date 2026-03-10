import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { createBooking } from '../api'
import type { CourtDto } from '../types'
import fastCat from '../assets/fast-cat.svg'

function formatDateDisplay(iso?: string) {
  if (!iso) return ''
  const parts = iso.split('-')
  if (parts.length !== 3) return iso
  const [y, m, d] = parts
  if (!y || !m || !d) return iso
  return `${d}.${m}.${y}`
}

export default function BookingPage() {
  const { courtId, date, startTime, endTime } = useParams()
  const [searchParams] = useSearchParams()
  const sport = searchParams.get('sport') || 'TENNIS'
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [unavailableVisible, setUnavailableVisible] = useState(false)
  const [unavailableMessage, setUnavailableMessage] = useState('')
  const nav = useNavigate()
  const phoneInputRef = useRef<HTMLInputElement | null>(null)
  const [court, setCourt] = useState<CourtDto | null>(null)

  const displayDate = useMemo(() => formatDateDisplay(date), [date])
  const subtitle = useMemo(() => `${displayDate} - ${startTime} - ${endTime}`, [displayDate, startTime, endTime])

  function minutesBetween(a?: string, b?: string) {
    if (!a || !b) return 0
    const [ah, am] = a.split(':').map(Number)
    const [bh, bm] = b.split(':').map(Number)
    let diff = (bh * 60 + bm) - (ah * 60 + am)
    if (diff < 0) diff += 24 * 60
    return diff
  }

  const meetsMinDuration = minutesBetween(startTime, endTime) >= 60

  function validatePhone(inputEl?: HTMLInputElement) {
    const el = inputEl || phoneInputRef.current
    if (!el) return
    try {
      el.setCustomValidity('')
      const raw = el.value.replace(/[\s-]/g, '')
      const valid = /^0\d{9}$/.test(raw) || /^\+40\d{9}$/.test(raw)
      if (el.value && !valid) {
        el.setCustomValidity('Introdu un numar valid de telefon (07xxxxxxxx sau +407xxxxxxxx).')
      }
    } catch {}
  }

  function redirectToGrid() {
    const lastSport = localStorage.getItem('lastSport') || sport
    const fallbackDate = new Date().toISOString().slice(0, 10)
    const gridDate = date || fallbackDate
    nav(`/?sport=${encodeURIComponent(lastSport)}&date=${encodeURIComponent(gridDate)}`)
  }

  function showUnavailable(message: string) {
    setUnavailableMessage(message)
    setUnavailableVisible(true)
  }

  // Load court details to compute total price
  useEffect(() => {
    async function loadCourt() {
      try {
        if (!courtId) return
        const base = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8080/api'
        const res = await fetch(`${base}/courts/${courtId}`)
        if (!res.ok) return
        const data = await res.json() as CourtDto
        setCourt(data)
      } catch {}
    }
    loadCourt()
  }, [courtId])

  const totalPrice = useMemo(() => {
    try {
      if (!court || !startTime || !endTime) return null
      const normalizedEnd = endTime === '24:00' ? '23:59' : endTime
      const mins = minutesBetween(startTime, normalizedEnd)
      if (mins <= 0) return null
      const hours = mins / 60
      const amount = (court.pricePerHour as unknown as number) * hours
      return amount
    } catch { return null }
  }, [court, startTime, endTime])

  const courtDetailSuffix = useMemo(() => {
    if (!court) return ''
    const parts: string[] = []
    parts.push(court.indoor ? 'interior' : 'exterior')
    if (court.heated) parts.push('incalzit')
    if (court.lighting) parts.push('iluminat')
    if (!parts.length) return ''
    return ' - ' + parts.join(' - ')
  }, [court])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!courtId || !date || !startTime || !endTime) return
    validatePhone()
    if (phoneInputRef.current && !phoneInputRef.current.checkValidity()) {
      phoneInputRef.current.reportValidity()
      return
    }
    setSubmitting(true)
    try {
      const normalizedEnd = endTime === '24:00' ? '23:59' : endTime
      await createBooking({
        courtId: Number(courtId),
        date,
        startTime,
        endTime: normalizedEnd,
        customerName: name,
        customerPhone: phone,
        customerEmail: email || undefined,
      })
      alert('Multumim, rezervarea a fost inregistrata.')
      redirectToGrid()
    } catch {
      showUnavailable('Ups, teren ocupat! Alt juc\u0103tor a fost mai iute de lab\u0103! \uD83D\uDC31')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 w-full font-sans flex flex-col items-center py-6 px-4">
      
      {/* Premium Header */}
      <div className="w-full max-w-lg mb-8 flex justify-between items-center">
        <button 
          onClick={() => redirectToGrid()} 
          className="bg-white hover:bg-slate-100 text-slate-700 p-2.5 rounded-full shadow-sm border border-slate-200 transition-all active:scale-95 flex items-center justify-center" 
          aria-label="Înapoi la calendar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>Finalizare Rezervare</h1>
        <div className="w-10"></div> {/* Spacer pt centrare */}
      </div>

      <div className="w-full max-w-lg space-y-6">
        {/* Receipt Card (Bilet Digital) */}
        <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
          {/* Decorative receipt zig-zag top/bottom can be added with CSS or SVG, keeping it clean here */}
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-400 to-teal-400"></div>
          
          <div className="text-center mb-6">
            <span className="inline-block bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase mb-3">Sumar Rezervare</span>
            <h2 className="text-2xl font-black text-slate-800">{`Teren ${court?.name ?? courtId}`}</h2>
            <p className="text-slate-500 font-medium text-sm mt-1 capitalize">{courtDetailSuffix.replace(' - ', '') || 'Standard'}</p>
          </div>

          <div className="border-t border-dashed border-slate-200 py-5 my-2 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Data</span>
              <span className="text-slate-800 font-bold">{displayDate}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Interval</span>
              <span className="text-slate-800 font-bold">{startTime} - {endTime}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Durată</span>
              <span className="text-slate-800 font-bold">{minutesBetween(startTime, endTime)} min</span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 flex justify-between items-center border border-slate-100 mt-2">
            <span className="text-slate-600 font-semibold uppercase tracking-wider text-sm">Total de plată</span>
            <span className="text-2xl font-black text-emerald-600">{totalPrice != null ? `${totalPrice.toFixed(2)} RON` : '...'}</span>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-5">Date de Contact</h3>
          
          <form onSubmit={onSubmit} className="space-y-4">
            {!meetsMinDuration && (
              <div className="p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-2xl text-sm font-medium flex gap-3 items-start">
                <span>⚠️</span>
                <span>Selectează cel puțin 1 oră (două intervale continue de 30 min).</span>
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-600 ml-1">Nume și Prenume *</label>
              <input 
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 transition-all font-medium text-slate-800" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                placeholder="Ex. Popescu Ion"
                required 
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-600 ml-1">Telefon *</label>
              <input
                ref={phoneInputRef}
                type="tel"
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 transition-all font-medium text-slate-800"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onInput={(e) => validatePhone(e.currentTarget)}
                placeholder="07XX XXX XXX"
                required
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-600 ml-1">Email <span className="font-normal text-slate-400">(Opțional)</span></label>
              <input 
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 transition-all font-medium text-slate-800" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                type="email" 
                placeholder="adresa@exemplu.ro"
              />
            </div>
            
            <div className="pt-2">
              <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl">
                Prin apăsarea butonului de confirmare, îți exprimi acordul pentru prelucrarea datelor personale, exclusiv în scopul administrării rezervării.
              </p>
            </div>
            
            <div className="pt-4 flex flex-col gap-3">
              <button 
                className="w-full py-4 rounded-xl font-bold text-lg bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 active:scale-95 transition-all flex justify-center items-center gap-2 disabled:bg-slate-300 disabled:shadow-none" 
               disabled={submitting || !meetsMinDuration} 
               type="submit"
              >
                {submitting ? 'SE PROCESEAZĂ...' : 'CONFIRMĂ REZERVAREA'}
              </button>
            </div>
          </form>
        </div>
      </div>

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
                  redirectToGrid()
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
                  redirectToGrid()
                }}
              >
                Am inteles!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}




