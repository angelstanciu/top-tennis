import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Phone, Check, X, MessageSquare, Trash2, Calendar } from 'lucide-react'
import AdminHeader from '../components/AdminHeader'
import SegmentedControl from '../components/admin/SegmentedControl'

export default function AdminSubscriptionRequestsPage() {
  const navigate = useNavigate()
  const [auth, setAuth] = useState<string | null>(null)
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('PENDING')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [approveId, setApproveId] = useState<number | null>(null)

  useEffect(() => {
    const token = sessionStorage.getItem('adminAuth')
    const ts = Number(sessionStorage.getItem('adminAuthTS') || 0)
    if (token && ts && (Date.now() - ts) <= 3600000) {
      setAuth(token)
    } else {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  const fetchRequests = async () => {
    if (!auth) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/subscriptions/requests', {
        headers: {
          'Authorization': `Basic ${auth}`
        }
      })
      if (res.ok) {
        setRequests(await res.json())
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [auth])

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/admin/subscriptions/requests/${deleteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${auth}`
        }
      })
      if (res.ok || res.status === 404) {
        setRequests(prev => prev.filter(r => r.id !== deleteId))
        setFilter('ALL')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setDeleteId(null);
    }
  }

  const confirmApprove = async (navAway: boolean) => {
    if (!approveId) return;
    try {
      const res = await fetch(`/api/admin/subscriptions/requests/${approveId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        },
        body: JSON.stringify({ status: 'APPROVED' })
      })
      if (res.ok) {
        setRequests(prev => prev.map(r => r.id === approveId ? { ...r, status: 'APPROVED' } : r))
        if (navAway) navigate('/admin/subscriptions/add');
      }
    } catch (err) {
      console.error(err)
    } finally {
      setApproveId(null);
    }
  }

  const handleStatusUpdate = async (id: number, status: string) => {
    if (status === 'APPROVED') {
      setApproveId(id);
      return;
    }
    try {
      const res = await fetch(`/api/admin/subscriptions/requests/${id}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        },
        body: JSON.stringify({ status })
      })
      if (res.ok) {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r))
        if (status === 'CONTACTED') {
           setFilter('CONTACTED');
        }
      }
    } catch (err) {
      console.error(err)
    }
  }

  const filteredRequests = requests
    .filter(r => filter === 'ALL' || r.status === filter)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const SUB_STATUS: Record<string, { bg: string; color: string; label: string }> = {
    PENDING: { bg: 'rgba(244,63,94,0.14)', color: '#fb7185', label: 'Nou' },
    CONTACTED: { bg: 'rgba(245,158,11,0.14)', color: '#fbbf24', label: 'Contactat' },
    APPROVED: { bg: 'rgba(148,163,184,0.16)', color: '#cbd5e1', label: 'Finalizat' },
  }

  return (
    <div className="min-h-screen font-sans pb-20" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <AdminHeader active="subscriptions" />

      <main className="max-w-6xl mx-auto px-4 mt-8">
        <div className="rounded-[24px] p-6 border flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}>
          <div>
            <span className="block text-[11px] font-black uppercase tracking-[0.12em] mb-1.5" style={{ color: 'var(--lime-link)', fontFamily: "'Outfit', sans-serif" }}>Solicitări clienți</span>
            <h1 className="text-3xl font-black tracking-tight" style={{ color: 'var(--text)', fontFamily: "'Outfit', sans-serif" }}>Cereri abonamente</h1>
            <p className="mt-1" style={{ color: 'var(--muted)' }}>Gestionează solicitările primite de la clienți pentru abonamente Padel/Tenis.</p>
          </div>

          <SegmentedControl
            className="md:w-[420px]"
            options={[
              { value: 'PENDING', label: 'Noi' },
              { value: 'CONTACTED', label: 'Contactați' },
              { value: 'APPROVED', label: 'Aprobate' },
              { value: 'ALL', label: 'Toate' },
            ]}
            value={filter}
            onChange={setFilter}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--lime)' }}></div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-[24px] p-20 text-center border border-dashed" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
             <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--surface2)' }}>
                <MessageSquare className="w-8 h-8" style={{ color: 'var(--faint)' }} />
             </div>
             <p className="font-medium" style={{ color: 'var(--faint)' }}>Nicio cerere găsită pentru acest filtru.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredRequests.map(req => {
              const st = SUB_STATUS[req.status] || SUB_STATUS.APPROVED
              return (
              <div
                key={req.id}
                className="rounded-[22px] overflow-hidden border p-4 relative"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)', opacity: req.status === 'APPROVED' ? 0.9 : 1 }}
              >
                 <div className="flex items-center justify-between mb-2.5 gap-2">
                    <span
                      className="text-[9px] font-black uppercase tracking-wide px-2.5 py-1 rounded-full shrink-0"
                      style={{ background: st.bg, color: st.color, fontFamily: "'Outfit', sans-serif" }}
                    >
                      {st.label}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-bold" style={{ color: 'var(--faint)' }}>{new Date(req.createdAt).toLocaleDateString()}</span>
                      {req.status === 'APPROVED' && (
                        <button
                           onClick={() => setDeleteId(req.id)}
                           className="p-1.5 rounded-lg transition-all hover:opacity-70"
                           style={{ background: 'var(--surface2)', color: 'var(--faint)', border: '1px solid var(--border)' }}
                           title="Șterge definitiv"
                        >
                           <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                 </div>
                 <div className="text-lg font-black tracking-tight" style={{ color: 'var(--text)', fontFamily: "'Outfit', sans-serif" }}>{req.player.fullName}</div>
                 <div className="text-xs font-extrabold mt-0.5" style={{ color: 'var(--lime-link)', fontFamily: "'Outfit', sans-serif" }}>{req.sportType} · {req.subscriptionType}</div>

                 <a
                   href={`tel:${req.player.phoneNumber}`}
                   className="flex items-center gap-2 mt-3 text-sm font-bold transition-colors hover:opacity-70"
                   style={{ color: 'var(--text2)' }}
                 >
                   <Phone className="w-3.5 h-3.5 shrink-0" /> {req.player.phoneNumber}
                 </a>

                 <div className="mt-3 p-3 rounded-2xl border" style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}>
                    <p className="text-[9px] font-black uppercase tracking-wide mb-1" style={{ color: 'var(--faint)' }}>Program dorit</p>
                    <div className="text-[13px] italic leading-relaxed" style={{ color: 'var(--text2)' }}>
                      {req.preferredSchedule}
                    </div>
                 </div>

                 {req.status === 'PENDING' && (
                   <div className="flex gap-2 mt-3.5">
                      <button
                        onClick={() => setDeleteId(req.id)}
                        className="w-11 shrink-0 rounded-xl border transition-all"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface2)', color: 'var(--faint)' }}
                        title="Șterge cererea"
                      >
                        <X className="w-4 h-4 mx-auto" />
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(req.id, 'CONTACTED')}
                        className="flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wide transition-all flex items-center justify-center gap-2 active:scale-95"
                        style={{ background: '#10b981', color: '#052e16', fontFamily: "'Outfit', sans-serif" }}
                      >
                        <Phone className="w-3.5 h-3.5" /> Marchează contactat
                      </button>
                   </div>
                 )}

                 {req.status === 'CONTACTED' && (
                   <div className="flex gap-2 mt-3.5">
                      <button
                        onClick={() => setDeleteId(req.id)}
                        className="w-11 shrink-0 rounded-xl border transition-all"
                        style={{ borderColor: 'var(--border)', background: 'var(--surface2)', color: 'var(--faint)' }}
                        title="Șterge cererea"
                      >
                        <X className="w-4 h-4 mx-auto" />
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(req.id, 'APPROVED')}
                        className="flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wide transition-all flex items-center justify-center gap-2 active:scale-95"
                        style={{ background: '#10b981', color: '#052e16', fontFamily: "'Outfit', sans-serif" }}
                      >
                        <Check className="w-3.5 h-3.5" /> Programează & aprobă
                      </button>
                   </div>
                 )}
              </div>
              )
            })}
          </div>
        )}
      </main>

      {deleteId !== null && (() => {
        const req = requests.find(r => r.id === deleteId)
        const isApproved = req?.status === 'APPROVED'
        return (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <div className="p-6 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(244,63,94,0.14)', color: '#fb7185' }}>
                  <Trash2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black mb-2" style={{ color: 'var(--text)' }}>Confirmare ștergere</h3>
                <p className="text-sm font-medium" style={{ color: 'var(--text2)' }}>
                  {isApproved
                    ? `Ești sigur că a expirat abonamentul rezervat de ${req?.player?.fullName}?`
                    : 'Ești sigur că vrei să ștergi această cerere? Această acțiune este ireversibilă.'}
                </p>
              </div>
              <div className="flex p-4 gap-3 border-t" style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}>
                 <button onClick={() => setDeleteId(null)} className="flex-1 py-3 rounded-xl font-bold transition-colors hover:opacity-70" style={{ color: 'var(--muted)' }}>Anulează</button>
                 <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 text-sm" style={{ background: '#f43f5e', boxShadow: '0 8px 20px rgba(244,63,94,0.3)' }}>Șterge</button>
              </div>
            </div>
          </div>
        )
      })()}

      {approveId !== null && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
             <div className="p-6 text-center text-white relative overflow-hidden" style={{ background: '#10b981' }}>
                <div className="absolute top-0 right-0 p-8 bg-white/10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl" style={{ color: '#10b981' }}>
                  <Calendar className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black tracking-tight relative z-10">Aprobare cerere</h3>
             </div>
             <div className="p-6 text-center">
                <p className="text-sm font-medium leading-relaxed mb-6" style={{ color: 'var(--text2)' }}>
                  Ai aprobat cererea de abonament! Statusul va fi schimbat în Finalizat.<br/><br/>
                  <strong style={{ color: '#34d399' }}>Nu uita să creezi abonamentul propriu-zis în calendar</strong> pentru a rezerva slot-urile aferente.
                </p>
                <div className="flex flex-col gap-3">
                   <button onClick={() => confirmApprove(true)} className="w-full py-4 rounded-xl font-bold text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2" style={{ background: '#10b981', boxShadow: '0 8px 20px rgba(16,185,129,0.25)' }}>
                     <Calendar className="w-5 h-5" /> Mergi la programare abonamente
                   </button>
                   <button onClick={() => confirmApprove(false)} className="w-full py-3.5 rounded-xl font-bold transition-colors" style={{ background: 'var(--surface2)', color: 'var(--muted)' }}>
                     Închide (programez mai târziu)
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
