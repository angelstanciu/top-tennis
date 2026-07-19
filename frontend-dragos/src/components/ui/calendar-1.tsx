'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Calendar } from '../../components/ui/calendar'
import { format } from "date-fns"
import { ro } from "date-fns/locale"

export default function CalendarDemo({
  value,
  onChange,
  placeholder,
  children,
  maxDate,
}: {
  value: string,
  onChange: (date: string) => void,
  placeholder?: string,
  children?: React.ReactNode,
  maxDate?: Date,
}) {
  const [date, setDate] = useState<Date | undefined>(value ? new Date(value) : undefined)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (value) {
      const d = new Date(value)
      if (!isNaN(d.getTime())) setDate(d)
    }
  }, [value])

  const handleSelect = (newDate: Date | undefined) => {
    if (!newDate) return
    setDate(newDate)

    // adjust to local YYYY-MM-DD
    const local = new Date(newDate.getTime() - newDate.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
    onChange(local)
    setOpen(false)
  }

  return (
    <>
      <div className="contents" onClick={() => setOpen(true)}>
        {children ? (
          children
        ) : (
          <button
            type="button"
            className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold shadow-sm hover:bg-slate-50 transition-all active:scale-[0.98]"
          >
            <span className="truncate">
              {date ? format(date, "d MMMM yyyy", { locale: ro }) : (placeholder || "Selectează data")}
            </span>
            <svg className="ml-2 h-4 w-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
        )}
      </div>
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
              Selectează data
            </div>
            <Calendar
              mode='single'
              defaultMonth={date}
              selected={date}
              onSelect={handleSelect}
              className='rounded-xl border-0 bg-transparent'
              toDate={maxDate}
            />
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 w-full font-black uppercase tracking-widest text-[11px] py-3 rounded-xl transition-all active:scale-95"
              style={{ background: 'var(--lime)', color: 'var(--lime-on)' }}
            >
              Închide
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
