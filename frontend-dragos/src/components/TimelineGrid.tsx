import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AvailabilityDto, calculateGranularPrice, sportLabel } from '../types'
import { useTheme } from '../ThemeContext'

// Brand accent RGB triples, reused at varying alpha across the grid and the
// reservation popup — named once so every accent (lime "free/selected", rose
// "warning/conflict", amber "pick a duration") has a single source instead of
// the same digits retyped at each opacity.
const LIME_RGB = '163,230,53'       // dark-theme lime accent; also used theme-invariantly in the popup
const LIME_LIGHT_RGB = '132,204,22' // light-theme lime accent (grid free/selected only)
const ROSE_RGB = '244,63,94'        // popup warning/conflict accent
const AMBER_RGB = '245,158,11'      // popup "pick a duration" nudge accent
const rgba = (rgb: string, a: number) => `rgba(${rgb},${a})`

// Theme-invariant popup accents: unlike GRID_TOKENS/POPUP_TOKENS below, these
// stay the same lime/rose in both light and dark mode.
const LIME = '#a3e635'
const LIME_TEXT = '#1a2e05'
const LIME_TEXT_RGB = '26,46,5'
const LIME_LINK = '#84cc16'
const ROSE = '#f43f5e'
const AMBER = '#f59e0b'

const GRID_TOKENS = {
  dark: {
    free: { background: rgba(LIME_RGB, 0.18), borderTop: `1px solid ${rgba(LIME_RGB, 0.35)}` },
    selected: { background: LIME, color: LIME_TEXT, boxShadow: `0 4px 18px ${rgba(LIME_RGB, 0.35)}` },
    booked: { background: '#5c1a2e', border: '1px solid rgba(190,18,60,0.6)', name: '#ffe4e6', time: 'rgba(255,228,230,0.75)' },
    pending: { background: '#78350f', border: '1px solid rgba(251,191,36,0.65)', text: '#fef3c7', time: 'rgba(254,243,199,0.8)' },
    timeCol: { background: '#0b1120', color: '#cbd5e1' },
    headerCell: { background: '#0b1120', borderBottom: '1px solid #334155' },
    outdoor: { background: 'rgba(56,189,248,0.18)', color: '#7dd3fc' },
    indoor: { background: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
    cellBorder: '#334155',
    hatchLine: '#334155',
    courtName: '#ffffff',
    unavailableBg: '#0f172a',
  },
  light: {
    free: { background: rgba(LIME_LIGHT_RGB, 0.18), borderTop: '1px solid rgba(101,163,13,0.45)' },
    selected: { background: '#84cc16', color: '#0f172a', boxShadow: `0 4px 18px ${rgba(LIME_LIGHT_RGB, 0.3)}` },
    booked: { background: '#fecdd3', border: '1px solid rgba(225,29,72,0.65)', name: '#9f1239', time: 'rgba(159,18,57,0.8)' },
    pending: { background: '#fde68a', border: '1px solid rgba(217,119,6,0.65)', text: '#92400e', time: 'rgba(146,64,14,0.85)' },
    timeCol: { background: '#f8fafc', color: '#475569' },
    headerCell: { background: '#ffffff', borderBottom: '1px solid #cbd5e1' },
    outdoor: { background: '#bae6fd', color: '#0369a1' },
    indoor: { background: '#fde68a', color: '#92400e' },
    cellBorder: '#cbd5e1',
    hatchLine: '#94a3b8',
    courtName: '#0f172a',
    unavailableBg: '#f1f5f9',
  },
}

// Reservation-confirmation popup: same theme-branch shape as GRID_TOKENS, but
// for the booking dialog rather than grid cells — no keys overlap with cell
// states, so it's kept as its own table instead of being merged into one.
const POPUP_TOKENS = {
  dark: {
    modalBg: '#0f172a', modalBorder: '#1e293b',
    headerBg: '#0b1120', headerBorder: '#1e293b',
    title: '#f8fafc', subtle: '#94a3b8', closeBg: '#1e293b',
    loginText: '#e2e8f0', intervalText: '#a3e635', errorText: '#fecdd3',
    suggestionBg: 'rgba(255,255,255,0.05)',
    reselectBg: '#1e293b',
    optionBorder: '#1e293b', optionBg: '#0b1120', optionColor: '#e2e8f0',
    optionDisabledBg: 'rgba(11,17,32,0.5)', optionDisabledColor: '#475569',
    radioBorder: '#334155', radioBg: '#0f172a',
    confirmDisabledBg: '#1e293b', confirmDisabledColor: '#475569',
  },
  light: {
    modalBg: '#ffffff', modalBorder: '#e2e8f0',
    headerBg: 'rgba(248,250,252,0.5)', headerBorder: '#f1f5f9',
    title: '#0f172a', subtle: '#64748b', closeBg: 'rgba(226,232,240,0.5)',
    loginText: '#365314', intervalText: '#4d7c0f', errorText: '#9f1239',
    suggestionBg: 'rgba(255,255,255,0.6)',
    reselectBg: '#ffffff',
    optionBorder: '#f1f5f9', optionBg: '#f8fafc', optionColor: '#334155',
    optionDisabledBg: 'rgba(248,250,252,0.5)', optionDisabledColor: '#cbd5e1',
    radioBorder: '#e2e8f0', radioBg: '#ffffff',
    confirmDisabledBg: '#e2e8f0', confirmDisabledColor: '#94a3b8',
  },
}

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

// Normalized court close time, or null when the court runs non-stop (23:59 = no limit).
function courtCloseLimitOf(closeTime?: string) {
  const normalizedClose = (closeTime || '23:59').substring(0, 5)
  return normalizedClose === '23:59' ? null : normalizedClose
}

// Normalized court open time, or null when the court runs non-stop (00:00 = no limit).
function courtOpenLimitOf(openTime?: string) {
  const normalizedOpen = (openTime || '00:00').substring(0, 5)
  return normalizedOpen === '00:00' ? null : normalizedOpen
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
  onSelectionChange?: (courtId: number | null, start: string | null, end: string | null, valid: boolean, gapInvalid?: boolean | string) => void
  onReserve?: (courtId?: number, start?: string, end?: string) => void
  clearSignal?: number
  flat?: boolean
  onAdminClick?: (courtId: number, startTime: string, endTime: string, booking?: any) => void
  player?: any // ADDED: to know if user is logged in
  isAdmin?: boolean
  // Meciuri deschise: click pe un bloc „Caută jucători" din grilă
  onOpenMatchClick?: (info: { matchId: number; spotsLeft: number; takeover: boolean; courtId: number; start: string; end: string }) => void
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
  // Meci deschis: blocul devine clickabil și se afișează distinct
  openMatchId?: number
  openMatchSpotsLeft?: number
  openMatchTakeover?: boolean
  rawStart?: string
  rawEnd?: string
}


function computeBookingBlocks(booked: { start: string, end: string, customerName?: string, status?: string, note?: string, openMatchId?: number, openMatchSpotsLeft?: number, openMatchTakeover?: boolean }[], tickIndex: Map<string, number>, isAdmin?: boolean): BookingBlock[] {
  const blocks: BookingBlock[] = []
  const maxIdx = tickIndex.get('24:00') || 48
  const minIdx = tickIndex.get('00:00') || 0

  for (const b of booked) {
    const normalizedEnd = (b.end === '23:59' || b.end === '24:00') ? '24:00' : b.end
    const startIndex = tickIndex.get(b.start)
    let endIndex = tickIndex.get(normalizedEnd)

    if (startIndex === undefined || endIndex === undefined) continue

    const isBlocked = b.status === 'BLOCKED'
    const isOpenMatch = b.openMatchId != null && (b.openMatchSpotsLeft ?? 0) > 0
    const label = isOpenMatch
      ? `🔎 Căutăm ${b.openMatchSpotsLeft} ${b.openMatchSpotsLeft === 1 ? 'jucător' : 'jucători'}`
      : (isAdmin || isBlocked) && b.customerName ? b.customerName : getDisplayName(b as any)

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
        openMatchId: isOpenMatch ? b.openMatchId : undefined,
        openMatchSpotsLeft: isOpenMatch ? b.openMatchSpotsLeft : undefined,
        openMatchTakeover: isOpenMatch ? !!b.openMatchTakeover : undefined,
        rawStart: b.start,
        rawEnd: b.end,
      })
    }
  }
  blocks.sort((a, b) => a.startIndex - b.startIndex)
  return blocks
}

