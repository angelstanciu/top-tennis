import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CourtDto, SportType } from '../types'
import { fetchActiveCourts, adminBlockSlot } from '../api'
import AdminHeader from '../components/AdminHeader'
import CalendarDemo from '../components/ui/calendar-1'

function generateTimeOptions(isEnd = false) {
  const opts = []
  for (let h = 0; h < 24; h++) {
    const hh = String(h).padStart(2, '0')
    opts.push(`${hh}:00`, `${hh}:30`)
  }
  if (isEnd) opts.push("23:59")
  return opts
}

export default function AdminBlockDayPage() {
  const navigate = useNavigate()
  const [auth, setAuth] = useState<string | null>(null)
  
  const [courts, setCourts] = useState<CourtDto[]>([])
  const [sport, setSport] = useState<SportType | ''>('')
  const [courtId, setCourtId] = useState<number | ''>('')
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const dateInputRef = React.useRef<HTMLInputElement | null>(null)

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
    const months = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie']
    const monthIdx = Math.max(0, Math.min(11, Number(m) - 1))
    const dd = String(Number(d))
    return `${dd} ${months[monthIdx]} ${y}`
  }
  const [startTime, setStartTime] = useState<string>('00:00')
  const [endTime, setEndTime] = useState<string>('23:59')
  const [note, setNote] = useState<string>('Blocat de Administrator')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    try {
      const token = localStorage.getItem('adminAuth')
      const ts = Number(localStorage.getItem('adminAuthTS') || 0)
      if (token && ts && (Date.now() - ts) <= 3600000) {
        setAuth(token)
      } else {
        navigate('/login', { replace: true })
      }
    } catch {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    fetchActiveCourts().then(setCourts).catch(console.error)
  }, [])

  const filteredCourts = courts.filter(c => sport === '' || c.sportType === sport)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth || courtId === '') return
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      await adminBlockSlot({
        courtId: Number(courtId),
        date,
        startTime,
        endTime,
        note
      }, auth)
      setSuccess('Terenul a fost blocat cu succes pentru intervalul selectat!')
      // Reset after 3s
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      let errorMsg = 'A apărut o eroare la blocarea terenului.'
      
      try {
        // Try to parse if it's a JSON string from the server
        const parsed = JSON.parse(err.message)
        errorMsg = parsed.message || errorMsg
      } catch {
        errorMsg = err.message || errorMsg
      }

      if (errorMsg.includes('multiplu de 30')) {
        errorMsg = 'Eroare: Orele trebuie să fie din 30 în 30 de minute (ex: 12:00, 12:30).'
      } else if (errorMsg.toLowerCase().includes('overlap') || errorMsg.toLowerCase().includes('conflict') || errorMsg.toLowerCase().includes('suprapune')) {
        errorMsg = 'Conflict: Acest interval se suprapune cu o rezervare existentă. Verificați calendarul și eliberați intervalul dorit înainte de a-l bloca.'
      }
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {auth && (
        <>
          <AdminHeader active="landing" />
          
          <div className="max-w-2xl mx-auto px-4 mt-8">
            <button onClick={() => navigate('/admin')} className="text-sm font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-2 mb-6">
              <span>&larr;</span> Înapoi la Panou
            </button>
            
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
              <h2 className="text-2xl font-black text-rose-600 mb-2">Blocare Terenuri</h2>
              <p className="text-slate-500 mb-8 text-sm">Folosiți acest formular în situații excepționale pentru a marca un teren ca Indisponibil/Ocupat (Zile libere naționale, turnee externe, lucrări de mentenanță).</p>

              {success && <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium">{success}</div>}
              {error && <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Alege Sportul</label>
                    <select className="w-full rounded-xl border-slate-200 bg-slate-50 p-3 text-slate-800 font-semibold focus:ring-rose-500 focus:border-rose-500" value={sport} onChange={e => {setSport(e.target.value as SportType | ''); setCourtId('')}}>
                      <option value="">Toate Sporturile</option>
                      <option value="TENNIS">Tenis</option>
                      <option value="PADEL">Padel</option>
                      <option value="BASKETBALL">Baschet</option>
                      <option value="FOOTVOLLEY">Tenis de picior</option>
                      <option value="BEACH_VOLLEY">Volei pe Plajă</option>
                      <option value="TABLE_TENNIS">Tenis de Masă</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Alege Terenul *</label>
                    <select required className="w-full rounded-xl border-slate-200 bg-slate-50 p-3 text-slate-800 font-semibold focus:ring-rose-500 focus:border-rose-500" value={courtId} onChange={e => setCourtId(e.target.value ? Number(e.target.value) : '')}>
                      <option value="">-- Selectează un teren --</option>
                      {filteredCourts.map(c => (
                        <option key={c.id} value={c.id}>{c.sportType} {c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Data *</label>
                  <div className="relative flex items-stretch border-slate-200 bg-slate-50 rounded-xl overflow-hidden shadow-sm h-12">
                    <button
                      type="button"
                      className="px-4 text-2xl text-slate-600 hover:bg-slate-200 hover:text-slate-800 border-r border-slate-200 focus:outline-none transition-colors"
                      onClick={() => shiftDate(-1)}
                    >
                      {'\u2039'}
                    </button>
                    <CalendarDemo value={date} onChange={newDate => setDate(newDate)}>
                      <div className="relative flex-1 min-w-0 flex items-center justify-center cursor-pointer group px-4">
                        <div className="font-semibold text-slate-800 text-center select-none truncate group-hover:text-emerald-700 transition-colors">
                          {formatDateDisplay(date)}
                        </div>
                        <button
                          type="button"
                          className="absolute right-3 p-1 text-slate-400 pointer-events-none z-10 group-hover:text-emerald-500 transition-colors"
                          aria-label="Deschide calendarul"
                          title="Deschide calendarul"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                          </svg>
                        </button>
                      </div>
                    </CalendarDemo>
                    <button
                      type="button"
                      className="px-4 text-2xl text-slate-600 hover:bg-slate-200 hover:text-slate-800 border-l border-slate-200 focus:outline-none transition-colors"
                      onClick={() => shiftDate(1)}
                    >
                      {'\u203A'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Ora Start *</label>
                    <div className="relative w-full">
                      <select required className="w-full appearance-none rounded-xl border-slate-200 bg-slate-50 p-3 pr-10 text-slate-800 font-semibold focus:ring-rose-500 focus:border-rose-500" value={startTime} onChange={e => setStartTime(e.target.value)}>
                        {generateTimeOptions(false).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Ora Sfârșit *</label>
                    <div className="relative w-full">
                      <select required className="w-full appearance-none rounded-xl border-slate-200 bg-slate-50 p-3 pr-10 text-slate-800 font-semibold focus:ring-rose-500 focus:border-rose-500" value={endTime} onChange={e => setEndTime(e.target.value)}>
                        {generateTimeOptions(true).map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 pl-1 mt-1">Lăsați 00:00 - 23:59 ptr întreaga zi</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Notiță Internă (Apare ca nume pe grid)</label>
                  <input type="text" className="w-full rounded-xl border-slate-200 bg-slate-50 p-3 text-slate-800 font-semibold focus:ring-rose-500 focus:border-rose-500" placeholder="ex: Ocupat de Admin, Turneu, Reabilitare..." value={note} onChange={e => setNote(e.target.value)} />
                </div>

                <button
                  type="submit"
                  disabled={loading || courtId === ''}
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50 mt-6 disabled:cursor-not-allowed"
                >
                  {loading ? 'Se procesează...' : 'Blochează Terenul'}
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
