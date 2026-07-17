import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CourtDto, SportType } from '../types'
import { fetchActiveCourts, adminCreateWeeklyBooking } from '../api'
import AdminHeader from '../components/AdminHeader'
import CalendarDemo from '../components/ui/calendar-1'
import { SportChips, SelectField, DateStepperField, TextField, FieldLabel } from '../components/admin/FilterBar'
import SegmentedControl from '../components/admin/SegmentedControl'

function generateTimeOptions(isEnd = false) {
  const opts = []
  for (let h = 0; h < 24; h++) {
    const hh = String(h).padStart(2, '0')
    opts.push(`${hh}:00`, `${hh}:30`)
  }
  if (isEnd) opts.push("23:59")
  return opts
}

export default function AdminWeeklyBookingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [auth, setAuth] = useState<string | null>(null)
  
  const [courts, setCourts] = useState<CourtDto[]>([])
  const [sport, setSport] = useState<SportType | ''>((searchParams.get('sport') as SportType) || '')
  
  // payload
  const initialCourtId = searchParams.get('courtId')
  const [courtId, setCourtId] = useState<number | ''>(initialCourtId ? Number(initialCourtId) : '')
  const [startDate, setStartDate] = useState<string>(searchParams.get('date') || new Date().toISOString().slice(0, 10))
  const [startTime, setStartTime] = useState<string>(searchParams.get('start') || '18:00')
  const [endTime, setEndTime] = useState<string>(searchParams.get('end') || '20:00')
  const [customerName, setCustomerName] = useState<string>('')
  const [customerPhone, setCustomerPhone] = useState<string>('')
  // recurrence: 1=Once, 2=Every 2 days, 3=Every 3 days, 7=Weekly
  const initialFrequency = searchParams.get('once') === 'true' ? 0 : 7
  const [frequency, setFrequency] = useState<number>(initialFrequency)
  const [count, setCount] = useState<number>(initialFrequency === 0 ? 1 : 4)
  
  const dateInputRef = React.useRef<HTMLInputElement | null>(null)
  const maxAdminDate = React.useMemo(() => {
    const d = new Date()
    d.setMonth(d.getMonth() + 13)
    return d
  }, [])

  function shiftDate(delta: number) {
    try {
      const d = new Date(startDate)
      d.setDate(d.getDate() + delta)
      setStartDate(d.toISOString().slice(0, 10))
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
      const parts = startDate.split('-')
      const baseDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
      const promises = []

      for (let i = 0; i < count; i++) {
        const d = new Date(baseDate)
        if (frequency > 0) {
          d.setDate(d.getDate() + i * frequency)
        } else if (i > 0) {
          break // 'once' means only 1
        }
        
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, "0")
        const dd = String(d.getDate()).padStart(2, "0")
        const iterDateStr = `${y}-${m}-${dd}`

        // Call base createBooking directly since we have the loop logic here now
        // This is more flexible than the old adminCreateWeeklyBooking
        const base = import.meta.env.VITE_API_BASE_URL || '/api'
        const payload = {
          courtId: Number(courtId),
          date: iterDateStr,
          startTime,
          endTime,
          customerName: frequency === 0 ? customerName : `${customerName} (Abonament)`,
          customerPhone: customerPhone || '0000000000'
        }

        promises.push(fetch(`${base}/admin/bookings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${auth}` },
          body: JSON.stringify(payload),
        }).then(async r => {
          if (!r.ok) {
            const txt = await r.text()
            let msg = txt
            try {
               const j = JSON.parse(txt)
               if (j.message) msg = j.message
            } catch (ignore) {}
            throw new Error(`Data ${formatDateDisplay(iterDateStr)}: ${msg}`)
          }
          return r.json()
        }))
        
        if (frequency === 0) break // Exit loop after 1 if 'once'
      }

      const results = await Promise.allSettled(promises)
      const failed = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[]
      const succeeded = results.filter(r => r.status === 'fulfilled').length

      if (succeeded === 0) {
        const firstError = failed[0]?.reason?.message || 'Eroare la crearea rezervărilor.'
        setError(firstError.includes('multiplu de 30')
          ? 'Eroare: Orele trebuie să fie din 30 în 30 de minute (ex: 12:00, 12:30).'
          : firstError)
      } else {
        const msg = frequency === 0
          ? 'Rezervarea a fost creată cu succes!'
          : `Abonamentul a fost generat: ${succeeded}/${count} apariții create cu succes!`
        setSuccess(msg)
        setTimeout(() => setSuccess(null), 8000)
        if (failed.length > 0) {
          setError(`${failed.length} date nu au putut fi rezervate (conflicte): ${failed.map(f => f.reason?.message).join('; ')}`)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Eroare la crearea rezervărilor.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen font-sans pb-20" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {auth && (
        <>
          <AdminHeader active="weekly" />
          <div className="max-w-2xl mx-auto px-4 pt-6">
            <div className="rounded-[24px] p-6 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}>
              <span className="block text-[11px] font-black uppercase tracking-[0.12em] mb-1.5" style={{ color: '#fbbf24', fontFamily: "'Outfit', sans-serif" }}>Clienți de casă</span>
              <h2 className="text-2xl font-black tracking-tight mb-2" style={{ color: 'var(--text)', fontFamily: "'Outfit', sans-serif" }}>Rezervare / abonament</h2>
              <p className="mb-6 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>Creați o rezervare rapidă sau un slot fix recurent (abonament). Sistemul va replica rezervarea conform frecvenței alese.</p>

              {success && <div className="mb-6 p-4 rounded-xl text-sm font-medium" style={{ background: 'rgba(16,185,129,0.14)', color: '#34d399' }}>{success}</div>}
              {error && <div className="mb-6 p-4 rounded-xl text-sm font-medium" style={{ background: 'rgba(244,63,94,0.14)', color: '#fb7185' }}>{error}</div>}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <SportChips
                  value={sport}
                  onChange={v => { setSport(v); setCourtId('') }}
                  includeAll
                />

                <div className="flex gap-2.5">
                  <SelectField label="Teren" required value={courtId as any} onChange={e => setCourtId(e.target.value ? Number(e.target.value) : '')} className="flex-[1.4]">
                    <option value="">Selectează un teren</option>
                    {filteredCourts.map(c => (
                      <option key={c.id} value={c.id}>{c.sportType === 'TENNIS' ? 'Teren' : c.sportType === 'BEACH_VOLLEY' ? 'Volei Plajă' : c.sportType === 'TABLE_TENNIS' ? 'Tenis Masă' : c.sportType === 'FOOTVOLLEY' ? 'Fotbal Tenis' : c.sportType === 'BASKETBALL' ? 'Baschet' : c.sportType === 'PADEL' ? 'Padel' : c.sportType} {c.name}</option>
                    ))}
                  </SelectField>
                  <DateStepperField
                    label="Prima dată"
                    display={formatDateDisplay(startDate)}
                    onPrev={() => shiftDate(-1)}
                    onNext={() => shiftDate(1)}
                    className="flex-1"
                  >
                    <CalendarDemo value={startDate} onChange={newDate => setStartDate(newDate)} maxDate={maxAdminDate}>
                      <div className="relative flex-1 min-w-0 flex items-center justify-center cursor-pointer group w-full">
                        <div className="text-[13px] font-extrabold text-center select-none truncate" style={{ color: 'var(--text)', fontFamily: "'Outfit', sans-serif" }}>
                          {formatDateDisplay(startDate)}
                        </div>
                      </div>
                    </CalendarDemo>
                  </DateStepperField>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <SelectField label="Start" required value={startTime} onChange={e => setStartTime(e.target.value)}>
                    {generateTimeOptions(false).map(t => <option key={t} value={t}>{t}</option>)}
                  </SelectField>
                  <SelectField label="Stop" required value={endTime} onChange={e => setEndTime(e.target.value)}>
                    {generateTimeOptions(true).map(t => <option key={t} value={t}>{t}</option>)}
                  </SelectField>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    label="Nume jucător"
                    required
                    type="text"
                    placeholder="Marian Padel"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                  />
                  <TextField
                    label="Telefon"
                    type="tel"
                    placeholder="07XX XXX XXX"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                  />
                </div>

                <div>
                  <FieldLabel>Frecvență</FieldLabel>
                  <SegmentedControl
                    options={[
                      { value: 0, label: 'O dată' },
                      { value: 7, label: 'Săptămânal' },
                      { value: 2, label: 'La 2 zile' },
                      { value: 3, label: 'La 3 zile' },
                    ]}
                    value={frequency}
                    onChange={val => {
                      setFrequency(val)
                      if (val === 0) setCount(1)
                    }}
                  />
                </div>

                {frequency !== 0 && (
                  <SelectField label="Număr apariții" required value={count} onChange={e => setCount(Number(e.target.value))}>
                    <option value={4}>4 apariții</option>
                    <option value={8}>8 apariții</option>
                    <option value={12}>12 apariții</option>
                    <option value={24}>24 apariții</option>
                    <option value={52}>52 apariții (1 an)</option>
                  </SelectField>
                )}

                <button
                  type="submit"
                  disabled={loading || courtId === ''}
                  className="w-full font-black uppercase tracking-widest text-[11px] py-4 rounded-2xl shadow-xl transition-all disabled:opacity-50 mt-2 disabled:cursor-not-allowed active:scale-95"
                  style={{ background: '#f59e0b', color: '#020617', boxShadow: '0 8px 20px rgba(245,158,11,0.25)' }}
                >
                  {loading ? 'Se procesează...' : frequency === 0 ? 'Creează rezervarea' : 'Generează abonamentul'}
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
