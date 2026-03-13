import React from 'react'
import { SportType } from '../types'
const sports: { value: SportType, label: string, emoji: string }[] = [
  { value: 'TENNIS', label: 'Tenis', emoji: '🎾' },
  { value: 'PADEL', label: 'Padel', emoji: '🏓' },
  { value: 'BEACH_VOLLEY', label: 'Volei', emoji: '🏐' },
  { value: 'BASKETBALL', label: 'Baschet', emoji: '🏀' },
  { value: 'FOOTVOLLEY', label: 'Tenis de picior', emoji: '⚽' },
  { value: 'TABLE_TENNIS', label: 'Tenis de masă', emoji: '🏓' },
]

type SportPickerValue = SportType | ''

export default function SportPicker({
  value,
  onChange,
  includeAll = false,
  allLabel = 'Toate',
  disabledSports = [],
}: {
  value: SportPickerValue
  onChange: (v: SportPickerValue) => void
  includeAll?: boolean
  allLabel?: string
  disabledSports?: SportType[]
}) {
  const options = includeAll ? [{ value: '', label: allLabel, emoji: '✨' }, ...sports] : sports
  const disabledSet = React.useMemo(() => new Set(disabledSports), [disabledSports])

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 w-full" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
      {options.map((s) => {
        const disabled = s.value !== '' && disabledSet.has(s.value as SportType)
        const isSelected = value === s.value

        return (
          <button
            key={s.value}
            disabled={disabled}
            onClick={() => onChange(s.value as SportPickerValue)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-medium transition-all whitespace-nowrap border shrink-0 ${
              isSelected
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/30 ring-2 ring-emerald-500/20'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 shadow-sm'
            } ${disabled ? 'opacity-40 grayscale cursor-not-allowed hover:bg-white hover:text-slate-600 hover:border-slate-200' : ''}`}
            aria-label={`Selectează ${s.label}`}
          >
            <span className="text-xl">{s.emoji}</span>
            <span className={isSelected ? 'font-semibold' : 'font-medium'}>{s.label}</span>
          </button>
        )
      })}
    </div>
  )
}
