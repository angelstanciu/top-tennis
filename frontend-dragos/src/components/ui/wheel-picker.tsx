import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { useTheme } from '../../ThemeContext'
import { WheelColumn, ITEM_HEIGHT, PAD } from './time-wheel-picker'

export function WheelPicker<T extends string>({
  value,
  options,
  onChange,
  title,
  width = 180,
}: {
  value: T
  options: { value: T; label: string; badge?: string }[]
  onChange: (v: T) => void
  title: string
  width?: number
}) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<T>(value)

  const optionFor = (v: T) => options.find(o => o.value === v)
  const labelFor = (v: T) => optionFor(v)?.label ?? v
  const badgeFor = (v: T) => optionFor(v)?.badge
  const labels = options.map(o => o.label)
  const badges = options.map(o => o.badge)

  function openPicker() {
    setPending(value)
    setOpen(true)
  }

  function handleSettle(label: string) {
    const match = options.find(o => o.label === label)
    if (match) {
      setPending(match.value)
      onChange(match.value)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        className="w-full h-11 rounded-[14px] border text-[13px] font-extrabold text-left transition-colors flex items-center justify-between"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--surface2)',
          color: 'var(--text)',
          padding: '0 14px',
          fontFamily: "'Outfit', sans-serif",
        }}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="truncate">{labelFor(value)}</span>
          {badgeFor(value) && (
            <span className="shrink-0 text-[7px] font-black px-1.5 py-0.5 rounded-full leading-none uppercase bg-rose-500 text-white shadow-sm">
              {badgeFor(value)}
            </span>
          )}
        </span>
        <svg className="ml-2 h-3.5 w-3.5 shrink-0" style={{ color: 'var(--muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
        </svg>
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
              {title}
            </div>
            <div className="relative flex items-center justify-center">
              <div
                className="absolute left-0 right-0 rounded-2xl pointer-events-none"
                style={{
                  top: PAD,
                  height: ITEM_HEIGHT,
                  background: isDark ? 'rgba(163,230,53,0.10)' : 'rgba(132,204,22,0.10)',
                  border: `1.5px solid ${isDark ? 'rgba(163,230,53,0.35)' : 'rgba(132,204,22,0.35)'}`,
                }}
              />
              <WheelColumn values={labels} value={labelFor(pending)} onSettle={handleSettle} width={width} badges={badges} />
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
