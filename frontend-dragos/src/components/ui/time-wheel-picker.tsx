import React, { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '../../ThemeContext'

export const ITEM_HEIGHT = 44
export const VISIBLE_COUNT = 5
export const PAD = Math.floor(VISIBLE_COUNT / 2) * ITEM_HEIGHT

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'))

function minutesFor(hour: string): string[] {
  // Half-hour steps everywhere, plus the special 23:59 "no limit / nonstop" sentinel
  // used elsewhere in the app (courtCloseLimitOf treats "23:59" as null = unrestricted).
  return hour === '23' ? ['00', '30', '59'] : ['00', '30']
}

export function WheelColumn({ values, value, onSettle, width = 84, badges }: { values: string[]; value: string; onSettle: (v: string) => void; width?: number; badges?: (string | undefined)[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const settleTimer = useRef<any>(null)
  const [centerIndex, setCenterIndex] = useState(() => Math.max(0, values.indexOf(value)))

  // Scroll to the matching value whenever it changes from outside (open, or hour->minute clamp).
  // useLayoutEffect (not useEffect) so this happens before the browser paints — otherwise the
  // wheel briefly flashes at scrollTop=0 (item "00") before jumping to the real value.
  useLayoutEffect(() => {
    const idx = Math.max(0, values.indexOf(value))
    setCenterIndex(idx)
    ref.current?.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'auto' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, values.length])

  function handleScroll() {
    const el = ref.current
    if (!el) return
    const idx = Math.round(el.scrollTop / ITEM_HEIGHT)
    const clamped = Math.max(0, Math.min(values.length - 1, idx))
    setCenterIndex(clamped)
    if (settleTimer.current) clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => onSettle(values[clamped]), 120)
  }

  function clickItem(idx: number) {
    ref.current?.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' })
  }

  return (
    <div className="relative" style={{ height: ITEM_HEIGHT * VISIBLE_COUNT, width }}>
      <div
        ref={ref}
        onScroll={handleScroll}
        className="h-full overflow-y-auto admin-chip-row"
        style={{ scrollSnapType: 'y mandatory' }}
      >
        <div style={{ height: PAD }} />
        {values.map((v, i) => {
          const dist = Math.abs(i - centerIndex)
          const isCenter = dist === 0
          const badge = badges?.[i]
          return (
            <div
              key={v}
              onClick={() => clickItem(i)}
              className="flex items-center justify-center cursor-pointer select-none transition-all whitespace-nowrap overflow-hidden text-ellipsis px-2 w-full gap-1.5"
              style={{
                height: ITEM_HEIGHT,
                scrollSnapAlign: 'center',
                fontFamily: "'Outfit', sans-serif",
                fontWeight: isCenter ? 800 : 700,
                fontSize: isCenter ? 26 : dist === 1 ? 18 : 15,
                opacity: isCenter ? 1 : dist === 1 ? 0.55 : 0.28,
                color: isCenter ? 'var(--text)' : 'var(--muted)',
              }}
            >
              <span className="truncate">{v}</span>
              {badge && (
                <span
                  className="shrink-0 text-[7px] font-black px-1.5 py-0.5 rounded-full leading-none uppercase bg-rose-500 text-white shadow-sm"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {badge}
                </span>
              )}
            </div>
          )
        })}
        <div style={{ height: PAD }} />
      </div>
    </div>
  )
}

export function TimeWheelPicker({ value, onChange }: { value: string; onChange: (t: string) => void }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [open, setOpen] = useState(false)
  const [hour, setHour] = useState(() => (value || '08:00').slice(0, 2))
  const [minute, setMinute] = useState(() => (value || '08:00').slice(3, 5))

  useLayoutEffect(() => {
    if (!open) return
    setHour((value || '08:00').slice(0, 2))
    setMinute((value || '08:00').slice(3, 5))
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function commit(h: string, m: string) {
    onChange(`${h}:${m}`)
  }

  function handleHourSettle(h: string) {
    setHour(h)
    const validMinutes = minutesFor(h)
    const m = validMinutes.includes(minute) ? minute : '00'
    setMinute(m)
    commit(h, m)
  }

  function handleMinuteSettle(m: string) {
    setMinute(m)
    commit(hour, m)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full h-11 rounded-[14px] border text-[13px] font-extrabold text-left transition-colors"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--surface2)',
          color: 'var(--text)',
          padding: '0 14px',
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        {value === '23:59' ? '23:59' : value}
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[70000] flex items-center justify-center px-4"
          style={{ background: 'rgba(2,6,23,0.6)', backdropFilter: 'blur(2px)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xs rounded-[28px] p-6 border shadow-2xl"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center text-[11px] font-black uppercase tracking-[0.12em] mb-4" style={{ color: 'var(--faint)', fontFamily: "'Outfit', sans-serif" }}>
              Selectează ora
            </div>
            <div className="relative flex items-center justify-center gap-2">
              {/* Center selection highlight, purely visual, spans both columns */}
              <div
                className="absolute left-0 right-0 rounded-2xl pointer-events-none"
                style={{
                  top: PAD,
                  height: ITEM_HEIGHT,
                  background: isDark ? 'rgba(163,230,53,0.10)' : 'rgba(132,204,22,0.10)',
                  border: `1.5px solid ${isDark ? 'rgba(163,230,53,0.35)' : 'rgba(132,204,22,0.35)'}`,
                }}
              />
              <WheelColumn values={HOURS} value={hour} onSettle={handleHourSettle} />
              <div className="text-2xl font-black pb-0" style={{ color: 'var(--muted)' }}>:</div>
              <WheelColumn values={minutesFor(hour)} value={minute} onSettle={handleMinuteSettle} />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 w-full font-black uppercase tracking-widest text-[11px] py-3 rounded-xl transition-all active:scale-95"
              style={{ background: 'var(--lime)', color: 'var(--lime-on)' }}
            >
              Gata
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
