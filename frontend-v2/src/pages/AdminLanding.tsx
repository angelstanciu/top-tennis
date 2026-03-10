import React, { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AdminHeader from '../components/AdminHeader'
import { CalendarDays, Megaphone, ShieldBan, RepeatIcon } from 'lucide-react'

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

  useEffect(() => {
    if (!isLogged) navigate('/login', { replace: true })
  }, [isLogged, navigate])

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {isLogged && (
        <>
          <AdminHeader active="landing" />
          
          <div className="max-w-5xl mx-auto px-4 mt-8">
            <div className="mb-8">
              <h1 className="text-3xl font-black text-slate-800" style={{ fontFamily: 'Outfit, sans-serif' }}>Panou Administrator</h1>
              <p className="text-slate-500 mt-2">Gestionează rezervările, blochează terenuri și creează abonamente recurente.</p>
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

            </div>
          </div>
        </>
      )}
    </div>
  )
}
