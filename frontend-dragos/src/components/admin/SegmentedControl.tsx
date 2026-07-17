import React from 'react'

export type SegmentedOption<T extends string | number> = {
  value: T
  label: string
  badge?: number
}

export default function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  className = '',
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div
      className={`flex gap-1 p-[5px] rounded-2xl border ${className}`}
      style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}
    >
      {options.map(o => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className="flex-1 text-center rounded-[11px] text-[10px] font-black uppercase tracking-wide transition-colors"
            style={{
              padding: '8px 4px',
              fontFamily: "'Outfit', sans-serif",
              background: active ? 'var(--lime)' : 'transparent',
              color: active ? 'var(--lime-on)' : 'var(--muted)',
            }}
          >
            {o.label}
            {!!o.badge && (
              <span
                className="ml-1 inline-flex items-center justify-center rounded-full text-[9px] font-black"
                style={{ minWidth: 15, height: 15, padding: '0 4px', background: '#f43f5e', color: '#fff' }}
              >
                {o.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
