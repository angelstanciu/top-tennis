import React from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

export default function CookiesPage() {
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
          <h2 className="text-3xl font-black text-slate-800 mb-8" style={{ fontFamily: 'Outfit, sans-serif' }}>Politica de Utilizare Cookies</h2>
          
          <div className="space-y-6 text-slate-600 leading-relaxed">
            <section>
              <h3 className="text-xl font-bold text-slate-800 mb-3">1. Ce sunt Cookie-urile?</h3>
              <p>Un modul „cookie” reprezintă un fișier text de mici dimensiuni pe care un site web îl salvează pe calculatorul sau dispozitivul tău mobil atunci când îl vizitezi. Permite site-ului să își amintească acțiunile și preferințele tale temporar.</p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-800 mb-3">2. Cum folosim Cookie-urile?</h3>
              <p>Platforma Star Arena folosește cu precădere cookie-uri și date de LocalStorage de tip <strong>strict necesar / tehnic</strong> pentru buna desfășurare a calendarului (de exemplu: memorarea sportului preferat la redeschiderea paginii sau preferințe de layout). Ocazional, putem apela la Analytics pentru funcționare structurală (pe ce butoane s-a dat click, fără indentificarea utilizatorului specific).</p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-800 mb-3">3. Cookie-uri de Terță Parte (Marketing)</h3>
              <p>Dacă site-ul implementează extensii precum Meta Pixel / Google Marketing, acestea folosesc propriile module Cookie pt livrarea relevării publicitare a bazei sportive. Poți opri mereu targetarea din browser.</p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-800 mb-3">4. Controlul cookie-urilor</h3>
              <p>Poți controla și/sau șterge cookie-urile direct din browserul tău. Poți șterge opțiunile și astfel browserul va forța cererile de acorduri o nouă dată. Pentru informații suplimentare despre controlarea cookie-urilor, consultați secțiunea setărilor din browser.</p>
            </section>

          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
