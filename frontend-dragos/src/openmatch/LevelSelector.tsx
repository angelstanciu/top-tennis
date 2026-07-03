import { useEffect, useState } from 'react'
import { LEVELS } from './types'
import { getMyLevel, setMyLevel } from './api'

// Selectorul "Nivel de joc" din profil (temă închisă, ca restul profilului).
// Se salvează singur la selectare — nu depinde de formularul de editare al paginii.

export default function LevelSelector({ sport = 'PADEL' }: { sport?: string }) {
  const [rank, setRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    getMyLevel(sport)
      .then(l => { if (alive) setRank(l.levelRank) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [sport])

  async function pick(newRank: number) {
    if (saving || newRank === rank) return
    setSaving(true)
    setError('')
    const prev = rank
    setRank(newRank)
    try {
      await setMyLevel(sport, newRank)
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 2000)
    } catch (e: any) {
      setRank(prev)
      setError(e?.message || 'Nu am putut salva nivelul. Încearcă din nou.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 md:p-10 overflow-hidden shadow-2xl">
      <div className="absolute -left-6 -top-6 w-32 h-32 bg-lime-500/5 rounded-full blur-3xl" />
      <div className="relative z-10">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Nivel de joc · Padel</p>
          {savedFlash && (
            <span className="text-[10px] font-black text-lime-400 uppercase tracking-widest">Salvat ✓</span>
          )}
        </div>
        <h3 className="text-xl font-black text-white tracking-tight mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
          La ce nivel joci?
        </h3>
        <p className="text-xs text-slate-500 font-medium mb-6">
          Nivelul tău îi ajută pe ceilalți să găsească parteneri potriviți la meciurile deschise.
        </p>

        {loading ? (
          <div className="h-16 flex items-center text-slate-500 text-sm font-medium">Se încarcă...</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {LEVELS.map(level => {
              const selected = rank === level.rank
              return (
                <button
                  key={level.rank}
                  type="button"
                  onClick={() => pick(level.rank)}
                  disabled={saving}
                  aria-pressed={selected}
                  className={`flex flex-col items-center justify-center rounded-2xl px-2 py-3 border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400 active:scale-95 ${
                    selected
                      ? 'bg-lime-400 border-lime-400 text-slate-950 shadow-lg shadow-lime-500/25'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:border-lime-500/40 hover:text-white'
                  }`}
                >
                  <span className="text-sm font-black leading-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {level.short}
                  </span>
                  <span className={`text-[9px] font-bold leading-tight mt-0.5 ${selected ? 'text-slate-800' : 'text-slate-500'}`}>
                    {level.sub || ' '}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {rank == null && !loading && (
          <p className="mt-4 text-[11px] font-bold text-amber-400/80">
            Nu ai selectat încă nivelul — e necesar ca să creezi sau să te alături meciurilor deschise.
          </p>
        )}
        {error && <p className="mt-3 text-[11px] font-bold text-rose-400">{error}</p>}
      </div>
    </div>
  )
}
