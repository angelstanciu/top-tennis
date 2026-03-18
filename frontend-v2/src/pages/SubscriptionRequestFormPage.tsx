import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Send, Calendar, Clock, MessageSquare, CheckCircle } from 'lucide-react'
import { fetchPlayerMe } from '../api'

export default function SubscriptionRequestFormPage() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const subType = params.get('type') || 'Abonament'
  
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  const [formData, setFormData] = useState({
    sportType: 'PADEL',
    preferredSchedule: '',
  })

  useEffect(() => {
    const token = localStorage.getItem('playerToken')
    if (!token) {
      nav('/cont?redirect=' + encodeURIComponent(window.location.pathname + window.location.search))
      return
    }
    fetchPlayerMe(token).then(setUser).catch(() => {
        localStorage.removeItem('playerToken')
        nav('/cont')
    })
  }, [nav])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const token = localStorage.getItem('playerToken')
    try {
      const res = await fetch('/api/player/subscriptions/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          sportType: formData.sportType,
          subscriptionType: subType,
          preferredSchedule: formData.preferredSchedule
        })
      })

      if (!res.ok) {
        throw new Error(await res.text() || 'Eroare la trimiterea cererii.')
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] max-w-md w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-lime-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-lime-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">Cerere Trimisă!</h2>
          <p className="text-slate-400 mb-8">
            Cererea ta pentru <span className="text-white font-bold">{subType}</span> a fost recepționată. Cosmin te va contacta în cel mai scurt timp pentru a stabili detaliile și programul dorit.
          </p>
          <button 
            onClick={() => nav('/')}
            className="w-full py-4 bg-lime-500 text-slate-950 font-black rounded-2xl hover:bg-lime-400 transition-all uppercase tracking-widest text-sm"
          >
            Înapoi Acasă
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans" style={{ fontFamily: 'Outfit, sans-serif' }}>
      <nav className="fixed top-0 inset-x-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 py-4">
        <div className="max-w-3xl mx-auto px-4 flex items-center gap-4">
          <button onClick={() => nav(-1)} className="p-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-extrabold text-xl tracking-tighter text-white">Cere <span className="text-lime-400">Ofertă</span></span>
        </div>
      </nav>

      <main className="pt-28 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-10">
            <h1 className="text-3xl font-black text-white mb-2">Solicită {subType}</h1>
            <p className="text-slate-500">Completează programul dorit și te vom contacta pentru confirmare.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2rem] space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 pl-1">Sport</label>
                    <select 
                      value={formData.sportType} 
                      onChange={e => setFormData({...formData, sportType: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-lime-500/50 transition-colors"
                    >
                      <option value="PADEL">Padel</option>
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 pl-1">Jucător</label>
                    <div className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-400 font-bold overflow-hidden whitespace-nowrap text-ellipsis">
                      {user?.fullName || 'Se încarcă...'}
                    </div>
                 </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 pl-1">Program dorit / Observații</label>
                <textarea 
                  required
                  rows={4}
                  value={formData.preferredSchedule}
                  onChange={e => setFormData({...formData, preferredSchedule: e.target.value})}
                  placeholder="Ex: Luni și Miercuri de la 18:00 la 20:00, Teren Indoor"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-4 text-white font-medium outline-none focus:border-lime-500/50 transition-colors resize-none"
                />
              </div>
            </div>

            {error && <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-sm font-medium">{error}</div>}

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-lime-500 text-slate-950 font-black rounded-2xl hover:bg-lime-400 transition-all uppercase tracking-widest shadow-xl shadow-lime-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-6 h-6 border-4 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
              ) : (
                <>Trimite Cererea <Send className="w-5 h-5" /></>
              )}
            </button>
          </form>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4">
             <div className="bg-slate-900/30 p-4 rounded-2xl border border-slate-800/50 flex items-center gap-3">
                <Calendar className="w-5 h-5 text-lime-400" />
                <span className="text-xs text-slate-400">Program flexibil</span>
             </div>
             <div className="bg-slate-900/30 p-4 rounded-2xl border border-slate-800/50 flex items-center gap-3">
                <Clock className="w-5 h-5 text-lime-400" />
                <span className="text-xs text-slate-400">Confirmare rapidă</span>
             </div>
             <div className="bg-slate-900/30 p-4 rounded-2xl border border-slate-800/50 flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-lime-400" />
                <span className="text-xs text-slate-400">Consultanță Admin</span>
             </div>
          </div>
        </div>
      </main>
    </div>
  )
}
