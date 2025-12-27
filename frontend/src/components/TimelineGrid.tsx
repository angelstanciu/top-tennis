import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AvailabilityDto } from '../types'

function timeLabel(t: string) {
  // Display 24-hour format HH:mm
  const [h, m] = t.split(':')
  return `${h.padStart(2,'0')}:${m.padStart(2,'0')}`
}

function enumerateSlots(start: string, end: string) {
  const out: string[] = []
  let [h, m] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  while (h < eh || (h === eh && m < em)) {
    out.push(`${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`)
    m += 30
    if (m >= 60) { m = 0; h += 1 }
  }
  out.push(end)
  return out
}

type Props = {
  data: AvailabilityDto[]
  date: string
  onHover?: (msg: string) => void
  onSelectionChange?: (courtId: number | null, start: string | null, end: string | null, valid: boolean, gapInvalid?: boolean) => void
  onReserve?: () => void
  clearSignal?: number
  flat?: boolean
  scrollContainerRef?: React.RefObject<HTMLDivElement>
}

function sportLabel(s: string) {
  switch (s) {
    case 'TENNIS': return 'Tenis'
    case 'PADEL': return 'Padel'
    case 'BEACH_VOLLEY': return 'Volei pe plajă'
    case 'BASKETBALL': return 'Baschet'
    case 'FOOTVOLLEY': return 'Tenis de picior'
    case 'TABLE_TENNIS': return 'Tenis de masă'
    default: return s
  }
}

