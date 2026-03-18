import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { createBooking } from '../api'
import { CourtDto, calculateGranularPrice, LOCATION_TAGS } from '../types'
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
  const [name, setName] = useState(() => {
    try { return JSON.parse(localStorage.getItem('playerData') || '{}').fullName || '' } catch { return '' }
  })
  const [phone, setPhone] = useState(() => {
    try { return JSON.parse(localStorage.getItem('playerData') || '{}').phoneNumber || '' } catch { return '' }
  })
  const [email, setEmail] = useState(() => {
    try { return JSON.parse(localStorage.getItem('playerData') || '{}').email || '' } catch { return '' }
  })
  const isLoggedUser = useMemo(() => {
    try { return !!JSON.parse(localStorage.getItem('playerData') || '{}').phoneNumber } catch { return false }
  }, [])
  const isAdminUser = useMemo(() => {
    try { return !!localStorage.getItem('adminAuth') } catch { return false }
  }, [])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    function syncAuth() {
      try {
        const data = JSON.parse(localStorage.getItem('playerData') || '{}')
        if (data.phoneNumber) {
          setName(data.fullName || '')
          setPhone(data.phoneNumber || '')
          setEmail(data.email || '')
        }
      } catch {}
    }
    window.addEventListener('auth-change', syncAuth)
    return () => window.removeEventListener('auth-change', syncAuth)
  }, [])
  const [unavailableVisible, setUnavailableVisible] = useState(false)
  const [unavailableMessage, setUnavailableMessage] = useState('')
  const [requireBypassApproval, setRequireBypassApproval] = useState(false)
  const [successVisible, setSuccessVisible] = useState(false)
  const [pendingVisible, setPendingVisible] = useState(false)
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
    nav(`/rezerva?sport=${encodeURIComponent(lastSport)}&date=${encodeURIComponent(gridDate)}`)
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
        const base = (import.meta as any).env.VITE_API_BASE_URL || '/api'
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
      return calculateGranularPrice(court.sportType, court.indoor, startTime, endTime, date || '')
    } catch { return null }
  }, [court, startTime, endTime, date])

  function timeToMinutes(t: string) {
    if (t === '24:00' || t === '23:59') return 24 * 60
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }

  const courtDetailSuffix = useMemo(() => {
    if (!court) return ''
    const parts: string[] = []
    parts.push(court.indoor ? 'interior' : 'exterior')
    if (court.heated) parts.push('incalzit')
    if (court.lighting) parts.push('iluminat')
    if (!parts.length) return ''
    return ' - ' + parts.join(' - ')
  }, [court])

  async function onSubmit(e?: React.FormEvent, bypassDoubleBooking = false) {
    if (e) e.preventDefault()
    if (!courtId || !date || !startTime || !endTime) return
    validatePhone()
    if (phoneInputRef.current && !phoneInputRef.current.checkValidity()) {
      phoneInputRef.current.reportValidity()
      return
    }
    setSubmitting(true)
    let bookingResultStatus = 'CONFIRMED'
    try {
      const normalizedEnd = endTime === '24:00' ? '23:59' : endTime
      const result = await createBooking({
        courtId: Number(courtId),
        date,
        startTime,
        endTime: normalizedEnd,
        customerName: name,
        customerPhone: phone || (isAdminUser ? '0000000000' : ''),
        customerEmail: email || undefined,
        bypassDoubleBooking,
      })
      if (result && result.status) {
          bookingResultStatus = result.status
      }
      
      // Auto-sync profile if logged in to update phone numbers/localStorage
      const token = localStorage.getItem('playerToken')
      if (token) {
        try {
          const { fetchPlayerMe } = await import('../api')
          const updated = await fetchPlayerMe(token)
          localStorage.setItem('playerData', JSON.stringify(updated))
          window.dispatchEvent(new Event('auth-change'))
        } catch (syncErr) {
          console.error("Failed to sync profile after booking:", syncErr)
        }
      }
      
      if (bookingResultStatus === 'PENDING_APPROVAL') {
          setPendingVisible(true)
      } else {
          setSuccessVisible(true)
      }
    } catch (err: any) {
      if (err.message && err.message.includes('rezervare confirmată sau în așteptare')) {
        setRequireBypassApproval(true)
        showUnavailable(err.message)
      } else {
        showUnavailable(err.message || 'Se pare că a apărut o problemă de comunicare cu serverul.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 w-full font-sans flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-400 to-teal-400"></div>
        
        {/* Header Compact */}
        <div className="px-5 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
          <button 
            onClick={() => redirectToGrid()} 
            className="group bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded-2xl transition-all active:scale-90" 
            aria-label="Înapoi la calendar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div className="text-center">
            <h1 className="text-xl font-black text-slate-900 tracking-tighter leading-tight">Rezervare {court?.sportType === 'PADEL' ? 'Padel ' : ''}{court?.name || ''}</h1>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-0.5">{displayDate} • {startTime} - {endTime}</p>
          </div>
          <div className="w-9"></div>
        </div>

        <form onSubmit={onSubmit} className="p-5 flex flex-col gap-4">
          {/* Upsell Banner for Guests */}
          {!isLoggedUser && (
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl flex gap-3 items-start animate-in fade-in slide-in-from-top-2 duration-500 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div className="flex-1">
                <p className="text-[12px] font-semibold text-slate-700 leading-relaxed">
                  💡 <a href="/cont" className="text-emerald-600 font-black underline decoration-emerald-500/30 hover:decoration-emerald-500 transition-all">Creează-ți un cont</a> pentru a-ți salva datele automat la următoarele rezervări și pentru a avea control total asupra istoricului tău de meciuri.
                </p>
              </div>
            </div>
          )}

          {/* Summary Compact */}
          <div className="bg-slate-50 rounded-2xl p-3.5 flex justify-between items-center border border-slate-100">
            <div>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Total de plată</p>
              <p className="text-xl font-black text-slate-800">{totalPrice != null ? `${totalPrice.toFixed(2)} RON` : '...'}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Durată</p>
              <p className="text-sm font-bold text-slate-700">{minutesBetween(startTime, endTime)} min</p>
            </div>
          </div>

          {!meetsMinDuration && (
            <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-medium flex gap-2 items-start">
              <span className="shrink-0 leading-tight">⚠️</span>
              <span className="leading-tight">Selectează cel puțin 1 oră (două intervale de 30 min).</span>
            </div>
          )}

          {/* Inputs Compact */}
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Nume și Prenume *</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
                <input 
                  className="w-full h-11 border-2 border-slate-200 rounded-xl pl-9 pr-3 text-[15px] outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 transition-all font-semibold text-slate-800" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  placeholder="Ex. Popescu Ion"
                  required 
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Telefon {isAdminUser ? '(Opțional pt Admin)' : '*'}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </div>
                <input
                  ref={phoneInputRef}
                  type="tel"
                  className={`w-full h-11 border-2 border-slate-200 rounded-xl pl-9 pr-3 text-[15px] outline-none ${isLoggedUser && !isAdminUser ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10'} transition-all font-semibold text-slate-800`}
                  value={phone}
                  onChange={e => (!isLoggedUser || isAdminUser) && setPhone(e.target.value)}
                  onInput={(e) => (!isLoggedUser || isAdminUser) && validatePhone(e.currentTarget)}
                  placeholder={isAdminUser ? "Opțional" : "07XX XXX XXX"}
                  required={!isAdminUser}
                  readOnly={isLoggedUser && !isAdminUser}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Email <span className="font-medium text-slate-400">(Opțional)</span></label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </div>
                <input 
                  className="w-full h-11 border-2 border-slate-200 rounded-xl pl-9 pr-3 text-[15px] outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 transition-all font-semibold text-slate-800" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  type="email" 
                  placeholder="adresa@exemplu.ro"
                />
              </div>

              {/* Midnight/Night Warning */}
              {(startTime && endTime) && (endTime === '00:00' || (endTime !== '24:00' && endTime <= startTime)) && (
                <div className="mt-3 p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-xl text-[10px] font-black uppercase tracking-tight flex gap-2 items-center animate-pulse">
                  <span className="shrink-0 text-lg">🌙</span>
                  <span className="leading-tight text-left">Atenție: Rezervările nocturne (care depășesc miezul nopții) necesită aprobarea administratorului din motive logistice.</span>
                </div>
              )}

              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2 ml-1 italic">
                <span className="text-emerald-500">Informație:</span> Recomandăm completarea adresei de email pentru a primi confirmarea oficială a rezervării.
              </p>
            </div>
          </div>

          <div className="pt-2">
             <button 
               className="w-full h-[52px] rounded-xl font-bold tracking-wide text-[15px] bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-600 active:scale-95 transition-all flex justify-center items-center gap-2 disabled:bg-slate-300 disabled:shadow-none" 
               disabled={submitting || !meetsMinDuration} 
               type="submit"
             >
               {submitting ? 'SE PROCESEAZĂ...' : 'CONFIRMĂ REZERVAREA'}
             </button>
             <p className="text-[10px] text-slate-400 font-medium text-center mt-3 px-2 leading-relaxed">
               Apasând pe buton ești de acord cu prelucrarea datelor. Plata se face la locație.
             </p>
          </div>
        </form>
      </div>

      {unavailableVisible && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-md transition-all">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-rose-50 px-6 py-6 border-b border-rose-100 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center shadow-inner mb-2">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-rose-600" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              </div>
              <h3 className="text-xl font-bold text-rose-900 tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>Rezervare Nereușită</h3>
            </div>
            <div className="p-7">
              <p className="text-slate-600 font-medium leading-relaxed mb-8 text-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                {unavailableMessage}
              </p>
              {requireBypassApproval && (
                <button
                  onClick={() => {
                    setUnavailableVisible(false)
                    setRequireBypassApproval(false)
                    onSubmit(undefined, true)
                  }}
                  className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold text-lg hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 mb-3"
                >
                  Continuă (Necesită Aprobare)
                </button>
              )}
              <button
                onClick={() => {
                  setUnavailableVisible(false)
                  setRequireBypassApproval(false)
                  redirectToGrid()
                }}
                className="w-full py-4 bg-slate-800 text-white rounded-xl font-bold text-lg hover:bg-slate-900 active:scale-95 transition-all shadow-lg shadow-slate-900/20"
              >
                Înapoi la Calendar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Approval Modal */}
      {pendingVisible && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-md transition-all">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 relative">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400"></div>
            
            <div className="bg-amber-50/50 px-6 py-8 flex flex-col items-center gap-4 text-center relative">
              <div className="w-20 h-20 rounded-[2rem] bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20 mb-2 rotate-3 hover:rotate-0 transition-transform duration-500">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter" style={{ fontFamily: 'Outfit, sans-serif' }}>ÎN AȘTEPTARE</h3>
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mt-1">Aprobare Necesară</p>
              </div>
            </div>
            
            <div className="p-6">
              <div className="text-slate-600 text-sm font-medium leading-relaxed mb-6 text-center space-y-2">
                <p>Rezervarea ta a fost înregistrată, dar <strong>necesită aprobare manuală</strong> de către recepție deoarece ai depășit limita de anulări permise recent.</p>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-left mt-4">
                  <div className="flex justify-between items-center text-xs mb-1"><span className="text-slate-400">Teren</span><strong className="text-slate-700">{court?.sportType === 'PADEL' ? 'Padel ' : ''}{court?.name}</strong></div>
                  <div className="flex justify-between items-center text-xs mb-1"><span className="text-slate-400">Data</span><strong className="text-slate-700">{displayDate}</strong></div>
                  <div className="flex justify-between items-center text-xs"><span className="text-slate-400">Interval</span><strong className="text-slate-700">{startTime} - {endTime}</strong></div>
                </div>
              </div>
              
              <button
                onClick={() => {
                  setPendingVisible(false)
                  redirectToGrid()
                }}
                className="w-full py-3.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 active:scale-95 transition-all shadow-lg shadow-slate-900/20"
              >
                Înapoi la Calendar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal Polish */}
      {successVisible && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-md transition-all">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 relative">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400"></div>
            
            {/* Confetti-like decoration circles */}
            <div className="absolute top-10 left-10 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-20"></div>
            <div className="absolute top-20 right-10 w-3 h-3 rounded-full bg-sky-400 animate-pulse opacity-20"></div>
            <div className="absolute bottom-40 left-5 w-4 h-4 rounded-full bg-teal-400 animate-bounce opacity-10"></div>

            <div className="bg-emerald-50/50 px-6 py-8 flex flex-col items-center gap-4 text-center relative">
              <div className="w-20 h-20 rounded-[2rem] bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-2 rotate-3 hover:rotate-0 transition-transform duration-500">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tighter" style={{ fontFamily: 'Outfit, sans-serif' }}>REZERVARE REUȘITĂ</h3>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mt-1">Ești gata pentru meci!</p>
              </div>
            </div>
            <div className="p-6">
              <div className="text-slate-600 text-sm font-medium leading-relaxed mb-6 text-center space-y-2">
                <p>Mulțumim pentru rezervare! Datele tale au fost înregistrate cu succes.</p>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-left">
                  <div className="flex justify-between items-center text-xs mb-1"><span className="text-slate-400">Teren</span><strong className="text-slate-700">{court?.sportType === 'PADEL' ? 'Padel ' : ''}{court?.name}</strong></div>
                  <div className="flex justify-between items-center text-xs mb-1"><span className="text-slate-400">Data</span><strong className="text-slate-700">{displayDate}</strong></div>
                  <div className="flex justify-between items-center text-xs"><span className="text-slate-400">Interval</span><strong className="text-slate-700">{startTime} - {endTime}</strong></div>
                </div>
              </div>
              
              <div className="flex flex-col gap-3">
                <a
                  href={court?.notes === LOCATION_TAGS.STAR_ARENA || (court?.sportType === 'PADEL' && court?.indoor) ? "https://www.google.com/maps/search/?api=1&query=STAR+ARENA+PADEL" : "https://www.google.com/maps/search/?api=1&query=COSMIN+TOP+TENIS"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all flex justify-center items-center gap-2"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                  Navighează spre locație
                </a>
                
                <button
                  onClick={() => {
                    setSuccessVisible(false)
                    redirectToGrid()
                  }}
                  className="w-full py-3.5 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 active:scale-95 transition-all shadow-lg shadow-slate-900/20"
                >
                  Înapoi la Calendar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}




