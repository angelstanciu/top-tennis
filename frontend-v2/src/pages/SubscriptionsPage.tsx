import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trophy, CheckCircle2, Star, Clock, Zap, Target } from 'lucide-react'
import Footer from '../components/Footer'

export default function SubscriptionsPage() {
  const nav = useNavigate()

  const subscriptions = [
    {
      title: "Early Booking",
      subtitle: "Până în ora 14:00",
      price: "50",
      features: ["Lumină naturală inclusă", "Rezervare prioritară", "Anulare flexibilă"],
      color: "from-indigo-600 to-blue-600",
      bg: "bg-indigo-500/10"
    },
    {
      title: "Abonament 3 Luni",
      subtitle: "Pasiune pe termen lung",
      price: "60/70",
      features: ["60 LEI - Lumină naturală", "70 LEI - Nocturnă", "Program fix săptămânal", "Prioritate la rezervare"],
      color: "from-emerald-600 to-teal-600",
      bg: "bg-emerald-500/10",
      highlight: true,
      requestOnly: true
    },
    {
      title: "Abonament 1 Lună",
      subtitle: "Echilibru și performanță",
      price: "70/80",
      features: ["70 LEI - Lumină naturală", "80 LEI - Nocturnă", "Flexibilitate maximă", "Program stabilit cu admin-ul"],
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans" style={{ fontFamily: 'Outfit, sans-serif' }}>
      {/* Header */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 py-4">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-4">
          <button 
            onClick={() => nav(-1)}
            className="p-2 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-extrabold text-xl tracking-tighter text-white">
            STAR<span className="text-lime-400">ARENA</span> <span className="text-slate-500 font-medium ml-2">Abonamente</span>
          </span>
        </div>
      </nav>

      <main className="pt-28 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section inside Subscriptions */}
          <div className="text-center mb-16 relative">
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-lime-500/10 rounded-full blur-[120px] pointer-events-none"></div>
             <span className="text-lime-400 font-bold uppercase tracking-[0.2em] text-xs mb-4 block">Tarif Padel 2026</span>
             <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
               Evoluează la <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-400">Nivelul Următor</span>
             </h1>
             <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
               Te așteaptă 4 terenuri de ultimă generație <span className="text-white font-bold">PREMIER PADEL</span>, dotate cu mocheta PGR și nocturnă LED profesională.
             </p>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {subscriptions.map((sub, idx) => (
              <div 
                key={idx}
                className={`relative rounded-[3rem] p-8 border transition-all duration-500 hover:scale-[1.02] flex flex-col h-full bg-slate-900/40 backdrop-blur-md ${
                  sub.highlight ? 'border-lime-500/50 shadow-2xl shadow-lime-500/10' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {sub.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-lime-500 text-slate-950 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                    Recomandat
                  </div>
                )}
                
                <div className="mb-8 text-center md:text-left">
                  <h3 className="text-xl font-black text-white mb-1">{sub.title}</h3>
                  <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">{sub.subtitle}</p>
                </div>

                <div className="mb-8 flex flex-col items-center md:items-start">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white tracking-tighter">{sub.price}</span>
                    <span className="text-slate-500 font-bold text-sm tracking-wide">LEI/ORĂ</span>
                  </div>
                </div>

                <div className="space-y-4 mb-10 flex-1">
                  {sub.features.map((feat, fidx) => (
                    <div key={fidx} className="flex items-start gap-3 text-sm">
                      <CheckCircle2 className={`w-5 h-5 shrink-0 ${sub.highlight ? 'text-lime-400' : 'text-slate-600'}`} />
                      <span className="text-slate-300 font-medium leading-tight">{feat}</span>
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
                  className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${
                    sub.highlight 
                      ? 'bg-lime-500 text-slate-950 hover:bg-lime-400 shadow-xl shadow-lime-500/20' 
                      : 'bg-slate-800 text-white hover:bg-slate-700'
                  }`}
                >
                  {sub.requestOnly ? 'Cere Ofertă' : 'Rezervă Acum'}
                </button>
              </div>
            ))}
          </div>

          {/* Footer Info */}
          <div className="mt-16 p-8 rounded-[2.5rem] bg-slate-900/30 border border-slate-800/50 text-center">
             <div className="flex flex-col md:flex-row items-center justify-center gap-8 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-lime-400" />
                  <span>Nocturnă LED profesională</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-lime-400" />
                  <span>Mochetă oficială PGR</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-lime-400" />
                  <span>Acces 08:00 - 24:00</span>
                </div>
             </div>
             <p className="mt-6 text-[10px] text-slate-500 uppercase tracking-[0.3em] max-w-2xl mx-auto leading-relaxed">
               * În situația în care rezervarea nu poate fi onorată din motive ce țin de administrație sau de condițiile meteo, aceasta va fi reprogramată în perioada de valabilitate.
             </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
