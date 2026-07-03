import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Toaster, toast } from 'sonner'
import { OpenMatchDto, LEVELS, levelLabel } from '../openmatch/types'
import { getMyLevel, joinOpenMatch, listOpenMatches } from '../openmatch/api'
import OpenMatchCard from '../openmatch/OpenMatchCard'
import { LevelMismatchModal, LevelRequiredModal } from '../openmatch/OpenMatchModals'

type DateFilter = 'ALL' | 'TODAY' | 'TOMORROW'

function todayISO(offset = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function OpenMatchesPage() {
  const nav = useNavigate()
  const [matches, setMatches] = useState<OpenMatchDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateFilter, setDateFilter] = useState<DateFilter>('ALL')
  const [levelFilter, setLevelFilter] = useState<number | 'ALL'>('ALL')

  const isAuthenticated = !!localStorage.getItem('playerToken')
  const [myLevel, setMyLevel] = useState<number | null | undefined>(undefined) // undefined = necunoscut încă

  // Modale flux alăturare
  const [levelRequired, setLevelRequired] = useState(false)
  const [mismatchFor, setMismatchFor] = useState<OpenMatchDto | null>(null)
  const [joiningId, setJoiningId] = useState<number | null>(null)

  async function load() {
    setLoading(true)
    setError('')
    try {
      setMatches(await listOpenMatches())
    } catch (e: any) {
      setError(e?.message || 'Nu am putut încărca meciurile.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!isAuthenticated) { setMyLevel(null); return }
    getMyLevel('PADEL')
      .then(l => setMyLevel(l.levelRank))
      .catch(() => setMyLevel(null))
  }, [isAuthenticated])

  const filtered = useMemo(() => {
    const list = matches.filter(m => {
      if (dateFilter === 'TODAY' && m.date !== todayISO()) return false
      if (dateFilter === 'TOMORROW' && m.date !== todayISO(1)) return false
      if (levelFilter !== 'ALL' && m.targetLevelRank !== levelFilter) return false
      return true
    })
    // Meciurile care încă mai caută jucători primele; cele complete la coadă.
    const isFull = (m: OpenMatchDto) => m.status === 'FULL' || m.spotsLeft === 0
    return [...list].sort((a, b) => {
      if (isFull(a) !== isFull(b)) return isFull(a) ? 1 : -1
      const dateCmp = a.date.localeCompare(b.date)
      return dateCmp !== 0 ? dateCmp : a.startTime.localeCompare(b.startTime)
    })
  }, [matches, dateFilter, levelFilter])

  async function doJoin(match: OpenMatchDto) {
    setJoiningId(match.id)
    try {
      const res = await joinOpenMatch(match.id)
      toast.success(res.status === 'FULL' ? 'Te-ai alăturat! Echipa e completă — ne vedem pe teren! 🎾' : 'Te-ai alăturat meciului!')
      await load()
    } catch (e: any) {
      toast.error(e?.message || 'Nu te-am putut alătura meciului.')
      await load()
    } finally {
      setJoiningId(null)
    }
  }

  function handleJoinClick(match: OpenMatchDto) {
    if (joiningId != null) return
    if (!isAuthenticated) {
      nav('/cont')
      return
    }
    if (myLevel == null) {
      setLevelRequired(true)
      return
    }
    // Avertisment când meciul e peste nivelul tău (decizia rămâne a ta).
    if (myLevel < match.targetLevelRank) {
      setMismatchFor(match)
      return
    }
    doJoin(match)
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => nav('/')}
              className="bg-white/5 hover:bg-white/10 text-white p-2 rounded-full transition-all active:scale-95"
              aria-label="Înapoi acasă"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <span className="font-extrabold text-lg tracking-tighter text-white">
              STAR<span className="text-lime-400">ARENA</span>
            </span>
          </div>
          <button
            onClick={() => nav('/rezerva?sport=PADEL')}
            className="font-bold px-4 py-2 rounded-full text-sm bg-lime-500 text-slate-950 hover:bg-lime-400 transition-all active:scale-95 shadow-lg shadow-lime-500/25"
          >
            Rezervă padel
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8 pb-20">
        {/* Antet */}
        <div className="mb-7">
          <p className="text-lime-400 font-bold uppercase tracking-widest text-[11px] mb-2">Meciuri deschise · Padel</p>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Găsește-ți partenerii de joc</h1>
          <p className="text-slate-400 text-sm font-medium mt-2 max-w-xl">
            Meciuri care caută jucători. Alătură-te unuia sau deschide-ți propriul meci dintr-o rezervare de padel.
          </p>
        </div>

        {/* Filtre */}
        <div className="flex items-center gap-2 flex-wrap mb-6">
          {([['ALL', 'Toate'], ['TODAY', 'Azi'], ['TOMORROW', 'Mâine']] as [DateFilter, string][]).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setDateFilter(value)}
              aria-pressed={dateFilter === value}
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${
                dateFilter === value
                  ? 'bg-lime-400 text-slate-950'
                  : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
          <select
            value={levelFilter === 'ALL' ? 'ALL' : String(levelFilter)}
            onChange={e => setLevelFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
            className="ml-auto bg-white/5 border border-white/10 text-slate-300 text-xs font-bold rounded-full px-4 py-2 outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-lime-400"
            aria-label="Filtrează după nivel"
          >
            <option value="ALL">Toate nivelurile</option>
            {LEVELS.map(l => (
              <option key={l.rank} value={l.rank}>{l.sub ? `${l.short} (${l.sub})` : l.short}</option>
            ))}
          </select>
        </div>

        {/* Conținut */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-11 h-11 border-4 border-lime-500/20 border-t-lime-400 rounded-full animate-spin" />
            <p className="mt-4 text-slate-500 font-medium text-sm">Se încarcă meciurile...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-slate-400 font-medium mb-4">{error}</p>
            <button onClick={load} className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all">
              Încearcă din nou
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-lime-500/10 border border-lime-500/20 flex items-center justify-center mb-5">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#a3e635" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            </div>
            <h3 className="text-xl font-black text-white mb-2">Niciun meci deschis {dateFilter !== 'ALL' || levelFilter !== 'ALL' ? 'cu filtrele alese' : 'momentan'}</h3>
            <p className="text-slate-400 text-sm font-medium max-w-sm mx-auto mb-6">
              Fii primul care deschide unul: fă o rezervare la padel și alege „Caut jucători".
            </p>
            <button
              onClick={() => nav('/rezerva?sport=PADEL')}
              className="px-7 py-3.5 bg-lime-400 text-slate-950 rounded-xl font-black hover:bg-lime-300 active:scale-95 transition-all shadow-lg shadow-lime-500/25"
            >
              Rezervă padel
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {filtered.map(match => (
              <OpenMatchCard
                key={match.id}
                match={match}
                isAuthenticated={isAuthenticated}
                onJoin={handleJoinClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modale */}
      {levelRequired && (
        <LevelRequiredModal
          dark
          onGoProfile={() => nav('/profile')}
          onClose={() => setLevelRequired(false)}
        />
      )}
      {mismatchFor && myLevel != null && (
        <LevelMismatchModal
          myLevelRank={myLevel}
          targetLevelLabel={levelLabel(mismatchFor.targetLevelRank)}
          onConfirm={() => { const m = mismatchFor; setMismatchFor(null); if (m) doJoin(m) }}
          onFindAnother={() => setMismatchFor(null)}
        />
      )}

      <Toaster richColors theme="dark" position="top-center" />
    </div>
  )
}
