import React, { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AdminHeader from '../components/AdminHeader'
import { CalendarDays, Megaphone, ShieldBan, RepeatIcon, TrendingUp, DollarSign } from 'lucide-react'
import { fetchAvailability } from '../api'

export default function AdminLanding() {
  const navigate = useNavigate()
  
  const isLogged = (() => {
    try {
      const token = sessionStorage.getItem('adminAuth')
      const ts = Number(sessionStorage.getItem('adminAuthTS') || 0)
      const valid = token && ts && (Date.now() - ts) <= 3600000
      if (!valid) { sessionStorage.removeItem('adminAuth'); sessionStorage.removeItem('adminAuthTS') }
      return !!valid
    } catch { return false }
  })()

  const [globalRevenue, setGlobalRevenue] = React.useState<number | null>(null)

  useEffect(() => {
    if (!isLogged) {
      navigate('/login', { replace: true })
      return
    }

    const today = new Date().toISOString().slice(0, 10)
    const nowStr = new Date().toTimeString().slice(0, 5)

    fetchAvailability(today)
      .then(res => {
        let total = 0
        res.forEach(court => {
          court.booked.forEach(b => {
             const status = (b as any).status
             const endTime = (b as any).endTime
             if ((status === 'CONFIRMED' || status === 'FINISHED' || !status) && endTime <= nowStr) {
                total += Number((b as any).price || 0)
             }
          })
        })
        setGlobalRevenue(total)
      })
      .catch(() => setGlobalRevenue(0))

    if (isLogged) {
        fetch('/api/admin/subscriptions/requests', {
            headers: { 'Authorization': `Basic ${sessionStorage.getItem('adminAuth')}` }
        })
        .then(r => r.json())
        .then((data: any[]) => {
            const pending = data.filter(r => r.status === 'PENDING').length
            setPendingSubsCount(pending)
        })
        .catch(() => {})
    }
  }, [isLogged, navigate])

  const [pendingSubsCount, setPendingSubsCount] = React.useState(0)

  return (
    <div className="min-h-screen font-sans pb-20" style={{ background: '#020617', color: '#f8fafc' }}>
      {isLogged && (
        <>
          <div className="max-w-5xl mx-auto px-4 pt-6">
            <AdminHeader active="landing" />
          </div>

          <div className="max-w-5xl mx-auto px-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div>
                <h1 className="text-[34px] font-black tracking-tighter" style={{ fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.03em' }}>Panou Administrator</h1>
                <p className="text-slate-400 mt-2 font-medium">Gestionează rezervările, blochează terenuri și creează abonamente.</p>
              </div>

              {/* Global Revenue Quick Stat */}
              <div className="rounded-[22px] p-6 border shadow-xl flex items-center gap-5 min-w-[280px]" style={{ background: '#0f172a', borderColor: '#1e293b' }}>
                <div className="p-4 rounded-3xl shadow-lg" style={{ background: '#a3e635', color: '#020617', boxShadow: '0 8px 20px rgba(163,230,53,0.2)' }}>
                  <TrendingUp className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Încasat Azi</div>
                  <div className="text-3xl font-black tracking-tight">
                    {globalRevenue === null ? '...' : globalRevenue.toFixed(0)} <span className="text-sm font-bold text-slate-500 italic">RON</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Card 1: Vizualizare Rezervari */}
              <Link to="/admin/administrare-rezervari" className="group rounded-[22px] p-[22px] border shadow-sm hover:shadow-xl transition-all flex items-start gap-5 cursor-pointer" style={{ background: '#0f172a', borderColor: '#1e293b' }}>
                <div className="p-4 rounded-2xl group-hover:scale-110 transition-transform" style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8' }}>
                  <CalendarDays className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold mb-1 transition-colors">Administrare Zilnică</h3>
                  <p className="text-[13px] text-slate-500 leading-relaxed">Vizualizează centralizat calendarul pe zile, anulează rezervări client și vezi istoricul instant.</p>
                </div>
              </Link>

              {/* Card 2: Pozitii Libere Whatsapp */}
              <Link to="/admin/pozitii-libere" className="group rounded-[22px] p-[22px] border shadow-sm hover:shadow-xl transition-all flex items-start gap-5 cursor-pointer" style={{ background: '#0f172a', borderColor: '#1e293b' }}>
                <div className="p-4 rounded-2xl group-hover:scale-110 transition-transform" style={{ background: 'rgba(163,230,53,0.1)', color: '#a3e635' }}>
                  <Megaphone className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold mb-1 transition-colors">Poziții Libere</h3>
                  <p className="text-[13px] text-slate-500 leading-relaxed">Generează automat tabelul cu ore libere gata formatat pentru a-l copia spre Grupurile de WhatsApp.</p>
                </div>
              </Link>

              {/* Card 3: Blocare Terenuri/Zi */}
              <Link to="/admin/block-day" className="group rounded-[22px] p-[22px] border shadow-sm hover:shadow-xl transition-all flex items-start gap-5 cursor-pointer" style={{ background: '#0f172a', borderColor: '#1e293b' }}>
                <div className="p-4 rounded-2xl group-hover:scale-110 transition-transform" style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e' }}>
                  <ShieldBan className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold mb-1 transition-colors">Blocare Terenuri</h3>
                  <p className="text-[13px] text-slate-500 leading-relaxed">Setează zile ocupate complet (Meciuri externe/Sărbători) sau indisponibilizează un teren pe intervale lungi.</p>
                </div>
              </Link>

              {/* Card 4: Abonamente / Saptamanal */}
              <Link to="/admin/weekly" className="group rounded-[22px] p-[22px] border shadow-sm hover:shadow-xl transition-all flex items-start gap-5 cursor-pointer" style={{ background: '#0f172a', borderColor: '#1e293b' }}>
                <div className="p-4 rounded-2xl group-hover:scale-110 transition-transform" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                  <RepeatIcon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold mb-1 transition-colors">Abonamente Săpt.</h3>
                  <p className="text-[13px] text-slate-500 leading-relaxed">Adaugă clienți "de casă". Rezervă automat aceeași oră pentru un anumit număr de săptămâni consecutive.</p>
                </div>
              </Link>

              {/* Card 5: Cereri Abonamente */}
              <Link to="/admin/abonamente" className="group rounded-[22px] p-[22px] border shadow-sm hover:shadow-xl transition-all flex items-start gap-5 cursor-pointer" style={{ background: '#0f172a', borderColor: '#1e293b' }}>
                <div className="p-4 rounded-2xl group-hover:scale-110 transition-transform relative" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                   {pendingSubsCount > 0 && (
                     <div className="absolute -top-2 -right-2 min-w-[20px] h-5 bg-rose-500 text-white text-[10px] font-black rounded-full border-2 flex items-center justify-center px-1 animate-in zoom-in" style={{ borderColor: '#0f172a' }}>
                        {pendingSubsCount}
                     </div>
                   )}
                   <TrendingUp className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold mb-1 transition-colors flex items-center gap-2">
                    Cereri Abonamente
                  </h3>
                  <p className="text-[13px] text-slate-500 leading-relaxed">Vezi cine dorește abonament nou. Gestionează cererile, sună clienții și aprobă programul dorit.</p>
                </div>
              </Link>

            </div>
          </div>
        </>
      )}
    </div>
  )
}
