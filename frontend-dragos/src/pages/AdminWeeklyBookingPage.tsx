import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CourtDto, SportType, sortCourtsByName, courtLocationBadge, courtLabel } from '../types'
import { fetchActiveCourts } from '../api'
import AdminHeader from '../components/AdminHeader'
import { TextField, FieldLabel, DateStepperField, SPORT_OPTIONS } from '../components/admin/FilterBar'
import { WheelPicker } from '../components/ui/wheel-picker'
import { TimeWheelPicker } from '../components/ui/time-wheel-picker'
import CalendarDemo from '../components/ui/calendar-1'

const WEEKDAYS = [
  { iso: 1, short: 'Lu', label: 'Luni' },
  { iso: 2, short: 'Ma', label: 'Marți' },
  { iso: 3, short: 'Mi', label: 'Miercuri' },
  { iso: 4, short: 'Jo', label: 'Joi' },
  { iso: 5, short: 'Vi', label: 'Vineri' },
  { iso: 6, short: 'Sa', label: 'Sâmbătă' },
  { iso: 7, short: 'Du', label: 'Duminică' },
]

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const n = i + 1
  return { value: String(n), label: n === 1 ? '1 lună' : `${n} luni` }
})

function isoWeekday(date: Date): number {
  const day = date.getDay() // 0=Sun..6=Sat
  return day === 0 ? 7 : day
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Nearest upcoming occurrence of the given ISO weekday, today included.
function nextOccurrence(isoWd: number): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let delta = isoWd - isoWeekday(today)
  if (delta < 0) delta += 7
  const d = new Date(today)
  d.setDate(d.getDate() + delta)
  return toDateStr(d)
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

type DaySchedule = {
  weekday: number // 1=Luni..7=Duminică
  startTime: string
  endTime: string
  firstDate: string
}

export default function AdminWeeklyBookingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [auth, setAuth] = useState<string | null>(null)

  const [courts, setCourts] = useState<CourtDto[]>([])
  const [sport, setSport] = useState<SportType>((searchParams.get('sport') as SportType) || 'TENNIS')

  const initialCourtId = searchParams.get('courtId')
  const [courtId, setCourtId] = useState<number | ''>(initialCourtId ? Number(initialCourtId) : '')

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [daySchedules, setDaySchedules] = useState<DaySchedule[]>([])
  const [months, setMonths] = useState('3')

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

  function toggleDay(weekday: number) {
    setDaySchedules(prev => {
      if (prev.some(d => d.weekday === weekday)) return prev.filter(d => d.weekday !== weekday)
      const next = [...prev, { weekday, startTime: '18:00', endTime: '19:00', firstDate: nextOccurrence(weekday) }]
      return next.sort((a, b) => a.weekday - b.weekday)
    })
  }

  function updateDay(weekday: number, patch: Partial<DaySchedule>) {
    setDaySchedules(prev => prev.map(d => d.weekday === weekday ? { ...d, ...patch } : d))
  }

  // Steps by a full week so the picked date keeps landing on the same weekday.
  function shiftFirstDate(weekday: number, deltaDays: number) {
    setDaySchedules(prev => prev.map(d => {
      if (d.weekday !== weekday) return d
      const dt = new Date(d.firstDate)
      dt.setDate(dt.getDate() + deltaDays)
      return { ...d, firstDate: toDateStr(dt) }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!auth || courtId === '' || daySchedules.length === 0) return
    setLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const base = import.meta.env.VITE_API_BASE_URL || '/api'
      const monthsNum = Number(months)
      const promises: Promise<any>[] = []
      let totalCount = 0

      for (const day of daySchedules) {
        const subscriptionKey = crypto.randomUUID()
        const cursor = new Date(day.firstDate)
        const end = new Date(day.firstDate)
        end.setMonth(end.getMonth() + monthsNum)

        while (cursor <= end) {
          totalCount++
          const dateStr = toDateStr(cursor)
          const payload = {
            courtId: Number(courtId),
            date: dateStr,
            startTime: day.startTime,
            endTime: day.endTime,
            customerName: `${customerName} (Abonament)`,
            customerPhone: customerPhone || '0000000000',
            subscriptionKey,
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
              } catch { }
              throw new Error(`${dateStr}: ${msg}`)
            }
            return r.json()
          }))

          cursor.setDate(cursor.getDate() + 7)
        }
      }

      const results = await Promise.allSettled(promises)
      const failed = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[]
      const succeeded = results.filter(r => r.status === 'fulfilled').length

      if (succeeded === 0) {
        const firstError = failed[0]?.reason?.message || 'Eroare la crearea abonamentului.'
        setError(firstError.includes('multiplu de 30')
          ? 'Eroare: Orele trebuie să fie din 30 în 30 de minute (ex: 12:00, 12:30).'
          : firstError)
      } else {
        setSuccess(`Abonamentul a fost generat: ${succeeded}/${totalCount} ședințe create cu succes!`)
        setTimeout(() => setSuccess(null), 8000)
        if (failed.length > 0) {
          setError(`${failed.length} date nu au putut fi rezervate (conflicte): ${failed.map(f => f.reason?.message).join('; ')}`)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Eroare la crearea abonamentului.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen font-sans pb-20" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {auth && (
        <>
          <AdminHeader active="subscriptions-add" backTo="/admin/subscriptions" />
          <div className="max-w-2xl mx-auto px-4 pt-6">
            <div className="rounded-[24px] p-6 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}>
              <span className="block text-[11px] font-black uppercase tracking-[0.12em] mb-1.5" style={{ color: '#fbbf24', fontFamily: "'Outfit', sans-serif" }}>Clienți de casă</span>
              <h2 className="text-2xl font-black tracking-tight mb-2" style={{ color: 'var(--text)', fontFamily: "'Outfit', sans-serif" }}>Adăugare Abonament</h2>
              <p className="mb-6 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>Alege zilele fixe și orele la care vine clientul. Prima ședință se calculează automat pentru fiecare zi, dar poate fi mutată manual.</p>

              {success && <div className="mb-6 p-4 rounded-xl text-sm font-medium" style={{ background: 'rgba(16,185,129,0.14)', color: '#34d399' }}>{success}</div>}
              {error && <div className="mb-6 p-4 rounded-xl text-sm font-medium" style={{ background: 'rgba(244,63,94,0.14)', color: '#fb7185' }}>{error}</div>}

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex gap-2.5">
                  <div className="flex-1">
                    <FieldLabel>Sport</FieldLabel>
                    <WheelPicker
                      title="Selectează sportul"
                      value={sport}
                      options={SPORT_OPTIONS}
                      onChange={setSport}
                    />
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
                  <FieldLabel>Zile</FieldLabel>
                  <div className="flex gap-1.5">
                    {WEEKDAYS.map(w => {
                      const active = daySchedules.some(d => d.weekday === w.iso)
                      return (
                        <button
                          key={w.iso}
                          type="button"
                          onClick={() => toggleDay(w.iso)}
                          className="flex-1 text-center rounded-xl text-[13px] font-black tracking-wide transition-colors py-2.5"
                          style={{
                            fontFamily: "'Outfit', sans-serif",
                            background: active ? 'var(--lime)' : 'var(--surface2)',
                            color: active ? 'var(--lime-on)' : 'var(--muted)',
                            border: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
                          }}
                        >
                          {w.short}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {daySchedules.map(day => (
                  <div key={day.weekday} className="rounded-2xl border p-3.5 flex flex-col gap-3" style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
                    <div className="font-extrabold text-sm" style={{ color: 'var(--text)' }}>{WEEKDAYS.find(w => w.iso === day.weekday)?.label}</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <FieldLabel>Start</FieldLabel>
                        <TimeWheelPicker value={day.startTime} onChange={t => updateDay(day.weekday, { startTime: t })} />
                      </div>
                      <div>
                        <FieldLabel>Stop</FieldLabel>
                        <TimeWheelPicker value={day.endTime} onChange={t => updateDay(day.weekday, { endTime: t })} />
                      </div>
                    </div>
                    <DateStepperField
                      label="Primă ședință"
                      display={formatDateDisplay(day.firstDate)}
                      onPrev={() => shiftFirstDate(day.weekday, -7)}
                      onNext={() => shiftFirstDate(day.weekday, 7)}
                    >
                      <CalendarDemo value={day.firstDate} onChange={d => updateDay(day.weekday, { firstDate: d })}>
                        <div className="relative flex-1 min-w-0 flex items-center justify-center cursor-pointer group w-full">
                          <div className="text-[13px] font-extrabold text-center select-none truncate" style={{ color: 'var(--text)', fontFamily: "'Outfit', sans-serif" }}>
                            {formatDateDisplay(day.firstDate)}
                          </div>
                        </div>
                      </CalendarDemo>
                    </DateStepperField>
                  </div>
                ))}

                <div>
                  <FieldLabel>Durată abonament</FieldLabel>
                  <WheelPicker
                    title="Durată abonament"
                    value={months}
                    options={MONTH_OPTIONS}
                    onChange={setMonths}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || courtId === '' || daySchedules.length === 0}
                  className="w-full font-black uppercase tracking-widest text-[11px] py-4 rounded-2xl shadow-xl transition-all disabled:opacity-50 mt-2 disabled:cursor-not-allowed active:scale-95"
                  style={{ background: '#f59e0b', color: '#020617', boxShadow: '0 8px 20px rgba(245,158,11,0.25)' }}
                >
                  {loading ? 'Se procesează...' : 'Generează abonamentul'}
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
