import React from 'react'
import { Link, useNavigate } from 'react-router-dom'

type AdminHeaderProps = {
  active?: 'landing' | 'bookings' | 'free'
}

export default function AdminHeader({ active }: AdminHeaderProps) {
  const navigate = useNavigate()
  const activeLabel =
    active === 'bookings' ? 'Administrare rezervari' :
    active === 'free' ? 'Pozitii libere' :
    null
  const isLanding = active === 'landing'

  return (
    <div className="rounded-lg overflow-hidden border border-slate-200 shadow-sm">
      <div className="bg-gradient-to-r from-emerald-600 via-sky-500 to-amber-400 text-white px-4 py-3 text-center relative flex flex-col justify-center">
        {activeLabel && (
          <button
            type="button"
            className="absolute left-5 inset-y-0 flex items-center z-10 text-white/90 hover:text-white text-3xl leading-none"
            onClick={() => navigate('/admin')}
            aria-label="Inapoi"
            title="Inapoi"
          >
            {'\u2039'}
          </button>
        )}
        <div className="text-sm uppercase tracking-wide opacity-90">Administrare Platforma Star Arena</div>
        <div className="text-xs opacity-90">Panou de control</div>
      </div>
      <div className="bg-white px-3 py-2 flex flex-wrap items-center gap-2 text-sm">
        <div className="flex items-center gap-2">
          <Link
            className={`text-slate-700 hover:text-slate-900 underline underline-offset-2 decoration-slate-300 ${isLanding ? 'font-semibold' : ''}`}
            to="/admin"
          >
            Acasa
          </Link>
          {activeLabel && (
            <>
              <span className="text-slate-400">{'>'}</span>
              <span className="text-slate-900 font-semibold underline underline-offset-2 decoration-slate-300">{activeLabel}</span>
            </>
          )}
        </div>
        <div className="ml-auto" />
      </div>
    </div>
  )
}
