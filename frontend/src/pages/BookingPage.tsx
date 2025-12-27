import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { createBooking } from '../api'
import type { CourtDto } from '../types'

export default function BookingPage() {
  const { courtId, date, startTime, endTime } = useParams()
  const [searchParams] = useSearchParams()
  const sport = searchParams.get('sport') || 'TENNIS'
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nav = useNavigate()
  const phoneInputRef = useRef<HTMLInputElement | null>(null)
  const [court, setCourt] = useState<CourtDto | null>(null)

  const subtitle = useMemo(() => `${date} • ${startTime} - ${endTime}`, [date, startTime, endTime])

  function minutesBetween(a?: string, b?: string) {
    if (!a || !b) return 0
    const [ah, am] = a.split(':').map(Number)
    const [bh, bm] = b.split(':').map(Number)
    return (bh*60 + bm) - (ah*60 + am)
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
        el.setCustomValidity('Introduceți un număr valid de telefon (07xxxxxxxx sau +407xxxxxxxx).')
      }
    } catch {}
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
    // always include indoor/outdoor first
    parts.push(court.indoor ? 'interior' : 'exterior')
    if (court.heated) parts.push('încălzit')
    if (court.lighting) parts.push('iluminat')
    if (!parts.length) return ''
    // Return properties without parentheses, each prefixed with a bullet
    return ' ' + parts.map(p => `• ${p}`).join(' ')
  }, [court])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!courtId || !date || !startTime || !endTime) return
    // Ensure phone validity uses same tooltip style as email
    validatePhone()
    if (phoneInputRef.current && !phoneInputRef.current.checkValidity()) {
      phoneInputRef.current.reportValidity()
      return
    }
    setSubmitting(true)
    setError(null)
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
      alert('Mulțumim, rezervarea a fost înregistrată.')
      const lastSport = localStorage.getItem('lastSport') || sport
      const lastDate = localStorage.getItem('lastDate') || date
      const backUrl = `/?sport=${encodeURIComponent(lastSport)}&date=${encodeURIComponent(lastDate)}`
      nav(backUrl)
    } catch (e: any) {
      setError(e.message || 'Nu am putut crea rezervarea')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto min-h-screen bg-white p-4 space-y-4">
      <div className="flex items-center">
        <h1 className="text-2xl font-bold border-l-4 border-sky-500 pl-3">Finalizează rezervarea</h1>
      </div>

      <div className="rounded border border-sky-200 bg-sky-50 p-3 shadow-md">
        <div className="text-sm font-semibold text-sky-900 mb-1">Detalii rezervare</div>
        <div className="text-slate-700 flex flex-col">
          <div>{`Teren #${courtId}${courtDetailSuffix}`}</div>
          <div>{subtitle}</div>
          <div>{totalPrice != null ? `Total: ${totalPrice.toFixed(2)} RON` : ''}</div>
        </div>
      </div>

      {error && <div className="p-2 bg-rose-100 text-rose-700 border border-rose-200 rounded">{error}</div>}

      <div className="rounded border border-sky-200 bg-sky-50 p-4 shadow-md">
        <div className="text-sm font-semibold text-sky-900 mb-2">Date de contact</div>
        <form onSubmit={onSubmit} className="space-y-2.5">
          {!meetsMinDuration && (
            <div className="p-2 bg-amber-100 text-amber-800 border border-amber-200 rounded text-sm">
              Selectați cel puțin 1 oră (două intervale continue de 30 min).
            </div>
          )}
          <div>
            <label className="block text-sm">Nume</label>
            <input className="w-full border rounded px-3 py-2" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm">Telefon</label>
            <input
              ref={phoneInputRef}
              type="tel"
              className="w-full border rounded px-3 py-2"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              onInput={(e) => validatePhone(e.currentTarget)}
              required
            />
          </div>
          <div>
            <label className="block text-sm">Email (opțional)</label>
            <input className="w-full border rounded px-3 py-2" value={email} onChange={e => setEmail(e.target.value)} type="email" />
          </div>
          <div className="mt-3 flex justify-center gap-3">
            <button className="btn" disabled={submitting || !meetsMinDuration} type="submit">Confirmă rezervarea</button>
            <button
              className="px-4 py-2 rounded border"
              type="button"
              onClick={() => {
                const lastSport = localStorage.getItem('lastSport') || sport
                const lastDate = localStorage.getItem('lastDate') || date
                nav(`/?sport=${encodeURIComponent(lastSport)}&date=${encodeURIComponent(lastDate)}`)
              }}
            >
              Anulează
            </button>
          </div>
        </form>
      </div>

      <div className="mt-3 rounded border border-sky-200 bg-sky-50 p-3 text-xs text-slate-700 shadow-md">
        <div className="flex items-start gap-2">
          <span aria-hidden className="mt-0.5">ℹ️</span>
          <div>
            <div className="font-semibold text-slate-800 mb-1">Instrucțiuni de completare</div>
            <ul className="list-disc pl-4 space-y-1">
              <li>Introduceți numele complet.</li>
              <li>Telefon valid: 07xxxxxxxx sau +407xxxxxxxx.</li>
              <li>Email (opțional) pentru confirmări.</li>
              <li>Verificați terenul și intervalul selectat.</li>
              <li>Vă rugăm să apăsați „Confirmă rezervarea”.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
