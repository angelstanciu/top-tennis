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
          <Link to="https://anpc.ro/" target="_blank" rel="noopener noreferrer" className="hover:text-emerald-400 transition-colors">ANPC</Link>
        </div>
      </div>
    </footer>
  );
}
