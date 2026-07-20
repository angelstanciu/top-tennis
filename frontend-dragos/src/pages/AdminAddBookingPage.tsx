import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CourtDto, SportType, sortCourtsByName, courtLocationBadge, courtLabel } from '../types'
import { fetchActiveCourts } from '../api'
import AdminHeader from '../components/AdminHeader'
import { TextField, FieldLabel, DateStepperField, SPORT_OPTIONS } from '../components/admin/FilterBar'
import { WheelPicker } from '../components/ui/wheel-picker'
import { TimeWheelPicker } from '../components/ui/time-wheel-picker'
import CalendarDemo from '../components/ui/calendar-1'

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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

export default function AdminAddBookingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [auth, setAuth] = useState<string | null>(null)

  const [courts, setCourts] = useState<CourtDto[]>([])
  const [sport, setSport] = useState<SportType>((searchParams.get('sport') as SportType) || 'TENNIS')

  const initialCourtId = searchParams.get('courtId')
  const [courtId, setCourtId] = useState<number | ''>(initialCourtId ? Number(initialCourtId) : '')

  const [date, setDate] = useState<string>(searchParams.get('date') || toDateStr(new Date()))
  const [startTime, setStartTime] = useState<string>(searchParams.get('start') || '18:00')
  const [endTime, setEndTime] = useState<string>(searchParams.get('end') || '19:00')

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')

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

  const filteredCourts = useMemo(() => sortCourtsByName(courts.filter(c => c.sportType === sport)), [courts, sport])

  // Keep exactly one court selected — auto-pick "1" (or the first available) whenever
  // the sport changes or the current selection falls outside the filtered list.
  useEffect(() => {
    if (filteredCourts.length === 0) { setCourtId(''); return }
    setCourtId(prev => {
      if (filteredCourts.some(c => c.id === prev)) return prev
      return (filteredCourts.find(c => c.name === '1') || filteredCourts[0]).id
    })
  }, [filteredCourts])

  function shiftDate(delta: number) {
    try {
      const d = new Date(date)
      d.setDate(d.getDate() + delta)
      setDate(toDateStr(d))
    } catch { }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth || courtId === '') return
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const base = import.meta.env.VITE_API_BASE_URL || '/api'
      const payload = {
        courtId: Number(courtId),
        date,
        startTime,
        endTime,
        customerName,
        customerPhone: customerPhone || '0000000000',
      }
      const res = await fetch(`${base}/admin/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${auth}` },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const txt = await res.text()
        let msg = txt
        try {
          const j = JSON.parse(txt)
          if (j.message) msg = j.message
        } catch { }
        throw new Error(msg)
      }
      setSuccess('Rezervarea a fost creată cu succes!')
      setTimeout(() => setSuccess(null), 6000)
      setCustomerName('')
      setCustomerPhone('')
    } catch (err: any) {
      const msg = err.message || 'Eroare la crearea rezervării.'
      setError(msg.includes('multiplu de 30')
        ? 'Eroare: Orele trebuie să fie din 30 în 30 de minute (ex: 12:00, 12:30).'
        : msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen font-sans pb-20" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {auth && (
        <>
          <AdminHeader active="bookings-add" backTo="/admin/administrare-rezervari" />
          <div className="max-w-2xl mx-auto px-4 pt-6">
            <div className="rounded-[24px] p-6 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}>
              <span className="block text-[11px] font-black uppercase tracking-[0.12em] mb-1.5" style={{ color: '#38bdf8', fontFamily: "'Outfit', sans-serif" }}>Clienți de casă</span>
              <h2 className="text-2xl font-black tracking-tight mb-2" style={{ color: 'var(--text)', fontFamily: "'Outfit', sans-serif" }}>Adăugare Rezervare</h2>
              <p className="mb-6 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>Adaugă manual o rezervare pentru un client care a sunat.</p>

              {success && <div className="mb-6 p-4 rounded-xl text-sm font-medium" style={{ background: 'rgba(16,185,129,0.14)', color: '#34d399' }}>{success}</div>}
              {error && <div className="mb-6 p-4 rounded-xl text-sm font-medium" style={{ background: 'rgba(244,63,94,0.14)', color: '#fb7185' }}>{error}</div>}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex gap-2.5">
                  <div className="flex-1">
                    <FieldLabel>Sport</FieldLabel>
                    <WheelPicker title="Selectează sportul" value={sport} options={SPORT_OPTIONS} onChange={setSport} />
                  </div>
                  <div className="flex-1">
                    <FieldLabel>Teren</FieldLabel>
                    {filteredCourts.length > 0 ? (
                      <WheelPicker
                        title="Selectează terenul"
                        value={String(courtId)}
                        options={filteredCourts.map(c => ({ value: String(c.id), label: courtLabel(c), badge: courtLocationBadge(c) }))}
                        onChange={v => setCourtId(Number(v))}
                      />
                    ) : (
                      <div className="h-11 rounded-[14px] border flex items-center px-3.5 text-[13px] font-bold" style={{ borderColor: 'var(--border)', background: 'var(--surface2)', color: 'var(--faint)' }}>Se încarcă...</div>
                    )}
                  </div>
                </div>

                <DateStepperField label="Dată" display={formatDateDisplay(date)} onPrev={() => shiftDate(-1)} onNext={() => shiftDate(1)}>
                  <CalendarDemo value={date} onChange={setDate}>
                    <div className="relative flex-1 min-w-0 flex items-center justify-center cursor-pointer group w-full">
                      <div className="text-[13px] font-extrabold text-center select-none truncate" style={{ color: 'var(--text)', fontFamily: "'Outfit', sans-serif" }}>
                        {formatDateDisplay(date)}
                      </div>
                    </div>
                  </CalendarDemo>
                </DateStepperField>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>De la ora</FieldLabel>
                    <TimeWheelPicker value={startTime} onChange={setStartTime} />
                  </div>
                  <div>
                    <FieldLabel>Până la ora</FieldLabel>
                    <TimeWheelPicker value={endTime} onChange={setEndTime} />
                  </div>
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

                <button
                  type="submit"
                  disabled={loading || courtId === ''}
                  className="w-full font-black uppercase tracking-widest text-[11px] py-4 rounded-2xl shadow-xl transition-all disabled:opacity-50 mt-2 disabled:cursor-not-allowed active:scale-95"
                  style={{ background: '#38bdf8', color: '#020617', boxShadow: '0 8px 20px rgba(56,189,248,0.25)' }}
                >
                  {loading ? 'Se procesează...' : 'Creează rezervarea'}
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