export default function TimelineGrid({ data, date, onHover, onSelectionChange, onReserve, clearSignal, flat, scrollContainerRef }: Props) {
  if (data.length === 0) return <div>Nu au fost găsite terenuri</div>
  // Non-stop base: show full day 00:00-24:00 without outside intervals
  const minOpen = '00:00'
  const maxClose = '24:00'
  const ticks = enumerateSlots(minOpen, maxClose)

  // Responsive: use mobile layout under 768px
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' ? window.innerWidth < 768 : true)
  useEffect(() => {
    function onResize() { setIsMobile(window.innerWidth < 768) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const colWidth = isMobile ? 48 : 60 // px per 30 mins (desktop only)
  const leftColWidth = isMobile ? 180 : 240

  // Selection state: court-bound contiguous 30-min slots
  const [selCourtId, setSelCourtId] = useState<number | null>(null)
  const [selStart, setSelStart] = useState<string | null>(null)
  const [selEnd, setSelEnd] = useState<string | null>(null)
  const [popup, setPopup] = useState<null | { courtId: number, rowIndex: number, startIndex: number, left: number, top: number }>(null)
  const [reserveWarnVisible, setReserveWarnVisible] = useState(false)
  const [reserveWarnFading, setReserveWarnFading] = useState(false)
  const reserveWarnHideTimer = useRef<any>(null)
  const reserveWarnFadeTimer = useRef<any>(null)

  // Reset selection on date changes or data refresh
  useEffect(() => {
    setSelCourtId(null); setSelStart(null); setSelEnd(null)
    onSelectionChange?.(null, null, null, false)
  }, [date, data.length])
  useEffect(() => {
    if (selStart && selEnd) {
      setReserveWarnVisible(false)
      setReserveWarnFading(false)
    }
  }, [selStart, selEnd])

  function add30(t: string) {
    const [h,m] = t.split(':').map(Number)
    const d = new Date()
    d.setHours(h, m + 30, 0, 0)
    return d.toTimeString().slice(0,5)
  }

  function sub30(t: string) {
    const [h,m] = t.split(':').map(Number)
    const d = new Date()
    d.setHours(h, m - 30, 0, 0)
    return d.toTimeString().slice(0,5)
  }

  function minutesBetween(a: string, b: string) {
    const [ah, am] = a.split(':').map(Number)
    const [bh, bm] = b.split(':').map(Number)
    return (bh*60 + bm) - (ah*60 + am)
  }

  function handleCellClick(courtId: number, t: string, next: string, isBooked: boolean, within: boolean, bookedRanges: {start:string,end:string}[]) {
    if (!within || isBooked) return
    // New selection if court changes or no selection
    if (selCourtId !== courtId || !selStart || !selEnd) {
      setSelCourtId(courtId)
      setSelStart(t)
      setSelEnd(next)
      onSelectionChange?.(courtId, t, next, false, false)
      return
    }
    // Only allow contiguous extension at either end
    if (t === selEnd) {
      const newEnd = next
      setSelEnd(newEnd)
      const meets = minutesBetween(selStart, newEnd) >= 60
      const gapInvalid = leavesThirtyMinuteGap(bookedRanges, selStart, newEnd)
      onSelectionChange?.(courtId, selStart, newEnd, meets && !gapInvalid, gapInvalid)
      return
    }
    if (next === selStart) {
      const newStart = t
      setSelStart(newStart)
      const meets = minutesBetween(newStart, selEnd) >= 60
      const gapInvalid = leavesThirtyMinuteGap(bookedRanges, newStart, selEnd)
      onSelectionChange?.(courtId, newStart, selEnd, meets && !gapInvalid, gapInvalid)
      return
    }
    // If clicked non-contiguous slot, start new selection at this slot
    setSelCourtId(courtId)
    setSelStart(t)
    setSelEnd(next)
    onSelectionChange?.(courtId, t, next, false, false)
  }

  function minutesSinceMidnightStr(s: string) {
    const [h,m] = s.split(":").map(Number)
    return h*60 + m
  }

  function leavesThirtyMinuteGap(booked: {start:string,end:string}[], selStart: string, selEnd: string) {
    // Find previous booking (max end <= selStart)
    let prevEnd: string | null = null
    for (const b of booked) {
      if (b.end <= selStart) {
        if (!prevEnd || b.end > prevEnd) prevEnd = b.end
      }
    }
    if (prevEnd && (minutesSinceMidnightStr(selStart) - minutesSinceMidnightStr(prevEnd) === 30)) return true
    // Find next booking (min start >= selEnd)
    let nextStart: string | null = null
    for (const b of booked) {
      if (b.start >= selEnd) {
        if (!nextStart || b.start < nextStart) nextStart = b.start
      }
    }
    if (nextStart && (minutesSinceMidnightStr(nextStart) - minutesSinceMidnightStr(selEnd) === 30)) return true
    return false
  }

  // Past time disabling
  const todayStr = new Date().toISOString().slice(0,10)
  const nowTime = new Date().toTimeString().slice(0,5) // HH:mm

  const scrollRef = useRef<HTMLDivElement>(null)
  const mobileBodyRef = useRef<HTMLDivElement>(null)
  const popupRowIndexRef = useRef<number>(0)

  // Custom smooth scroll helpers (slower ~600ms)
  function animateScrollX(el: HTMLElement, toLeft: number, duration = 600, onStep?: (left: number) => void) {
    const start = el.scrollLeft
    const change = toLeft - start
    if (Math.abs(change) < 1) { el.scrollLeft = toLeft; onStep?.(toLeft); return }
    const startTime = performance.now()
    const ease = (t: number) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2
    const step = (now: number) => {
      const pct = Math.min(1, (now - startTime) / duration)
      const val = start + change * ease(pct)
      el.scrollLeft = val
      onStep?.(val)
      if (pct < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }

  function animateScrollY(el: HTMLElement, toTop: number, duration = 600) {
    const start = el.scrollTop
    const change = toTop - start
    if (Math.abs(change) < 1) { el.scrollTop = toTop; return }
    const startTime = performance.now()
    const ease = (t: number) => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2
    const step = (now: number) => {
      const pct = Math.min(1, (now - startTime) / duration)
      const val = start + change * ease(pct)
      el.scrollTop = val
      if (pct < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }
  // Close popup and reset horizontal scroll on date/data changes
  useEffect(() => {
    setPopup(null)
    if (scrollRef.current) scrollRef.current.scrollLeft = 0
    if (headerRef.current) headerRef.current.scrollLeft = 0
  }, [date, data.length])
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setPopup(null) }
    function onResize() { setPopup(null) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [])
  useEffect(() => {
    return () => {
      if (reserveWarnFadeTimer.current) clearTimeout(reserveWarnFadeTimer.current)
      if (reserveWarnHideTimer.current) clearTimeout(reserveWarnHideTimer.current)
    }
  }, [])

  // Respond to external clear selection signal
  useEffect(() => {
    if (clearSignal === undefined) return
    setSelCourtId(null)
    setSelStart(null)
    setSelEnd(null)
    setPopup(null)
    onSelectionChange?.(null, null, null, false, false)
  }, [clearSignal])

  // Auto-scroll to current time minus one hour
  useEffect(() => {
    if (!data.length) return
    const findScrollIndex = () => {
      if (date !== todayStr) return 0
      const [hStr, mStr] = nowTime.split(':').map(Number)
      const total = hStr * 60 + mStr
      const targetMin = Math.max(0, total - 30)
      const targetH = Math.floor(targetMin / 60)
      const targetM = targetMin % 60
      const target = `${String(targetH).padStart(2, '0')}:${String(targetM).padStart(2, '0')}`
      const idx = ticks.findIndex(t => t >= target)
      return Math.max(0, idx)
    }
    const idx = findScrollIndex()
    if (idx !== null) {
      if (!isMobile) {
        // Desktop: keep the time header anchored at the start
        if (scrollRef.current) scrollRef.current.scrollLeft = 0
        if (headerRef.current) headerRef.current.scrollLeft = 0
      } else if (isMobile) {
        // Mobile: vertical scroll within the mobile grid container
        const container = mobileBodyRef.current
        if (!container) return
        const rowEl = container.querySelector(`[data-row-index="${idx}"]`) as HTMLElement | null
        if (rowEl) {
          const top = Math.max(0, rowEl.offsetTop - Math.max(0, container.clientHeight / 3))
          animateScrollY(container, top, 600)
        }
      }
    }
  }, [date, data, ticks.length, isMobile])

  // Reinforce auto-scroll shortly after layout settles
  useEffect(() => {
    if (!data.length) return
    const findScrollIndex = () => {
      if (date !== todayStr) return 0
      const [hStr, mStr] = nowTime.split(':').map(Number)
      const total = hStr * 60 + mStr
      const targetMin = Math.max(0, total - 30)
      const targetH = Math.floor(targetMin / 60)
      const targetM = targetMin % 60
      const target = `${String(targetH).padStart(2, '0')}:${String(targetM).padStart(2, '0')}`
      const idx = ticks.findIndex(t => t >= target)
      return Math.max(0, idx)
    }
    const idx = findScrollIndex()
    const timer = setTimeout(() => {
      if (!isMobile) {
        if (scrollRef.current) scrollRef.current.scrollLeft = 0
        if (headerRef.current) headerRef.current.scrollLeft = 0
      } else if (isMobile) {
        const container = mobileBodyRef.current
        const rowEl = container?.querySelector(`[data-row-index="${idx}"]`) as HTMLElement | null
        if (container && rowEl) {
          const top = Math.max(0, rowEl.offsetTop - Math.max(0, container.clientHeight / 3))
          animateScrollY(container, top, 600)
        }
      }
    }, 80)
    return () => clearTimeout(timer)
  }, [date, data.length, isMobile, colWidth])

  const headerRef = useRef<HTMLDivElement>(null)

  // Desktop layout (original)
  function renderDesktop() {
    return (
      <div className={flat ? '' : 'rounded border border-sky-200 bg-sky-50 shadow-md'}>
        <div className={flat ? '' : 'rounded'}>
          <div className="flex">
            <div className="px-3 py-2 font-semibold shrink-0" style={{ width: leftColWidth }}>Terenuri</div>
            <div className="overflow-hidden" ref={headerRef}>
              <div className="grid" style={{ gridTemplateColumns: `repeat(${ticks.length-1}, ${colWidth}px)` }}>
                {ticks.slice(0, -1).map((t,i) => (
                  <div key={t} className="text-xs text-slate-500 px-1 py-2 border-l border-slate-300 bg-white text-left">
                    {i % 2 === 0 ? timeLabel(t) : ''}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex">
            <div className="shrink-0" style={{ width: leftColWidth }}>
              {data.map((row) => (
                <div key={`name-${row.court.id}`} className="border-t border-slate-300 px-3 py-2 text-sm h-10 flex flex-col items-center justify-center text-center bg-white">
                  <div className="font-medium">{row.court.name}</div>
                  <div className="text-xs text-slate-500">{sportLabel(row.court.sportType)} {row.court.indoor ? '• Interior' : '• Exterior'} {row.court.heated ? '• Încălzit' : ''}</div>
                </div>
              ))}
            </div>
            <div ref={scrollRef} className="overflow-x-auto" onScroll={() => { if (headerRef.current && scrollRef.current) headerRef.current.scrollLeft = scrollRef.current.scrollLeft }}>
              {(() => {
                const pastCols = (date < todayStr) ? (ticks.length - 1) : (date === todayStr ? ticks.slice(0, -1).filter(t => t < nowTime).length : 0)
                const width = pastCols * colWidth
                return (
                  <div className="relative">
                    <div className="absolute top-0 bottom-0" style={{ width, backgroundImage: 'repeating-linear-gradient(45deg, rgba(148,163,184,0.35) 0, rgba(148,163,184,0.35) 12px, rgba(255,255,255,0) 12px, rgba(255,255,255,0) 24px)', pointerEvents: 'none' }} />
                    {data.map((row, rowIndex) => {
                      const booked = row.booked.map(b => ({ start: b.start, end: b.end, status: b.status }))
                      return (
                        <div key={row.court.id} className="grid items-stretch" style={{ gridTemplateColumns: `repeat(${ticks.length-1}, ${colWidth}px)` }}>
                          {ticks.slice(0,-1).map((t, i) => {
                            const next = ticks[i+1]
                            const isBooked = booked.some(b => !(b.end <= t || b.start >= next))
                            const isPast = (date < todayStr) || (date === todayStr && t < nowTime)
                            const selected = selCourtId === row.court.id && selStart && selEnd && t >= selStart && next <= selEnd
                            const clickable = !isBooked && !isPast
                            let stateClass = ''
                            if (isBooked) stateClass = 'bg-rose-200'
                            else if (selected) stateClass = 'bg-emerald-300'
                            else stateClass = 'bg-emerald-50 hover:bg-emerald-100'
                            const disabledClass = isPast ? 'cursor-not-allowed' : (clickable ? 'cursor-pointer' : '')
                            return (
                              <div
                                key={`${row.court.id}-${t}`}
                                className={`h-10 border-t border-l border-slate-300 ${stateClass} ${disabledClass}`}
                                onMouseEnter={() => onHover?.(`${row.court.name} • ${t} - ${next} • ${isBooked ? 'REZERVAT' : 'LIBER'}`)}
                                onClick={(e) => {
                                  if (!clickable) return
                                  // If any selection exists, clear it and require a new click to start fresh
                                  if (selCourtId && selStart && selEnd) {
                                    setSelCourtId(null); setSelStart(null); setSelEnd(null)
                                    onSelectionChange?.(null, null, null, false, false)
                                    // continue to handle this click as a fresh selection
                                  }
                                  // Pre-check default 60 min selection for 30-min gap; if gap would occur, signal error and do not open popup
                                  const end60 = ticks[i+2]
                                  if (end60) {
                                    const within = t >= row.court.openTime && end60 <= row.court.closeTime
                                    const slot2Booked = booked.some(b => !(b.end <= ticks[i+1] || b.start >= end60))
                                    const slot2Past = (date < todayStr) || (date === todayStr && ticks[i+1] < nowTime)
                                    const free60 = within && !isBooked && !slot2Booked && !isPast && !slot2Past
                                    if (free60) {
                                      const simpleBooked = booked.map(b => ({ start: b.start, end: b.end }))
                                      const gapInvalid = leavesThirtyMinuteGap(simpleBooked, t, end60)
                                      if (gapInvalid) { onSelectionChange?.(null, null, null, false, true); return }
                                    }
                                  }
                                  popupRowIndexRef.current = rowIndex
                                  handleCellClick(row.court.id, t, next, isBooked, true, booked)
                                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                                  setPopup({ courtId: row.court.id, rowIndex, startIndex: i, left: rect.left + window.scrollX, top: rect.bottom + window.scrollY })
                                }}
                                title={`${row.court.name} • ${t} - ${next}`}
                              />
                            )
                          })}
                        </div>
                      )
                    })}
                    
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Mobile layout (transposed): rows = times, columns = courts
  function renderMobile() {
    const courtCount = data.length
    const timeColWidth = 64
    return (
      <div className={flat ? '' : 'rounded border border-sky-200 bg-sky-50 shadow-md'}>
        <div className="max-h-[70vh] overflow-y-auto" ref={mobileBodyRef}>
          {/* Header: corner cell with diagonal split + court names */}
          <div className="grid sticky top-0 z-10" style={{ gridTemplateColumns: `${timeColWidth}px repeat(${courtCount}, minmax(0,1fr))` }}>
            <div className="px-2 py-2 text-xs font-semibold bg-white">Ora</div>
            {data.map(row => (
              <div key={`head-${row.court.id}`} className="px-2 py-2 text-xs font-semibold bg-white border-l border-slate-300 text-center">
                {row.court.name}
              </div>
            ))}
          </div>
          {/* Body: each row is a time slot */}
          {ticks.slice(0,-1).map((t, i) => {
            const next = ticks[i+1]
            const isPastRow = (date < todayStr) || (date === todayStr && t < nowTime)
            return (
              <div key={`time-${t}`} className="grid items-stretch" style={{ gridTemplateColumns: `${timeColWidth}px repeat(${courtCount}, minmax(0,1fr))` }} data-row-index={i}>
                {/* Time label */}
                <div className="px-2 pt-1 pb-0 text-xs border-t border-slate-300 bg-white text-left flex items-start">{timeLabel(t)}</div>
                {/* Cells per court */}
                {data.map((row, rowIndex) => {
                  const bookedRanges = row.booked.map(b => ({ start: b.start, end: b.end }))
                  const isBooked = bookedRanges.some(b => !(b.end <= t || b.start >= next))
                  const selected = selCourtId === row.court.id && selStart && selEnd && t >= selStart && next <= selEnd
                  const clickable = !isBooked && !isPastRow
                  let stateClass = ''
                  if (isBooked) stateClass = 'bg-rose-200'
                  else if (selected) stateClass = 'bg-emerald-300'
                  else stateClass = 'bg-emerald-50 hover:bg-emerald-100'
                  const disabledClass = isPastRow ? 'cursor-not-allowed' : (clickable ? 'cursor-pointer' : '')
                  const pastStyle = isPastRow ? { backgroundImage: 'repeating-linear-gradient(45deg, rgba(148,163,184,0.35) 0, rgba(148,163,184,0.35) 12px, rgba(255,255,255,0) 12px, rgba(255,255,255,0) 24px)' } : undefined
                  return (
                    <div
                      key={`cell-${row.court.id}-${t}`}
                      className={`h-10 border-t border-l border-slate-300 ${stateClass} ${disabledClass}`}
                      style={pastStyle}
                      onMouseEnter={() => onHover?.(`${row.court.name} • ${t} - ${next} • ${isBooked ? 'REZERVAT' : 'LIBER'}`)}
                      onClick={(e) => {
                        if (!clickable) return
                        // If any selection exists, clear it and require a new click to start fresh
                        if (selCourtId && selStart && selEnd) {
                          setSelCourtId(null); setSelStart(null); setSelEnd(null)
                          onSelectionChange?.(null, null, null, false, false)
                          // continue to handle this click as a fresh selection
                        }
                        const end60 = ticks[i+2]
                        if (end60) {
                          const within = t >= row.court.openTime && end60 <= row.court.closeTime
                          const slot2Booked = bookedRanges.some(b => !(b.end <= ticks[i+1] || b.start >= end60))
                          const slot2Past = (date < todayStr) || (date === todayStr && ticks[i+1] < nowTime)
                          const free60 = within && !isBooked && !isPastRow && !slot2Past && !slot2Booked
                          if (free60) {
                            const gapInvalid = leavesThirtyMinuteGap(bookedRanges, t, end60)
                            if (gapInvalid) { onSelectionChange?.(null, null, null, false, true); return }
                          }
                        }
                        popupRowIndexRef.current = rowIndex
                        handleCellClick(row.court.id, t, next, isBooked, true, bookedRanges)
                        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                        setPopup({ courtId: row.court.id, rowIndex, startIndex: i, left: rect.left + window.scrollX, top: rect.bottom + window.scrollY })
                      }}
                      title={`${row.court.name} • ${t} - ${next}`}
                    />
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  function renderPopup() {
    if (!popup || typeof document === 'undefined') return null
    const { courtId, rowIndex, startIndex } = popup // ignore left/top; centered via CSS
    const row = data[rowIndex]
    if (!row || !ticks[startIndex]) return null
    const booked = row.booked.map(b => ({ start: b.start, end: b.end }))
    const startTime = ticks[startIndex]
    const selectedIntervalText = (selCourtId === courtId && selStart === startTime && selEnd)
      ? `${selStart} - ${selEnd}`
      : 'â€”'
    const selectionValid = !!(selCourtId === courtId && selStart && selEnd && minutesBetween(selStart, selEnd) >= 60 && !leavesThirtyMinuteGap(booked, selStart, selEnd))
    const options = [60, 90, 120]
    function isRangeFree(mins: number) {
      const slots = mins / 30
      for (let i = 0; i < slots; i++) {
        const t = ticks[startIndex + i]
        const next = ticks[startIndex + i + 1]
        if (!t || !next) return false
        const isPast = (date < todayStr) || (date === todayStr && t < nowTime)
        const isBooked = booked.some(b => !(b.end <= t || b.start >= next))
        if (isPast || isBooked) return false
      }
      return true
    }
    function priceFor(mins: number) {
      const hours = mins / 60
      const p = (row.court.pricePerHour as unknown as number) * hours
      return `lei ${p.toFixed(2)}`
    }
    function choose(mins: number) {
      const slots = mins / 30
      const endTime = ticks[startIndex + slots]
      if (!endTime) return
      setSelCourtId(courtId)
      setSelStart(startTime)
      setSelEnd(endTime)
      const gapInvalid = leavesThirtyMinuteGap(booked, startTime, endTime)
      onSelectionChange?.(courtId, startTime, endTime, mins >= 60 && !gapInvalid, gapInvalid)
      if (reserveWarnVisible) {
        setReserveWarnVisible(false)
        setReserveWarnFading(false)
      }
    }
    function handleReserveClick() {
      if (!selectionValid) {
        setReserveWarnVisible(true)
        setReserveWarnFading(false)
        if (reserveWarnFadeTimer.current) clearTimeout(reserveWarnFadeTimer.current)
        if (reserveWarnHideTimer.current) clearTimeout(reserveWarnHideTimer.current)
        reserveWarnFadeTimer.current = setTimeout(() => setReserveWarnFading(true), 3000)
        reserveWarnHideTimer.current = setTimeout(() => setReserveWarnVisible(false), 4000)
        return
      }
      onReserve?.()
    }
    return createPortal((
      <>
        <div
          className="fixed inset-0 z-[9999] bg-black/30 backdrop-blur-sm"
          onClick={() => setPopup(null)}
        />
        <div
          className="fixed z-[10000] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 m-1 flex min-w-[220px] max-w-xs flex-col gap-2 rounded-md border bg-white px-3 py-2 text-sm shadow"
          onClick={(e) => e.stopPropagation()}
        >
          {reserveWarnVisible && (
            <div
              className={'rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900 transition-opacity ' + (reserveWarnFading ? 'opacity-0' : 'opacity-100')}
              style={{ transitionDuration: '1000ms' }}
            >
              Te rugăm selectează una din selecțiile disponibile.
            </div>
          )}
          <div className="flex flex-col">
            <div className="font-bold">Teren: {row.court.name}</div>
            <div className="text-xs text-slate-600">Ora de începere: {startTime}</div>
            <div className="text-xs text-slate-600">Interval selectat: {selectedIntervalText}</div>
          </div>
          <div className="flex flex-col gap-2">
            {options.map((mins) => {
              const ok = isRangeFree(mins)
              const label = mins === 60 ? '1 h, 0 min' : mins === 90 ? '1 h, 30 min' : '2 h, 0 min'
              return (
                <button key={mins} disabled={!ok} onClick={() => choose(mins)} className={`flex w-full flex-row justify-between rounded-md border px-2 py-1.5 ${ok ? 'bg-emerald-50 hover:bg-emerald-100' : 'opacity-50 cursor-not-allowed'}`}>
                  <div>{label}</div>
                  <div>{priceFor(mins)}</div>
                </button>
              )
            })}
            <div className="flex gap-2">
              <button className="btn flex-1" onClick={handleReserveClick}>Rezervă selecția</button>
              <button
                className="px-3 py-2 rounded border"
                onClick={() => {
                  setPopup(null)
                  setSelCourtId(null)
                  setSelStart(null)
                  setSelEnd(null)
                  onSelectionChange?.(null, null, null, false, false)
                }}
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      </>
    ), document.body)
  }

  return (
    <div>
      {isMobile ? renderMobile() : renderDesktop()}
      {renderPopup()}
    </div>
  )
}








