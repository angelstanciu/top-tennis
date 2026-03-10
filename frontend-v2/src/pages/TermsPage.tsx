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
        <h1 className="text-xl font-bold text-slate-800" style={{ fontFamily: 'Outfit, sans-serif' }}>Top Tenis</h1>
        <div className="w-20"></div> {/* Spacer */}
      </div>

      <div className="max-w-3xl mx-auto w-full px-6 py-12 flex-1">
        <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-xl shadow-slate-200/50 border border-slate-100">
          <h2 className="text-3xl font-black text-slate-800 mb-8" style={{ fontFamily: 'Outfit, sans-serif' }}>Termeni și Condiții</h2>
          
          <div className="space-y-6 text-slate-600 leading-relaxed">
            <section>
              <h3 className="text-xl font-bold text-slate-800 mb-3">1. Introducere</h3>
              <p>Acest site web este operat de Top Tenis Arena. Termenii "noi", "ne" și "nostru" se referă la Top Tenis. Prin utilizarea site-ului și efectuarea rezervărilor, acceptați acești Termeni și Condiții în totalitate.</p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-800 mb-3">2. Rezervări și Anulări</h3>
              <p>Rezervările sunt considerate ferme după confirmarea pe site. Orice anulare se face cu cel puțin 24 de ore înainte, direct la recepția bazei sportive sau apelând numărul de telefon afișat pe site. Ne rezervăm dreptul de a refuza accesul persoanelor care prezintă un istoric de rezervări neprezentate (no-shows).</p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-800 mb-3">3. Regulamentul Bazei Sportive</h3>
              <p>Toți jucătorii trebuie să aibă echipament adecvat sportului ales (Tenis, Padel etc.), în special încălțăminte curată dedicată. Este strict interzisă deteriorarea bunurilor sau folosirea unui limbaj agresiv în incinta bazei.</p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-800 mb-3">4. Plăți</h3>
              <p>Plata contravalorii orelor rezervate se face momentan la recepție / fizic, direct la bază, înainte sau după efectuarea orei de joc, conform tarifelor în vigoare afișate pe site sau la locație.</p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-800 mb-3">5. Forță majoră</h3>
              <p>Top Tenis nu este responsabil pentru imposibilitatea onorării rezervărilor în caz de forță majoră, inclusiv factori meteorologici extremi pentru terenurile outdoor.</p>
            </section>

            <p className="text-sm text-slate-400 mt-10 pt-6 border-t border-slate-100 italic">Ultima actualizare: Martie 2026</p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
