import React, { useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Generate next N days starting from today
function generateDays(count = 14): { iso: string; label: string; dayName: string; day: number }[] {
  const days = []
  for (let i = 0; i < count; i++) {
    const d = new Date()
    d.setDate(d.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    const dayNames = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm']
    const months = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie']
    days.push({
      iso,
      label: `${d.getDate()} ${months[d.getMonth()]}`,
      dayName: i === 0 ? 'Azi' : i === 1 ? 'Mâine' : dayNames[d.getDay()],
      day: d.getDate(),
    })
  }
  return days
}

interface DateSliderProps {
  selected?: string          // ISO date string selected
  onSelect: (iso: string) => void
  onConfirm?: (iso: string) => void
}

export function DateSlider({ selected, onSelect, onConfirm }: DateSliderProps) {
  const days = generateDays(21)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = useCallback((dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    scrollRef.current.scrollBy({ left: dir === 'right' ? 200 : -200, behavior: 'smooth' })
  }, [])

  const today = new Date().toISOString().slice(0, 10)
  const sel = selected || today

  return (
    <div className="w-full">
      <div className="relative flex items-center gap-2">
        <button
          onClick={() => scroll('left')}
          className="shrink-0 w-9 h-9 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center hover:bg-slate-700 hover:text-lime-400 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto scrollbar-none flex-1 py-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {days.map(d => {
            const isSelected = d.iso === sel
            const isToday = d.iso === today
            return (
              <button
                key={d.iso}
                onClick={() => {
                  onSelect(d.iso)
                  onConfirm?.(d.iso)
                }}
                className={`
                  shrink-0 flex flex-col items-center justify-center w-20 py-2.5 rounded-2xl border transition-all
                  ${isSelected
                    ? 'bg-lime-500 border-lime-500 text-slate-950 shadow-lg shadow-lime-500/40'
                    : isToday
                      ? 'border-lime-500/50 bg-slate-800 text-lime-400'
                      : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-lime-500/50 hover:text-lime-400'
                  }
                `}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wide ${isSelected ? 'text-slate-950' : ''}`}>
                  {d.dayName}
                </span>
                <span className={`text-xl font-extrabold leading-tight ${isSelected ? 'text-slate-950' : ''}`}>
                  {d.day}
                </span>
                <span className={`text-[9px] font-medium leading-tight ${isSelected ? 'text-slate-800' : 'text-slate-500'}`}>
                  {d.label.split(' ')[1]}
                </span>
              </button>
            )
          })}
        </div>

        <button
          onClick={() => scroll('right')}
          className="shrink-0 w-9 h-9 rounded-full bg-slate-800 border border-slate-700 text-slate-300 flex items-center justify-center hover:bg-slate-700 hover:text-lime-400 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
