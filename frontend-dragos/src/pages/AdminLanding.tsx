import React, { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AdminHeader from '../components/AdminHeader'
import { CalendarDays, Megaphone, ShieldBan, TrendingUp, Clock, ListChecks } from 'lucide-react'

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

  useEffect(() => {
    if (!isLogged) {
      navigate('/login', { replace: true })
      return
    }

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
    <div className="min-h-screen font-sans pb-20" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {isLogged && (
        <>
          <AdminHeader active="landing" />

          <div className="max-w-5xl mx-auto px-4 pt-6">
            <span className="block text-[11px] font-black uppercase tracking-[0.12em] mb-4" style={{ color: 'var(--lime-link)', fontFamily: "'Outfit', sans-serif" }}>Panou administrator</span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

              {/* Card 1: Vizualizare Rezervari */}
              <Link to="/admin/administrare-rezervari" className="group rounded-2xl p-4 border shadow-sm hover:shadow-xl transition-all flex items-center gap-4 cursor-pointer" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}>
                <div className="shrink-0 p-2.5 rounded-xl group-hover:scale-110 transition-transform" style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8' }}>
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-extrabold mb-0.5 truncate transition-colors" style={{ color: 'var(--text)' }}>Administrare Zilnică</h3>
                  <p className="text-[12.5px] truncate" style={{ color: 'var(--muted)' }}>Calendar rezervări pe zile și istoric.</p>
                </div>
              </Link>

              {/* Card 2: Pozitii Libere Whatsapp */}
              <Link to="/admin/pozitii-libere" className="group rounded-2xl p-4 border shadow-sm hover:shadow-xl transition-all flex items-center gap-4 cursor-pointer" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}>
                <div className="shrink-0 p-2.5 rounded-xl group-hover:scale-110 transition-transform" style={{ background: 'rgba(163,230,53,0.1)', color: '#a3e635' }}>
                  <Megaphone className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-extrabold mb-0.5 truncate transition-colors" style={{ color: 'var(--text)' }}>Poziții Libere</h3>
                  <p className="text-[12.5px] truncate" style={{ color: 'var(--muted)' }}>Tabel cu ore libere, gata pentru WhatsApp.</p>
                </div>
              </Link>

              {/* Card 3: Blocare Terenuri/Zi */}
              <Link to="/admin/block-day" className="group rounded-2xl p-4 border shadow-sm hover:shadow-xl transition-all flex items-center gap-4 cursor-pointer" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}>
                <div className="shrink-0 p-2.5 rounded-xl group-hover:scale-110 transition-transform" style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e' }}>
                  <ShieldBan className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-extrabold mb-0.5 truncate transition-colors" style={{ color: 'var(--text)' }}>Blocare Terenuri</h3>
                  <p className="text-[12.5px] truncate" style={{ color: 'var(--muted)' }}>Blochează zile sau intervale pe un teren.</p>
                </div>
              </Link>

              {/* Card 4: Abonamente */}
              <Link to="/admin/subscriptions" className="group rounded-2xl p-4 border shadow-sm hover:shadow-xl transition-all flex items-center gap-4 cursor-pointer" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}>
                <div className="shrink-0 p-2.5 rounded-xl group-hover:scale-110 transition-transform" style={{ background: 'rgba(236,72,153,0.1)', color: '#ec4899' }}>
                  <ListChecks className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-extrabold mb-0.5 truncate transition-colors" style={{ color: 'var(--text)' }}>Abonamente</h3>
                  <p className="text-[12.5px] truncate" style={{ color: 'var(--muted)' }}>Listă abonamente active, adăugare și anulare.</p>
                </div>
              </Link>

              {/* Card 5: Cereri Abonamente */}
              <Link to="/admin/abonamente" className="group rounded-2xl p-4 border shadow-sm hover:shadow-xl transition-all flex items-center gap-4 cursor-pointer" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}>
                <div className="shrink-0 p-2.5 rounded-xl group-hover:scale-110 transition-transform relative" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                   {pendingSubsCount > 0 && (
                     <div className="absolute -top-2 -right-2 min-w-[20px] h-5 bg-rose-500 text-white text-[10px] font-black rounded-full border-2 flex items-center justify-center px-1 animate-in zoom-in" style={{ borderColor: 'var(--surface)' }}>
                        {pendingSubsCount}
                     </div>
                   )}
                   <TrendingUp className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-extrabold mb-0.5 truncate transition-colors" style={{ color: 'var(--text)' }}>Cereri Abonamente</h3>
                  <p className="text-[12.5px] truncate" style={{ color: 'var(--muted)' }}>Aprobă sau respinge cereri de abonament.</p>
                </div>
              </Link>

              {/* Card 6: Administrare Terenuri */}
              <Link to="/admin/terenuri" className="group rounded-2xl p-4 border shadow-sm hover:shadow-xl transition-all flex items-center gap-4 cursor-pointer" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}>
                <div className="shrink-0 p-2.5 rounded-xl group-hover:scale-110 transition-transform" style={{ background: 'rgba(20,184,166,0.1)', color: '#14b8a6' }}>
                  <Clock className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-extrabold mb-0.5 truncate transition-colors" style={{ color: 'var(--text)' }}>Administrare Terenuri</h3>
                  <p className="text-[12.5px] truncate" style={{ color: 'var(--muted)' }}>Program, preț și nocturnă pentru fiecare teren.</p>
                </div>
              </Link>

            </div>
          </div>
        </>
      )}
    </div>
  )
}
