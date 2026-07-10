import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trophy, CheckCircle2, Star, Clock, Zap, Target } from 'lucide-react'
import Footer from '../components/Footer'
import { useSeo } from '../seo'
import { useTheme } from '../ThemeContext'

export default function SubscriptionsPage() {
  useSeo({
    path: '/abonamente',
    title: 'Abonamente Padel și Tenis | Star Arena Pitești Bascov',
    description: 'Abonamente lunare pentru padel și tenis la Star Arena Bascov, lângă Pitești. Interval fix săptămânal, preț avantajos, prioritate la rezervări.',
  })
  const nav = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const subscriptions = [
    {
      title: "Early Booking",
      subtitle: "Până în ora 14:00",
      price: "50",
      features: ["Parcare privată gratuită", "Rezervare prioritară", "Anulare flexibilă"],
      color: "from-indigo-600 to-blue-600",
      bg: "bg-indigo-500/10"
    },
    {
      title: "Abonament 3 Luni",
      subtitle: "Pasiune pe termen lung",
      price: "60/70",
      features: ["60 LEI - Ziua", "70 LEI - Seara/Nocturnă", "Program fix săptămânal", "Prioritate la rezervare"],
      color: "from-emerald-600 to-teal-600",
      bg: "bg-emerald-500/10",
      highlight: true,
      requestOnly: true
    },
    {
      title: "Abonament 1 Lună",
      subtitle: "Echilibru și performanță",
      price: "70/80",
      features: ["70 LEI - Ziua (Lumină naturală)", "80 LEI - Seara/Nocturnă", "Flexibilitate maximă", "Program stabilit cu admin-ul"],
      color: "from-amber-600 to-orange-600",
      bg: "bg-amber-500/10",
      requestOnly: true
    },
    {
      title: "Ocazional",
      subtitle: "Joc liber, oricând",
      price: "80/150",
      features: ["80 LEI - Padel Exterior", "150 LEI - Padel Indoor", "Fără obligații", "Plată rapidă la locație"],
      color: "from-slate-700 to-slate-900",
      bg: "bg-slate-500/10"
    }
  ]

  return (
    <div className="min-h-screen font-sans transition-colors" style={{ fontFamily: 'Outfit, sans-serif', background: isDark ? '#020617' : '#f6f7f4', color: isDark ? '#f1f5f9' : '#0f172a' }}>
      {/* Header */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl border-b py-4 transition-colors" style={{ background: isDark ? 'rgba(2,6,23,0.8)' : 'rgba(255,255,255,0.85)', borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-4">
          <button
            onClick={() => nav(-1)}
            className="p-2 rounded-full transition-colors"
            style={{ background: isDark ? '#0f172a' : '#f1f5f9', border: `1px solid ${isDark ? '#1e293b' : '#e2e8f0'}`, color: isDark ? '#94a3b8' : '#64748b' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-extrabold text-xl tracking-tighter" style={{ color: isDark ? '#fff' : '#0f172a' }}>
            STAR<span className="text-lime-400">ARENA</span> <span className="font-medium ml-2" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Abonamente</span>
          </span>
        </div>
      </nav>

      <main className="pt-28 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section inside Subscriptions */}
          <div className="text-center mb-16 relative">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-lime-500/10 rounded-full blur-[120px] pointer-events-none"></div>
             <span className="text-lime-500 font-bold uppercase tracking-[0.2em] text-xs mb-4 block">Tarif Padel 2026</span>
             <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
               Evoluează la <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-400">Nivelul Următor</span>
             </h1>
             <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
               Te așteaptă 5 terenuri de ultimă generație <span className="font-bold" style={{ color: isDark ? '#fff' : '#0f172a' }}>PREMIER PADEL</span>, dotate cu mocheta PGR și nocturnă LED profesională.
             </p>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {subscriptions.map((sub, idx) => (
              <div
                key={idx}
                className="relative rounded-[3rem] p-8 border transition-all duration-500 hover:scale-[1.02] flex flex-col h-full backdrop-blur-md"
                style={{
                  background: isDark ? 'rgba(15,23,42,0.4)' : '#ffffff',
                  borderColor: sub.highlight ? 'rgba(163,230,53,0.5)' : (isDark ? '#1e293b' : '#e2e8f0'),
                  boxShadow: sub.highlight ? '0 25px 50px -12px rgba(163,230,53,0.1)' : undefined,
                }}
              >
                {sub.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-lime-500 text-slate-950 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                    Recomandat
                  </div>
                )}

                <div className="mb-8 text-center md:text-left">
                  <h3 className="text-xl font-black mb-1" style={{ color: isDark ? '#fff' : '#0f172a' }}>{sub.title}</h3>
                  <p className="text-xs font-medium uppercase tracking-wider" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>{sub.subtitle}</p>
                </div>

                <div className="mb-8 flex flex-col items-center md:items-start">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black tracking-tighter" style={{ color: isDark ? '#fff' : '#0f172a' }}>{sub.price}</span>
                    <span className="font-bold text-sm tracking-wide" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>LEI/ORĂ</span>
                  </div>
                </div>

                <div className="space-y-4 mb-10 flex-1">
                  {sub.features.map((feat, fidx) => (
                    <div key={fidx} className="flex items-start gap-3 text-sm">
                      <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: sub.highlight ? '#a3e635' : (isDark ? '#475569' : '#94a3b8') }} />
                      <span className="font-medium leading-tight" style={{ color: isDark ? '#cbd5e1' : '#334155' }}>{feat}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    if (sub.requestOnly) {
                      nav(`/abonamente/cere-oferta?type=${encodeURIComponent(sub.title)}`)
                    } else {
                      nav('/rezerva?sport=PADEL')
                    }
                  }}
                  className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all"
                  style={sub.highlight
                    ? { background: '#a3e635', color: '#020617', boxShadow: '0 20px 25px -5px rgba(163,230,53,0.2)' }
                    : { background: isDark ? '#1e293b' : '#f1f5f9', color: isDark ? '#fff' : '#0f172a' }}
                >
                  {sub.requestOnly ? 'Cere Ofertă' : 'Rezervă Acum'}
                </button>
              </div>
            ))}
          </div>

          {/* Footer Info */}
          <div className="mt-16 p-8 rounded-[2.5rem] border text-center" style={{ background: isDark ? 'rgba(15,23,42,0.3)' : '#ffffff', borderColor: isDark ? 'rgba(30,41,59,0.5)' : '#e2e8f0' }}>
             <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-sm" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-lime-500" />
                  <span>Nocturnă LED profesională</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-lime-500" />
                  <span>Mochetă oficială PGR</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-lime-500" />
                  <span>Acces 08:00 - 24:00</span>
                </div>
             </div>
             <p className="mt-6 text-[10px] uppercase tracking-[0.3em] max-w-2xl mx-auto leading-relaxed" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
               * În situația în care rezervarea nu poate fi onorată din motive ce țin de administrație sau de condițiile meteo, aceasta va fi reprogramată în perioada de valabilitate.
             </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
