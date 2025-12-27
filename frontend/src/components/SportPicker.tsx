import React from 'react'
import { SportType } from '../types'

const sports: { value: SportType, label: string }[] = [
  { value: 'TENNIS', label: 'Tenis' },
  { value: 'PADEL', label: 'Padel' },
  { value: 'BEACH_VOLLEY', label: 'Volei pe plajă' },
  { value: 'BASKETBALL', label: 'Baschet' },
  { value: 'FOOTVOLLEY', label: 'Tenis de picior' },
  { value: 'TABLE_TENNIS', label: 'Tenis de masă' },
]

export default function SportPicker({ value, onChange }: { value: SportType, onChange: (v: SportType) => void }) {
  const selectRef = React.useRef<HTMLSelectElement | null>(null)
  const [width, setWidth] = React.useState<number | undefined>(undefined)

  // Measure the widest option so the dropdown fits the longest label
  React.useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      // Try to read computed font from the element for accurate measurement
      let font = '400 14px system-ui'
      if (selectRef.current) {
        const st = window.getComputedStyle(selectRef.current)
        font = `${st.fontWeight} ${st.fontSize} ${st.fontFamily}`
      }
      ctx.font = font
      let max = 0
      for (const s of sports) {
        const w = ctx.measureText(s.label).width
        if (w > max) max = w
      }
      // padding (px-3 both sides ~24px) + native arrow (~20px) + borders (~2px)
      const computed = Math.ceil(max + 24 + 20 + 2)
      setWidth(computed)
    } catch {}
  }, [])

  return (
    <div className="inline-block">
      <select
        ref={selectRef}
        className="border rounded px-2 py-1.5 text-sm whitespace-nowrap bg-white text-slate-900"
        style={{ width: width ? `${width}px` : undefined }}
        value={value}
        onChange={(e) => onChange(e.target.value as SportType)}
        aria-label="Selectează sportul"
      >
        {sports.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  )
}
