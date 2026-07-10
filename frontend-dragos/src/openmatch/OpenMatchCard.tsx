import { OpenMatchDto, levelLabel } from './types'
import PlayerSlots from './PlayerSlots'
import { useTheme } from '../ThemeContext'

function formatDateRo(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const date = new Date(y, m - 1, d)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(y, m - 1, d)
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000)
  if (diffDays === 0) return 'Azi'
  if (diffDays === 1) return 'Mâine'
  const days = ['Duminică', 'Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă']
  const months = ['ian', 'feb', 'mar', 'apr', 'mai', 'iun', 'iul', 'aug', 'sep', 'oct', 'nov', 'dec']
  return `${days[date.getDay()]}, ${d} ${months[m - 1]}`
}

export default function OpenMatchCard({
  match,
  isAuthenticated,
  onJoin,
}: {
  match: OpenMatchDto
  isAuthenticated: boolean
  onJoin: (match: OpenMatchDto) => void
}) {
  const full = match.status === 'FULL' || match.spotsLeft === 0
  const canJoin = !full && !match.mine && !match.joined
  const callPhone = match.organizerPhone
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div
      className="relative backdrop-blur-3xl border rounded-3xl p-5 md:p-6 shadow-xl transition-all duration-300"
      style={{
        background: isDark ? 'rgba(15,23,42,0.6)' : '#ffffff',
        borderColor: full ? (isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0') : 'rgba(163,230,53,0.2)',
        opacity: full ? 0.6 : 1,
        filter: full ? 'saturate(0.5)' : undefined,
      }}
    >
      {/* Antet: dată/interval + nivel */}
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black text-lime-500 uppercase tracking-widest bg-lime-500/10 border border-lime-500/20 px-2.5 py-1 rounded-full">
              {formatDateRo(match.date)}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0'}`, color: isDark ? '#94a3b8' : '#64748b' }}>
              Padel · Teren {match.courtName}{match.courtIndoor ? ' · Indoor' : ''}
            </span>
          </div>
          <p className="text-2xl font-black tracking-tight mt-2" style={{ fontFamily: 'Outfit, sans-serif', color: isDark ? '#fff' : '#0f172a' }}>
            {match.startTime} – {match.endTime}
          </p>
          <p className="text-[11px] font-bold mt-0.5" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
            Organizator: <span style={{ color: isDark ? '#cbd5e1' : '#334155' }}>{match.organizerName}</span>
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Nivel căutat</p>
          <span className="inline-block text-sm font-black text-slate-950 bg-lime-400 px-3 py-1.5 rounded-xl" style={{ fontFamily: 'Outfit, sans-serif' }}>
            {levelLabel(match.targetLevelRank)}
          </span>
        </div>
      </div>

      {/* Semnătura: cele 4 locuri */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <PlayerSlots
          totalSlots={match.totalSlots}
          groupSize={match.groupSize}
          participants={match.participants}
          organizerName={match.organizerName}
          organizerAvatar={match.organizerAvatar}
        />
        <div className="text-right">
          {full ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-lime-500 uppercase tracking-widest">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              Complet
            </span>
          ) : (
            <p className="text-[11px] font-bold" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
              Mai e nevoie de <span className="text-lime-500 font-black">{match.spotsLeft}</span> {match.spotsLeft === 1 ? 'jucător' : 'jucători'}
            </p>
          )}
        </div>
      </div>

      {/* Acțiuni */}
      <div className="flex items-center gap-2 mt-5">
        {match.mine ? (
          <span className="flex-1 py-3 text-center text-[11px] font-black uppercase tracking-widest rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0'}`, color: isDark ? '#94a3b8' : '#64748b' }}>
            Meciul tău
          </span>
        ) : match.joined ? (
          <span className="flex-1 py-3 text-center text-[11px] font-black text-lime-500 uppercase tracking-widest bg-lime-500/10 border border-lime-500/20 rounded-xl">
            Te-ai alăturat ✓
          </span>
        ) : canJoin ? (
          <button
            onClick={() => onJoin(match)}
            className="flex-1 py-3.5 bg-lime-400 text-slate-950 rounded-xl font-black text-sm hover:bg-lime-300 active:scale-95 transition-all shadow-lg shadow-lime-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Mă alătur
          </button>
        ) : (
          <span className="flex-1 py-3 text-center text-[11px] font-black uppercase tracking-widest rounded-xl" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', color: isDark ? '#64748b' : '#94a3b8' }}>
            Echipa e completă
          </span>
        )}

        {isAuthenticated && callPhone && (
          <a
            href={`tel:${callPhone}`}
            className="px-4 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`, color: isDark ? '#cbd5e1' : '#334155' }}
            title={`Sună organizatorul (${callPhone})`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
            Sună
          </a>
        )}
      </div>
    </div>
  )
}
