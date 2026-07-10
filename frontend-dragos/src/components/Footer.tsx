import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../ThemeContext';

export default function Footer() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <footer
      className="w-full py-12 px-4 mt-auto border-t transition-colors"
      style={{
        background: isDark ? '#020617' : '#f6f7f4',
        color: isDark ? '#94a3b8' : '#64748b',
        borderColor: isDark ? '#0f172a' : '#e2e8f0',
      }}
    >
      <div className="max-w-7xl mx-auto flex flex-col gap-10">

        {/* Top Section: Links & Company Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b" style={{ borderColor: isDark ? 'rgba(30,41,59,0.5)' : '#e2e8f0' }}>

          {/* Brand & Socials */}
          <div className="flex flex-col items-center justify-center md:items-start md:justify-start">
            <span className="font-black text-2xl tracking-tighter mb-2" style={{ fontFamily: 'Outfit, sans-serif', color: isDark ? '#fff' : '#0f172a' }}>
              STAR<span className="text-lime-500">ARENA</span>
            </span>
            <p className="text-xs mb-4 max-w-xs text-center md:text-left" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
              Bază sportivă modernă dedicată tenisului și padelului de agrement și performanță.
            </p>
            <a
              href="https://www.facebook.com/profile.php?id=100086205076767"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all border"
              style={{ background: isDark ? '#0f172a' : '#fff', borderColor: isDark ? '#1e293b' : '#e2e8f0', color: isDark ? '#94a3b8' : '#64748b' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            </a>
          </div>

          {/* Legal Pages */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <h4 className="font-bold text-sm mb-2 uppercase tracking-widest" style={{ color: isDark ? '#fff' : '#0f172a' }}>Informații Client</h4>
            <Link to="/termeni" className="text-xs font-medium hover:text-lime-500 transition-colors">Termeni și Condiții</Link>
            <Link to="/confidentialitate" className="text-xs font-medium hover:text-lime-500 transition-colors">Politica de Confidențialitate</Link>
            <Link to="/cookies" className="text-xs font-medium hover:text-lime-500 transition-colors">Politica de Cookies</Link>
          </div>

          {/* Company Identity & Payments */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <h4 className="font-bold text-sm mb-2 uppercase tracking-widest" style={{ color: isDark ? '#fff' : '#0f172a' }}>Detalii Companie</h4>
            <p className="text-xs mb-1 flex flex-col items-center md:items-start gap-0.5">
              <strong style={{ color: isDark ? '#cbd5e1' : '#334155' }}>SC HOBBY RALLY JUNIOR SRL</strong>
              <span>CUI: RO36469122</span>
              <span>Baza Sportivă Star Arena, Bascov, RO</span>
              <span className="mt-1">Email: contact@star-arena.ro</span>
              <span>Tel: 0742 197 487</span>
            </p>
          </div>
        </div>

        {/* Bottom Section: ANPC & Copyright */}
        <div className="flex flex-col xl:flex-row justify-between items-center gap-6">
          <p className="text-xs font-medium order-2 xl:order-1" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>
            © {new Date().getFullYear()} Star Arena. Toate drepturile rezervate.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 order-1 xl:order-2 scale-90 sm:scale-100">
            <a
              href="https://anpc.ro/ce-este-sal/"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex rounded-lg overflow-hidden items-center w-[220px] h-[55px] hover:border-blue-500/50 transition-all border"
              style={{ background: isDark ? '#0f172a' : '#fff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }}
            >
              <div className="w-[55px] h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 to-blue-950 border-r shrink-0" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
                <span className="text-[8px] font-black text-yellow-400 tracking-wider">ANPC</span>
                <svg className="w-5 h-5 text-yellow-500 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
              </div>
              <div className="flex-1 px-3 py-1 leading-tight flex flex-col justify-center">
                <span className="text-[9px] font-bold tracking-widest mb-0.5" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>ROMÂNIA</span>
                <span className="text-[10px] font-black uppercase leading-tight transition-colors" style={{ color: isDark ? '#cbd5e1' : '#334155' }}>Soluționarea<br/><span className="text-blue-500">Alternativă</span> a litigiilor</span>
              </div>
            </a>

            <a
              href="https://ec.europa.eu/consumers/odr/main/index.cfm?event=main.home2.show&lng=RO"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex rounded-lg overflow-hidden items-center w-[220px] h-[55px] hover:border-lime-500/50 transition-all border"
              style={{ background: isDark ? '#0f172a' : '#fff', borderColor: isDark ? '#1e293b' : '#e2e8f0' }}
            >
              <div className="w-[55px] h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-700 to-blue-900 border-r shrink-0" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
                <span className="text-[8px] font-black text-yellow-400 tracking-wider">EUROPA</span>
                <svg className="w-5 h-5 text-yellow-500 mt-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
              </div>
              <div className="flex-1 px-3 py-1 leading-tight flex flex-col justify-center">
                <span className="text-[9px] font-bold tracking-widest mb-0.5" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>UNIUNEA EUROPEANĂ</span>
                <span className="text-[10px] font-black uppercase leading-tight transition-colors" style={{ color: isDark ? '#cbd5e1' : '#334155' }}>Soluționarea<br/><span className="text-lime-500">Online</span> a litigiilor</span>
              </div>
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}
