import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CourtDto, SportType, sortCourtsByName, courtLocationBadge, courtLabel } from '../types'
import { fetchActiveCourts, adminUpdateCourtHours } from '../api'
import AdminHeader from '../components/AdminHeader'
import { FieldLabel, TextField } from '../components/admin/FilterBar'
import { TimeWheelPicker } from '../components/ui/time-wheel-picker'
import { WheelPicker } from '../components/ui/wheel-picker'

const SPORT_LABELS: Record<SportType, string> = {
  TENNIS: 'Tenis',
  PADEL: 'Padel',
  BEACH_VOLLEY: 'Volei Plajă',
  BASKETBALL: 'Baschet',
  FOOTVOLLEY: 'Fotbal Tenis',
  TABLE_TENNIS: 'Tenis Masă',
}
const SPORT_OPTIONS: SportType[] = ['TENNIS', 'PADEL', 'BASKETBALL', 'BEACH_VOLLEY', 'FOOTVOLLEY', 'TABLE_TENNIS']

type EditState = {
  openTime: string
  closeTime: string
  lighting: boolean
  pricePerHour: number
  nightPrice: number
  nightRateStartTime: string
  morningPrice: number
  nightRateEndTime: string
}

function toEditState(c: CourtDto): EditState {
  return {
    openTime: c.openTime.slice(0, 5),
    closeTime: c.closeTime.slice(0, 5),
    lighting: c.lighting,
    pricePerHour: c.pricePerHour,
    nightPrice: c.nightPrice,
    nightRateStartTime: c.nightRateStartTime.slice(0, 5),
    morningPrice: c.morningPrice,
    nightRateEndTime: c.nightRateEndTime.slice(0, 5),
  }
}

