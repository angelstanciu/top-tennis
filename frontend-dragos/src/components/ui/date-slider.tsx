import React, { useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTheme } from '../../ThemeContext'

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
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  // Show up to 90 days (approx 3 months) in the slider as requested for the horizon
  const days = generateDays(90)
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
          className="shrink-0 w-9 h-9 rounded-full border flex items-center justify-center hover:text-lime-500 transition-colors"
          style={{ background: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#cbd5e1' : '#64748b' }}
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
                      ? 'border-lime-500/50'
                      : 'hover:border-lime-500/50 hover:text-lime-500'
                  }
                `}
                style={isSelected ? undefined : {
                  background: isToday ? (isDark ? '#1e293b' : '#fff') : (isDark ? 'rgba(30,41,59,0.6)' : '#fff'),
                  borderColor: isToday ? undefined : (isDark ? '#334155' : '#e2e8f0'),
                  color: isToday ? '#84cc16' : (isDark ? '#cbd5e1' : '#334155'),
                }}
              >
                <span className={`text-[10px] font-bold uppercase tracking-wide ${isSelected ? 'text-slate-950' : ''}`}>
                  {d.dayName}
                </span>
                <span className={`text-xl font-extrabold leading-tight ${isSelected ? 'text-slate-950' : ''}`}>
                  {d.day}
                </span>
                <span
                  className={`text-[9px] font-medium leading-tight ${isSelected ? 'text-slate-800' : ''}`}
                  style={isSelected ? undefined : { color: isDark ? '#64748b' : '#94a3b8' }}
                >
                  {d.label.split(' ')[1]}
                </span>
              </button>
            )
          })}
        </div>

        <button
          onClick={() => scroll('right')}
          className="shrink-0 w-9 h-9 rounded-full border flex items-center justify-center hover:text-lime-500 transition-colors"
          style={{ background: isDark ? '#1e293b' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0', color: isDark ? '#cbd5e1' : '#64748b' }}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
