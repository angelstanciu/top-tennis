import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Trophy, Settings, LogOut, ChevronRight, Calendar, MapPin, 
  Target, Clock, ArrowLeft, Camera, Edit2, Shield, Save, X, ChevronDown,
  ArrowRight, Loader2, Star, Zap, Crown, Gem
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchPlayerHistory, updatePlayerProfile, cancelBooking } from '../api'
import { BookingDto, PlayerUser } from '../types'
import { toast } from 'sonner'
import { ConfirmModal } from '../components/ui/confirm-modal'

export default function ProfilePage() {
  const nav = useNavigate()
  const [player, setPlayer] = useState<PlayerUser | null>(null)
  const [history, setHistory] = useState<BookingDto[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  
  // Edit State
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    preferredSport: '',
    age: 0,
    gender: '',
    phoneNumber: '',
    avatarUrl: ''
  })
  const [saving, setSaving] = useState(false)

  const token = localStorage.getItem('playerToken')

  // Account Claim State
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [claimOtp, setClaimOtp] = useState('')
  const [claimPhone, setClaimPhone] = useState('')
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimError, setClaimError] = useState('')
  const [claimOtpSent, setClaimOtpSent] = useState(false)
  const [isVerificationOnly, setIsVerificationOnly] = useState(false)

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [bookingToCancel, setBookingToCancel] = useState<number | null>(null)

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
        if (!res.ok) {
           if (res.status === 401 || res.status === 403) throw new Error("UNAUTHORIZED");
           throw new Error("SERVER_ERROR");
        }
        const userData = await res.json()
        setPlayer(userData)
        setEditForm({
          fullName: userData.fullName || '',
          email: userData.email || '',
          preferredSport: userData.preferredSport || 'TENNIS',
          age: userData.age || 0,
          gender: userData.gender || '',
          phoneNumber: userData.phoneNumber || '',
          avatarUrl: userData.avatarUrl || ''
        })

        const histData = await fetchPlayerHistory(token!)
        setHistory(histData)
      } catch (err: any) {
        if (err.message === "UNAUTHORIZED" || err.message?.includes("Token invalid") || err.message?.includes("Eroare de comunicare")) {
           localStorage.removeItem('playerToken')
           nav('/cont')
        } else {
           console.error("Profile load failed:", err)
        }
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [token, nav])

  const matchesPlayed = useMemo(() => {
    const now = new Date()
    return history.filter(b => {
      if (b.status !== 'CONFIRMED') return false
      const bDate = new Date(b.bookingDate)
      const [sh, sm] = b.startTime.split(':').map(Number)
      const [eh, em] = b.endTime.split(':').map(Number)
      bDate.setHours(eh, em, 0, 0)
      return bDate <= now
    }).length
  }, [history])
  
  const rankInfo = useMemo(() => {
    if (matchesPlayed < 10) return { label: 'Bronze', color: 'from-orange-400 to-orange-700', next: 10, icon: <Shield className="w-16 h-16 text-orange-400 drop-shadow-[0_0_15px_rgba(251,146,60,0.5)]" />, level: 1 }
    if (matchesPlayed < 25) return { label: 'Silver', color: 'from-slate-300 to-slate-500', next: 25, icon: <Zap className="w-16 h-16 text-slate-300 drop-shadow-[0_0_15px_rgba(203,213,225,0.5)]" />, level: 2 }
    if (matchesPlayed < 55) return { label: 'Gold', color: 'from-yellow-300 to-yellow-600', next: 55, icon: <Crown className="w-16 h-16 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />, level: 3 }
    if (matchesPlayed < 105) return { label: 'Diamond', color: 'from-cyan-300 to-cyan-500', next: 105, icon: <Gem className="w-16 h-16 text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />, level: 4 }
    return { label: 'Platinum', color: 'from-indigo-400 to-purple-600', next: null, icon: <Trophy className="w-16 h-16 text-purple-400 drop-shadow-[0_0_15px_rgba(192,132,252,0.5)]" />, level: 5 }
  }, [matchesPlayed])

  const progress = rankInfo.next ? (matchesPlayed / rankInfo.next) * 100 : 100

  const executeLogout = () => {
    localStorage.removeItem('playerToken')
    localStorage.removeItem('playerData')
    window.dispatchEvent(new Event('auth-change'))
    nav('/')
  }

  const handleLogout = () => {
    setShowLogoutConfirm(true)
  }

  const handleSaveProfile = async () => {
    if (!token) return
    setSaving(true)
    const sanitizedForm = {
      ...editForm,
      email: editForm.email?.trim() === '' ? undefined : editForm.email?.trim()
    }
    try {
      const updated = await updatePlayerProfile(token, sanitizedForm)
      setPlayer(updated)
      setIsEditing(false)
      localStorage.setItem('playerData', JSON.stringify(updated))
      window.dispatchEvent(new Event('auth-change'))
      toast.success('Profilul a fost actualizat cu succes!')
    } catch (err: any) {
      if (err.message?.includes('deja folosit') || err.message?.includes('deja asociat')) {
        setClaimPhone(editForm.phoneNumber)
        setClaimOtp('')
        setClaimOtpSent(false)
        setClaimError('')
        setIsVerificationOnly(false)
        setShowClaimModal(true)
      } else {
        toast.error(err.message || 'Eroare la salvarea profilului.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleStartClaim = async () => {
    setClaimLoading(true)
    setClaimError('')
    try {
      const { requestPlayerOtp } = await import('../api')
      await requestPlayerOtp(claimPhone)
      setClaimOtpSent(true)
    } catch (err: any) {
      setClaimError(err.message)
    } finally {
      setClaimLoading(false)
    }
  }

  const handleVerifyClaim = async () => {
    setClaimLoading(true)
    setClaimError('')
    try {
      let updatedUser: PlayerUser;
      if (isVerificationOnly) {
         const { verifyUserPhone } = await import('../api')
         updatedUser = await verifyUserPhone(token!, claimOtp)
      } else {
         const { linkPlayerPhone } = await import('../api')
         updatedUser = await linkPlayerPhone(token!, claimPhone, claimOtp)
      }
      
      // Auto-refresh logic: re-fetch the absolute newest profile and history
      try {
        const base = (import.meta as any).env.VITE_API_BASE_URL || '/api'
        const res = await fetch(`${base}/player/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const freshProfile = await res.json()
          setPlayer(freshProfile)
          localStorage.setItem('playerData', JSON.stringify(freshProfile))
        } else {
          setPlayer(updatedUser)
          localStorage.setItem('playerData', JSON.stringify(updatedUser))
        }

        const freshHistory = await fetchPlayerHistory(token!)
        setHistory(freshHistory)
      } catch (err) {
        // Fallback to the returned user data if fetching fails
        setPlayer(updatedUser)
        localStorage.setItem('playerData', JSON.stringify(updatedUser))
        console.error('Eroare la reîmprospătarea automată după revendicare:', err)
      }

      setShowClaimModal(false)
      setIsVerificationOnly(false)
      setPlayer(updatedUser)
      setIsVerificationOnly(false)
      setShowClaimModal(false)
      toast.success(isVerificationOnly ? 'Numărul de telefon a fost verificat cu succes!' : 'Telefonul a fost conectat cu succes! Istoricul tău a fost actualizat.')
      // optionally trigger re-fetch of history
      const data = await fetchPlayerHistory(token!)
      setHistory(data)
    } catch (err: any) {
      setClaimError(err.message)
    } finally {
      setClaimLoading(false)
    }
  }

  const sports = [
    { id: 'TENNIS', label: 'Tenis', icon: '🎾' },
    { id: 'PADEL', label: 'Padel', icon: '🏓' },
    { id: 'FOOTVOLLEY', label: 'Tenis de picior', icon: '⚽' },
    { id: 'BASKETBALL', label: 'Baschet', icon: '🏀' },
    { id: 'TABLE_TENNIS', label: 'Tenis de Masă', icon: '🏓' },
    { id: 'BEACH_VOLLEY', label: 'Volei pe Plajă', icon: '🏐' }
  ]

  const { activeBookings, pastBookings } = useMemo(() => {
    const now = new Date()
    const active: BookingDto[] = []
    const past: BookingDto[] = []

    history.forEach(b => {
      const bDate = new Date(b.bookingDate)
      const [sh, sm] = b.startTime.split(':').map(Number)
      bDate.setHours(sh, sm, 0, 0)

      if (bDate > now && b.status !== 'CANCELLED') {
        active.push(b)
      } else {
        past.push(b)
      }
    })

    // Sort active ascending (closest to now first)
    active.sort((a,b) => {
      const dateA = new Date(a.bookingDate)
      const [hA, mA] = a.startTime.split(':').map(Number)
      dateA.setHours(hA, mA)
      
      const dateB = new Date(b.bookingDate)
      const [hB, mB] = b.startTime.split(':').map(Number)
      dateB.setHours(hB, mB)
      
      return dateA.getTime() - dateB.getTime()
    })

    // Sort past descending (most recent first)
    past.sort((a,b) => {
      const dateA = new Date(a.bookingDate)
      const [hA, mA] = a.startTime.split(':').map(Number)
      dateA.setHours(hA, mA)
      
      const dateB = new Date(b.bookingDate)
      const [hB, mB] = b.startTime.split(':').map(Number)
      dateB.setHours(hB, mB)
      
      return dateB.getTime() - dateA.getTime()
    })

    return { activeBookings: active, pastBookings: past }
  }, [history])

  const handleCancelClick = (id: number) => {
    setBookingToCancel(id)
    setShowCancelModal(true)
  }

  const confirmCancel = async () => {
    if (!bookingToCancel) return
    try {
      setLoading(true)
      await cancelBooking(bookingToCancel)
      setHistory(prev => prev.filter(b => b.id !== bookingToCancel))
      setShowCancelModal(false)
      setBookingToCancel(null)
      toast.success('Rezervarea a fost anulată cu succes!')
    } catch (err: any) {
      toast.error(err.message || "Eroare la anularea rezervării.")
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (time: string) => {
    if (!time) return ""
    return time.split(':').slice(0, 2).join(':')
  }

  const isCancellable = (bookingDate: string, startTime: string) => {
    try {
      const now = new Date()
      // bookingDate is YYYY-MM-DD
      const [year, month, day] = bookingDate.split('-').map(Number)
      const [hour, minute] = startTime.split(':').map(Number)
      const bookingTime = new Date(year, month - 1, day, hour, minute)
      
      const diffMs = bookingTime.getTime() - now.getTime()
      const diffHours = diffMs / (1000 * 60 * 60)
      
      return diffHours >= 24
    } catch {
      return false
    }
  }

  const getLocationLink = (court: any) => {
    // Star Arena link (correct search URL)
    const starArena = "https://www.google.com/maps/search/Star+Arena+Bascov+Arges"
    // Cosmin Top Tenis link
    const topTenis = "https://www.google.com/maps/search/Cosmin+Top+Tenis+Pitesti+Arges"
    
    if (court?.sportType === 'PADEL' && court?.indoor) {
      return starArena
    }
    return topTenis
  }

  const displayedHistory = showAllHistory ? pastBookings : pastBookings.slice(0, 3)

  const getInitials = (name: string) => {
    if (!name) return 'S'
    const parts = name.split(' ').filter(p => !!p)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return name.slice(0, 1).toUpperCase()
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64 = reader.result as string
      try {
        setSaving(true)
        const updated = await updatePlayerProfile(token!, { ...editForm, avatarUrl: base64 })
        setPlayer(updated)
        setEditForm(prev => ({ ...prev, avatarUrl: base64 }))
        toast.success('Poza de profil a fost actualizată!')
      } catch (err) {
        toast.error('Eroare la încărcarea pozei.')
      } finally {
        setSaving(false)
      }
    }
    reader.readAsDataURL(file)
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 gap-6">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-lime-500/20 border-t-lime-500 rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center text-lime-500 font-black">S</div>
      </div>
      <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] animate-pulse">Sincronizare Profil...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans selection:bg-lime-500/30 overflow-x-hidden" style={{ fontFamily: 'Outfit, sans-serif' }}>
      
      {/* Premium Background Layer */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#0f172a,transparent)] opacity-60" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-[0.02] blend-overlay" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-800/50 to-transparent" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-12">
        
        {/* Modern Header */}
        <div className="flex items-center justify-between mb-12">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => nav('/')} 
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-gradient-to-br from-lime-400 to-lime-600 flex items-center justify-center shadow-xl shadow-lime-500/20 group-hover:scale-110 transition-all duration-500">
              <span className="text-black font-black text-xl md:text-2xl italic">S</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl md:text-2xl font-black tracking-tighter text-white leading-none">
                STAR<span className="text-lime-400">ARENA</span>
              </h1>
              <p className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-0.5">Premium Hub</p>
            </div>
          </motion.div>

          <div className="flex gap-4">
            <button 
              onClick={() => nav('/securitate')}
              className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 transition-all text-slate-400 hover:text-blue-400 shadow-2xl backdrop-blur-xl"
            >
              <Shield className="w-5 h-5" />
            </button>
            <button 
              onClick={handleLogout}
              className="px-6 h-12 rounded-2xl bg-rose-500/5 border border-rose-500/10 flex items-center gap-2 hover:bg-rose-500/10 transition-all text-rose-500/70 hover:text-rose-400 shadow-2xl backdrop-blur-xl font-bold text-xs uppercase tracking-widest"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Deconectare</span>
            </button>
          </div>
        </div>

        {/* Verification Banner */}
        {player && player.phoneVerified === false && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 md:p-6 bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="text-sm md:text-base font-black text-amber-500 uppercase tracking-widest">Protejează-ți contul: Verifică telefonul</h3>
                <p className="text-xs text-amber-500/70 mt-0.5 font-bold">Vei primi un cod prin SMS pentru confirmare.</p>
              </div>
            </div>
            <button 
              onClick={() => {
                setClaimPhone(player.phoneNumber || '')
                setClaimOtp('')
                setClaimOtpSent(false)
                setClaimError('')
                setIsVerificationOnly(true)
                setShowClaimModal(true)
              }}
              className="px-6 py-4 bg-amber-500 hover:bg-amber-400 text-black rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-xl"
            >
              Verifică Acum
            </button>
          </motion.div>
        )}

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24">
          
          {/* Main Profile Card (2 cols on md) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:col-span-2 relative group"
          >
            <div className="relative h-full bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 md:p-12 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-lime-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
                {/* Avatar Section */}
                <div className="relative">
                  <div className="absolute -inset-4 bg-gradient-to-tr from-lime-500/20 to-sky-500/20 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition duration-1000" />
                  <div className="relative w-32 h-32 md:w-44 md:h-44 rounded-[2.5rem] overflow-hidden border-2 border-white/10 shadow-2xl bg-slate-800 p-1 flex items-center justify-center group/avatar">
                    {player?.avatarUrl ? (
                      <img 
                        src={player.avatarUrl}
                        alt="Avatar" 
                        className="w-full h-full object-cover rounded-[2.2rem]"
                      />
                    ) : (
                      <div className="w-full h-full rounded-[2.2rem] bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                        <span className="text-5xl font-black text-white/50 tracking-widest">{getInitials(player?.fullName || '')}</span>
                      </div>
                    )}
                    <label className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer">
                      <Camera className="w-8 h-8 text-white" />
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                    </label>
                  </div>
                </div>

                {/* Identity Info */}
                <div className="flex-1 text-center md:text-left space-y-4">
                  {isEditing ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                       <input 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-center md:text-left text-2xl font-black text-white focus:border-lime-500 outline-none transition-all"
                        value={editForm.fullName}
                        onChange={e => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                        placeholder="Nume Complet"
                      />
                      <div className="flex flex-col gap-4">
                        <input 
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm font-bold text-slate-300 focus:border-lime-500 outline-none transition-all font-mono"
                          value={editForm.phoneNumber}
                          onChange={e => setEditForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                          placeholder="Telefon"
                        />
                        <input 
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm font-bold text-slate-300 focus:border-lime-500 outline-none transition-all"
                          value={editForm.email}
                          onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="Email"
                        />
                      </div>

                      {/* Added Missing Fields: Age, Gender, Sport */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input 
                          type="number"
                          className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-slate-300 focus:border-lime-500 outline-none transition-all"
                          value={editForm.age || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, age: parseInt(e.target.value) || 0 }))}
                          placeholder="Vârstă"
                        />
                        <select 
                          className="bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-slate-300 focus:border-lime-500 outline-none transition-all"
                          value={editForm.gender}
                          onChange={e => setEditForm(prev => ({ ...prev, gender: e.target.value }))}
                        >
                          <option value="">Alege Sexul</option>
                          <option value="MALE">Masculin</option>
                          <option value="FEMALE">Feminin</option>
                          <option value="OTHER">Altul</option>
                        </select>
                      </div>

                      <select 
                        className="w-full bg-slate-900 border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-slate-300 focus:border-lime-500 outline-none transition-all"
                        value={editForm.preferredSport}
                        onChange={e => setEditForm(prev => ({ ...prev, preferredSport: e.target.value }))}
                      >
                        <option value="">Alege Sportul Preferat</option>
                        {sports.map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>

                      <div className="flex gap-4">
                        <button 
                          onClick={handleSaveProfile}
                          disabled={saving}
                          className="flex-1 bg-lime-500 hover:bg-lime-400 text-black px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          Salveaza
                        </button>
                        <button 
                          onClick={() => setIsEditing(false)}
                          className="px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <motion.h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                          {player?.fullName || 'Jucător Pro'}
                        </motion.h2>
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 opacity-60">
                           <span className="text-xs font-bold text-slate-300 font-mono tracking-widest uppercase">{player?.phoneNumber || 'Fără telefon'}</span>
                           {player?.email && (
                             <>
                               <div className="w-1 h-1 rounded-full bg-slate-700" />
                               <span className="text-xs font-bold text-slate-400 italic break-all md:break-words line-clamp-1 hover:line-clamp-none transition-all cursor-help">{player.email}</span>
                             </>
                           )}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-4">
                        <button 
                          onClick={() => setIsEditing(true)}
                          className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/5 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-300 hover:bg-white/10 hover:text-white transition-all group/edit"
                        >
                          <Edit2 className="w-3.5 h-3.5 group-hover/edit:rotate-12 transition-transform" />
                          Editează Profil
                        </button>
                        <button 
                          onClick={() => nav('/rezerva')}
                          className="flex items-center gap-2 px-6 py-3 bg-lime-500 hover:bg-lime-400 text-black rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          Rezervă meci
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Matches Stat Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-slate-950/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center group hover:border-sky-500/30 transition-all duration-700 h-full min-h-[300px]"
          >
            <div className="w-20 h-20 rounded-3xl bg-sky-500/10 flex items-center justify-center text-sky-400 border border-sky-500/10 mb-6 group-hover:scale-110 group-hover:bg-sky-500/20 transition-all duration-500">
              <Target className="w-10 h-10" />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Meciuri Finalizate</p>
            <span className="text-7xl font-black text-white tracking-tighter">{matchesPlayed}</span>
            <div className="mt-6 px-4 py-2 bg-sky-500/5 rounded-xl border border-sky-500/10">
               <span className="text-[10px] font-bold text-sky-500 uppercase tracking-widest">
                 {matchesPlayed === 0 ? 'Te așteptăm pe teren' : 'Performanță Excelentă'}
               </span>
            </div>
          </motion.div>


          {/* Pro Ranking Progress Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="md:col-span-2 bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden group shadow-2xl"
          >
            <div className={`absolute inset-0 bg-gradient-to-r ${rankInfo.color} opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-700`} />
            
            <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
              {/* Circular Premium Progress */}
              <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
                <svg className="w-full h-full -rotate-90 filter drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]">
                  <circle cx="88" cy="88" r="80" className="fill-none stroke-slate-800/50 stroke-[8]" />
                  <motion.circle 
                    cx="88" cy="88" r="80" 
                    className={`fill-none stroke-[10] stroke-current ${rankInfo.color.split(' ')[1].replace('to-', 'text-')}`}
                    strokeDasharray={502.6}
                    initial={{ strokeDashoffset: 502.6 }}
                    animate={{ strokeDashoffset: 502.6 - (502.6 * progress) / 100 }}
                    transition={{ duration: 2, ease: "circOut" }}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center group-hover:scale-110 transition-transform duration-700">
                   <div className="text-6xl mb-1">{rankInfo.icon}</div>
                   <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em]">Status Curent</div>
                </div>
              </div>

              <div className="flex-1 w-full text-center md:text-left">
                <div className="mb-6">
                  <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-gradient-to-r ${rankInfo.color} text-white shadow-xl mb-4`}>
                    <Star className="w-4 h-4 fill-white" />
                    <span className="text-xs font-black uppercase tracking-widest">NIVEL {rankInfo.label}</span>
                  </div>
                  <h3 className="text-3xl font-black text-white leading-tight">
                    {matchesPlayed === 0 ? (
                      <>
                        Descoperă pasiunea <br />
                        <span className="text-lime-400 italic">sportului</span>&nbsp;în arenă.
                      </>
                    ) : (
                      <>
                        Evoluția ta <br />
                        în&nbsp;<span className="text-lime-400 italic">arenă</span>.
                      </>
                    )}
                  </h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Meciuri Contorizate</p>
                      <p className="text-xl font-black text-white">{matchesPlayed} <span className="text-slate-500 text-sm">/ {rankInfo.next || matchesPlayed}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mastery</p>
                      <p className="text-xl font-black text-lime-400">{Math.round(progress)}%</p>
                    </div>
                  </div>
                  <div className="h-4 w-full bg-black/40 rounded-full border border-white/5 p-1 relative overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      className={`h-full rounded-full bg-gradient-to-r ${rankInfo.color} relative overflow-hidden`}
                    >
                      <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[shimmer_2s_linear_infinite]" />
                    </motion.div>
                  </div>
                  {rankInfo.next && (
                    <p className="text-[11px] font-bold text-slate-500 flex items-center gap-2 justify-center md:justify-start">
                      <ArrowRight className="w-3.5 h-3.5 text-lime-500" />
                      Mai ai nevoie de <span className="text-white">{rankInfo.next - matchesPlayed}</span> meciuri pentru noul rang
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Sport Favorit Detail Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="group relative bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 flex flex-col items-center justify-center text-center overflow-hidden h-full shadow-2xl"
          >
            <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-lime-500/5 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-lime-500 text-black flex items-center justify-center mb-6 shadow-xl shadow-lime-500/20 group-hover:scale-110 transition-transform duration-500">
                <div className="text-4xl">{sports.find(s => s.id === player?.preferredSport)?.icon || '🎾'}</div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Sport Favorit</p>
                <h3 className="text-2xl font-black text-white tracking-widest uppercase">
                  {sports.find(s => s.id === player?.preferredSport)?.label || 'Nespecificat'}
                </h3>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Modern Activity Feed */}
        <div className="space-y-8">
          {activeBookings.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-lime-400" />
                <h3 className="text-xl font-black text-white tracking-widest uppercase">Rezervări Active</h3>
              </div>
              <div className="grid grid-cols-1 gap-6">
                {activeBookings.map((item, idx) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group relative bg-slate-900/60 backdrop-blur-3xl border border-lime-500/10 rounded-3xl p-5 flex flex-col md:flex-row items-center gap-6 hover:border-lime-500/30 transition-all duration-500 shadow-xl"
                  >
                    <div className="flex items-center gap-5 flex-1 w-full">
                      <div className="w-16 h-16 shrink-0 bg-lime-500 rounded-2xl flex flex-col items-center justify-center shadow-lg">
                         <span className="text-[9px] font-black text-black/50 uppercase tracking-widest leading-none mb-0.5">
                           {new Date(item.bookingDate).toLocaleDateString('ro-RO', { month: 'short' })}
                         </span>
                         <span className="text-2xl font-black text-black leading-none italic">
                           {new Date(item.bookingDate).getDate()}
                         </span>
                      </div>
                      <div className="flex-1 text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-2 mb-0.5">
                          <span className="text-[9px] font-black text-lime-500 uppercase tracking-widest bg-lime-500/10 px-2 py-0.5 rounded-full">Viitor</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Teren {item.court?.name} {item.court?.indoor ? '• Indoor' : '• Exterior'}
                          </span>
                        </div>
                        <h4 className="text-xl font-black text-white tracking-tight leading-none uppercase">
                           {item.court?.sportType === 'TENNIS' ? 'Tenis' : 
                            item.court?.sportType === 'PADEL' ? 'Padel' : 
                            item.court?.sportType === 'BASKETBALL' ? 'Baschet' : 
                            (item.court?.sportType as any) === 'FOOTBALL' || item.court?.sportType === 'FOOTVOLLEY' ? 'Tenis de picior' : 'Sport'}
                         </h4>
                         <div className="flex items-center justify-center md:justify-start gap-4 text-slate-400 font-mono mt-1.5">
                           <div className="flex items-center gap-1.5">
                             <Clock className="w-3 h-3 text-slate-600" />
                             <span className="text-[10px] font-bold tracking-wider">{formatTime(item.startTime)} - {formatTime(item.endTime)}</span>
                           </div>
                         </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <a 
                        href={getLocationLink(item.court)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex-1 md:flex-none px-4 py-3 bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                      >
                         <MapPin className="w-3 h-3" />
                         Locație
                      </a>
                      <button 
                        onClick={() => {
                          if (isCancellable(item.bookingDate, item.startTime)) {
                            handleCancelClick(item.id)
                          }
                        }}
                        disabled={!isCancellable(item.bookingDate, item.startTime)}
                        className={`flex-1 md:flex-none px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                          isCancellable(item.bookingDate, item.startTime)
                            ? 'bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white active:scale-95'
                            : 'bg-slate-800 border border-white/5 text-slate-500 cursor-not-allowed'
                        }`}
                        title={!isCancellable(item.bookingDate, item.startTime) ? "Anularea este posibilă cu maxim 24h înainte" : ""}
                      >
                         Anulează
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-10">
            <div>
              <h3 className="text-3xl font-black text-white tracking-widest uppercase text-center sm:text-left">Istoric Activitate</h3>
              <p className="text-xs font-bold text-slate-500 mt-1 text-center sm:text-left">Meciurile tale trecute</p>
            </div>
            {pastBookings.length > 3 && (
              <button 
                onClick={() => setShowAllHistory(!showAllHistory)}
                className="w-full sm:w-auto text-[10px] font-black text-lime-400 hover:text-black transition-all uppercase tracking-widest px-8 py-4 bg-lime-500/10 hover:bg-lime-500 rounded-2xl border border-lime-500/20 shadow-xl backdrop-blur-xl"
              >
                {showAllHistory ? 'RESTRÂNGE LISTA' : 'VEZI TOT ISTORICUL'}
              </button>
            )}
          </div>

          <div className="space-y-6 relative">
            <AnimatePresence mode="popLayout">
              {displayedHistory.length > 0 ? displayedHistory.map((item, idx) => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group relative bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 hover:bg-slate-900/60 transition-all duration-500 hover:border-lime-500/30 shadow-xl"
                >
                  <div className="flex items-center gap-6 flex-1 w-full opacity-60">
                    {/* Date Block */}
                    <div className="w-20 h-20 shrink-0 bg-slate-950 rounded-[1.8rem] border border-white/10 flex flex-col items-center justify-center shadow-inner group-hover:bg-slate-800 transition-colors duration-500">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                         {new Date(item.bookingDate).toLocaleDateString('ro-RO', { month: 'short' })}
                       </span>
                       <span className="text-3xl font-black text-slate-400 leading-none italic">
                         {new Date(item.bookingDate).getDate()}
                       </span>
                    </div>

                    <div className="flex-1 space-y-2 text-center md:text-left">
                      <div className="flex items-center justify-center md:justify-start gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${item.status === 'CANCELLED' ? 'text-rose-500 bg-rose-500/10' : 'text-slate-500 bg-slate-500/10'} px-2 py-0.5 rounded-full`}>
                          {item.status === 'CANCELLED' ? 'Anulată' : 'Finalizată'}
                        </span>
                        <div className="w-1 h-1 rounded-full bg-slate-700" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Teren {item.court?.name}</span>
                      </div>
                      <h4 className="text-2xl font-black text-slate-400 tracking-tight leading-none uppercase">
                        {item.court?.sportType === 'TENNIS' ? 'Tenis' : 
                         item.court?.sportType === 'PADEL' ? 'Padel' : 
                         item.court?.sportType === 'BASKETBALL' ? 'Baschet' : 
                         (item.court?.sportType as any) === 'FOOTBALL' || item.court?.sportType === 'FOOTVOLLEY' ? 'Tenis de picior' : 'Sport'}
                      </h4>
                      <div className="flex items-center justify-center md:justify-start gap-4 text-slate-500 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-600" />
                          <span className="text-[11px] font-bold tracking-wider">{formatTime(item.startTime)} - {formatTime(item.endTime)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
                    <div className="px-6 py-3 bg-white/5 border border-white/5 rounded-2xl flex flex-col items-center justify-center shrink-0 text-center">
                       <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Cost</span>
                       <span className="text-sm font-black text-white italic">{item.price} RON</span>
                    </div>
                  </div>
                </motion.div>
              )) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20 bg-slate-900/40 rounded-[2.5rem] border border-white/5"
                >
                  <div className="w-24 h-24 rounded-[2.5rem] bg-slate-900/50 flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-2xl">
                    <Calendar className="w-10 h-10 text-slate-700" />
                  </div>
                  <h3 className="text-xl font-black text-white tracking-tight mb-2 uppercase">Niciun meci înregistrat</h3>
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

        <AnimatePresence>
          {showCancelModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-center justify-center px-4 backdrop-blur-md bg-black/60"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[2rem] p-8 shadow-2xl text-center"
              >
                <div className="w-16 h-16 bg-rose-500/20 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <X className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Anulezi rezervarea?</h3>
                <p className="text-slate-400 text-sm font-medium mb-8">
                  Această acțiune este ireversibilă. Poți anula doar cu cel puțin <span className="text-rose-400 font-bold">24 ore</span> înainte. Ești sigur?
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowCancelModal(false)}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black text-[10px] tracking-widest uppercase transition-all"
                  >
                    Nu, înapoi
                  </button>
                  <button 
                    onClick={confirmCancel}
                    className="flex-1 py-4 bg-rose-500 hover:bg-rose-400 text-white rounded-xl font-black text-[10px] tracking-widest uppercase transition-all"
                  >
                    Da, anulează
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Account Claim Modal */}
        <AnimatePresence>
          {showClaimModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center px-4 backdrop-blur-md bg-black/60"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-2xl relative overflow-hidden"
              >
                {/* Background Decor */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-lime-500/10 rounded-full blur-3xl" />
                
                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500 mb-6 mx-auto">
                    <Shield className="w-8 h-8" />
                  </div>
                  
                  <h3 className="text-2xl font-black text-white text-center tracking-tight mb-2 uppercase">
                    {isVerificationOnly ? 'Verifică Numărul' : 'Revendică Numărul'}
                  </h3>
                  <p className="text-slate-400 text-center text-sm font-medium mb-8 leading-relaxed">
                    {isVerificationOnly ? 
                      <>Îți vom trimite un cod prin SMS la numărul <span className="text-white font-bold">{claimPhone}</span> pentru a-l verifica.</> : 
                      <>Numărul <span className="text-white font-bold">{claimPhone}</span> este legat de un alt cont. Îl poți transfera pe acest cont verificându-l prin SMS.</>}
                  </p>

                  <div className="space-y-6">

                    {/* Step 1: Send OTP */}
                    {!claimOtpSent ? (
                      <div className="space-y-4">
                        <p className="text-slate-500 text-center text-xs font-bold uppercase tracking-widest">
                          Pasul 1 din 2 — Trimite cod de verificare
                        </p>
                        <button 
                          onClick={handleStartClaim}
                          disabled={claimLoading}
                          className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black rounded-2xl font-black text-sm tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          {claimLoading ? <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                          {claimLoading ? 'SE TRIMITE...' : 'TRIMITE COD PRIN SMS'}
                        </button>
                      </div>
                    ) : (
                      /* Step 2: Enter OTP and verify */
                      <div className="space-y-4">
                        <p className="text-slate-500 text-center text-xs font-bold uppercase tracking-widest">
                          Pasul 2 din 2 — Introdu codul primit
                        </p>
                        <input 
                          type="text"
                          placeholder="Cod OTP din SMS"
                          className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-center text-lg font-black tracking-[0.5em] focus:border-lime-500 outline-none transition-all placeholder:tracking-normal placeholder:font-bold placeholder:text-slate-700"
                          value={claimOtp}
                          onChange={e => setClaimOtp(e.target.value)}
                          autoFocus
                        />
                        <button 
                          onClick={handleVerifyClaim}
                          disabled={claimLoading || claimOtp.length < 4}
                          className="w-full py-4 bg-lime-500 hover:bg-lime-400 text-black rounded-2xl font-black text-sm tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {claimLoading ? <div className="w-5 h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : <Shield className="w-5 h-5" />}
                          {claimLoading ? 'SE VERIFICĂ...' : (isVerificationOnly ? 'VERIFICĂ NUMĂRUL' : 'VERIFICĂ ȘI REVENDICĂ')}
                        </button>
                        <button
                          onClick={() => { setClaimOtpSent(false); setClaimOtp(''); setClaimError(''); }}
                          className="w-full py-2 text-slate-600 hover:text-slate-400 font-bold text-[10px] tracking-widest uppercase transition-colors"
                        >
                          ← Retrimite cod
                        </button>
                      </div>
                    )}

                    {claimError && (
                      <p className="text-rose-500 text-center text-[10px] font-bold uppercase tracking-widest bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                        {claimError.includes('404') || claimError.toLowerCase().includes('static resource') 
                          ? 'Serviciul este momentan indisponibil. Reîncearcă în câteva minute.' 
                          : claimError}
                      </p>
                    )}

                    <button 
                      onClick={() => setShowClaimModal(false)}
                      className="w-full py-3 text-slate-500 hover:text-white font-bold text-[10px] tracking-widest uppercase transition-colors"
                    >
                      ANULEAZĂ
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <ConfirmModal
          isOpen={showLogoutConfirm}
          title="Deconectare cont"
          description="Ești sigur(ă) că vrei să părăsești contul tău?"
          confirmText="Deconectare"
          cancelText="Rămâi aici"
          onConfirm={executeLogout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
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
