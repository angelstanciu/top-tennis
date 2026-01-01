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
    <div className="max-w-lg mx-auto min-h-screen bg-white p-4 space-y-4">
      <div className="flex items-center">
        <h1 className="text-2xl font-bold border-l-4 border-sky-500 pl-3">Finalizeaza rezervarea</h1>
      </div>

      <div className="rounded border border-sky-200 bg-sky-50 p-3 shadow-md">
        <div className="text-sm font-semibold text-sky-900 mb-1">Detalii rezervare</div>
        <div className="text-slate-700 flex flex-col">
          <div>{`Teren ${court?.name ?? courtId}${courtDetailSuffix}`}</div>
          <div>{subtitle}</div>
          <div>{totalPrice != null ? `Total: ${totalPrice.toFixed(2)} RON` : ''}</div>
        </div>
      </div>

      <div className="rounded border border-sky-200 bg-sky-50 p-4 shadow-md">
        <div className="text-sm font-semibold text-sky-900 mb-2">Date de contact</div>
        <form onSubmit={onSubmit} className="space-y-2.5">
          {!meetsMinDuration && (
            <div className="p-2 bg-amber-100 text-amber-800 border border-amber-200 rounded text-sm">
              Selecteaza cel putin 1 ora (doua intervale continue de 30 min).
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
            <label className="block text-sm">Email (optional)</label>
            <input className="w-full border rounded px-3 py-2" value={email} onChange={e => setEmail(e.target.value)} type="email" />
          </div>
          <div className="mt-3 flex justify-center gap-3">
            <button className="btn" disabled={submitting || !meetsMinDuration} type="submit">Confirma rezervarea</button>
            <button
              className="px-4 py-2 rounded border"
              type="button"
              onClick={() => redirectToGrid()}
            >
              Anuleaza
            </button>
          </div>
        </form>
      </div>

      <div className="mt-3 rounded border border-sky-200 bg-sky-50 p-3 text-xs text-slate-700 shadow-md">
        <div className="flex items-start gap-2">
          <span aria-hidden className="mt-0.5">i</span>
          <div>
            <div className="font-semibold text-slate-800 mb-1">Instructiuni de completare</div>
            <ul className="list-disc pl-4 space-y-1">
              <li>Introdu numele complet.</li>
              <li>Telefon valid: 07xxxxxxxx sau +407xxxxxxxx.</li>
              <li>Email (optional) pentru confirmari.</li>
              <li>Verifica terenul si intervalul selectat.</li>
              <li>Apasa "Confirma rezervarea".</li>
            </ul>
          </div>
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




