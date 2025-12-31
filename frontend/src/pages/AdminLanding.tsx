import React, { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AdminLanding() {
  const navigate = useNavigate()
  const isLogged = (() => {
    try {
      const token = localStorage.getItem('adminAuth')
      const ts = Number(localStorage.getItem('adminAuthTS') || 0)
      const valid = token && ts && (Date.now() - ts) <= 3600000
      if (!valid) { localStorage.removeItem('adminAuth'); localStorage.removeItem('adminAuthTS') }
      return !!valid
    } catch { return false }
  })()
  const title = useMemo(() => 'Panou administrare', [])

  useEffect(() => {
    if (!isLogged) navigate('/login', { replace: true })
  }, [isLogged, navigate])

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      
      {isLogged && (
        <>
        <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          <button
            type="button"
            className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
            onClick={() => { try { localStorage.removeItem('adminAuth'); localStorage.removeItem('adminAuthTS') } catch {}; navigate('/login', { replace: true }) }}
          >
            Delogare
          </button>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Actiuni</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a href="/admin/administrare-rezervari" className="group rounded-md border border-slate-200 hover:border-sky-300 p-4 flex items-center gap-3 hover:bg-sky-50 transition-colors">
              <span aria-hidden>🗂️</span>
              <div>
                <div className="font-medium">Administrare rezervari</div>
                <div className="text-xs text-slate-600">Vizualizare si anulari</div>
              </div>
            </a>
            <a href="/admin/pozitii-libere" className={`group rounded-md border p-4 flex items-center gap-3 transition-colors ${isLogged ? 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50' : 'border-slate-200 text-slate-400 cursor-not-allowed pointer-events-none'}`}>
              <span aria-hidden>📝</span>
              <div>
                <div className="font-medium">Generare pozitii libere</div>
                <div className="text-xs text-slate-600">Text gata de copiat pentru WhatsApp</div>
              </div>
            </a>
            <span className="rounded-md border border-slate-200 p-4 flex items-center gap-3 text-slate-400 cursor-not-allowed">
              <span aria-hidden>🔒</span>
              <div>
                <div className="font-medium">Setare zi ca ocupat complet</div>
                <div className="text-xs">In curand</div>
              </div>
            </span>
            <span className="rounded-md border border-slate-200 p-4 flex items-center gap-3 text-slate-400 cursor-not-allowed">
              <span aria-hidden>🔒</span>
              <div>
                <div className="font-medium">Setare pozitie saptamanala</div>
                <div className="text-xs">In curand</div>
              </div>
            </span>
          </div>
        </div>
        </>
      )}
    </div>
  )
}
