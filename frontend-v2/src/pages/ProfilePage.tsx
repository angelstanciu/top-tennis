import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Trophy, Settings, LogOut, ChevronRight, Calendar, MapPin, 
  Target, Clock, ArrowLeft, Camera, Edit2, Shield, Save, X, ChevronDown,
  ArrowRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchPlayerHistory, updatePlayerProfile } from '../api'
import { BookingDto, PlayerUser } from '../types'

export default function ProfilePage() {
  const nav = useNavigate()
  const [player, setPlayer] = useState<PlayerUser | null>(null)
  const [history, setHistory] = useState<BookingDto[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [showAllHistory, setShowAllHistory] = useState(false)
  
  // Edit State
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    preferredSport: '',
    age: 0,
    avatarUrl: ''
  })
  const [saving, setSaving] = useState(false)

  const token = localStorage.getItem('playerToken')

  useEffect(() => {
    if (!token) {
      nav('/cont')
      return
    }

    async function loadData() {
      try {
        const base = (import.meta as any).env.VITE_API_BASE_URL || '/api'
        const res = await fetch(`${base}/player/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!res.ok) throw new Error()
        const userData = await res.json()
        setPlayer(userData)
        setEditForm({
          fullName: userData.fullName || '',
          email: userData.email || '',
          preferredSport: userData.preferredSport || 'TENNIS',
          age: userData.age || 0,
          avatarUrl: userData.avatarUrl || ''
        })

        const histData = await fetchPlayerHistory(token!)
        setHistory(histData)
      } catch (err) {
        localStorage.removeItem('playerToken')
        nav('/cont')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [token, nav])

  const matchesPlayed = history.length
  
  const rankInfo = useMemo(() => {
    if (matchesPlayed < 7) return { label: 'Bronze', color: 'from-orange-400 to-orange-700', next: 7, icon: '🥉' }
    if (matchesPlayed < 20) return { label: 'Silver', color: 'from-slate-300 to-slate-500', next: 20, icon: '🥈' }
    if (matchesPlayed < 50) return { label: 'Gold', color: 'from-yellow-300 to-yellow-600', next: 50, icon: '🥇' }
    if (matchesPlayed < 100) return { label: 'Diamond', color: 'from-cyan-300 to-cyan-500', next: 100, icon: '💎' }
    return { label: 'Platinum', color: 'from-indigo-400 to-purple-600', next: null, icon: '👑' }
  }, [matchesPlayed])

  const progress = rankInfo.next ? (matchesPlayed / rankInfo.next) * 100 : 100

  const handleLogout = () => {
    localStorage.removeItem('playerToken')
    localStorage.removeItem('playerData')
    window.dispatchEvent(new Event('auth-change'))
    nav('/')
  }

  const handleSaveProfile = async () => {
    if (!token) return
    setSaving(true)
    try {
      const updated = await updatePlayerProfile(token, editForm)
      setPlayer(updated)
      setIsEditing(false)
    } catch (err) {
      alert('Eroare la salvarea profilului.')
    } finally {
      setSaving(false)
    }
  }

  const sports = [
    { id: 'TENNIS', label: 'Tenis de Câmp', icon: '🎾' },
    { id: 'PADEL', label: 'Padel', icon: '🏓' },
    { id: 'FOOTVOLLEY', label: 'Tenis de Picior', icon: '⚽' },
    { id: 'BASKETBALL', label: 'Baschet', icon: '🏀' },
    { id: 'TABLE_TENNIS', label: 'Tenis de Masă', icon: '🏓' },
    { id: 'BEACH_VOLLEY', label: 'Volei', icon: '🏐' }
  ]

  const displayedHistory = showAllHistory ? history : history.slice(0, 3)

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-lime-500/20 border-t-lime-500 rounded-full animate-spin"></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-lime-500/30 overflow-x-hidden" style={{ fontFamily: 'Outfit, sans-serif' }}>
      
      {/* Premium Background Layer */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#1e293b,transparent)] opacity-40" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.03] blend-overlay" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-8">
        
        {/* Header Nav / Branding */}
        <div className="flex items-center justify-between mb-10">
          <div 
            onClick={() => nav('/')} 
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-lime-500 flex items-center justify-center shadow-lg shadow-lime-500/20 group-hover:scale-110 transition-transform">
              <span className="text-black font-black text-xl">S</span>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-white leading-none">
                STAR<span className="text-lime-400">ARENA</span>
              </h1>
              <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-0.5">Player Profile</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => nav('/securitate')}
              className="w-11 h-11 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all text-slate-400 hover:text-blue-400 shadow-xl"
            >
              <Shield className="w-5 h-5" />
            </button>
            <button 
              onClick={handleLogout}
              className="w-11 h-11 rounded-2xl bg-rose-500/10 border border-rose-500/10 flex items-center justify-center hover:bg-rose-500/20 transition-all text-rose-500/70 hover:text-rose-400 shadow-xl"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hero Profile Card */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative mb-10"
        >
          {/* Animated glow background */}
          <div className="absolute -inset-1 bg-gradient-to-r from-lime-500/20 via-emerald-500/20 to-sky-500/20 rounded-[3.5rem] blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000" />
          
          <div className="relative bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 md:p-10 overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            
            <div className="relative z-10 flex flex-col items-center">
              {/* Avatar with dynamic ring */}
              <div className="relative mb-8">
                <div className="absolute -inset-4 bg-gradient-to-tr from-lime-500 to-sky-500 rounded-[2.5rem] opacity-20 blur-xl animate-pulse" />
                <div className="relative w-36 h-36 rounded-[2.2rem] overflow-hidden border-4 border-slate-900 shadow-2xl bg-slate-800 p-1">
                  <img 
                    src={player?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player?.fullName || 'John'}`}
                    alt="Avatar" 
                    className="w-full h-full object-cover rounded-[1.8rem]"
                  />
                  {isEditing && (
                    <button className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Camera className="w-8 h-8 text-white" />
                    </button>
                  )}
                </div>
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -bottom-2 -right-2 bg-lime-500 text-black p-3 rounded-2xl border-4 border-slate-900 shadow-xl cursor-all-scroll"
                >
                  <Trophy className="w-5 h-5" />
                </motion.div>
              </div>

              {/* Identity */}
              {isEditing ? (
                <div className="w-full max-w-sm space-y-4 mb-8">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Nume Complet</label>
                    <input 
                      className="w-full bg-slate-950/80 border border-white/10 rounded-2xl px-6 py-4 text-center text-xl font-bold focus:border-lime-500 outline-none transition-all shadow-inner"
                      value={editForm.fullName}
                      onChange={e => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Sport Favorit</label>
                    <div className="relative">
                      <select 
                        className="w-full bg-slate-950/80 border border-white/10 rounded-2xl px-6 py-4 text-center text-sm font-bold focus:border-lime-400 outline-none appearance-none cursor-pointer hover:bg-slate-900 transition-all shadow-inner"
                        value={editForm.preferredSport}
                        onChange={e => setEditForm(prev => ({ ...prev, preferredSport: e.target.value }))}
                      >
                        {sports.map(s => (
                          <option key={s.id} value={s.id} className="bg-slate-900 text-white font-medium py-2">
                            {s.icon} {s.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center mb-8">
                  <h1 className="text-4xl font-black text-white tracking-tighter mb-2 bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">
                    {player?.fullName || 'Jucător Pro'}
                  </h1>
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/5 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-lime-500 shadow-[0_0_8px_rgba(132,204,22,0.8)]" />
                      <span className="text-xs font-bold text-slate-400 font-mono tracking-wider">{player?.phoneNumber}</span>
                    </div>
                    {player?.email && (
                      <div className="px-3 py-1 bg-white/5 border border-white/5 rounded-full text-xs font-bold text-slate-500 italic">
                        {player.email}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4 w-full max-w-sm">
                {isEditing ? (
                  <>
                    <button 
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="flex-1 flex items-center justify-center gap-2 py-4 bg-lime-500 hover:bg-lime-400 text-black rounded-2xl font-black transition-all shadow-lg shadow-lime-500/20 active:scale-95 disabled:opacity-50"
                    >
                      {saving ? <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                      {saving ? 'SE SALVEAZĂ' : 'SALVEAZĂ'}
                    </button>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="flex items-center justify-center px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all shadow-xl"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-white/10 hover:bg-white/15 text-white rounded-[1.5rem] font-black text-sm tracking-widest border border-white/10 transition-all active:scale-95 group/btn shadow-2xl"
                  >
                    <Settings className="w-5 h-5 text-lime-400 group-hover/btn:rotate-90 transition-transform duration-500" />
                    CONFIGUREAZĂ PROFILUL
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Dynamic Stats Section */}
        <div className="grid grid-cols-2 gap-5 mb-10">
          <motion.div 
            whileHover={{ y: -5 }}
            className="group relative bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-7 overflow-hidden shadow-2xl"
          >
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl group-hover:bg-sky-500/20 transition-all" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500/20 to-sky-600/10 flex items-center justify-center text-sky-400 border border-sky-500/20 mb-4 group-hover:scale-110 transition-transform duration-500">
                <Target className="w-7 h-7" />
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Meciuri Totale</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white">{matchesPlayed}</span>
                <span className="text-xs font-bold text-sky-500/60 uppercase">Activ</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ y: -5 }}
            className="group relative bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-7 overflow-hidden shadow-2xl"
          >
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl group-hover:bg-orange-500/20 transition-all" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 flex items-center justify-center text-orange-400 border border-orange-500/20 mb-4 group-hover:scale-110 transition-transform duration-500">
                <div className="text-2xl">{sports.find(s => s.id === player?.preferredSport)?.icon || '🎾'}</div>
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Sport Favorit</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white truncate max-w-[120px]">
                  {sports.find(s => s.id === player?.preferredSport)?.label?.split(' ')[0] || 'TBD'}
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Pro Ranking Progress */}
        <div className="bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 md:p-10 mb-10 relative overflow-hidden shadow-2xl group">
          <div className={`absolute inset-0 bg-gradient-to-r ${rankInfo.color} opacity-[0.05] group-hover:opacity-[0.08] transition-opacity duration-700`} />
          
          <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
            {/* Circular Premium Progress */}
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 filter drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                <circle cx="80" cy="80" r="72" className="fill-none stroke-slate-800/50 stroke-[8]" />
                <motion.circle 
                  cx="80" cy="80" r="72" 
                  className={`fill-none stroke-[10] stroke-current ${rankInfo.color.split(' ')[1].replace('to-', 'text-')}`}
                  strokeDasharray={452.4}
                  initial={{ strokeDashoffset: 452.4 }}
                  animate={{ strokeDashoffset: 452.4 - (452.4 * progress) / 100 }}
                  transition={{ duration: 2, ease: "circOut" }}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center group-hover:scale-110 transition-transform duration-700">
                 <div className="text-5xl drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{rankInfo.icon}</div>
                 <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mt-1">Status</div>
              </div>
            </div>

            <div className="flex-1 w-full text-center md:text-left">
              <div className="mb-6">
                <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-gradient-to-r ${rankInfo.color} text-white shadow-xl shadow-lime-950/20 mb-4`}>
                  <Shield className="w-4 h-4" />
                  <span className="text-xs font-black uppercase tracking-widest">NIVEL {rankInfo.label}</span>
                </div>
                <h3 className="text-3xl font-black text-white tracking-tighter leading-tight">
                  Construiește-ți <br />
                  <span className="text-lime-400 italic">legenda</span> în arenă.
                </h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Progres Curent</p>
                    <p className="text-lg font-black text-white">{matchesPlayed} <span className="text-slate-500 text-sm">/ {rankInfo.next || matchesPlayed}</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mastery</p>
                    <p className="text-lg font-black text-lime-400">{Math.round(progress)}%</p>
                  </div>
                </div>
                <div className="h-4 w-full bg-slate-950 rounded-full border border-white/5 p-1 relative shadow-inner overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className={`h-full rounded-full bg-gradient-to-r ${rankInfo.color} relative overflow-hidden`}
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[shimmer_2s_linear_infinite]" />
                  </motion.div>
                </div>
                {rankInfo.next && (
                  <p className="text-[11px] font-bold text-slate-500 flex items-center gap-2 justify-center md:justify-start">
                    <ArrowRight className="w-3 h-3 text-lime-500" />
                    Mai ai nevoie de <span className="text-white">{rankInfo.next - matchesPlayed}</span> meciuri pentru noul rang
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reservations Timeline */}
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-[3.5rem] p-8 md:p-10 mb-24 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-10">
            <h2 className="text-2xl font-black text-white tracking-tighter flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-lime-500/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-lime-400" />
              </div>
              ISTORIC ACTIVITATE
            </h2>
            <button 
              onClick={() => setShowAllHistory(!showAllHistory)}
              className="w-full sm:w-auto text-[10px] font-black text-lime-400 hover:text-black transition-all uppercase tracking-widest px-6 py-3 bg-lime-500/10 hover:bg-lime-500 rounded-2xl border border-lime-500/20 shadow-lg"
            >
              {showAllHistory ? 'RESTRÂNGE LISTA' : 'VEZI TOT ISTORICUL'}
            </button>
          </div>

          <div className="space-y-6 relative">
            {/* Timeline Line */}
            {displayedHistory.length > 1 && (
              <div className="absolute left-10 top-5 bottom-5 w-px bg-gradient-to-b from-lime-500/20 via-slate-800 to-transparent hidden md:block" />
            )}

            <AnimatePresence mode="popLayout">
              {displayedHistory.length > 0 ? displayedHistory.map((item, idx) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="relative group cursor-pointer"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-6 p-6 bg-slate-950/40 border border-white/5 rounded-[2.5rem] hover:border-lime-500/30 transition-all duration-500 hover:bg-slate-900/60 active:scale-[0.98]">
                    <div className="relative z-10 w-20 h-20 md:w-24 md:h-24 rounded-[2rem] bg-slate-900 border border-white/5 flex flex-col items-center justify-center text-center shadow-2xl group-hover:scale-105 transition-transform duration-500 shrink-0">
                      <div className="text-3xl mb-1">
                        {item.court?.sportType === 'TENNIS' ? '🎾' : item.court?.sportType === 'PADEL' ? '🏓' : item.court?.sportType === 'BASKETBALL' ? '🏀' : '⚽'}
                      </div>
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{item.court?.sportType?.split('_')[0]}</span>
                    </div>

                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="text-lg font-black text-white tracking-tight uppercase leading-tight">{item.court?.name} Bascov</h4>
                          <div className="flex items-center gap-2 mt-1">
                             <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase">
                               <MapPin className="w-3 h-3 text-lime-500" /> STAR ARENA
                             </span>
                             <div className="w-1 h-1 rounded-full bg-slate-700" />
                             <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">FINALIZAT</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-black text-lime-400 font-mono tracking-tighter leading-none mb-1">{item.startTime}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.bookingDate}</p>
                        </div>
                      </div>
                      <div className="flex gap-4 mt-4">
                        <div className="px-3 py-1.2 rounded-lg bg-white/5 border border-white/5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          {item.endTime} Final
                        </div>
                        <div className="px-3 py-1.2 rounded-lg bg-lime-500/10 border border-lime-500/10 text-[9px] font-black text-lime-500 uppercase tracking-widest">
                          {item.price} RON
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <div className="w-24 h-24 rounded-[2.5rem] bg-slate-900/50 flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-2xl">
                    <Calendar className="w-10 h-10 text-slate-700" />
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tight mb-2">NICIUN MECI ÎNREGISTRAT</h3>
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-8 max-w-[200px] mx-auto leading-relaxed">Începe-ți cariera de jucător și ocupă locul în arenă.</p>
                  <button 
                    onClick={() => nav('/rezerva')}
                    className="px-10 py-4 bg-lime-500 hover:bg-lime-400 text-black font-black rounded-2xl transition-all shadow-xl shadow-lime-500/20 active:scale-95 text-xs tracking-widest"
                  >
                    RESERVĂ ACUM
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
      
      {/* Animations Style */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}