export default function AdminCourtsPage() {
  const navigate = useNavigate()
  const [auth, setAuth] = useState<string | null>(null)
  const [courts, setCourts] = useState<CourtDto[]>([])
  const [sport, setSport] = useState<SportType>('TENNIS')
  const [courtId, setCourtId] = useState<number | ''>('')
  const [edits, setEdits] = useState<Record<number, EditState>>({})
  const [savingId, setSavingId] = useState<number | null>(null)
  const [successId, setSuccessId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(null), 5000)
    return () => clearTimeout(timer)
  }, [error])

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
    fetchActiveCourts().then(list => {
      setCourts(list)
      setEdits(prev => {
        const next = { ...prev }
        list.forEach(c => { if (!next[c.id]) next[c.id] = toEditState(c) })
        return next
      })
    }).catch(console.error)
  }, [])

  const filteredCourts = sortCourtsByName(courts.filter(c => c.sportType === sport))

  // Keep exactly one court selected/visible at a time — auto-pick court "1" (or the
  // first one available) whenever the sport changes or the current selection falls out of it.
  useEffect(() => {
    const list = sortCourtsByName(courts.filter(c => c.sportType === sport))
    if (list.length === 0) { setCourtId(''); return }
    setCourtId(prev => {
      if (list.some(c => c.id === prev)) return prev
      return (list.find(c => c.name === '1') || list[0]).id
    })
  }, [sport, courts])

  const selectedCourt = filteredCourts.find(c => c.id === courtId) || null

  function updateEdit(courtId: number, patch: Partial<EditState>) {
    setEdits(prev => ({ ...prev, [courtId]: { ...prev[courtId], ...patch } }))
  }

  async function handleSave(court: CourtDto) {
    if (!auth) return
    const edit = edits[court.id]
    if (!edit) return
    setSavingId(court.id)
    setError(null)
    try {
      const updated = await adminUpdateCourtHours(court.id, edit, auth)
      setCourts(prev => prev.map(c => c.id === court.id ? updated : c))
      setEdits(prev => ({ ...prev, [court.id]: toEditState(updated) }))
      setSuccessId(court.id)
      setTimeout(() => setSuccessId(id => id === court.id ? null : id), 2500)
    } catch (err: any) {
      let msg = 'A apărut o eroare la salvare.'
      try {
        const parsed = JSON.parse(err.message)
        msg = parsed.message || msg
      } catch {
        msg = err.message || msg
      }
      setError(msg)
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="min-h-screen font-sans pb-20" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {auth && (
        <>
          <AdminHeader active="courts" />
          <div className="max-w-2xl mx-auto px-4 pt-6">
          <div className="rounded-[24px] p-6 border" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}>
            <span className="block text-[11px] font-black uppercase tracking-[0.12em] mb-1.5" style={{ color: '#14b8a6', fontFamily: "'Outfit', sans-serif" }}>Configurare program</span>
            <h2 className="text-2xl font-black tracking-tight mb-2" style={{ color: 'var(--text)', fontFamily: "'Outfit', sans-serif" }}>Administrare terenuri</h2>
            <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>Program, preț și nocturnă pentru fiecare teren.</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Sport</FieldLabel>
                <WheelPicker
                  title="Selectează sportul"
                  value={sport}
                  options={SPORT_OPTIONS.map(s => ({ value: s, label: SPORT_LABELS[s] }))}
                  onChange={setSport}
                />
              </div>
              <div>
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

            <div className="flex flex-col gap-3 mt-3">
              {selectedCourt && (() => {
                const court = selectedCourt
                const edit = edits[court.id] || toEditState(court)
                const original = toEditState(court)
                const dirty = edit.openTime !== original.openTime
                  || edit.closeTime !== original.closeTime
                  || edit.lighting !== original.lighting
                  || edit.pricePerHour !== original.pricePerHour
                  || edit.nightPrice !== original.nightPrice
                  || edit.nightRateStartTime !== original.nightRateStartTime
                  || edit.morningPrice !== original.morningPrice
                  || edit.nightRateEndTime !== original.nightRateEndTime
                const showNocturnaPricing = !court.indoor && edit.lighting
                const showMorningPricing = court.sportType === 'PADEL' && !court.indoor
                return (
                  <div key={court.id} className="rounded-2xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
                    <div className="flex items-center justify-between mb-3 gap-3">
                      <div className="font-extrabold text-sm" style={{ color: 'var(--text)' }}>
                        {SPORT_LABELS[court.sportType]} {court.name}
                      </div>
                      <label className="flex items-center gap-1.5 text-[11px] font-bold cursor-pointer select-none shrink-0" style={{ color: 'var(--muted)' }}>
                        <input
                          type="checkbox"
                          checked={edit.lighting}
                          onChange={e => updateEdit(court.id, { lighting: e.target.checked })}
                        />
                        Nocturnă
                      </label>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <FieldLabel>Ora deschidere</FieldLabel>
                          <TimeWheelPicker value={edit.openTime} onChange={t => updateEdit(court.id, { openTime: t })} />
                        </div>
                        <div>
                          <FieldLabel>Ora închidere</FieldLabel>
                          <TimeWheelPicker value={edit.closeTime} onChange={t => updateEdit(court.id, { closeTime: t })} />
                        </div>
                      </div>
                      <TextField
                        label="Preț (lei/h)"
                        type="number"
                        min={0}
                        step={1}
                        value={edit.pricePerHour}
                        onChange={e => updateEdit(court.id, { pricePerHour: Number(e.target.value) })}
                      />
                      {showMorningPricing && (
                        <TextField
                          label="Preț dimineață (L-V până la 14:00)"
                          type="number"
                          min={0}
                          step={1}
                          value={edit.morningPrice}
                          onChange={e => updateEdit(court.id, { morningPrice: Number(e.target.value) })}
                        />
                      )}
                      {showNocturnaPricing && (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <FieldLabel>Nocturna De la</FieldLabel>
                              <TimeWheelPicker value={edit.nightRateStartTime} onChange={t => updateEdit(court.id, { nightRateStartTime: t })} />
                            </div>
                            <div>
                              <FieldLabel>Nocturna pana la</FieldLabel>
                              <TimeWheelPicker value={edit.nightRateEndTime} onChange={t => updateEdit(court.id, { nightRateEndTime: t })} />
                            </div>
                          </div>
                          <TextField
                            label="Preț nocturnă (lei/h)"
                            type="number"
                            min={0}
                            step={1}
                            value={edit.nightPrice}
                            onChange={e => updateEdit(court.id, { nightPrice: Number(e.target.value) })}
                          />
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={!dirty || savingId === court.id}
                      onClick={() => handleSave(court)}
                      className="mt-3 w-full font-black uppercase tracking-widest text-[11px] py-3 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                      style={{ background: successId === court.id ? '#10b981' : '#14b8a6', color: '#fff' }}
                    >
                      {savingId === court.id ? 'Se salvează...' : successId === court.id ? 'Salvat!' : 'Salvează'}
                    </button>
                  </div>
                )
              })()}
              {!selectedCourt && (
                <div className="text-sm text-center py-6" style={{ color: 'var(--muted)' }}>Niciun teren găsit.</div>
              )}
            </div>
          </div>
          </div>
        </>
      )}
      {error && (
        <div className="fixed inset-x-0 bottom-5 z-[100] flex justify-center px-4 pointer-events-none">
          <div
            className="pointer-events-auto max-w-md w-full flex items-center justify-between gap-3 px-5 py-3 rounded-2xl text-sm font-medium shadow-xl"
            style={{ background: 'rgba(244,63,94,0.14)', color: '#fb7185', border: '1px solid rgba(244,63,94,0.3)', backdropFilter: 'blur(8px)' }}
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              aria-label="Închide"
              className="shrink-0 text-lg leading-none opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
