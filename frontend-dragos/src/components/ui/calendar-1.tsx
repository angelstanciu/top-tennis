'use client'

import { useState, useEffect } from 'react'
import { Calendar } from '../../components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover'
import { format } from "date-fns"
import { ro } from "date-fns/locale"

export default function CalendarDemo({ 
  value, 
  onChange, 
  placeholder,
  children 
}: { 
  value: string, 
  onChange: (date: string) => void, 
  placeholder?: string,
  children?: React.ReactNode 
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
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
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 rounded-xl border-slate-200 shadow-2xl z-[100]" align="start">
        <Calendar 
          mode='single' 
          defaultMonth={date} 
          selected={date} 
          onSelect={handleSelect} 
          className='rounded-xl border-0 bg-white'
        />
      </PopoverContent>
    </Popover>
  )
}
