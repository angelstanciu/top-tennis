import React, { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AdminHeader from '../components/AdminHeader'
import { CalendarDays, Megaphone, ShieldBan, RepeatIcon, TrendingUp, DollarSign } from 'lucide-react'
import { fetchAvailability } from '../api'

export default function AdminLanding() {
  const navigate = useNavigate()
  
  const isLogged = (() => {
    try {
      const token = localStorage.getItem('adminAuth')
      const ts = Number(localStorage.getItem('adminAuthTS') || 0)
      const valid = token && ts && (Date.now() - ts) <= 3600000
      if (!valid) { localStorage.removeItem('adminAuth'); localStorage.removeItem('adminAuthTS') }
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
            headers: { 'Authorization': `Basic ${localStorage.getItem('adminAuth')}` }
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
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {isLogged && (
        <>
          <AdminHeader active="landing" />
          
          <div className="max-w-5xl mx-auto px-4 mt-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div>
                <h1 className="text-4xl font-black text-slate-800 tracking-tighter" style={{ fontFamily: 'Outfit, sans-serif' }}>Panou Administrator</h1>
                <p className="text-slate-500 mt-2 font-medium">Gestionează rezervările, blochează terenuri și creează abonamente.</p>
              </div>
              
              {/* Global Revenue Quick Stat */}
              <div className="bg-white rounded-[2rem] p-6 border border-sky-100 shadow-xl shadow-sky-900/5 flex items-center gap-5 min-w-[280px]">
                <div className="bg-emerald-500 text-white p-4 rounded-3xl shadow-lg shadow-emerald-500/30">
                  <TrendingUp className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Încasat Azi</div>
                  <div className="text-3xl font-black text-slate-800 tracking-tight">
                    {globalRevenue === null ? '...' : globalRevenue.toFixed(0)} <span className="text-sm font-bold text-slate-300 italic">RON</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Card 1: Vizualizare Rezervari */}
              <Link to="/admin/administrare-rezervari" className="group bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:border-sky-200 transition-all flex items-start gap-5 cursor-pointer">
                <div className="bg-sky-50 text-sky-600 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                  <CalendarDays className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-sky-600 transition-colors">Administrare Zilnică</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">Vizualizează centralizat calendarul pe zile, anulează rezervări client și vezi istoricul instant.</p>
                </div>
              </Link>

              {/* Card 2: Pozitii Libere Whatsapp */}
              <Link to="/admin/pozitii-libere" className="group bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all flex items-start gap-5 cursor-pointer">
                <div className="bg-emerald-50 text-emerald-600 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                  <Megaphone className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-emerald-600 transition-colors">Mesaj Poziții Libere</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">Generează automat tabelul cu ore libere gata formatat pentru a-l copia spre Grupurile de WhatsApp.</p>
                </div>
              </Link>

              {/* Card 3: Blocare Terenuri/Zi */}
              <Link to="/admin/block-day" className="group bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:border-rose-200 transition-all flex items-start gap-5 cursor-pointer">
                <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                  <ShieldBan className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-rose-600 transition-colors">Blocare Terenuri</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">Setează zile ocupate complet (Meciuri externe/Sărbători) sau indisponibilizează un teren pe intervale lungi.</p>
                </div>
              </Link>

              {/* Card 4: Abonamente / Saptamanal */}
              <Link to="/admin/weekly" className="group bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:border-amber-200 transition-all flex items-start gap-5 cursor-pointer">
                <div className="bg-amber-50 text-amber-600 p-4 rounded-2xl group-hover:scale-110 transition-transform">
                  <RepeatIcon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-amber-600 transition-colors">Abonamente Săptămânale</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">Adaugă clienți "de casă". Rezervă automat aceeași oră pentru un anumit număr de săptămâni consecutive.</p>
                </div>
              </Link>

              {/* Card 5: Cereri Abonamente */}
              <Link to="/admin/abonamente" className="group bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all flex items-start gap-5 cursor-pointer">
                <div className="bg-indigo-50 text-indigo-600 p-4 rounded-2xl group-hover:scale-110 transition-transform relative">
                   {pendingSubsCount > 0 && (
                     <div className="absolute -top-2 -right-2 min-w-[20px] h-5 bg-rose-500 text-white text-[10px] font-black rounded-full border-2 border-white flex items-center justify-center px-1 animate-in zoom-in">
                        {pendingSubsCount}
                     </div>
                   )}
                   <TrendingUp className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-1 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                    Cereri Abonamente
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">Vezi cine dorește abonament nou. Gestionează cererile, sună clienții și aprobă programul dorit.</p>
                </div>
              </Link>

            </div>
          </div>
        </>
      )}
    </div>
  )
}
