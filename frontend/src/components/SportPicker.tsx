import React from 'react'
import { SportType } from '../types'

const sports: { value: SportType, label: string }[] = [
  { value: 'TENNIS', label: 'Tenis 🎾' },
  { value: 'PADEL', label: 'Padel 🏓' },
  { value: 'BEACH_VOLLEY', label: 'Volei pe plaja 🏐' },
  { value: 'BASKETBALL', label: 'Baschet 🏀' },
  { value: 'FOOTVOLLEY', label: 'Tenis de picior ⚽' },
  { value: 'TABLE_TENNIS', label: 'Tenis de masa 🏓' },
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
  const selectRef = React.useRef<HTMLSelectElement | null>(null)
  const [width, setWidth] = React.useState<number | undefined>(undefined)
  const options = includeAll ? [{ value: '', label: allLabel }, ...sports] : sports
  const disabledSet = React.useMemo(() => new Set(disabledSports), [disabledSports])

  // Measure the widest option so the dropdown fits the longest label
  React.useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      let font = '400 14px system-ui'
      if (selectRef.current) {
        const st = window.getComputedStyle(selectRef.current)
        font = `${st.fontWeight} ${st.fontSize} ${st.fontFamily}`
      }
      ctx.font = font
      let max = 0
      for (const s of options) {
        const w = ctx.measureText(s.label).width
        if (w > max) max = w
      }
      const computed = Math.ceil(max + 24 + 20 + 2)
      setWidth(computed)
    } catch {}
  }, [])

  return (
    <div className="inline-block">
      <select
        ref={selectRef}
        className="border rounded px-2 py-1.5 text-sm whitespace-nowrap bg-white text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
        style={{ width: width ? `${width}px` : undefined }}
        value={value}
        onChange={(e) => onChange(e.target.value as SportPickerValue)}
        aria-label="Selecteaza sportul"
      >
        {options.map((s) => {
          const disabled = s.value !== '' && disabledSet.has(s.value as SportType)
          return (
            <option key={s.value} value={s.value} disabled={disabled}>
              {s.label}
            </option>
          )
        })}
      </select>
    </div>
  )
}
