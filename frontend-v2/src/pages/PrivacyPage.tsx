import React from 'react';
import { useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';

export default function PrivacyPage() {
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
          <h2 className="text-3xl font-black text-slate-800 mb-8" style={{ fontFamily: 'Outfit, sans-serif' }}>Politica de Confidențialitate</h2>
          
          <div className="space-y-6 text-slate-600 leading-relaxed">
            <section>
              <h3 className="text-xl font-bold text-slate-800 mb-3">1. Ce Date Colectăm</h3>
              <p>În procesul de rezervare a terenurilor, colectăm datele tale cu caracter personal, precum: <strong>Nume și Prenume</strong>, <strong>Număr de Telefon</strong>, și opțional <strong>Adresa de E-mail</strong>.</p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-800 mb-3">2. Scopul Colectării</h3>
              <p>Datele sunt preluate și procesate strict în scopul de a asigura buna desfășurare a rezervărilor la baza noastră sportivă. Folosim numărul de telefon pentru confirmări rapide, soluționarea no-show-urilor și trimiterea de alerte SMS (acolo unde este cazul) direct din sistem.</p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-800 mb-3">3. Protecția Datelor (GDPR)</h3>
              <p>Tratăm securitatea datelor dvs. cu prioritate și ne asigurăm că nu le distribuim terților pentru promovare/marketing fără acordul explicit. Stocarea lor se face pe servere securizate strict pe durata de relevanță a rezervărilor.</p>
            </section>

            <section>
              <h3 className="text-xl font-bold text-slate-800 mb-3">4. Drepturile Dumneavoastră</h3>
              <p>Vă puteți exercita în orice moment dreptul la:"Uitare" (stergerea datelor), modificarea acestora, sau restricționarea prelucrării adresându-vă recepției Top Tenis Arena conform datelor publice de contact din homepage.</p>
            </section>

            <p className="text-sm text-slate-400 mt-10 pt-6 border-t border-slate-100 italic">Prezenta politică poate suferi modificări, vă recomandăm consultarea ei periodică.</p>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
