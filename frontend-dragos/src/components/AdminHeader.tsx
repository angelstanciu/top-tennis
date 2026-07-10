import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Calendar, Users, Settings, LogOut, Award } from 'lucide-react'
import { useTheme } from '../ThemeContext'
import ThemeSwitcher from './ThemeSwitcher'

type AdminHeaderProps = {
  active?: 'landing' | 'bookings' | 'free' | 'block-day' | 'weekly' | 'subscriptions'
}

export default function AdminHeader({ active }: AdminHeaderProps) {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const navItems = [
    { id: 'landing', label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { id: 'bookings', label: 'Rezervări', path: '/admin/administrare-rezervari', icon: Calendar },
    { id: 'free', label: 'Poziții Libere', path: '/admin/pozitii-libere', icon: Users },
    { id: 'block-day', label: 'Blocare', path: '/admin/block-day', icon: Settings },
    { id: 'subscriptions', label: 'Abonamente', path: '/admin/abonamente', icon: Award }
  ]

  return (
    <div
      className="rounded-[2.5rem] overflow-hidden border shadow-2xl mb-8"
      style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0', background: isDark ? '#020617' : '#ffffff' }}
    >
      <div
        className="px-6 py-5 border-b flex flex-col gap-4"
        style={{
          background: isDark ? 'linear-gradient(90deg, #0f172a, #1e293b, #0f172a)' : 'linear-gradient(90deg, #ffffff, #f8fafc, #ffffff)',
          borderColor: isDark ? 'rgba(30,41,59,0.5)' : '#e2e8f0',
        }}
      >
        {/* Brand row: logo left, switcher + logout right — always on same line */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl rotate-3 shadow-lg" style={{ background: '#a3e635', boxShadow: '0 8px 20px rgba(163,230,53,0.2)' }}>
              <LayoutDashboard className="w-6 h-6" style={{ color: '#020617' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-2xl tracking-tighter uppercase" style={{ fontFamily: 'Outfit, sans-serif', color: isDark ? '#fff' : '#0f172a' }}>
                   STAR<span style={{ color: '#a3e635' }}>ARENA</span>
                </span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-black tracking-widest uppercase"
                  style={{ background: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9', color: isDark ? '#94a3b8' : '#64748b' }}
                >
                  Pro Admin
                </span>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] mt-1 italic" style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Exclusive Control Panel</div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <ThemeSwitcher size="lg" />
            <button
               onClick={() => {
                 sessionStorage.removeItem('adminAuth');
                 navigate('/admin');
               }}
               className="hover:bg-rose-500 hover:text-white p-3.5 rounded-2xl border transition-all active:scale-90 group shadow-lg"
               style={{ background: isDark ? '#0f172a' : '#f1f5f9', color: isDark ? '#94a3b8' : '#64748b', borderColor: isDark ? '#1e293b' : '#e2e8f0' }}
               title="Deconectare"
             >
               <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Nav pills row — below brand on all screen sizes */}
        <div
          className="flex items-center p-1.5 rounded-2xl border shadow-inner overflow-x-auto"
          style={{ background: isDark ? 'rgba(2,6,23,0.5)' : '#f8fafc', borderColor: isDark ? '#1e293b' : '#e2e8f0' }}
        >
           {navItems.map(item => {
             const Icon = item.icon
             const isActive = active === item.id
             return (
               <Link
                 key={item.id}
                 to={item.path}
                 className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 whitespace-nowrap ${isActive ? 'shadow-xl scale-105' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                 style={isActive
                   ? { background: '#a3e635', color: '#020617', boxShadow: '0 8px 20px rgba(163,230,53,0.2)' }
                   : { color: isDark ? '#94a3b8' : '#64748b' }}
               >
                 <Icon className="w-4 h-4" />
                 <span className="hidden sm:inline">{item.label}</span>
               </Link>
             )
           })}
        </div>
      </div>
    </div>
  )
}
