import { OpenMatchParticipant } from './types'

// Cele 4 locuri ale meciului — elementul-semnătură al paginii de meciuri.
// Pline: grupul organizatorului (lime plin) + jucătorii alăturați (contur lime).
// Goale: cerc punctat cu +, primul pulsează discret.

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface SlotDef {
  kind: 'organizer' | 'group' | 'joined' | 'empty'
  name?: string
  avatarUrl?: string | null
  pulse?: boolean
}

export default function PlayerSlots({
  totalSlots,
  groupSize,
  participants,
  organizerName,
  organizerAvatar,
}: {
  totalSlots: number
  groupSize: number
  participants: OpenMatchParticipant[]
  organizerName: string
  organizerAvatar: string | null
}) {
  const slots: SlotDef[] = []
  slots.push({ kind: 'organizer', name: organizerName, avatarUrl: organizerAvatar })
  for (let i = 1; i < groupSize; i++) slots.push({ kind: 'group' })
  for (const p of participants) slots.push({ kind: 'joined', name: p.name, avatarUrl: p.avatarUrl })
  let firstEmpty = true
  while (slots.length < totalSlots) {
    slots.push({ kind: 'empty', pulse: firstEmpty })
    firstEmpty = false
  }

  return (
    <div className="flex items-center gap-3" aria-label={`${slots.filter(s => s.kind !== 'empty').length} din ${totalSlots} locuri ocupate`}>
      {slots.slice(0, totalSlots).map((slot, idx) => {
        if (slot.kind === 'empty') {
          return (
            <div
              key={idx}
              className={`w-12 h-12 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500 ${slot.pulse ? 'motion-safe:animate-pulse border-lime-500/40 text-lime-500/60' : ''}`}
              title="Loc liber"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </div>
          )
        }
        const isOrganizer = slot.kind === 'organizer'
        const isGroup = slot.kind === 'group'
        return (
          <div key={idx} className="relative" title={slot.name || 'Partenerul organizatorului'}>
            {slot.avatarUrl ? (
              <img
                src={slot.avatarUrl}
                alt={slot.name || ''}
                className={`w-12 h-12 rounded-full object-cover ${isOrganizer ? 'ring-2 ring-lime-400' : 'ring-2 ring-lime-500/40'}`}
              />
            ) : (
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-[13px] font-black ${
                  isOrganizer
                    ? 'bg-lime-400 text-slate-950'
                    : isGroup
                      ? 'bg-lime-500/15 text-lime-300 border border-lime-500/30'
                      : 'bg-slate-800 text-lime-300 border-2 border-lime-500/50'
                }`}
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                {slot.name ? initials(slot.name) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                )}
              </div>
            )}
            {isOrganizer && (
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-950 border border-lime-400/60 flex items-center justify-center" title="Organizator">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#a3e635"><path d="M12 2l2.4 7.2H22l-6 4.6 2.3 7.2-6.3-4.5-6.3 4.5L8 13.8 2 9.2h7.6z" /></svg>
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
