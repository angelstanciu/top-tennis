import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CourtDto, SportType } from '../types'
import { fetchActiveCourts, adminBlockSlot } from '../api'
import AdminHeader from '../components/AdminHeader'
import CalendarDemo from '../components/ui/calendar-1'
import { SportChips, SelectField, DateStepperField, TextField } from '../components/admin/FilterBar'

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
      const token = sessionStorage.getItem('adminAuth')
      const ts = Number(sessionStorage.getItem('adminAuthTS') || 0)
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
      const result = await adminBlockSlot({
        courtId: Number(courtId),
        date,
        startTime,
        endTime,
        note
      }, auth)
      const cancelMsg = result.cancelledCount > 0
        ? ` ${result.cancelledCount} rezervare(i) anulate automat${result.notifiedCount > 0 ? `, ${result.notifiedCount} client(i) notificat(i) prin SMS` : ''}.`
        : ''
      setSuccess(`Terenul a fost blocat cu succes!${cancelMsg}`)
      setSport('')
      setCourtId('')
      setNote('Blocat de Administrator')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      // Reset after 3s
      setTimeout(() => setSuccess(null), 3500)
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
    <div className="min-h-screen font-sans pb-20" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {auth && (
        <>
          <AdminHeader active="block-day" />
          <div className="max-w-2xl mx-auto px-4 pt-6">
            <div className="rounded-[24px] p-6 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}>
              <span className="block text-[11px] font-black uppercase tracking-[0.12em] mb-1.5" style={{ color: '#fb7185', fontFamily: "'Outfit', sans-serif" }}>Situații excepționale</span>
              <h2 className="text-2xl font-black tracking-tight mb-2" style={{ color: 'var(--text)', fontFamily: "'Outfit', sans-serif" }}>Blocare terenuri</h2>
              <p className="mb-6 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>Marchează un teren indisponibil (sărbători, turnee, mentenanță).</p>

              {success && <div className="mb-6 p-4 rounded-xl text-sm font-medium" style={{ background: 'rgba(16,185,129,0.14)', color: '#34d399' }}>{success}</div>}
              {error && <div className="mb-6 p-4 rounded-xl text-sm font-medium" style={{ background: 'rgba(244,63,94,0.14)', color: '#fb7185' }}>{error}</div>}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <SportChips
                  value={sport}
                  onChange={v => { setSport(v); setCourtId('') }}
                  includeAll
                />

                <SelectField label="Teren" required value={courtId as any} onChange={e => setCourtId(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">Selectează un teren</option>
                  {filteredCourts.map(c => (
                    <option key={c.id} value={c.id}>{c.sportType === 'TENNIS' ? 'Teren' : c.sportType === 'BEACH_VOLLEY' ? 'Volei Plajă' : c.sportType === 'TABLE_TENNIS' ? 'Tenis Masă' : c.sportType === 'FOOTVOLLEY' ? 'Fotbal Tenis' : c.sportType === 'BASKETBALL' ? 'Baschet' : c.sportType === 'PADEL' ? 'Padel' : c.sportType} {c.name}</option>
                  ))}
                </SelectField>

                <DateStepperField
                  label="Dată"
                  display={formatDateDisplay(date)}
                  onPrev={() => shiftDate(-1)}
                  onNext={() => shiftDate(1)}
                  arrowWidth={44}
                >
                  <CalendarDemo value={date} onChange={newDate => setDate(newDate)}>
                    <div className="relative flex-1 min-w-0 flex items-center justify-center cursor-pointer group w-full">
                      <div className="text-[13px] font-extrabold text-center select-none truncate" style={{ color: 'var(--text)', fontFamily: "'Outfit', sans-serif" }}>
                        {formatDateDisplay(date)}
                      </div>
                    </div>
                  </CalendarDemo>
                </DateStepperField>

                <div className="grid grid-cols-2 gap-3">
                  <SelectField label="Ora start" required value={startTime} onChange={e => setStartTime(e.target.value)}>
                    {generateTimeOptions(false).map(t => <option key={t} value={t}>{t}</option>)}
                  </SelectField>
                  <SelectField label="Ora sfârșit" required value={endTime} onChange={e => setEndTime(e.target.value)}>
                    {generateTimeOptions(true).map(t => <option key={t} value={t}>{t}</option>)}
                  </SelectField>
                </div>
                <p className="text-[10px] -mt-2" style={{ color: 'var(--faint)' }}>Lăsați 00:00 - 23:59 ptr întreaga zi</p>

                <TextField
                  label="Motiv (vizibil clienților)"
                  type="text"
                  placeholder="ex: Ocupat de Admin, Turneu, Reabilitare..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />

                <button
                  type="submit"
                  disabled={loading || courtId === ''}
                  className="w-full font-black uppercase tracking-widest text-[11px] py-4 rounded-2xl shadow-xl transition-all disabled:opacity-50 mt-2 disabled:cursor-not-allowed active:scale-95"
                  style={{ background: '#f43f5e', color: '#fff', boxShadow: '0 8px 20px rgba(244,63,94,0.25)' }}
                >
                  {loading ? 'Se procesează...' : 'Blochează terenul'}
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
