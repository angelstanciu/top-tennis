import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Send, Calendar, Clock, MessageSquare, CheckCircle } from 'lucide-react'
import { fetchPlayerMe } from '../api'
import { useTheme } from '../ThemeContext'

export default function SubscriptionRequestFormPage() {
  const nav = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === 'dark'
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
      <div className="min-h-screen flex items-center justify-center p-4 transition-colors" style={{ fontFamily: 'Outfit, sans-serif', background: isDark ? '#020617' : '#f6f7f4' }}>
        <div className="border p-8 rounded-[2.5rem] max-w-md w-full text-center shadow-2xl" style={{ background: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
          <div className="w-20 h-20 bg-lime-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-lime-500" />
          </div>
          <h2 className="text-2xl font-black mb-2" style={{ color: isDark ? '#fff' : '#0f172a' }}>Cerere Trimisă!</h2>
          <p className="mb-8" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
            Cererea ta pentru <span className="font-bold" style={{ color: isDark ? '#fff' : '#0f172a' }}>{subType}</span> a fost recepționată. Cosmin te va contacta în cel mai scurt timp pentru a stabili detaliile și programul dorit.
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
    <div className="min-h-screen font-sans transition-colors" style={{ fontFamily: 'Outfit, sans-serif', background: isDark ? '#020617' : '#f6f7f4', color: isDark ? '#f1f5f9' : '#0f172a' }}>
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl border-b py-4 transition-colors" style={{ background: isDark ? 'rgba(2,6,23,0.8)' : 'rgba(255,255,255,0.85)', borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
        <div className="max-w-3xl mx-auto px-4 flex items-center gap-4">
          <button onClick={() => nav(-1)} className="p-2 rounded-full transition-colors" style={{ background: isDark ? '#0f172a' : '#f1f5f9', border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`, color: isDark ? '#94a3b8' : '#64748b' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-extrabold text-xl tracking-tighter" style={{ color: isDark ? '#fff' : '#0f172a' }}>Cere <span className="text-lime-500">Ofertă</span></span>
        </div>
      </nav>

      <main className="pt-28 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-10">
            <h1 className="text-3xl font-black mb-2" style={{ color: isDark ? '#fff' : '#0f172a' }}>Solicită {subType}</h1>
            <p style={{ color: isDark ? '#64748b' : '#64748b' }}>Completează programul dorit și te vom contacta pentru confirmare.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border p-8 rounded-[2rem] space-y-6" style={{ background: isDark ? 'rgba(15,23,42,0.5)' : '#ffffff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5 pl-1" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Sport</label>
                    <select
                      value={formData.sportType}
                      onChange={e => setFormData({...formData, sportType: e.target.value})}
                      className="w-full rounded-xl px-4 py-3 font-bold outline-none focus:border-lime-500/50 transition-colors sa-form-input"
                      style={{ background: isDark ? '#020617' : '#f8fafc', border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`, color: isDark ? '#fff' : '#0f172a' }}
                    >
                      <option value="PADEL">Padel</option>
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5 pl-1" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Jucător</label>
                    <div className="w-full rounded-xl px-4 py-3 font-bold overflow-hidden whitespace-nowrap text-ellipsis" style={{ background: isDark ? 'rgba(2,6,23,0.5)' : '#f1f5f9', border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`, color: isDark ? '#94a3b8' : '#64748b' }}>
                      {user?.fullName || 'Se încarcă...'}
                    </div>
                 </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5 pl-1" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Program dorit / Observații</label>
                <textarea
                  required
                  rows={4}
                  value={formData.preferredSchedule}
                  onChange={e => setFormData({...formData, preferredSchedule: e.target.value})}
                  placeholder="Ex: Luni și Miercuri de la 18:00 la 20:00, Teren Indoor"
                  className="w-full rounded-2xl px-4 py-4 font-medium outline-none focus:border-lime-500/50 transition-colors resize-none sa-form-input"
                  style={{ background: isDark ? '#020617' : '#f8fafc', border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`, color: isDark ? '#fff' : '#0f172a' }}
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
             <div className="p-4 rounded-2xl border flex items-center gap-3" style={{ background: isDark ? 'rgba(15,23,42,0.3)' : '#ffffff', borderColor: isDark ? 'rgba(30,41,59,0.5)' : '#e2e8f0' }}>
                <Calendar className="w-5 h-5 text-lime-500" />
                <span className="text-xs" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Program flexibil</span>
             </div>
             <div className="p-4 rounded-2xl border flex items-center gap-3" style={{ background: isDark ? 'rgba(15,23,42,0.3)' : '#ffffff', borderColor: isDark ? 'rgba(30,41,59,0.5)' : '#e2e8f0' }}>
                <Clock className="w-5 h-5 text-lime-500" />
                <span className="text-xs" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Confirmare rapidă</span>
             </div>
             <div className="p-4 rounded-2xl border flex items-center gap-3" style={{ background: isDark ? 'rgba(15,23,42,0.3)' : '#ffffff', borderColor: isDark ? 'rgba(30,41,59,0.5)' : '#e2e8f0' }}>
                <MessageSquare className="w-5 h-5 text-lime-500" />
                <span className="text-xs" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Consultanță Admin</span>
             </div>
          </div>
        </div>
      </main>
    </div>
  )
}