// Vector hourglass used for pending-approval blocks instead of the ⏳ emoji —
// color-emoji glyphs get rotated (via CSS transform, to align with the
// vertical text next to them) inconsistently across platforms/browsers,
// often rasterizing into a blurry or wrong-glyph mess in production. A plain
// currentColor SVG rotates cleanly everywhere and always matches the block's
// own text color.
function HourglassIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 2h12v2.2c0 3.4-2.4 5.6-4.5 6.8 2.1 1.2 4.5 3.4 4.5 6.8V20H6v-2.2c0-3.4 2.4-5.6 4.5-6.8C8.4 9.8 6 7.6 6 4.2V2z" />
    </svg>
  )
}

function BookingLabelBlock({
  label,
  icon,
  timeRange,
  className,
  style,
  vertical,
  isBlocked,
  playerMatchesCount,
  onClick,
  timeColor,
  fillColor,
  pastRanges,
  compact,
}: {
  label: string
  // Optional leading icon (e.g. the pending-approval hourglass), rendered as
  // its own rotated element instead of being embedded in the label string —
  // plain glyphs don't get auto-rotated by text-orientation:mixed the way
  // Latin text does, so inlining one into the vertical text left it sitting
  // upright and misaligned against the rotated name/time columns next to it.
  icon?: React.ReactNode
  timeRange?: string
  className?: string
  style?: React.CSSProperties
  vertical?: boolean
  isBlocked?: boolean
  playerMatchesCount?: number
  onClick?: () => void
  timeColor?: string
  // The block's own flat color, painted as internal fill layer(s) instead of
  // as the wrapper's `background` — so a past sub-range can be painted at
  // reduced opacity and let the shared grid stripe pattern (positioned behind
  // this block, covering its full cell incl. the rounding margin — see
  // unavailableRangesByCourt) show through, instead of this block drawing its
  // own separate repeating-gradient with its own phase.
  fillColor?: string
  // Sub-ranges (as % of this block's own height) that fall in an "unavailable"
  // window (e.g. already past) — the complement is painted at full opacity,
  // these are painted at reduced opacity over the shared stripe layer.
  pastRanges?: { topPct: number; heightPct: number }[]
  // Single 30-min-slot blocks (~40px usable height once margins are removed)
  // can't fit the vertical name text plus a separate time-range line plus an
  // icon without truncating — so on these we drop the time line and shrink
  // the name, instead of letting all three fight over ~40px of height.
  compact?: boolean
}) {
  // For long blocks, we want the text to appear centered and truncated if necessary
  const displayText = label
  // Vertical writing (rotated 180° on top of vertical-rl) reads bottom-to-top,
  // which lets a much taller axis (the block's height, which grows with
  // booking duration) carry the text instead of the narrow, fixed column
  // width — this is what keeps long names/times from getting cropped on
  // narrow screens with many courts.
  const verticalTextStyle: React.CSSProperties = {
    writingMode: 'vertical-rl',
    transform: 'rotate(180deg)',
    textOrientation: 'mixed',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxHeight: '100%',
  }

  // Past sub-ranges are painted at reduced opacity so the shared grid stripe
  // layer (sitting behind this block, at the exact same real position) reads
  // through — the complement (still-future ranges, or the whole block when
  // nothing is past) is painted at full opacity. Both use the SAME fillColor,
  // so a fully-future block renders identically to before this overlay logic
  // existed. Clamped with a tiny epsilon so float rounding on the % math
  // can't leave a hairline unfilled sliver between adjacent segments.
  const past = (pastRanges || []).slice().sort((a, b) => a.topPct - b.topPct)
  const normalRanges: { topPct: number; heightPct: number }[] = []
  let cursor = 0
  past.forEach(seg => {
    if (seg.topPct > cursor + 0.01) normalRanges.push({ topPct: cursor, heightPct: seg.topPct - cursor })
    cursor = seg.topPct + seg.heightPct
  })
  if (cursor < 99.99) normalRanges.push({ topPct: cursor, heightPct: 100 - cursor })

  return (
    <div
      className={`${onClick ? 'pointer-events-auto cursor-pointer active:scale-[0.98] transition-transform' : 'pointer-events-none'} relative flex flex-col justify-center items-center overflow-hidden ${className || ""}`}
      style={style}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      title={timeRange ? `${label} • ${timeRange}` : label}
    >
      {fillColor && normalRanges.map((seg, idx) => (
        <div
          key={`fill-${idx}`}
          className="absolute left-0 right-0"
          style={{ top: `${seg.topPct}%`, height: `${seg.heightPct}%`, background: fillColor }}
        />
      ))}
      {fillColor && past.map((seg, idx) => (
        <div
          key={`past-${idx}`}
          className="absolute left-0 right-0"
          style={{ top: `${seg.topPct}%`, height: `${seg.heightPct}%`, background: fillColor, opacity: 0.3 }}
        />
      ))}
      <div className="relative z-[1] flex flex-row items-center justify-center gap-1 w-full h-full px-1">
        <div className="flex flex-col items-center gap-0.5">
          {icon && (
            // Anchored right below the name (self-end on the row's cross axis)
            // instead of spanning the whole block height — keeps it next to the
            // name it's flagging instead of drifting to the middle of a tall
            // (long-duration) booking block.
            <div className="self-end" style={{ transform: 'rotate(90deg)', lineHeight: 0 }}>
              {icon}
            </div>
          )}
          <div
            className="font-extrabold"
            style={{
              ...verticalTextStyle,
              fontSize: compact ? "9px" : isBlocked ? "11px" : "11px",
              lineHeight: 1.2,
              letterSpacing: '0.01em',
              color: 'inherit',
            }}
          >
            {displayText}
          </div>
        </div>
        {timeRange && !compact && (
          <div
            className="font-semibold"
            style={timeColor
              ? { ...verticalTextStyle, fontSize: "9px", lineHeight: 1.2, color: timeColor }
              : { ...verticalTextStyle, fontSize: "9px", lineHeight: 1.2, color: 'inherit', opacity: 0.75 }}
          >
            {timeRange}
          </div>
        )}
        {playerMatchesCount !== undefined && playerMatchesCount !== null && (
          <div className="scale-75 transform-gpu opacity-90">
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
      </div>
    </div>
  )
}

export default function TimelineGrid({
  data, date, onHover, onSelectionChange, onReserve, clearSignal, flat,
  onAdminClick,
  player,
  isAdmin,
  onOpenMatchClick
}: TimelineGridProps) {
  const { theme } = useTheme()
  const T = GRID_TOKENS[theme]
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
    return [...data].sort((a, b) => {
      // 1. Group by sport type
      if (a.court.sportType !== b.court.sportType) {
        return a.court.sportType.localeCompare(b.court.sportType);
      }

      // 2. Numerical order by court number (e.g. Teren 1 < Teren 2)
      const numA = parseInt(a.court.name.replace(/\D/g, '') || '0', 10);
      const numB = parseInt(b.court.name.replace(/\D/g, '') || '0', 10);
      if (numA !== numB) return numA - numB;

      return a.court.name.localeCompare(b.court.name);
    });
  }, [data]);

  // Selection state: court-bound contiguous 30-min slots
  const [selCourtId, setSelCourtId] = useState<number | null>(null)
  const [selStart, setSelStart] = useState<string | null>(null)
  const [selEnd, setSelEnd] = useState<string | null>(null)
  const [popup, setPopup] = useState<null | { courtId: number, rowIndex: number, startIndex: number, left: number, top: number }>(null)
  const [reserveWarnVisible, setReserveWarnVisible] = useState(false)
  const [reserveWarnFading, setReserveWarnFading] = useState(false)
  const reserveWarnHideTimer = useRef<any>(null)
  const reserveWarnFadeTimer = useRef<any>(null)

  // Forces a re-render every minute so slots that just crossed into the past
  // pick up the "unavailable/striped" styling live, without needing a reload
  // or an unrelated data refetch to happen to trigger it.
  const [, setMinuteTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setMinuteTick(t => t + 1), 30 * 1000)
    return () => clearInterval(id)
  }, [])

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
      onSelectionChange?.(courtId, selStart, newEnd, meets, gapInvalid)
      return
    }
    if (next === selStart) {
      const newStart = t
      setSelStart(newStart)
      const meets = minutesBetween(newStart, selEnd) >= 60
      const courtRow = data.find(r => r.court.id === courtId)
      if (!courtRow) return
      const gapInvalid = leavesThirtyMinuteGap(bookedRanges, newStart, selEnd, courtRow?.court.sportType)
      onSelectionChange?.(courtId, newStart, selEnd, meets, gapInvalid)
      return
    }
    // If clicked non-contiguous slot, start new selection at this slot
    setSelCourtId(courtId)
    setSelStart(t)
    setSelEnd(next)
    onSelectionChange?.(courtId, t, next, false, false)
  }

  function isSelectedSlot(t: string, next: string) {
    if (!selStart || !selEnd) return false
    const wraps = selStart > selEnd
    if (!wraps) return t >= selStart && next <= selEnd
    return t >= selStart
  }

  // Clienții pot lăsa orice interval liber doresc între rezervări — nu mai
  // impunem reguli de gol minim/maxim între selecție și meciurile vecine.
  function leavesThirtyMinuteGap(_booked: {start:string,end:string,status?:string}[], _selStart: string, _selEnd: string, _sportType?: string, _isValidationOnly: boolean = false, _clickStartCell?: string, _adminOverride: boolean = false): string | false {
    return false
  }

  // Past time disabling
  const todayStr = todayISO()
  const nowTime = new Date().toTimeString().slice(0,5) // HH:mm
  const isTickPast = (t: string) => (date < todayStr) || (date === todayStr && t < nowTime)

  const mobileBodyRef = useRef<HTMLDivElement>(null)
  const popupRowIndexRef = useRef<number>(0)

  // Custom smooth scroll helper (slower ~600ms)
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
  // Closes the popup AND clears the in-progress selection together — the popup
  // is just a UI surface for editing that selection, so leaving the selection
  // (and its "Selecția ta" highlight in the grid) behind after the popup goes
  // away would strand a highlighted block with no popup to explain it.
  function closePopup() {
    setPopup(null)
    setSelCourtId(null)
    setSelStart(null)
    setSelEnd(null)
    onSelectionChange?.(null, null, null, false, false)
  }

  // Close popup on date/data changes
  useEffect(() => {
    setPopup(null)
  }, [date, data.length])
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') closePopup() }
    function onResize() { closePopup() }
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
    closePopup()
  }, [clearSignal])

  // Shared: index of the first clickable (free, within hours, not past) slot across all courts
  function findFirstClickableIndex() {
    for (let i = 0; i < ticks.length - 1; i++) {
      const t = ticks[i]
      const next = ticks[i+1]
      const isPast = (date < todayStr) || (date === todayStr && t < nowTime)
      if (isPast) continue
      for (const row of sortedData) {
        const courtOpenLimit = courtOpenLimitOf(row.court.openTime)
        const courtCloseLimit = courtCloseLimitOf(row.court.closeTime)
        const isWithin = (courtOpenLimit == null || t >= courtOpenLimit) && (courtCloseLimit == null || next <= courtCloseLimit)
        if (!isWithin) continue
        const isBooked = row.booked.some(b => !(b.end <= t || b.start >= next))
        if (!isBooked) return i
      }
    }
    return null
  }

  function scrollToFirstAvailable(idx: number | null, duration = 600) {
    const container = mobileBodyRef.current
    if (!container) return
    if (idx !== null) {
      if (idx <= 1) return
      const targetIndex = Math.max(0, idx - 1)
      const rowEl = container.querySelector(`[data-row-index="${targetIndex}"]`) as HTMLElement | null
      if (rowEl) {
        const top = Math.max(0, rowEl.offsetTop)
        animateScrollY(container, top, duration)
      }
    } else {
      const maxTop = container.scrollHeight - container.clientHeight
      animateScrollY(container, Math.max(0, maxTop), duration)
    }
  }

  // Auto-scroll to first clickable interval
  useEffect(() => {
    if (!data.length) return
    scrollToFirstAvailable(findFirstClickableIndex())
  }, [date, sportLabel(data[0]?.court.sportType || ''), ticks.length]) // Stabilized dependencies

  // Reinforce auto-scroll shortly after layout settles
  useEffect(() => {
    if (!data.length) return
    const idx = findFirstClickableIndex()
    const timer = setTimeout(() => scrollToFirstAvailable(idx), 80)
    return () => clearTimeout(timer)
  }, [date, sportLabel(data[0]?.court.sportType || '')]) // Stabilized dependencies

  // Mobile layout (transposed): rows = times, columns = courts
  function renderGrid() {
    const sortedDataList = sortedData
    const courtCount = sortedDataList.length
    const timeColWidth = 56
    const minCourtWidth = 85 // Prevent squashing
    const rowHeight = 44
    const blocksByCourt = SHOW_BOOKING_LABELS
      ? sortedDataList.map(row => computeBookingBlocks(row.booked as any, tickIndex, isAdmin))
      : []

    // Background segments (free / unavailable / selected) merged into contiguous
    // per-column runs, so each visual state renders as one rounded shape instead
    // of a seam of individually-square 30-min cells.
    type BgSegment = { startIndex: number; endIndex: number; kind: 'free' | 'unavailable' | 'selected' }
    const bgSegmentsByCourt: BgSegment[][] = sortedDataList.map((row, colIndex) => {
      const N = ticks.length - 1
      const covered = new Array(N).fill(false)
      const blocks = blocksByCourt[colIndex] || []
      blocks.forEach(b => {
        for (let i = Math.max(0, b.startIndex); i < Math.min(N, b.endIndex); i++) covered[i] = true
      })
      const courtOpenLimit = courtOpenLimitOf(row.court.openTime)
      const courtCloseLimit = courtCloseLimitOf(row.court.closeTime)
      const segments: BgSegment[] = []
      let curKind: BgSegment['kind'] | null = null
      let curStart = -1
      for (let i = 0; i < N; i++) {
        if (covered[i]) {
          if (curKind) { segments.push({ startIndex: curStart, endIndex: i, kind: curKind }); curKind = null }
          continue
        }
        const t = ticks[i]
        const next = ticks[i + 1]
        const isOutsideHours = (courtCloseLimit != null && next > courtCloseLimit) || (courtOpenLimit != null && t < courtOpenLimit)
        const isSelectedHere = selCourtId === row.court.id && isSelectedSlot(t, next)
        const kind: BgSegment['kind'] = isSelectedHere ? 'selected' : (isTickPast(t) || isOutsideHours) ? 'unavailable' : 'free'
        if (kind !== curKind) {
          if (curKind) segments.push({ startIndex: curStart, endIndex: i, kind: curKind })
          curKind = kind
          curStart = i
        }
      }
      if (curKind) segments.push({ startIndex: curStart, endIndex: N, kind: curKind })
      return segments
    })

    // Unavailable ranges (past time / outside hours) per court, INDEPENDENT of whether
    // a booking block sits on top. Unlike bgSegmentsByCourt (which skips booked cells
    // entirely, since it only drives the plain free/selected cell backgrounds), this
    // drives the shared stripe mask below and must cover booked cells too — otherwise
    // the stripe layer has a hole under every booking, and the flat green backdrop
    // (z-4) shows through the block's own rounding/margin gap for past bookings.
    const unavailableRangesByCourt: { startIndex: number; endIndex: number }[][] = sortedDataList.map(row => {
      const N = ticks.length - 1
      const courtOpenLimit = courtOpenLimitOf(row.court.openTime)
      const courtCloseLimit = courtCloseLimitOf(row.court.closeTime)
      const segments: { startIndex: number; endIndex: number }[] = []
      let curStart = -1
      for (let i = 0; i < N; i++) {
        const t = ticks[i]
        const next = ticks[i + 1]
        const isOutsideHours = (courtCloseLimit != null && next > courtCloseLimit) || (courtOpenLimit != null && t < courtOpenLimit)
        if (isTickPast(t) || isOutsideHours) {
          if (curStart === -1) curStart = i
        } else if (curStart !== -1) {
          segments.push({ startIndex: curStart, endIndex: i })
          curStart = -1
        }
      }
      if (curStart !== -1) segments.push({ startIndex: curStart, endIndex: N })
      return segments
    })

    // Single continuous stripe pattern for "unavailable" (past time / outside hours)
    // cells, masked to the exact per-column ranges above. Drawing this as ONE element
    // spanning the whole grid — instead of one per column — keeps the diagonal lines
    // aligned across column borders instead of each column restarting its own pattern
    // origin (which read as "broken" stripes at every seam). Because it covers booked
    // cells too, this same layer is what shows through a past booking's own margin
    // gap and (via the block's translucent past-fill) through the block itself.
    const gridRowCount = ticks.length - 1
    const unavailableMaskUrl = useMemo(() => {
      const rects: string[] = []
      unavailableRangesByCourt.forEach((segments, colIndex) => {
        segments.forEach(seg => {
          rects.push(`<rect x="${colIndex}" y="${seg.startIndex}" width="1" height="${seg.endIndex - seg.startIndex}" fill="#fff"/>`)
        })
      })
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${courtCount} ${gridRowCount}" preserveAspectRatio="none">${rects.join('')}</svg>`
      return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
    }, [unavailableRangesByCourt, courtCount, gridRowCount])
    const hatchSolid = T.hatchLine

    // For each booking block, the sub-ranges (in the same tick-index space as the
    // block itself) that overlap an "unavailable" window — past time or outside
    // operating hours. Rendered as a striped overlay on top of the block's own
    // color, never shortening/splitting the block or replacing its background.
    type OverlaySeg = { startIndex: number; endIndex: number }
    const blockOverlaysByCourt: OverlaySeg[][][] = sortedDataList.map((row, colIndex) => {
      const courtOpenLimit = courtOpenLimitOf(row.court.openTime)
      const courtCloseLimit = courtCloseLimitOf(row.court.closeTime)
      const blocks = blocksByCourt[colIndex] || []
      return blocks.map(block => {
        const segs: OverlaySeg[] = []
        let curStart = -1
        for (let i = block.startIndex; i < block.endIndex; i++) {
          const t = ticks[i]
          const next = ticks[i + 1]
          const isUnavailable = isTickPast(t) || (courtCloseLimit != null && next > courtCloseLimit) || (courtOpenLimit != null && t < courtOpenLimit)
          if (isUnavailable) {
            if (curStart === -1) curStart = i
          } else if (curStart !== -1) {
            segs.push({ startIndex: curStart, endIndex: i })
            curStart = -1
          }
        }
        if (curStart !== -1) segs.push({ startIndex: curStart, endIndex: block.endIndex })
        return segs
      })
    })

    return (
      <div
        className={`${flat ? '' : 'rounded border border-sky-200 bg-sky-50 shadow-md'} h-full min-h-0 flex flex-col overflow-hidden select-none`}
        style={{ WebkitTouchCallout: 'none' }}
      >
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" ref={mobileBodyRef}>
          <div style={{ minWidth: timeColWidth + courtCount * minCourtWidth }}>
            {/* Header: corner cell + court names */}
            <div className="grid sticky top-0 z-40 border-b"
                 style={{ gridTemplateColumns: `${timeColWidth}px repeat(${courtCount}, 1fr)`, background: T.headerCell.background, borderColor: T.headerCell.borderBottom.replace('1px solid ', '') }}>
              <div className="sticky left-0 z-50 px-2 py-3 text-[10px] font-black uppercase tracking-tighter border-r flex items-center justify-center text-center" style={{ background: T.headerCell.background, color: '#94a3b8', borderColor: T.cellBorder }}>
                ORA
              </div>
              {sortedData.map(row => (
                <div key={`head-${row.court.id}`}
                     className="px-1 py-2 text-[13px] font-bold border-l text-center leading-tight flex flex-col items-center justify-center gap-0.5"
                     style={{ minWidth: minCourtWidth, background: T.headerCell.background, borderColor: T.cellBorder }}>
                  <span className="truncate w-full px-0.5 font-extrabold" style={{ color: T.courtName }}>{row.court.name}</span>
                  <div className="flex flex-col gap-0.5">
                    <span
                      className="text-[7px] font-black px-1.5 py-0.5 rounded-full leading-none uppercase tracking-[0.08em]"
                      style={row.court.indoor ? T.indoor : T.outdoor}
                    >
                      {row.court.indoor ? 'INDOOR' : 'OUTDOOR'}
                    </span>
                    {row.court.indoor && row.court.sportType === 'PADEL' && (
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
              {/* Solid green backdrop for the whole free area — flat fill, no per-slot
                  rounded corners/seams. Sits under everything; unavailable/selected/booked
                  segments paint their own rounded shapes on top of it. */}
              <div
                className="absolute pointer-events-none z-[4]"
                style={{
                  left: timeColWidth,
                  right: 0,
                  top: 0,
                  height: (ticks.length - 1) * rowHeight,
                  background: T.free.background,
                }}
              />

              {/* Unavailable (past time / outside hours) cells: one continuous, fully
                  opaque stripe pattern spanning the whole grid, cut to shape with a
                  mask built from the per-column ranges above — so the diagonal lines
                  never break at a column border. */}
              <div
                className="absolute pointer-events-none z-[5]"
                style={{
                  left: timeColWidth,
                  right: 0,
                  top: 0,
                  height: gridRowCount * rowHeight,
                  background: T.unavailableBg,
                  backgroundImage: `repeating-linear-gradient(45deg, ${hatchSolid} 0, ${hatchSolid} 10px, transparent 10px, transparent 20px)`,
                  WebkitMaskImage: unavailableMaskUrl,
                  maskImage: unavailableMaskUrl,
                  WebkitMaskSize: '100% 100%',
                  maskSize: '100% 100%',
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                } as React.CSSProperties}
              />

              {/* Background segments: selected slot, merged per contiguous run so it renders as one rounded shape */}
              <div
                className="absolute inset-0 pointer-events-none z-[6] grid"
                style={{
                  gridTemplateColumns: `${timeColWidth}px repeat(${courtCount}, 1fr)`,
                  gridTemplateRows: `repeat(${ticks.length - 1}, ${rowHeight}px)`,
                }}
              >
                {sortedData.map((row, colIndex) => (
                  <React.Fragment key={`bg-col-${row.court.id}`}>
                    {bgSegmentsByCourt[colIndex].filter(seg => seg.kind === 'selected').map((seg, segIndex) => {
                      const segStyle: React.CSSProperties = { background: T.selected.background, boxShadow: T.selected.boxShadow }
                      return (
                        <div
                          key={`bg-${row.court.id}-${seg.startIndex}-${seg.endIndex}`}
                          className="rounded-[10px] mx-[3px] my-[2px] flex flex-col items-center justify-center overflow-hidden"
                          style={{
                            gridColumn: colIndex + 2,
                            gridRow: `${seg.startIndex + 1} / ${seg.endIndex + 1}`,
                            ...segStyle,
                          }}
                        >
                          {seg.kind === 'selected' && (
                            <>
                              <div className="font-black truncate w-full text-center px-2" style={{ fontSize: 13, color: T.selected.color }}>Selecția ta</div>
                              <div className="truncate w-full text-center mt-0.5 font-bold" style={{ fontSize: 10, color: T.selected.color, opacity: 0.75 }}>
                                {ticks[seg.startIndex]} – {ticks[seg.endIndex]}
                              </div>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </React.Fragment>
                ))}
              </div>

              {/* Linie subțire între fiecare interval de 30 min, ca în UI-ul vechi.
                  Layer separat (nu per-segment) ca să se alinieze exact cu liniile
                  reale din coloana ORA, fără artefact la marginile blocurilor unite,
                  și acoperit de blocurile de rezervare (z peste segmentele de fundal,
                  sub etichetele de rezervare). */}
              <div
                className="absolute pointer-events-none z-[7]"
                style={{
                  left: timeColWidth,
                  right: 0,
                  top: 0,
                  height: (ticks.length - 1) * rowHeight,
                  backgroundImage: `linear-gradient(to bottom, ${T.cellBorder} 1px, transparent 1px)`,
                  backgroundSize: `100% ${rowHeight}px`,
                  backgroundRepeat: 'repeat',
                }}
              />

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
                      {blocksByCourt[colIndex].map((block, blockIndex) => {
                        const isOpenMatch = block.openMatchId != null
                        const isPendingBlock = block.status === 'PENDING_APPROVAL'
                        // Border/color only here — the fill color is painted internally by
                        // BookingLabelBlock (see fillColor/pastRanges below) so its past
                        // sub-range can be dimmed while letting the shared grid stripe
                        // layer show through instead of drawing a separate local pattern.
                        const blockStyle: React.CSSProperties = isOpenMatch
                          ? { border: `1px solid ${rgba(LIME_RGB, 0.5)}` }
                          : isPendingBlock
                            ? { border: T.pending.border, color: T.pending.text }
                            : { border: T.booked.border, color: T.booked.name }
                        const fillColor = isOpenMatch ? rgba(LIME_RGB, 0.3) : isPendingBlock ? T.pending.background : T.booked.background
                        // Portions of this block that are also "unavailable" (already past,
                        // or past the court's closing time) — painted at reduced opacity so
                        // the shared stripe layer behind the block shows through, instead of
                        // shortening, moving, or splitting the reservation itself.
                        const totalRows = block.endIndex - block.startIndex
                        const pastRanges = (blockOverlaysByCourt[colIndex]?.[blockIndex] || []).map(seg => ({
                          topPct: ((seg.startIndex - block.startIndex) / totalRows) * 100,
                          heightPct: ((seg.endIndex - seg.startIndex) / totalRows) * 100,
                        }))
                        return (
                        <BookingLabelBlock
                          key={`${row.court.id}-${block.startIndex}-${block.endIndex}-${blockIndex}`}
                          className="rounded-[10px] mx-[3px] my-[2px]"
                          style={{
                            gridColumn: colIndex + 2,
                            gridRow: `${block.startIndex + 1} / ${block.endIndex + 1}`,
                            ...blockStyle,
                          }}
                          label={block.label}
                          icon={isPendingBlock ? <HourglassIcon size={totalRows <= 1 ? 9 : 11} /> : undefined}
                          timeRange={block.timeRange}
                          timeColor={isOpenMatch ? undefined : isPendingBlock ? T.pending.time : T.booked.time}
                          playerMatchesCount={block.playerMatchesCount}
                          fillColor={fillColor}
                          pastRanges={pastRanges}
                          compact={totalRows <= 1}
                          onClick={block.openMatchId != null && onOpenMatchClick ? () => onOpenMatchClick({
                            matchId: block.openMatchId!,
                            spotsLeft: block.openMatchSpotsLeft ?? 0,
                            takeover: !!block.openMatchTakeover,
                            courtId: row.court.id,
                            start: block.rawStart || '',
                            end: block.rawEnd || '',
                          }) : undefined}
                        />
                      )})}
                    </React.Fragment>
                  ))}
                </div>
              )}

              {ticks.slice(0,-1).map((t, i) => {
                const next = ticks[i+1]
                const isPastRow = isTickPast(t)
                return (
                  <div key={`time-${t}`} className="relative grid items-stretch"
                       style={{ gridTemplateColumns: `${timeColWidth}px repeat(${courtCount}, 1fr)`, height: rowHeight }} 
                       data-row-index={i}>
                    {/* Time label (Sticky) */}
                    <div
                      className="sticky left-0 z-30 px-1 pt-px text-[15px] font-bold leading-none border-t flex items-start justify-center text-center border-r shadow-[2px_0_5px_rgba(0,0,0,0.05)]"
                      style={{ background: T.timeCol.background, color: T.timeCol.color, borderColor: T.cellBorder }}
                    >
                      {timeLabel(t)}
                    </div>
                    {/* Cells per court */}
                    {sortedData.map((row, rowIndex) => {
                      const bookedRanges = row.booked.map(b => ({ start: b.start, end: b.end, status: b.status }))
                      const isBooked = bookedRanges.some(b => !(b.end <= t || b.start >= next))
                      const isBlocked = bookedRanges.some(b => !(b.end <= t || b.start >= next) && b.status === 'BLOCKED')
                      const isPending = bookedRanges.some(b => !(b.end <= t || b.start >= next) && b.status === 'PENDING_APPROVAL')
                      const selected = selCourtId === row.court.id && isSelectedSlot(t, next)
                      const courtOpenLimit = courtOpenLimitOf(row.court.openTime)
                      const courtCloseLimit = courtCloseLimitOf(row.court.closeTime)
                      const isBeforeOpen = courtOpenLimit != null && t < courtOpenLimit
                      const isAfterClose = courtCloseLimit != null && next > courtCloseLimit
                      const isOutsideHours = isBeforeOpen || isAfterClose
                      // Un interval liber mai scurt de 1 oră (durata minimă de rezervare) nu poate
                      // găzdui nicio rezervare validă — nu are rost să deschidem popup-ul pentru el.
                      // Excepție: dacă intervalul liber ajunge chiar până la miezul nopții (nimic
                      // nu îl blochează înainte de ora 24:00 a zilei afișate), o rezervare pornită
                      // oriunde în el tot poate continua în ziua următoare — deci nu e „prea scurt",
                      // doar tăiat de granița zilei din grilă. Blocăm doar golurile prinse efectiv
                      // între două rezervări (sau înainte de închiderea terenului).
                      const freeSegment = bgSegmentsByCourt[rowIndex]?.find(seg => seg.kind === 'free' && i >= seg.startIndex && i < seg.endIndex)
                      const touchesMidnight = !!freeSegment && freeSegment.endIndex === ticks.length - 1
                      const tooShortToBook = !!freeSegment && !touchesMidnight && (freeSegment.endIndex - i) * 30 < 60
                      const unavailable = isPastRow || isBooked || isBlocked || isPending || isOutsideHours || tooShortToBook
                      const clickable = !unavailable
                      // Nu folosim pointer-events-none aici: scoate elementul din hit-testing,
                      // deci cursor-not-allowed nu s-ar mai afișa (browserul ar arăta cursorul
                      // elementului de dedesubt, de obicei I-beam). Click-ul e oricum blocat
                      // mai jos prin `if (!clickable) return`.
                      const disabledClass = unavailable ? 'cursor-not-allowed' : 'cursor-pointer'
                      return (
                        <div
                          key={`cell-${row.court.id}-${t}`}
                          className={`h-full transition-colors ${disabledClass}`}
                          style={{ minWidth: minCourtWidth, boxSizing: 'border-box', borderLeft: `1px solid ${T.cellBorder}` }}
                          onMouseEnter={() => onHover?.(`${row.court.name} • ${t} - ${next} • ${isBeforeOpen ? 'INDISPONIBIL (inainte de deschidere)' : isAfterClose ? 'INDISPONIBIL (nocturna)' : isBlocked ? 'INDISPONIBIL' : isBooked ? 'REZERVAT' : tooShortToBook ? 'PREA SCURT (sub 1 oră)' : 'LIBER'}`)}
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
                            // Note: Premature gap validation removed here to allow selecting 90+ min intervals even if 60 mins is invalid
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
    const P = POPUP_TOKENS[theme]
    const { courtId, rowIndex, startIndex } = popup // ignore left/top; centered via CSS
    const row = sortedData[rowIndex]  // FIX: was data[rowIndex] - must use sortedData to match displayed order
    if (!row || !ticks[startIndex]) return null
    const booked = row.booked.map(b => ({ start: b.start, end: b.end }))
    const startTime = ticks[startIndex]
    const selectedIntervalText = (selCourtId === courtId && selStart === startTime && selEnd)
      ? `${selStart} - ${selEnd}`
      : '—'
    const selectionValid = !!(selCourtId === courtId && selStart && selEnd && minutesBetween(selStart, selEnd) >= 60 && !leavesThirtyMinuteGap(booked, selStart, selEnd, row.court.sportType, false, undefined, !!isAdmin))
    const options = [60, 90, 120]
    function isRangeFree(mins: number) {
      const slots = mins / 30
      const courtOpenLimit = courtOpenLimitOf(row.court.openTime)
      const courtCloseLimit = courtCloseLimitOf(row.court.closeTime)
      for (let i = 0; i < slots; i++) {
        const t = ticks[startIndex + i]
        const next = ticks[startIndex + i + 1]
        // If range crosses midnight conceptually, optimistically allow (backend handles PENDING)
        if (!t || !next) return true

        const isPast = (date < todayStr) || (date === todayStr && t < nowTime)
        const isBooked = booked.some(b => !(b.end <= t || b.start >= next))
        const isOutsideHours = (courtCloseLimit != null && next > courtCloseLimit) || (courtOpenLimit != null && t < courtOpenLimit)
        if (isPast || isBooked || isOutsideHours) return false
      }
      
      // Additional gap validation to make it consistent with the backend rules
      let endTimeRaw = ticks[startIndex + slots]
      if (endTimeRaw) {
         if (leavesThirtyMinuteGap(booked, startTime, endTimeRaw, row.court.sportType, true, startTime, !!isAdmin)) {
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

      const total = calculateGranularPrice(row.court, startTime, endTime, date)
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
      const gapInvalid = leavesThirtyMinuteGap(booked, startTime, endTime, row.court.sportType, false, undefined, !!isAdmin)
      onSelectionChange?.(courtId, startTime, endTime, mins >= 60 && !gapInvalid, gapInvalid)
      if (reserveWarnVisible) {
        setReserveWarnVisible(false)
        setReserveWarnFading(false)
      }
    }

    function getSuggestionText() {
       const activeLocal = row.booked.filter(b => b.status !== 'CANCELLED');
       const startMin = timeToMinutes(startTime);
       
       let blockStart = timeToMinutes(row.court.openTime || '08:00');
       let blockEnd = timeToMinutes(row.court.closeTime === '23:59' ? '24:00' : (row.court.closeTime || '24:00'));
       activeLocal.forEach(b => {
         const bs = timeToMinutes(b.start);
         const be = timeToMinutes(b.end);
         if (be <= startMin && be > blockStart) blockStart = be;
         if (bs > startMin && bs < blockEnd) blockEnd = bs;
       });

       const formatTime = (m: number) => {
         if (m >= 24 * 60) return '24:00';
         const h = Math.floor(m / 60).toString().padStart(2, '0');
         const min = (m % 60).toString().padStart(2, '0');
         return `${h}:${min}`;
       };

       const bStartStr = formatTime(blockStart);
       const gap = blockEnd - blockStart;

       if (gap < 60) return "Vă informăm că spațiul disponibil aici este prea scurt pentru o rezervare de minim 1 oră.";

       const isTennis = row.court.sportType === 'TENNIS';
       const isPadel = row.court.sportType === 'PADEL';

       if (isTennis || isPadel) {
           const nextValidLeft = blockStart + 90;
           const nextLeftStr = nextValidLeft + 60 <= blockEnd ? ` sau de la ${formatTime(nextValidLeft)}` : '';
           const leftStr = `💡 Sfat: Pentru a respecta regula de pauză, poți începe rezervarea exact de la ${bStartStr}${nextLeftStr}.`;
           
           if (blockEnd >= 24 * 60 - 30) {
               return leftStr; // No right booking to snap to
           } else {
               const bEndStr = formatTime(blockEnd);
               const rightPicks: string[] = [];
               if (blockEnd - 90 >= blockStart) rightPicks.push(formatTime(blockEnd - 90));
               if (blockEnd - 60 >= blockStart) rightPicks.push(formatTime(blockEnd - 60));
               const rightStr = rightPicks.length > 0 ? rightPicks.join(' sau ') : '';
               
               if (rightStr) {
                   return `💡 Sfat: Poți rezerva în siguranță de la ora ${bStartStr}, sau poți alege ${rightStr} (pentru a te lipi corect de următoarea rezervare de la ${bEndStr}).`;
               }
               return leftStr;
           }
       } else {
           if (blockEnd >= 24 * 60 - 30) {
               return `💡 Sfat: Cel mai bine este să începi rezervarea fix de la ora ${bStartStr}.`;
           }
           const bEndStr = formatTime(blockEnd);
           const rightPicks: string[] = [];
           if (blockEnd - 90 >= blockStart) rightPicks.push(formatTime(blockEnd - 90));
           if (blockEnd - 60 >= blockStart) rightPicks.push(formatTime(blockEnd - 60));
           const rightStr = rightPicks.length > 0 ? rightPicks.join(' / ') : formatTime(blockEnd - 60);

           return `💡 Sfat: Poți alege să începi exact de la ${bStartStr}, sau de la ora ${rightStr} pentru a te alinia cu rezervarea de la ${bEndStr}.`;
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
      onReserve?.(selCourtId!, selStart!, selEnd!)
    }
    return createPortal((
      <>
        <div
          className="fixed inset-0 z-[9999] bg-black/30 backdrop-blur-sm"
          onClick={closePopup}
        />
        <div
          className="fixed z-[10000] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-sm flex flex-col overflow-hidden rounded-[2.5rem] shadow-2xl shadow-black/20 transition-all p-1 border"
          style={{ background: P.modalBg, borderColor: P.modalBorder }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="backdrop-blur-md px-6 py-6 border-b flex flex-col gap-1" style={{ background: P.headerBg, borderColor: P.headerBorder }}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-black tracking-tight" style={{ color: P.title }}>{row.court.name}</h3>
                <p className="text-sm font-medium" style={{ color: P.subtle }}>{sportLabel(row.court.sportType)} • {row.court.indoor ? 'Indoor' : 'Outdoor'}</p>
              </div>
              <button
                onClick={closePopup}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                style={{ background: P.closeBg, color: P.subtle }}
              >
                ✕
              </button>
            </div>
          </div>

          <div className="p-4 flex flex-col gap-3">
             {!player && !onAdminClick && (
               <div className="rounded-2xl p-4 border text-[13px] font-medium leading-relaxed shadow-sm" style={{ background: rgba(LIME_RGB, 0.1), borderColor: rgba(LIME_RGB, 0.25), color: P.loginText }}>
                 💡 Ai deja un cont?
                 <a href="/cont" className="underline font-black mx-1 hover:opacity-80 transition-colors" style={{ color: LIME_LINK }}>Loghează-te</a>
                 pentru a rezerva mai rapid și pentru a-ți urmări progresul în Rank-ul STAR ARENA!
               </div>
             )}

             <div className="px-3 py-3 rounded-2xl flex items-center justify-between gap-2 border mb-1" style={{ background: rgba(LIME_RGB, 0.1), borderColor: rgba(LIME_RGB, 0.2), color: P.intervalText }}>
                <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider opacity-70 leading-tight shrink">
                  {selEnd ? 'Interval selectat' : 'Începere la ora'}
                </span>
                <span className="font-black text-base md:text-lg whitespace-nowrap shrink-0 text-right">
                  {selEnd ? `${startTime} - ${selEnd}` : startTime}
                </span>
             </div>

             {reserveWarnVisible && (
                <div className={'mx-1 px-4 py-2 rounded-xl border text-xs font-medium animate-pulse transition-opacity ' + (reserveWarnFading ? 'opacity-0' : 'opacity-100')} style={{ background: rgba(AMBER_RGB, 0.1), borderColor: rgba(AMBER_RGB, 0.3), color: AMBER }}>
                  Vă rugăm selectați durata dorită mai jos!
                </div>
             )}

             <div className="space-y-2.5">
                {(options.every(mins => !isRangeFree(mins)) || (selEnd && selStart && minutesBetween(selStart, selEnd) >= 60 && !selectionValid)) ? (
                  <div className="flex flex-col gap-4 items-center text-center p-5 rounded-3xl border mt-2 mb-2 shadow-inner" style={{ background: rgba(ROSE_RGB, 0.08), borderColor: rgba(ROSE_RGB, 0.25) }}>
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-sm" style={{ background: rgba(ROSE_RGB, 0.15) }}>⚠️</div>
                    <p className="text-[14px] font-semibold leading-relaxed" style={{ color: P.errorText }}>
                      {(row.court.sportType === 'TENNIS' || row.court.sportType === 'PADEL')
                        ? <>La <strong>{sportLabel(row.court.sportType)}</strong>, rezervările trebuie să fie una după alta (fără pauză) sau să lase cel puțin <strong>1 oră și 30 de minute</strong> libere între ele.</>
                        : <>La <strong>{sportLabel(row.court.sportType)}</strong>, regulile noastre nu permit lăsarea unui spațiu liber de exact 30 sau 60 de minute între rezervări.</>}
                    </p>
                    {(row.court.sportType !== 'TENNIS' && row.court.sportType !== 'PADEL') && (
                      <div className="p-3 rounded-2xl border text-[13px] leading-snug w-full" style={{ background: P.suggestionBg, borderColor: rgba(ROSE_RGB, 0.2), color: P.errorText }}>
                        {getSuggestionText()}
                      </div>
                    )}
                    <button
                      onClick={closePopup}
                      className="mt-2 w-full px-4 py-3 font-black uppercase text-[11px] tracking-widest rounded-2xl border shadow-sm transition-all active:scale-95"
                      style={{ background: P.reselectBg, color: ROSE, borderColor: rgba(ROSE_RGB, 0.3) }}
                    >
                      {selEnd && !selectionValid ? "Reselectează Intervalul" : "Am înțeles"}
                    </button>
                  </div>
                ) : options.map((mins) => {
                  const ok = isRangeFree(mins)
                  const isSelectedCurrent = selEnd && (timeToMinutes(selEnd) - timeToMinutes(startTime) === mins)
                  const label = mins === 60 ? '1 oră' : mins === 90 ? '1h 30m' : '2 ore'

                  return (
                    <button
                      key={mins}
                      disabled={!ok}
                      onClick={() => choose(mins)}
                      className="group relative flex w-full items-center justify-between rounded-3xl border-2 px-5 py-4 transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      style={isSelectedCurrent
                        ? { borderColor: LIME, background: LIME, color: LIME_TEXT, boxShadow: `0 4px 18px ${rgba(LIME_RGB, 0.3)}` }
                        : ok
                          ? { borderColor: P.optionBorder, background: P.optionBg, color: P.optionColor }
                          : { borderColor: P.optionBorder, background: P.optionDisabledBg, color: P.optionDisabledColor }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors" style={isSelectedCurrent ? { borderColor: LIME_TEXT, background: rgba(LIME_TEXT_RGB, 0.15) } : { borderColor: P.radioBorder, background: P.radioBg }}>
                          {isSelectedCurrent && <div className="w-2.5 h-2.5 rounded-full" style={{ background: LIME_TEXT }} />}
                        </div>
                        <span className="font-bold text-lg">{label}</span>
                      </div>
                      <span className="font-black tracking-tight" style={{ opacity: isSelectedCurrent ? 1 : 0.8 }}>{priceFor(mins)}</span>
                    </button>
                  )
                })}
             </div>

             {!(options.every(mins => !isRangeFree(mins)) || (selEnd && selStart && minutesBetween(selStart, selEnd) >= 60 && !selectionValid)) && (
               <div className="mt-4 pt-2 flex flex-col gap-3">
                  <button
                    onClick={handleReserveClick}
                    className="w-full py-5 rounded-[2rem] font-black text-xl tracking-tight transition-all shadow-xl active:scale-95 disabled:cursor-not-allowed"
                    style={selectionValid
                      ? { background: LIME, color: '#020617', boxShadow: `0 8px 24px ${rgba(LIME_RGB, 0.3)}` }
                      : { background: P.confirmDisabledBg, color: P.confirmDisabledColor }}
                  >
                    Confirmă Rezervarea
                  </button>
                  <div className="text-center">
                     <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Prețul include TVA</p>
                  </div>
               </div>
             )}
          </div>
        </div>
      </>
    ), document.body)
  }

  return (
    <div className="h-full min-h-0">
      {renderGrid()}
      {renderPopup()}
    </div>
  )
}

