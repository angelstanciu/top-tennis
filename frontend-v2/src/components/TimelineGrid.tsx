import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AvailabilityDto, calculateGranularPrice } from '../types'

function todayISO() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function timeLabel(t: string) {

  // Display 24-hour format HH:mm
  const [h, m] = t.split(':')
  return `${h.padStart(2,'0')}:${m.padStart(2,'0')}`
}

const SHOW_BOOKING_LABELS = true

function timeToMinutes(t: string) {
  if (t === '24:00' || t === '23:59') return 24 * 60
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
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

type TimelineGridProps = {
  data: AvailabilityDto[]
  date: string
  onHover?: (msg: string) => void
  onSelectionChange?: (courtId: number | null, start: string | null, end: string | null, valid: boolean, gapInvalid?: boolean) => void
  onReserve?: () => void
  clearSignal?: number
  flat?: boolean
  scrollContainerRef?: React.RefObject<HTMLDivElement>
  onAdminClick?: (courtId: number, startTime: string, endTime: string, booking?: any) => void
  player?: any // ADDED: to know if user is logged in
}

function sportLabel(s: string) {
  switch (s) {
    case 'TENNIS': return 'Tenis'
    case 'PADEL': return 'Padel 🎾'
    case 'BEACH_VOLLEY': return 'Volei'
    case 'BASKETBALL': return 'Baschet'
    case 'FOOTVOLLEY': return 'Tenis de picior'
    case 'TABLE_TENNIS': return 'Tenis de masă'
    default: return s
  }
}

function getDisplayName(booking: { customerName?: string } | null | undefined) {
  const raw = booking?.customerName ? booking.customerName.trim() : ''
  if (!raw) return 'REZERVAT'
  const parts = raw.split(/\s+/).filter(Boolean)
  return parts[0] || 'REZERVAT'
}
type BookingBlock = {
  startIndex: number
  endIndex: number
  label: string
  timeRange?: string
  status?: string
  playerMatchesCount?: number
}


function computeBookingBlocks(booked: { start: string, end: string, customerName?: string, status?: string, note?: string }[], tickIndex: Map<string, number>): BookingBlock[] {
  const blocks: BookingBlock[] = []
  const maxIdx = tickIndex.get('24:00') || 48
  const minIdx = tickIndex.get('00:00') || 0

  for (const b of booked) {
    const normalizedEnd = (b.end === '23:59' || b.end === '24:00') ? '24:00' : b.end
    const startIndex = tickIndex.get(b.start)
    let endIndex = tickIndex.get(normalizedEnd)
    
    if (startIndex === undefined || endIndex === undefined) continue
    
    // If blocked, use the note as the primary label if available
    const isBlocked = b.status === 'BLOCKED'
    const label = isBlocked && b.note ? b.note : getDisplayName(b as any)

    if (endIndex <= startIndex && normalizedEnd !== '00:00' && normalizedEnd !== '24:00') {
      // Over midnight booking - create TWO blocks
      // 1. From start to midnight
      blocks.push({
        startIndex,
        endIndex: maxIdx,
        label,
        timeRange: `${b.start} - ${b.end}`,
        status: b.status,
        playerMatchesCount: (b as any).playerMatchesCount
      })
      // 2. From midnight to end
      blocks.push({
        startIndex: minIdx,
        endIndex,
        label,
        timeRange: `${b.start} - ${b.end}`,
        status: b.status,
        playerMatchesCount: (b as any).playerMatchesCount
      })
    } else {
      // Normal booking
      let effectiveEnd = endIndex
      if (endIndex <= startIndex) effectiveEnd = maxIdx

      blocks.push({
        startIndex,
        endIndex: effectiveEnd,
        label,
        timeRange: `${b.start} - ${b.end}`,
        status: b.status,
      })
    }
  }
  blocks.sort((a, b) => a.startIndex - b.startIndex)
  return blocks
}

function BookingLabelBlock({
  label,
  timeRange,
  className,
  style,
  vertical,
  isBlocked,
  playerMatchesCount,
}: {
  label: string
  timeRange?: string
  className?: string
  style?: React.CSSProperties
  vertical?: boolean
  isBlocked?: boolean
  playerMatchesCount?: number
}) {
  // For long blocks, we want the text to appear centered and truncated if necessary
  const displayText = label

  return (
    <div
      className={`pointer-events-none flex flex-col ${vertical ? 'justify-start py-2' : 'justify-center items-center'} overflow-hidden px-2 ${className || ""}`}
      style={style}
    >
      <div
        className="text-white font-bold truncate w-full text-center px-2"
        style={{
          fontSize: isBlocked ? "13px" : "12px",
          lineHeight: 1.2,
          textShadow: "0 1px 3px rgba(0,0,0,0.5)",
          letterSpacing: '0.01em',
        }}
      >
        {displayText}
      </div>
      {playerMatchesCount !== undefined && playerMatchesCount !== null && (
        <div className="mt-0.5 scale-75 transform-gpu opacity-90">
             {(() => {
                const RANKS = [
                  { name: 'Bronze', min: 0, max: 6, color: 'bg-orange-400/10 text-orange-600 border-orange-400/20' },
                  { name: 'Silver', min: 7, max: 19, color: 'bg-slate-200 text-slate-600 border-slate-300' },
                  { name: 'Gold', min: 20, max: 49, color: 'bg-amber-100 text-amber-600 border-amber-200' },
                  { name: 'Diamond', min: 50, max: 99, color: 'bg-cyan-100 text-cyan-600 border-cyan-200' },
                  { name: 'Platinum', min: 100, max: Infinity, color: 'bg-purple-100 text-purple-600 border-purple-200' }
                ];
                const r = RANKS.find(rank => playerMatchesCount >= rank.min && playerMatchesCount <= rank.max) || RANKS[0];
                return (
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black tracking-tighter uppercase border ${r.color}`}>
                    {r.name}
                  </span>
                );
             })()}
        </div>
      )}
      {timeRange && !isBlocked && (
        <div
          className="text-white/80 truncate w-full text-center mt-0.5"
          style={{ fontSize: "10px", lineHeight: 1.2 }}
        >
          {timeRange}
        </div>
      )}
      {timeRange && isBlocked && (
        <div
          className="text-white/90 truncate w-full text-center mt-0.5 font-semibold tracking-wider"
          style={{ fontSize: "11px", lineHeight: 1.2 }}
        >
          {timeRange}
        </div>
      )}
    </div>
  )
}

export default function TimelineGrid({
  data, date, onHover, onSelectionChange, onReserve, clearSignal, flat, scrollContainerRef,
  onAdminClick,
  player
}: TimelineGridProps) {
  if (data.length === 0) return <div>Nu au fost găsite terenuri</div>
  // Non-stop base: show full day 00:00-24:00 without outside intervals
  const minOpen = '00:00'
  const maxClose = '24:00'
  const ticks = enumerateSlots(minOpen, maxClose)
  const tickIndex = useMemo(() => {
    const map = new Map<string, number>()
    ticks.forEach((t, i) => map.set(t, i))
    return map
  }, [ticks])

  const sortedData = useMemo(() => {
    const now = new Date();
    const currentISO = todayISO();
    const curTime = now.toTimeString().slice(0, 5);

    return [...data].sort((a, b) => {
      // 1. Group by sport type
      if (a.court.sportType !== b.court.sportType) {
        return a.court.sportType.localeCompare(b.court.sportType);
      }

      // 2. Count future bookings (excluding cancelled and past ones)
      const countA = a.booked.filter(b => {
        if (b.status === 'CANCELLED') return false;
        if (date < currentISO) return false;
        if (date > currentISO) return true;
        return (b.end === '23:59' || b.end === '24:00' || b.end > curTime);
      }).length;

      const countB = b.booked.filter(b => {
        if (b.status === 'CANCELLED') return false;
        if (date < currentISO) return false;
        if (date > currentISO) return true;
        return (b.end === '23:59' || b.end === '24:00' || b.end > curTime);
      }).length;

      if (countA !== countB) return countA - countB;

      // 3. Numerical order by Name (e.g. Padel 1 < Padel 2)
      const numA = parseInt(a.court.name.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.court.name.replace(/\D/g, '') || '0', 10);
      if (numA !== numB) return numA - numB;

      return a.court.name.localeCompare(b.court.name);
    });
  }, [data, date]);

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
    let diff = (bh*60 + bm) - (ah*60 + am)
    if (diff < 0) diff += 24*60
    return diff
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
      const courtRow = data.find(r => r.court.id === courtId)
      const gapInvalid = leavesThirtyMinuteGap(bookedRanges, selStart, newEnd, courtRow?.court.sportType)
      onSelectionChange?.(courtId, selStart, newEnd, meets && !gapInvalid, gapInvalid)
      return
    }
    if (next === selStart) {
      const newStart = t
      setSelStart(newStart)
      const meets = minutesBetween(newStart, selEnd) >= 60
      const courtRow = data.find(r => r.court.id === courtId)
      const gapInvalid = leavesThirtyMinuteGap(bookedRanges, newStart, selEnd, courtRow?.court.sportType)
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

  function isSelectedSlot(t: string, next: string) {
    if (!selStart || !selEnd) return false
    const wraps = selStart > selEnd
    if (!wraps) return t >= selStart && next <= selEnd
    return t >= selStart
  }

  function leavesThirtyMinuteGap(booked: {start:string,end:string,status?:string}[], selStart: string, selEnd: string, sportType?: string, isValidationOnly: boolean = false, clickStartCell?: string) {
    const active = booked.filter(b => b.status !== 'CANCELLED')
    
    const startMin = minutesSinceMidnightStr(selStart)
    const endMin = minutesSinceMidnightStr(selEnd)

    // Find the free block [blockStart, blockEnd] surrounding our selection
    let blockStart = 0 // represents grid start time in reality, approximated as 0 here
    let blockEnd = 1440

    active.forEach(b => {
      const bStart = minutesSinceMidnightStr(b.start)
      const bEnd = minutesSinceMidnightStr(b.end)
      
      if (bEnd <= startMin) {
        if (bEnd > blockStart) blockStart = bEnd
      }
      if (bStart >= endMin) {
        if (bStart < blockEnd) blockEnd = bStart
      }
    })

    const gapBefore = startMin - blockStart
    const gapAfter = blockEnd - endMin
    const duration = endMin - startMin

    if (gapBefore === 0 || gapAfter === 0) return false; // perfectly snapped

    const isTennis = sportType === 'TENNIS'
    // Assume left edge is somewhat permissive if we don't have blockStart precisely tracked to grid opening time
    // For UI simplicity, if the gapBefore is very large, it means it's touching the start of the day grid
    const isLeftEdge = gapBefore >= 10 * 60; // Just a rough UI proxy, backend has the precise logic.
    
    if (isTennis) {
        if (isLeftEdge && gapBefore === 30 && isValidationOnly) {
           // allow UI left edge test for tennis
        } else if (gapBefore > 0 && gapBefore < 90) {
            return true;
        }
        if (gapAfter > 0 && gapAfter < 90) {
            return true;
        }
        return false;
    }

    // Logic aligned with Backend (BookingService.java):
    // REJECT ONLY IF:
    // 1. Fragmented in the middle (30m on BOTH sides)
    if (gapBefore === 30 && gapAfter === 30) return true

    // 2. Fragmented on one side and NOT snapped to the other (Force snapping)
    // If there's a 30m gap on one side and >= 60m on the other, it should have been snapped.
    if (gapBefore === 30 && gapAfter >= 60 && !isLeftEdge) return true
    if (gapAfter === 30 && gapBefore >= 60) return true

    // ALLOW ALL OTHER CASES:
    // - Snapped to either side (gapBefore == 0 or gapAfter == 0)
    // - Large gaps on both sides (gapBefore >= 60 and gapAfter >= 60)
    
    return false
  }

  // Past time disabling
  const todayStr = todayISO()
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

  // Auto-scroll to first clickable interval
  useEffect(() => {
    if (!data.length) return
    const findFirstClickableIndex = () => {
      for (let i = 0; i < ticks.length - 1; i++) {
        const t = ticks[i]
        const next = ticks[i+1]
        const isPast = (date < todayStr) || (date === todayStr && t < nowTime)
        if (isPast) continue
        for (const row of sortedData) {
          const closeTime = row.court.closeTime === '23:59' ? '24:00' : row.court.closeTime
          const isWithin = t >= row.court.openTime && next <= closeTime
          if (!isWithin) continue
          const isBooked = row.booked.some(b => !(b.end <= t || b.start >= next))
          if (!isBooked) return i
        }
      }
      return null
    }
    const idx = findFirstClickableIndex()
    if (idx !== null) {
      if (idx <= 1) return
      if (!isMobile) {
        // Desktop: scroll horizontally to the first available slot
        const targetLeft = Math.max(0, idx * colWidth - colWidth * 2)
        if (scrollRef.current) {
          animateScrollX(scrollRef.current, targetLeft, 600, (left) => {
            if (headerRef.current) headerRef.current.scrollLeft = left
          })
        }
      } else if (isMobile) {
        // Mobile: vertical scroll to align the first free row at the top
        const container = mobileBodyRef.current
        if (!container) return
        const targetIndex = Math.max(0, idx - 1)
        const rowEl = container.querySelector(`[data-row-index="${targetIndex}"]`) as HTMLElement | null
        if (rowEl) {
          const top = Math.max(0, rowEl.offsetTop)
          animateScrollY(container, top, 600)
        }
      }
    } else {
      if (!isMobile) {
        const maxLeft = scrollRef.current ? scrollRef.current.scrollWidth - scrollRef.current.clientWidth : 0
        if (scrollRef.current) {
          animateScrollX(scrollRef.current, Math.max(0, maxLeft), 600, (left) => {
            if (headerRef.current) headerRef.current.scrollLeft = left
          })
        }
      } else if (isMobile) {
        const container = mobileBodyRef.current
        if (container) {
          const maxTop = container.scrollHeight - container.clientHeight
          animateScrollY(container, Math.max(0, maxTop), 600)
        }
      }
    }
  }, [date, sportLabel(data[0]?.court.sportType || ''), ticks.length, isMobile]) // Stabilized dependencies

  // Reinforce auto-scroll shortly after layout settles
  useEffect(() => {
    if (!data.length) return
    const findFirstClickableIndex = () => {
      for (let i = 0; i < ticks.length - 1; i++) {
        const t = ticks[i]
        const next = ticks[i+1]
        const isPast = (date < todayStr) || (date === todayStr && t < nowTime)
        if (isPast) continue
        for (const row of sortedData) {
          const closeTime = row.court.closeTime === '23:59' ? '24:00' : row.court.closeTime
          const isWithin = t >= row.court.openTime && next <= closeTime
          if (!isWithin) continue
          const isBooked = row.booked.some(b => !(b.end <= t || b.start >= next))
          if (!isBooked) return i
        }
      }
      return null
    }
    const idx = findFirstClickableIndex()
    const timer = setTimeout(() => {
      if (idx !== null) {
        if (idx <= 1) return
        if (!isMobile) {
          const targetLeft = Math.max(0, idx * colWidth - colWidth * 2)
          if (scrollRef.current) {
            animateScrollX(scrollRef.current, targetLeft, 600, (left) => {
              if (headerRef.current) headerRef.current.scrollLeft = left
            })
          }
        } else if (isMobile) {
          const container = mobileBodyRef.current
          const targetIndex = Math.max(0, idx - 1)
          const rowEl = container?.querySelector(`[data-row-index="${targetIndex}"]`) as HTMLElement | null
          if (container && rowEl) {
            const top = Math.max(0, rowEl.offsetTop)
            animateScrollY(container, top, 600)
          }
        }
      } else {
        if (!isMobile) {
          const maxLeft = scrollRef.current ? scrollRef.current.scrollWidth - scrollRef.current.clientWidth : 0
          if (scrollRef.current) {
            animateScrollX(scrollRef.current, Math.max(0, maxLeft), 600, (left) => {
              if (headerRef.current) headerRef.current.scrollLeft = left
            })
          }
        } else if (isMobile) {
          const container = mobileBodyRef.current
          if (container) {
            const maxTop = container.scrollHeight - container.clientHeight
            animateScrollY(container, Math.max(0, maxTop), 600)
          }
        }
      }
    }, 80)
    return () => clearTimeout(timer)
  }, [date, sportLabel(data[0]?.court.sportType || ''), isMobile, colWidth]) // Stabilized dependencies

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
              {sortedData.map((row) => (
                <div key={`name-${row.court.id}`} className="border-t border-slate-300 px-2 py-0.5 text-sm h-[56px] flex flex-col items-start justify-center bg-white">
                  <div className="font-bold text-slate-800 text-xs leading-snug">{sportLabel(row.court.sportType)} {row.court.name}</div>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${row.court.indoor ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
                      {row.court.indoor ? 'Indoor' : 'Exterior'}
                    </span>
                    {row.court.indoor && row.court.sportType !== 'TENNIS' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white shadow-sm ring-1 ring-rose-600/20">
                        Star Arena 2
                      </span>
                    )}
                    {row.court.heated && !row.court.indoor && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">Încălzit</span>}
                  </div>
                </div>
              ))}
            </div>
            <div ref={scrollRef} className="overflow-x-auto flex-1" onScroll={() => { if (headerRef.current && scrollRef.current) headerRef.current.scrollLeft = scrollRef.current.scrollLeft }}>
              <div className="relative">
                {/* Past time overlay - single element at grid level for aligned stripes */}
                {(() => {
                  const pastCount = ticks.slice(0, -1).filter(t => (date < todayStr) || (date === todayStr && t < nowTime)).length
                  if (pastCount <= 0) return null
                  const totalCols = ticks.length - 1
                  const pastWidth = pastCount * colWidth
                  return (
                    <div
                      className="absolute top-0 left-0 bottom-0 pointer-events-none z-20"
                      style={{
                        width: pastWidth,
                        backgroundImage: 'repeating-linear-gradient(45deg, rgba(148,163,184,0.3) 0, rgba(148,163,184,0.3) 8px, transparent 8px, transparent 16px)',
                      }}
                    />
                  )
                })()}
                {sortedData.map((row, rowIndex) => {
                  const booked = row.booked.map(b => ({ start: b.start, end: b.end, status: b.status }))
                  const blocks = SHOW_BOOKING_LABELS ? computeBookingBlocks(row.booked as any, tickIndex) : []
                  return (
                    <div key={row.court.id} className="relative h-[56px]">
                      <div className="grid h-full items-stretch" style={{ gridTemplateColumns: `repeat(${ticks.length-1}, ${colWidth}px)` }}>
                        {ticks.slice(0,-1).map((t, i) => {
                          const next = ticks[i+1]
                          const isBooked = booked.some(b => !(b.end <= t || b.start >= next))
                          const isPast = (date < todayStr) || (date === todayStr && t < nowTime)
                          const selected = selCourtId === row.court.id && isSelectedSlot(t, next)
                          const clickable = !isBooked && !isPast
                          
                          let stateClass = ''
                          const isBlocked = booked.some(b => !(b.end <= t || b.start >= next) && b.status === 'BLOCKED')
                          const isPending = booked.some(b => !(b.end <= t || b.start >= next) && b.status === 'PENDING_APPROVAL')
                          const unavailable = isPast || isBooked || isBlocked || isPending
                          if (selected && !unavailable) stateClass = 'bg-emerald-300'
                          else if (isBlocked) stateClass = 'bg-slate-200'
                          else if (isPending) stateClass = 'bg-amber-200 animate-pulse'
                          else if (isBooked) stateClass = 'bg-rose-200'
                          else if (isPast) stateClass = 'bg-slate-100'
                          else stateClass = 'bg-emerald-50 hover:bg-emerald-100'
                          
                          const disabledClass = unavailable ? 'cursor-not-allowed' : 'cursor-pointer'

                          return (
                            <div
                              key={`${row.court.id}-${t}`}
                              className={`h-full border-t border-l border-slate-200/60 ${stateClass} ${disabledClass} ${onAdminClick && isBooked ? 'ring-inset hover:ring-2 hover:ring-rose-400' : ''}`}
                              onMouseEnter={() => onHover?.(`${row.court.name} • ${t} - ${next} • ${isBooked ? 'OCUPAT' : (isPast ? 'INDISPONIBIL' : 'LIBER')}`)}
                              onClick={(e) => {
                                if (onAdminClick && isBooked) {
                                  const b = booked.find(br => !(br.end <= t || br.start >= next))
                                  onAdminClick(row.court.id, t, next, b)
                                  return
                                }
                                if (!clickable) return
                                if (selCourtId && selStart && selEnd) {
                                  setSelCourtId(null); setSelStart(null); setSelEnd(null)
                                  onSelectionChange?.(null, null, null, false, false)
                                }
                                const end60 = ticks[i+2]
                                if (end60) {
                                  const within = t >= row.court.openTime && end60 <= row.court.closeTime
                                  const slot2Booked = booked.some(b => !(b.end <= ticks[i+1] || b.start >= end60))
                                  const slot2Past = (date < todayStr) || (date === todayStr && ticks[i+1] < nowTime)
                                  const free60 = within && !isBooked && !slot2Booked && !isPast && !slot2Past
                                  if (free60) {
                                    const simpleBooked = booked.map(b => ({ start: b.start, end: b.end }))
                                    const gapInvalid = leavesThirtyMinuteGap(simpleBooked, t, end60, row.court.sportType)
                                    if (gapInvalid) { onSelectionChange?.(null, null, null, false, true); return }
                                  }
                                }
                                popupRowIndexRef.current = rowIndex
                                handleCellClick(row.court.id, t, next, isBooked, true, (booked as any))
                                const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                                setPopup({ courtId: row.court.id, rowIndex, startIndex: i, left: rect.left + window.scrollX, top: rect.bottom + window.scrollY })
                              }}
                              title={`${row.court.name} • ${t} - ${next}`}
                            />
                          )
                        })}
                      </div>
                      {SHOW_BOOKING_LABELS && blocks.length > 0 && (
                        <div className="absolute inset-0 pointer-events-none">
                          {blocks.map((block, blockIndex) => (
                            <BookingLabelBlock
                              key={`${row.court.id}-${block.startIndex}-${block.endIndex}-${blockIndex}`}
                              className={`absolute inset-y-0 flex items-center rounded-sm ${block.status === 'BLOCKED' ? 'bg-slate-700/80 shadow-inner' : block.status === 'PENDING_APPROVAL' ? 'bg-amber-500/40 border border-amber-600/30' : 'bg-rose-500/20'}`}
                              style={{
                                width: (block.endIndex - block.startIndex) * colWidth - 2,
                                left: block.startIndex * colWidth + 1,
                              }}
                              label={block.status === 'PENDING_APPROVAL' ? `⏳ ${block.label}` : block.label}
                              timeRange={block.timeRange}
                              isBlocked={block.status === 'BLOCKED'}
                              playerMatchesCount={block.playerMatchesCount}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Mobile layout (transposed): rows = times, columns = courts
  function renderMobile() {
    const sortedDataList = sortedData
    const courtCount = sortedDataList.length
    const timeColWidth = 56
    const minCourtWidth = 85 // Prevent squashing
    const rowHeight = 44
    const pastRows = (date < todayStr)
      ? (ticks.length - 1)
      : (date === todayStr ? ticks.slice(0, -1).filter(t => t < nowTime).length : 0)
    const blocksByCourt = SHOW_BOOKING_LABELS
      ? sortedDataList.map(row => computeBookingBlocks(row.booked as any, tickIndex))
      : []

    return (
      <div className={`${flat ? '' : 'rounded border border-sky-200 bg-sky-50 shadow-md'} h-full min-h-0 flex flex-col overflow-hidden`}>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" ref={mobileBodyRef}>
          <div style={{ minWidth: timeColWidth + courtCount * minCourtWidth }}>
            {/* Header: corner cell + court names */}
            <div className="grid sticky top-0 z-40 bg-white border-b border-slate-300" 
                 style={{ gridTemplateColumns: `${timeColWidth}px repeat(${courtCount}, 1fr)` }}>
              <div className="sticky left-0 z-50 px-2 py-3 text-[10px] font-black bg-white text-slate-400 uppercase tracking-tighter border-r border-slate-200">
                Ora
              </div>
              {sortedData.map(row => (
                <div key={`head-${row.court.id}`} 
                     className="px-1 py-1.5 text-[10px] font-bold bg-white border-l border-slate-200 text-center leading-tight flex flex-col items-center justify-center gap-0.5"
                     style={{ minWidth: minCourtWidth }}>
                  <span className="text-slate-950 truncate w-full px-0.5">{row.court.name}</span>
                  <div className="flex flex-col gap-0.5">
                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full leading-none uppercase ${row.court.indoor ? 'bg-amber-100 text-amber-600' : 'bg-sky-100 text-sky-600'}`}>
                      {row.court.indoor ? 'INDOOR' : 'OUTDOOR'}
                    </span>
                    {row.court.indoor && row.court.sportType !== 'TENNIS' && (
                      <span className="text-[7px] font-black px-1.5 py-0.5 rounded-full leading-none uppercase bg-rose-500 text-white shadow-sm">
                        ARENA 2
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Body: each row is a time slot */}
            <div className="relative">
              {pastRows > 0 && (
                <div
                  className="absolute z-20"
                  style={{
                    top: 0,
                    left: timeColWidth,
                    right: 0,
                    height: Math.max(0, pastRows * rowHeight - 1),
                    backgroundImage: 'repeating-linear-gradient(45deg, rgba(148,163,184,0.3) 0, rgba(148,163,184,0.3) 12px, rgba(255,255,255,0) 12px, rgba(255,255,255,0) 24px)',
                    pointerEvents: 'none',
                  }}
                />
              )}

              {SHOW_BOOKING_LABELS && (
                <div
                  className="absolute inset-0 pointer-events-none z-10 grid"
                  style={{
                    gridTemplateColumns: `${timeColWidth}px repeat(${courtCount}, 1fr)`,
                    gridTemplateRows: `repeat(${ticks.length-1}, ${rowHeight}px)`,
                  }}
                >
                  {sortedData.map((row, colIndex) => (
                    <React.Fragment key={`label-col-${row.court.id}`}> 
                      {blocksByCourt[colIndex].map((block, blockIndex) => (
                        <BookingLabelBlock
                          key={`${row.court.id}-${block.startIndex}-${block.endIndex}-${blockIndex}`}
                          className="bg-rose-500/20 rounded-sm"
                          style={{
                            gridColumn: colIndex + 2,
                            gridRow: `${block.startIndex + 1} / ${block.endIndex + 1}`,
                          }}
                          label={block.label}
                          timeRange={block.timeRange}
                          playerMatchesCount={block.playerMatchesCount}
                        />
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              )}

              {ticks.slice(0,-1).map((t, i) => {
                const next = ticks[i+1]
                const isPastRow = (date < todayStr) || (date === todayStr && t < nowTime)
                return (
                  <div key={`time-${t}`} className="relative z-0 grid items-stretch" 
                       style={{ gridTemplateColumns: `${timeColWidth}px repeat(${courtCount}, 1fr)`, height: rowHeight }} 
                       data-row-index={i}>
                    {/* Time label (Sticky) */}
                    <div className="sticky left-0 z-30 px-2 py-2 text-[11px] font-bold border-t border-slate-200 bg-slate-50 text-slate-600 flex items-center border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                      {timeLabel(t)}
                    </div>
                    {/* Cells per court */}
                    {sortedData.map((row, rowIndex) => {
                      const bookedRanges = row.booked.map(b => ({ start: b.start, end: b.end, status: b.status }))
                      const isBooked = bookedRanges.some(b => !(b.end <= t || b.start >= next))
                      const isBlocked = bookedRanges.some(b => !(b.end <= t || b.start >= next) && b.status === 'BLOCKED')
                      const isPending = bookedRanges.some(b => !(b.end <= t || b.start >= next) && b.status === 'PENDING_APPROVAL')
                      const selected = selCourtId === row.court.id && isSelectedSlot(t, next)
                      const unavailable = isPastRow || isBooked || isBlocked || isPending
                      const clickable = !unavailable
                      let stateClass = ''
                      if (selected && !unavailable) stateClass = 'bg-emerald-300'
                      else if (isBlocked) stateClass = 'bg-slate-200'
                      else if (isPending) stateClass = 'bg-amber-100 animate-pulse'
                      else if (isBooked) stateClass = 'bg-rose-200'
                      else if (isPastRow) stateClass = 'bg-slate-100'
                      else stateClass = 'bg-emerald-50 hover:bg-emerald-100 transition-colors'
                      const disabledClass = unavailable && !onAdminClick ? 'cursor-not-allowed pointer-events-none' : (unavailable ? 'cursor-not-allowed' : 'cursor-pointer')
                      return (
                        <div
                          key={`cell-${row.court.id}-${t}`}
                          className={`border-t border-l border-slate-200 ${stateClass} ${disabledClass}`}
                          style={{ minWidth: minCourtWidth }}
                          onMouseEnter={() => onHover?.(`${row.court.name} • ${t} - ${next} • ${isBlocked ? 'INDISPONIBIL' : isBooked ? 'REZERVAT' : 'LIBER'}`)}
                          onClick={(e) => {
                            if (onAdminClick && isBooked) {
                              const b = bookedRanges.find(br => !(br.end <= t || br.start >= next))
                              onAdminClick(row.court.id, t, next, b)
                              return
                            }
                            if (!clickable) return
                            if (selCourtId && selStart && selEnd) {
                              setSelCourtId(null); setSelStart(null); setSelEnd(null)
                              onSelectionChange?.(null, null, null, false, false)
                            }
                            const end60 = ticks[i+2]
                            if (end60) {
                              const within = t >= row.court.openTime && end60 <= row.court.closeTime
                              const slot2Booked = bookedRanges.some(b => !(b.end <= ticks[i+1] || b.start >= end60))
                              const slot2Past = (date < todayStr) || (date === todayStr && ticks[i+1] < nowTime)
                              const free60 = within && !isBooked && !isPastRow && !slot2Past && !slot2Booked
                              if (free60) {
                                const gapInvalid = leavesThirtyMinuteGap(bookedRanges, t, end60, row.court.sportType)
                                if (gapInvalid) { onSelectionChange?.(null, null, null, false, true); return }
                              }
                            }
                            popupRowIndexRef.current = rowIndex
                            handleCellClick(row.court.id, t, next, isBooked, true, bookedRanges)
                            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
                            setPopup({ courtId: row.court.id, rowIndex, startIndex: i, left: rect.left + window.scrollX, top: rect.bottom + window.scrollY })
                          }}
                        />
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  function renderPopup() {
    if (!popup || typeof document === 'undefined') return null
    const { courtId, rowIndex, startIndex } = popup // ignore left/top; centered via CSS
    const row = sortedData[rowIndex]  // FIX: was data[rowIndex] - must use sortedData to match displayed order
    if (!row || !ticks[startIndex]) return null
    const booked = row.booked.map(b => ({ start: b.start, end: b.end }))
    const startTime = ticks[startIndex]
    const selectedIntervalText = (selCourtId === courtId && selStart === startTime && selEnd)
      ? `${selStart} - ${selEnd}`
      : '—'
    const selectionValid = !!(selCourtId === courtId && selStart && selEnd && minutesBetween(selStart, selEnd) >= 60 && !leavesThirtyMinuteGap(booked, selStart, selEnd, row.court.sportType))
    const options = [60, 90, 120]
    function isRangeFree(mins: number) {
      const slots = mins / 30
      // Check closing time logic first
      const closeTime = row.court.closeTime === '23:59' ? '24:00' : (row.court.closeTime || '24:00')
      for (let i = 0; i < slots; i++) {
        const t = ticks[startIndex + i]
        const next = ticks[startIndex + i + 1]
        // If range crosses midnight conceptually, or extends beyond closing time
        if (!t || !next || next > closeTime) return false
        const isPast = (date < todayStr) || (date === todayStr && t < nowTime)
        const isBooked = booked.some(b => !(b.end <= t || b.start >= next))
        if (isPast || isBooked) return false
      }
      
      // Additional gap validation to make it consistent with the backend rules
      let endTimeRaw = ticks[startIndex + slots]
      if (endTimeRaw) {
         if (leavesThirtyMinuteGap(booked, startTime, endTimeRaw, row.court.sportType, true, startTime)) {
             return false;
         }
      }

      return true
    }
    function priceFor(mins: number) {
      // calculateGranularPrice imported at top
      const slots = mins / 30
      const endTimeRaw = ticks[startIndex + slots]
      
      let endTime = endTimeRaw
      if (!endTime) {
        const [sh, sm] = startTime.split(':').map(Number)
        const startMin = sh*60 + sm
        const endMin = (startMin + mins) % (24*60)
        const eh = Math.floor(endMin/60).toString().padStart(2,'0')
        const em = (endMin%60).toString().padStart(2,'0')
        endTime = `${eh}:${em}`
      }

      const total = calculateGranularPrice(row.court.sportType, row.court.indoor, startTime, endTime, date)
      return `lei ${total.toFixed(2)}`
    }
    function choose(mins: number) {
      const slots = mins / 30
      let endTime = ticks[startIndex + slots]
      if (!endTime) {
        const [sh, sm] = startTime.split(':').map(Number)
        const startMin = sh*60 + sm
        const endMin = (startMin + mins) % (24*60)
        const eh = Math.floor(endMin/60).toString().padStart(2,'0')
        const em = (endMin%60).toString().padStart(2,'0')
        endTime = `${eh}:${em}`
      }
      setSelCourtId(courtId)
      setSelStart(startTime)
      setSelEnd(endTime)
      const gapInvalid = leavesThirtyMinuteGap(booked, startTime, endTime, row.court.sportType)
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
          onClick={() => {
            setPopup(null)
            setSelCourtId(null)
            setSelStart(null)
            setSelEnd(null)
            onSelectionChange?.(null, null, null, false, false)
          }}
        />
        <div
          className="fixed z-[10000] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm flex flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl shadow-black/20 ring-1 ring-slate-900/5 transition-all p-1"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-slate-50/50 backdrop-blur-md px-6 py-6 border-b border-slate-100 flex flex-col gap-1">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">{row.court.name}</h3>
                <p className="text-sm font-medium text-slate-500">{sportLabel(row.court.sportType)} • {row.court.indoor ? 'Indoor' : 'Outdoor'}</p>
              </div>
              <button 
                onClick={() => { setPopup(null); setSelCourtId(null); setSelStart(null); setSelEnd(null); onSelectionChange?.(null, null, null, false, false) }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200/50 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="p-4 flex flex-col gap-3">
             {!player && !onAdminClick && (
               <div className="bg-lime-50 rounded-2xl p-4 border border-lime-100 text-[13px] font-medium text-lime-900 leading-relaxed shadow-sm">
                 💡 Ai deja un cont? 
                 <a href="/cont" className="text-lime-700 underline font-black mx-1 hover:text-lime-600 transition-colors">Loghează-te</a> 
                 pentru a rezerva mai rapid și pentru a-ți urmări progresul în Rank-ul STAR ARENA!
               </div>
             )}

             <div className="bg-emerald-50 text-emerald-700 px-3 py-3 rounded-2xl flex items-center justify-between gap-2 border border-emerald-100/50 mb-1">
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider opacity-70 leading-tight shrink">
                  {selEnd ? 'Interval selectat' : 'Începere la ora'}
                </span>
                <span className="font-black text-base md:text-lg whitespace-nowrap shrink-0 text-right">
                  {selEnd ? `${startTime} - ${selEnd}` : startTime}
                </span>
             </div>

             {reserveWarnVisible && (
                <div className={'mx-1 px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium animate-pulse transition-opacity ' + (reserveWarnFading ? 'opacity-0' : 'opacity-100')}>
                  Vă rugăm selectați durata dorită mai jos!
                </div>
             )}

             <div className="space-y-2.5">
                {options.map((mins) => {
                  const ok = isRangeFree(mins)
                  const isSelectedCurrent = selEnd && (timeToMinutes(selEnd) - timeToMinutes(startTime) === mins)
                  const label = mins === 60 ? '1 oră' : mins === 90 ? '1h 30m' : '2 ore'
                  
                  return (
                    <button 
                      key={mins} 
                      disabled={!ok} 
                      onClick={() => choose(mins)} 
                      className={`group relative flex w-full items-center justify-between rounded-3xl border-2 px-5 py-4 transition-all duration-300 ${
                        isSelectedCurrent 
                          ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-[0.98]' 
                          : ok 
                            ? 'border-slate-100 bg-slate-50/50 hover:border-emerald-200 hover:bg-emerald-50/30 text-slate-700 active:scale-[0.99]' 
                            : 'border-slate-50 bg-slate-50/30 text-slate-300 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelectedCurrent ? 'border-white bg-white/20' : 'border-slate-200 bg-white'}`}>
                          {isSelectedCurrent && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                        </div>
                        <span className="font-bold text-lg">{label}</span>
                      </div>
                      <span className={`font-black tracking-tight ${isSelectedCurrent ? 'text-white' : 'text-slate-900 opacity-80'}`}>{priceFor(mins)}</span>
                    </button>
                  )
                })}
             </div>

             <div className="mt-4 pt-2 flex flex-col gap-3">
                <button 
                  onClick={handleReserveClick}
                  className={`w-full py-5 rounded-[2rem] font-black text-xl tracking-tight transition-all shadow-xl active:scale-95 ${
                    selectionValid 
                      ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/30' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Confirmă Rezervarea
                </button>
                <div className="text-center">
                   <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Prețul include TVA</p>
                </div>
             </div>
          </div>
        </div>
      </>
    ), document.body)
  }

  return (
    <div className="h-full min-h-0">
      {isMobile ? renderMobile() : renderDesktop()}
      {renderPopup()}
    </div>
  )
}

