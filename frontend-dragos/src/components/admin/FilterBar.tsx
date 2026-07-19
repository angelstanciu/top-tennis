import React from 'react'
import { SportType } from '../../types'
import { WheelPicker } from '../ui/wheel-picker'

export const SPORT_OPTIONS: { value: SportType; label: string }[] = [
  { value: 'TENNIS', label: 'Tenis' },
  { value: 'PADEL', label: 'Padel' },
  { value: 'BASKETBALL', label: 'Baschet' },
  { value: 'BEACH_VOLLEY', label: 'Volei' },
  { value: 'FOOTVOLLEY', label: 'Fotbal-tenis' },
  { value: 'TABLE_TENNIS', label: 'Ping-pong' },
]

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="block text-[10px] font-black uppercase tracking-wider mb-1.5"
      style={{ color: 'var(--faint)', fontFamily: "'Outfit', sans-serif" }}
    >
      {children}
    </span>
  )
}

export function FilterBarCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-[24px] p-4 border flex flex-col gap-3.5 ${className}`}
      style={{ borderColor: 'var(--border)', background: 'var(--surface)', boxShadow: 'var(--card-shadow)' }}
    >
      {children}
    </div>
  )
}

export function SportChips({
  value,
  onChange,
  includeAll = false,
  allLabel = 'Toate',
  disabledSports = [],
  options = SPORT_OPTIONS,
  label = 'Sport',
}: {
  value: SportType | ''
  onChange: (v: SportType | '') => void
  includeAll?: boolean
  allLabel?: string
  disabledSports?: SportType[]
  options?: { value: SportType; label: string }[]
  label?: string | null
}) {
  const disabledSet = React.useMemo(() => new Set(disabledSports), [disabledSports])
  const chips = includeAll ? [{ value: '' as SportType | '', label: allLabel }, ...options] : options

  return (
    <div>
      {label && <FieldLabel>{label}</FieldLabel>}
      <div className="admin-chip-row flex gap-1.5 overflow-x-auto pb-0.5">
        {chips.map(c => {
          const active = c.value === value
          const disabled = c.value !== '' && disabledSet.has(c.value as SportType)
          return (
            <button
              key={c.value || 'ALL'}
              type="button"
              disabled={disabled}
              onClick={() => onChange(c.value)}
              className="shrink-0 whitespace-nowrap rounded-full text-[11px] font-extrabold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                padding: '8px 13px',
                fontFamily: "'Outfit', sans-serif",
                background: active ? 'var(--lime)' : 'var(--surface2)',
                color: active ? 'var(--lime-on)' : 'var(--text2)',
                border: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
              }}
            >
              {c.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function SelectField({
  label,
  className = '',
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string | null; className?: string }) {
  return (
    <div className={className}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <div className="relative">
        <select
          {...props}
          className="w-full h-11 rounded-[14px] border text-[13px] font-bold appearance-none cursor-pointer"
          style={{
            borderColor: 'var(--border)',
            background: 'var(--surface2)',
            color: 'var(--text)',
            padding: '0 34px 0 14px',
            fontFamily: 'inherit',
          }}
        >
          {children}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--muted)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      </div>
    </div>
  )
}

export function TextField({
  label,
  className = '',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string | null; className?: string }) {
  return (
    <div className={className}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <input
        {...props}
        className="w-full h-11 rounded-[14px] border text-[13px] font-bold"
        style={{
          borderColor: 'var(--border)',
          background: 'var(--surface2)',
          color: 'var(--text)',
          padding: '0 14px',
          fontFamily: 'inherit',
        }}
      />
    </div>
  )
}

export function DateStepperField({
  label,
  display,
  onPrev,
  onNext,
  children,
  className = '',
  arrowWidth = 38,
}: {
  label?: string | null
  display: string
  onPrev: () => void
  onNext: () => void
  children?: React.ReactNode
  className?: string
  arrowWidth?: number
}) {
  return (
    <div className={className}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <div
        className="flex items-stretch h-11 rounded-[14px] overflow-hidden border"
        style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}
      >
        <button
          type="button"
          onClick={onPrev}
          aria-label="Ziua anterioară"
          className="flex items-center justify-center text-lg border-r transition-colors"
          style={{ width: arrowWidth, color: 'var(--muted)', borderColor: 'var(--border)' }}
        >
          {'‹'}
        </button>
        <div className="relative flex-1 min-w-0 flex items-center justify-center">
          {children ?? (
            <div className="text-[13px] font-extrabold truncate" style={{ color: 'var(--text)', fontFamily: "'Outfit', sans-serif" }}>
              {display}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onNext}
          aria-label="Ziua următoare"
          className="flex items-center justify-center text-lg border-l transition-colors"
          style={{ width: arrowWidth, color: 'var(--muted)', borderColor: 'var(--border)' }}
        >
          {'›'}
        </button>
      </div>
    </div>
  )
}

/**
 * The unified filter bar: sport picker + Teren|Dată grid, used as-is on
 * AdminPage and FreePositionsPage. Pages with extra fields (BlockDay,
 * WeeklyBooking) compose FilterBarCard + the primitives above instead.
 */
export default function FilterBar({
  sportValue,
  onSportChange,
  includeAllSport = false,
  courtLabel = 'Teren',
  courtValue,
  onCourtChange,
  courtOptions,
  dateLabel = 'Dată',
  dateDisplay,
  onDatePrev,
  onDateNext,
  dateTrigger,
  children,
}: {
  sportValue: SportType | ''
  onSportChange: (v: SportType | '') => void
  includeAllSport?: boolean
  disabledSports?: SportType[]
  courtLabel?: string
  courtValue: number | ''
  onCourtChange: (value: string) => void
  courtOptions: { value: string; label: string; badge?: string }[]
  dateLabel?: string
  dateDisplay: string
  onDatePrev: () => void
  onDateNext: () => void
  dateTrigger?: React.ReactNode
  children?: React.ReactNode
}) {
  const sportOptionsWithAll = includeAllSport ? [{ value: '' as SportType | '', label: 'Toate' }, ...SPORT_OPTIONS] : SPORT_OPTIONS
  return (
    <FilterBarCard>
      <div className="flex gap-2.5">
        <div className="flex-1">
          <FieldLabel>Sport</FieldLabel>
          <WheelPicker title="Selectează sportul" value={sportValue} options={sportOptionsWithAll} onChange={onSportChange} />
        </div>
        <div className="flex-1">
          <FieldLabel>{courtLabel}</FieldLabel>
          {sportValue === '' ? (
            <div
              className="h-11 rounded-[14px] border flex items-center px-3.5 text-[13px] font-extrabold opacity-50"
              style={{ borderColor: 'var(--border)', background: 'var(--surface2)', color: 'var(--faint)' }}
            >
              Toate
            </div>
          ) : (
            <WheelPicker title={`Selectează ${courtLabel.toLowerCase()}`} value={String(courtValue)} options={courtOptions} onChange={onCourtChange} />
          )}
        </div>
      </div>
      <div className="flex gap-2.5">
        {children && <div className="flex-1">{children}</div>}
        <DateStepperField label={dateLabel} display={dateDisplay} onPrev={onDatePrev} onNext={onDateNext} className="flex-1">
          {dateTrigger}
        </DateStepperField>
      </div>
    </FilterBarCard>
  )
}
