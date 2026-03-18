import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="w-full bg-slate-900 text-slate-400 py-10 px-4 mt-auto border-t border-slate-800">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left">
          <p className="text-sm font-semibold text-slate-300 flex items-center justify-center md:justify-start gap-2">
            © {new Date().getFullYear()} Star Arena.
            <a href="https://www.facebook.com/profile.php?id=100086205076767" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-emerald-400 transition-colors inline-flex" title="Urmărește-ne pe Facebook">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            </a>
          </p>
          <p className="text-xs mt-1 max-w-sm">Toate drepturile rezervate. Bază sportivă dedicată tenisului și padelului de performanță și agrement.</p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-xs font-medium">
          <Link to="/termeni" className="hover:text-emerald-400 transition-colors">Termeni și Condiții</Link>
          <Link to="/confidentialitate" className="hover:text-emerald-400 transition-colors">Politica de Confidențialitate</Link>
          <Link to="/cookies" className="hover:text-emerald-400 transition-colors">Politica de Cookies</Link>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
          <a href="https://anpc.ro/ce-este-sal/" target="_blank" rel="noopener noreferrer" className="group flex border border-slate-700/60 rounded-lg overflow-hidden bg-slate-800/50 text-white items-center w-[230px] h-[60px] hover:border-emerald-500/50 hover:bg-slate-800 transition-all shadow-md">
            <div className="w-[60px] h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 to-blue-950 border-r border-slate-700/60 shrink-0">
              <span className="text-[9px] font-black text-yellow-400 tracking-wider">ANPC</span>
              <svg className="w-6 h-6 text-yellow-500 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            </div>
            <div className="flex-1 px-3 py-1.5 leading-tight flex flex-col justify-center">
              <span className="text-[10px] text-slate-400 font-bold tracking-widest mb-0.5">ROMÂNIA</span>
              <span className="text-[11px] font-black uppercase leading-tight text-slate-200 group-hover:text-white transition-colors">Soluționarea<br/><span className="text-emerald-400">Alternativă</span> a litigiilor</span>
            </div>
          </a>
          
          <a href="https://ec.europa.eu/consumers/odr/main/index.cfm?event=main.home2.show&lng=RO" target="_blank" rel="noopener noreferrer" className="group flex border border-slate-700/60 rounded-lg overflow-hidden bg-slate-800/50 text-white items-center w-[230px] h-[60px] hover:border-blue-500/50 hover:bg-slate-800 transition-all shadow-md">
            <div className="w-[60px] h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-700 to-blue-900 border-r border-slate-700/60 shrink-0">
              <span className="text-[9px] font-black text-yellow-400 tracking-wider">EUROPA</span>
              <svg className="w-6 h-6 text-yellow-400 mt-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
            </div>
            <div className="flex-1 px-3 py-1.5 leading-tight flex flex-col justify-center">
              <span className="text-[10px] text-slate-400 font-bold tracking-widest mb-0.5">UNIUNEA EUROPEANĂ</span>
              <span className="text-[11px] font-black uppercase leading-tight text-slate-200 group-hover:text-white transition-colors">Soluționarea<br/><span className="text-blue-400">Online</span> a litigiilor</span>
            </div>
          </a>
        </div>
      </div>
    </footer>
  );
}
