import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="w-full bg-slate-900 text-slate-400 py-10 px-4 mt-auto border-t border-slate-800">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left">
          <p className="text-sm font-semibold text-slate-300">© {new Date().getFullYear()} Star Arena.</p>
          <p className="text-xs mt-1 max-w-sm">Toate drepturile rezervate. Bază sportivă dedicată tenisului și padelului de performanță și agrement.</p>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-xs font-medium">
          <Link to="/termeni" className="hover:text-emerald-400 transition-colors">Termeni și Condiții</Link>
          <Link to="/confidentialitate" className="hover:text-emerald-400 transition-colors">Politica de Confidențialitate</Link>
          <Link to="/cookies" className="hover:text-emerald-400 transition-colors">Politica de Cookies</Link>
          <Link to="https://anpc.ro/" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">ANPC</Link>
        </div>
      </div>
    </footer>
  );
}
