import React, { useEffect, useState } from 'react';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      // Delay slightly so it animates in after initial paint
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[50000] p-4 sm:p-6 pointer-events-none">
      <div className="max-w-4xl mx-auto bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl rounded-2xl p-5 sm:p-6 text-slate-200 flex flex-col sm:flex-row gap-5 items-center pointer-events-auto transform transition-all duration-500 hover:border-emerald-500/30">
        <div className="flex-1 text-sm leading-relaxed text-center sm:text-left">
          <p className="font-semibold text-white mb-1.5 flex items-center justify-center sm:justify-start gap-2">
            🍪 Respectăm intimitatea ta
          </p>
          Acest site folosește cookie-uri strict necesare pentru funcționarea platformei, dar și cookie-uri opționale pentru a analiza traficul și a așigura cea mai bună experiență. 
          Poți afla mai multe <a href="/cookies" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 font-medium transition-colors">Politica de Cookies</a> și <a href="/confidentialitate" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2 font-medium transition-colors">Politica de Confidențialitate</a>.
        </div>
        
        <div className="flex flex-row gap-3 w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
          <button 
            onClick={handleDecline}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-600 hover:bg-slate-800 hover:border-slate-500 text-slate-300 font-bold text-sm transition-all focus:ring-2 focus:ring-slate-500"
          >
            Refuză
          </button>
          <button 
            onClick={handleAccept}
            className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all active:scale-95 focus:ring-2 focus:ring-emerald-400"
          >
            Acceptă
          </button>
        </div>
      </div>
    </div>
  );
}
