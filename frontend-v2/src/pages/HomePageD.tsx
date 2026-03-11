import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Phone, Clock, ArrowRight, CheckCircle2, Trophy, CalendarDays, ChevronRight, Shield } from 'lucide-react'
import { LampHero } from '../components/ui/lamp'
import { DateSlider } from '../components/ui/date-slider'
import Footer from '../components/Footer'

export default function HomePageD() {
  const nav = useNavigate()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleAccountClick = () => {
    if (localStorage.getItem('playerToken')) {
      nav('/profile')
    } else {
      nav('/cont')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100" style={{ fontFamily: 'Outfit, sans-serif' }}>

      {/* Sticky Navbar */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-slate-950/90 backdrop-blur-xl border-b border-slate-800 shadow-sm py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-4 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-2xl tracking-tighter text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
              STAR<span className="text-lime-400">ARENA</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
          <button 
            onClick={handleAccountClick}
            className="text-white hover:text-lime-400 transition-colors font-medium text-sm flex items-center gap-2"
          >
            {/* User Icon */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Contul Meu
          </button>

          <button
            onClick={() => nav('/rezerva')}
            className="font-bold px-6 py-2.5 rounded-full transition-all shadow-lg active:scale-95 bg-lime-500 text-slate-950 hover:bg-lime-400 shadow-lime-500/30"
          >
            Rezervă Acum
          </button>
          </div>
        </div>
      </nav>

      {/* Lamp Hero Section */}
      <LampHero />

      {/* Offers & Subscriptions Section [NEW] */}
      <section className="px-4 py-12 max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col items-center mb-10">
          <span className="text-lime-400 font-bold uppercase tracking-widest text-xs mb-2">Oferte & Abonamente</span>
          <h2 className="text-3xl md:text-4xl font-black text-white text-center">Profită de Avantajele Star Arena</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Padel Subscription Card */}
          <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-500/30 rounded-[3rem] p-8 relative overflow-hidden group hover:border-indigo-500/60 transition-all cursor-pointer shadow-2xl" onClick={() => nav('/abonamente')}>
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-indigo-500/20 p-4 rounded-2xl border border-indigo-500/40">
                  <Trophy className="w-8 h-8 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">Tarif Padel 2026</h3>
                  <p className="text-indigo-300 font-bold text-sm">Abonamente Early Booking</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Interval Zi (08:00-19:00)</p>
                    <p className="text-xl font-black text-white">80 <span className="text-xs text-slate-400">LEI/H</span></p>
                </div>
                <div className="bg-slate-950/40 p-4 rounded-2xl border border-white/5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Interval Nocturnă (după 19:00)</p>
                    <p className="text-xl font-black text-white">100 <span className="text-xs text-slate-400">LEI/H</span></p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">* Vezi oferte abonamente Early Booking / 3 Luni</span>
                <button className="bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-2 rounded-full font-bold text-sm transition-colors flex items-center gap-2">
                  Vezi Oferte <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* General Sports Promo */}
          <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/30 rounded-[3rem] p-8 relative overflow-hidden group hover:border-emerald-500/60 transition-all cursor-pointer shadow-2xl" onClick={() => nav('/rezerva')}>
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-emerald-500/20 p-4 rounded-2xl border border-emerald-500/40">
                  <CalendarDays className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white">Prețuri Sportive</h3>
                  <p className="text-emerald-300 font-bold text-sm">Cele mai bune tarife din zonă</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                  <span className="text-slate-400 font-medium">Tenis de Câmp (Până la 19:00)</span>
                  <span className="text-white font-black">40 LEI/H</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b border-white/5 pb-2">
                  <span className="text-slate-400 font-medium">Tenis de Picior (Până la 19:00)</span>
                  <span className="text-white font-black">75 LEI/H</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400 font-medium">Baschet & Tenis de Masă</span>
                  <span className="text-emerald-400 font-black">De la 35 LEI</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">* Prețurile variază după ora 19:00 (Nocturnă)</span>
                <button className="bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-2 rounded-full font-bold text-sm transition-colors flex items-center gap-2">
                  Rezervă <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Date Quick-Pick Section */}
      <section className="relative z-10 py-14 px-4 bg-slate-900 border-b border-slate-800">
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col items-center mb-6">
            <span className="text-lime-400 font-bold uppercase tracking-widest text-xs mb-2">Rezervă Rapid</span>
            <h2 className="text-2xl md:text-3xl font-bold text-white text-center">Alege data dorită</h2>
          </div>
          <div className="bg-slate-950/50 p-6 rounded-[2.5rem] border border-white/5 backdrop-blur-sm">
            <DateSlider
              onSelect={(iso) => nav(`/rezerva?date=${iso}`)}
              onConfirm={(iso) => nav(`/rezerva?date=${iso}`)}
            />
          </div>
          <div className="mt-8 text-center">
            <button
              onClick={() => nav('/rezerva')}
              className="text-sm text-lime-400 font-semibold hover:text-lime-300 transition-colors flex items-center gap-2 mx-auto justify-center"
            >
              Vezi toate terenurile disponibile <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Info Cards Section */}
      <section className="px-4 py-16 lg:py-24 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          <div className="relative overflow-hidden group rounded-[2.5rem] border border-slate-800 transition-all hover:border-lime-500/50">
            {/* Background Image */}
            <img 
              src="/img-raul-arges.jpg" 
              alt="Star Arena Locatie" 
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] group-hover:bg-slate-950/60 transition-colors"></div>
            
            <div className="relative z-10 p-8 flex flex-col items-center text-center">
              <div className="bg-lime-500/10 border border-lime-500/30 w-16 h-16 rounded-2xl flex items-center justify-center text-lime-400 mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-transform">
                <MapPin className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-xl mb-3 text-white">Lângă Râul Argeș</h3>
              <p className="text-slate-200 text-sm leading-relaxed mb-4">Complex sportiv în Bascov, Argeș — acces rapid din oraș, parcare amplă, chiar pe malul râului Argeș.</p>
              <a href="https://maps.app.goo.gl/Z7LWuvTvo1cbWJNGA" target="_blank" rel="noreferrer" className="text-lime-400 text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all">Deschide Navigația <ChevronRight className="w-4 h-4" /></a>
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-8 rounded-[2.5rem] flex flex-col items-center text-center hover:border-sky-500/50 transition-all group">
            <div className="bg-sky-500/10 border border-sky-500/30 w-16 h-16 rounded-2xl flex items-center justify-center text-sky-400 mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-xl mb-3 text-white">Program Extins</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">Pregătiți pentru pasiunea ta, indiferent de oră. Nocturnă LED profesională.</p>
            <span className="text-sky-400 font-black text-xl tracking-tight">08:00 – 24:00</span>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-8 rounded-[2.5rem] flex flex-col items-center text-center hover:border-amber-500/50 transition-all group">
            <div className="bg-amber-500/10 border border-amber-500/30 w-16 h-16 rounded-2xl flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform">
              <Phone className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-xl mb-3 text-white">Contact Rezervări</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">Sună-ne pentru detalii sau asistență cu programările tale.</p>
            <a href="tel:0742197487" className="text-amber-400 font-black text-xl hover:text-amber-300 transition-colors">0742 197 487</a>
          </div>
        </div>
      </section>

      {/* Padel Indoor Alert Section */}
      <section className="px-4 py-8 lg:py-12 max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-amber-500/30 rounded-[3rem] p-8 lg:p-12 text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
              <div className="bg-amber-500/20 p-5 rounded-3xl border border-amber-500/40 shrink-0">
                <MapPin className="w-10 h-10 text-amber-400" />
              </div>
              <div>
                <span className="text-amber-400 font-bold uppercase tracking-widest text-xs mb-2 block">Nou & Încălzit</span>
                <h3 className="text-3xl lg:text-4xl font-extrabold mb-3">Terenurile Padel Indoor</h3>
                <p className="text-slate-300 text-lg leading-relaxed max-w-2xl">
                  Cele <span className="font-bold text-amber-400">2 terenuri indoor noi</span> sunt situate în locația dedicată din Mărăcineni. Verifică traseul optim!
                </p>
              </div>
            </div>
            <a
              href="https://maps.app.goo.gl/9eRR5rjmoV6ooGi56"
              target="_blank"
              rel="noreferrer"
              className="shrink-0 bg-amber-500 text-slate-950 px-10 py-5 rounded-full font-black text-lg hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/30 active:scale-95 flex items-center gap-3"
            >
              Către Padel Indoor <ArrowRight className="w-6 h-6" />
            </a>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-24 bg-slate-950 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <span className="text-lime-400 font-bold uppercase tracking-widest text-xs">Complex Sportiv Premium Bascov</span>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mt-3 mb-5 text-white tracking-tight">
              15 Terenuri pentru <span className="text-lime-400 underline decoration-lime-500/30 underline-offset-8">Excelență Sportivă</span>
            </h2>
            <p className="text-slate-400 text-lg md:text-xl max-w-3xl mx-auto font-medium">
              Zgură profesională, parchet omologat și condiții de joc premium. <br className="hidden md:block"/> Experiența completă pentru orice sportiv.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Tenis */}
            <div 
              onClick={() => nav('/rezerva?sport=TENNIS')}
              className="rounded-[2.5rem] overflow-hidden aspect-[4/5] relative group shadow-2xl border border-white/5 cursor-pointer active:scale-95 transition-all"
            >
              <img
                src="/img-tenis-premium-night.jpg"
                alt="Terenuri Tenis Star Arena"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent p-10 flex flex-col justify-end">
                <span className="text-lime-400 font-bold uppercase tracking-widest text-[10px] mb-2">7 Terenuri Tenis</span>
                <h3 className="text-white text-3xl font-black mb-1 leading-tight">Tenis de Câmp</h3>
                <p className="text-slate-300 text-sm">5 terenuri outdoor zgură și 2 indoor încălzite, dotate cu iluminat nocturn.</p>
              </div>
            </div>

            {/* Padel */}
            <div 
              onClick={() => nav('/rezerva?sport=PADEL')}
              className="rounded-[2.5rem] overflow-hidden aspect-[4/5] relative group shadow-2xl border border-white/5 cursor-pointer active:scale-95 transition-all"
            >
              <img
                src="/img-padel-real-court.jpg"
                alt="Padel Star Arena"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent p-10 flex flex-col justify-end">
                <span className="text-sky-400 font-bold uppercase tracking-widest text-[10px] mb-2">5 Terenuri Padel</span>
                <h3 className="text-white text-3xl font-black mb-1 leading-tight">Padel Star Arena</h3>
                <p className="text-slate-300 text-sm">2 terenuri noi de Padel Indoor la Locația Nouă (Maracineni) + 3 terenuri outdoor.</p>
              </div>
            </div>

            {/* Baschet */}
            <div 
              onClick={() => nav('/rezerva?sport=BASKETBALL')}
              className="rounded-[2.5rem] overflow-hidden aspect-[4/5] relative group shadow-2xl border border-white/5 cursor-pointer active:scale-95 transition-all"
            >
              <img
                src="/img-basketball-top-view.jpg"
                alt="Terenuri Baschet Star Arena"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent p-10 flex flex-col justify-end">
                <span className="text-orange-400 font-bold uppercase tracking-widest text-[10px] mb-2">1 Teren Outdoor</span>
                <h3 className="text-white text-3xl font-black mb-1 leading-tight">Basketball Arena</h3>
                <p className="text-slate-300 text-sm">Coșuri omologate, suprafață de joc sigură.</p>
              </div>
            </div>

            {/* Volei */}
            <div 
              onClick={() => nav('/rezerva?sport=BEACH_VOLLEY')}
              className="rounded-[2.5rem] overflow-hidden aspect-[4/5] relative group shadow-2xl border border-white/5 cursor-pointer active:scale-95 transition-all"
            >
              <img
                src="/img-volley-real.jpg"
                alt="Volei pe nisip Star Arena"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent p-10 flex flex-col justify-end">
                <span className="text-emerald-400 font-bold uppercase tracking-widest text-[10px] mb-2">📍 Lângă Râul Argeș</span>
                <h3 className="text-white text-3xl font-black mb-1 leading-tight">Volei pe nisip</h3>
                <p className="text-slate-300 text-sm">Nisip fin și briză relaxantă, chiar pe malul Argeșului.</p>
              </div>
            </div>

            {/* Tenis de Picior */}
            <div 
              onClick={() => nav('/rezerva?sport=FOOTVOLLEY')}
              className="rounded-[2.5rem] overflow-hidden aspect-[4/5] relative group shadow-2xl border border-white/5 cursor-pointer active:scale-95 transition-all"
            >
              <img
                src="/img-foot-tennis-real.jpg"
                alt="Tenis de Picior Star Arena"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent p-10 flex flex-col justify-end">
                <span className="text-lime-400 font-bold uppercase tracking-widest text-[10px] mb-2">Teren cu tribună</span>
                <h3 className="text-white text-3xl font-black mb-1 leading-tight">Tenis de Picior</h3>
                <p className="text-slate-300 text-sm">Teren cu tribună și posibilitate de nocturnă.</p>
              </div>
            </div>

            {/* Tenis de Masa */}
            <div 
              onClick={() => nav('/rezerva?sport=TABLE_TENNIS')}
              className="rounded-[2.5rem] overflow-hidden aspect-[4/5] relative group shadow-2xl border border-white/5 cursor-pointer active:scale-95 transition-all"
            >
              <img
                src="/img-pingpong.png"
                alt="Tenis de Masa Star Arena"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent p-10 flex flex-col justify-end">
                <span className="text-amber-400 font-bold uppercase tracking-widest text-[10px] mb-2">Zonă Interior</span>
                <h3 className="text-white text-3xl font-black mb-1 leading-tight">Masă profesională</h3>
                <p className="text-slate-300 text-sm">Masă profesională, ambient relaxant.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}
