import React from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <div className="w-full bg-white border-b border-slate-200 sticky top-0 z-50 px-4 py-4 flex justify-between items-center shadow-sm">
        <button 
          onClick={() => navigate('/')} 
          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          Înapoi
        </button>
        <h1 className="text-xl font-bold text-slate-800" style={{ fontFamily: 'Outfit, sans-serif' }}>Star Arena</h1>
        <div className="w-20"></div> {/* Spacer */}
      </div>

      <div className="max-w-3xl mx-auto w-full px-6 py-12 flex-1">
        <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-xl shadow-slate-200/50 border border-slate-100">
          <h2 className="text-3xl font-black text-slate-800 mb-8" style={{ fontFamily: 'Outfit, sans-serif' }}>Termeni și Condiții</h2>
          
          <div className="space-y-6 text-slate-600 leading-relaxed">
            <section>
              <h3 className="text-xl font-bold text-slate-800 mb-3">1. Introducere</h3>
              <p>Acest site web este operat de Star Arena. Termenii "noi", "ne" și "nostru" se referă la Star Arena. Prin utilizarea site-ului și efectuarea rezervărilor, acceptați acești Termeni și Condiții în totalitate.</p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-800 mb-3">2. Rezervări și Anulări</h3>
              <p>Rezervările sunt considerate ferme după confirmarea pe site. <strong>Anularea gratuită a unei rezervări (inclusiv returnarea integrală a fondurilor în cazul plății online cu cardul) se poate face cu până la 24 de ore înainte de ora de începere a jocului.</strong> Orice anulare efectuată cu mai puțin de 24 de ore înainte va atrage reținerea integrală a sumei achitate (banii nu se mai returnează). Ne rezervăm dreptul de a refuza accesul persoanelor care prezintă un istoric de rezervări neprezentate (no-shows) fără a anunța în prealabil.</p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-800 mb-3">3. Politica de Livrare</h3>
              <p>Fiind vorba de un serviciu (închirierea unei baze sportive), "livrarea" are loc digital, imediat după confirmarea plății online. Clientul primește automat un e-mail/SMS de confirmare, iar serviciul este considerat prestat la data și ora rezervării, prin prezentarea fizică a clientului la locația Star Arena.</p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-800 mb-3">4. Regulamentul Bazei Sportive</h3>
              <p>Toți jucătorii trebuie să aibă echipament adecvat sportului ales (Tenis, Padel etc.), în special încălțăminte curată dedicată. Este strict interzisă deteriorarea bunurilor sau folosirea unui limbaj agresiv în incinta bazei.</p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-800 mb-3">5. Plăți și Securitate</h3>
              <p>Plata contravalorii orelor rezervate se poate face la recepție (cash sau card) sau <strong>online, direct pe site, prin intermediul procesatorului de plăți autorizat Netopia Payments</strong>.</p>
              <p className="mt-2">În cazul plății online, tranzacțiile sunt procesate într-un mediu securizat 3D Secure. Star Arena nu solicită și nu stochează niciun fel de detalii referitoare la cardul dumneavoastră.</p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-800 mb-3">6. Forță majoră</h3>
              <p>Star Arena nu este responsabil pentru imposibilitatea onorării rezervărilor în caz de forță majoră, inclusiv factori meteorologici extremi pentru terenurile outdoor.</p>
            </section>

            <p className="text-sm text-slate-400 mt-10 pt-6 border-t border-slate-100 italic">Ultima actualizare: Martie 2026</p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
