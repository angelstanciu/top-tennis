import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Calendar, Users, Settings, LogOut, Award } from 'lucide-react'

type AdminHeaderProps = {
  active?: 'landing' | 'bookings' | 'free' | 'block-day' | 'weekly' | 'subscriptions'
}

export default function AdminHeader({ active }: AdminHeaderProps) {
  const navigate = useNavigate()
  
  const navItems = [
    { id: 'landing', label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { id: 'bookings', label: 'Rezervări', path: '/admin/administrare-rezervari', icon: Calendar },
    { id: 'free', label: 'Poziții Libere', path: '/admin/pozitii-libere', icon: Users },
    { id: 'block-day', label: 'Blocare', path: '/admin/block-day', icon: Settings },
    { id: 'subscriptions', label: 'Abonamente', path: '/admin/abonamente', icon: Award }
  ]

  return (
    <div className="rounded-[2.5rem] overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl mb-8">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-6 border-b border-slate-800/50 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500 p-3 rounded-2xl rotate-3 shadow-lg shadow-emerald-500/20">
            <LayoutDashboard className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-2xl tracking-tighter text-white uppercase" style={{ fontFamily: 'Outfit, sans-serif' }}>
                 STAR<span className="text-emerald-400">ARENA</span>
              </span>
              <span className="text-[10px] bg-white/10 text-slate-400 px-2 py-0.5 rounded-full font-black tracking-widest uppercase">Pro Admin</span>
            </div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1 italic">Exclusive Control Panel</div>
          </div>
        </div>

        <div className="flex items-center bg-slate-950/50 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
           {navItems.map(item => {
             const Icon = item.icon
             const isActive = active === item.id
             return (
               <Link 
                 key={item.id} 
                 to={item.path}
                 className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 ${isActive ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20 scale-105' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
               >
                 <Icon className="w-4 h-4" />
                 <span className="hidden lg:inline">{item.label}</span>
               </Link>
             )
           })}
        </div>

        <button 
           onClick={() => {
             localStorage.removeItem('adminAuth');
             navigate('/admin');
           }}
           className="bg-slate-900 hover:bg-rose-500 text-slate-400 hover:text-white p-3.5 rounded-2xl border border-slate-800 transition-all active:scale-90 group shadow-lg"
           title="Deconectare"
         >
           <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  )
}
