import React, { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { SportType, SubscriptionSummaryDto } from '../types'
import AdminHeader from '../components/AdminHeader'
import { fetchActiveSubscriptions, cancelSubscription } from '../api'
import { Plus, Phone, X, RefreshCw } from 'lucide-react'

function sportLabel(s?: SportType) {
  switch (s) {
    case 'TENNIS': return 'Tenis'
    case 'PADEL': return 'Padel'
    case 'BEACH_VOLLEY': return 'Volei pe plaja'
    case 'BASKETBALL': return 'Baschet'
    case 'FOOTVOLLEY': return 'Tenis de picior'
    case 'TABLE_TENNIS': return 'Tenis de masa'
    default: return s || ''
  }
}

function formatTime(t?: string) {
  if (!t) return ''
  return t.length >= 5 ? t.slice(0, 5) : t
}

function formatDateShortRo(iso?: string) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  const months = ['Ian', 'Feb', 'Mar', 'Apr', 'Mai', 'Iun', 'Iul', 'Aug', 'Sep', 'Oct', 'Noi', 'Dec']
  const monthIdx = Math.max(0, Math.min(11, Number(m) - 1))
  const dd = String(Number(d))
  return `${dd} ${months[monthIdx]} ${y}`
}

function broadcastUpdate() {
  try {
    const BC: any = (window as any).BroadcastChannel
    if (BC) {
      const ch = new BC('bookingUpdates')
      try { ch.postMessage({ type: 'changed' }) } catch { }
      try { (ch as any).close?.() } catch { }
    }
    localStorage.setItem('bookingUpdate', JSON.stringify({ ts: Date.now() }))
    setTimeout(() => { try { localStorage.removeItem('bookingUpdate') } catch { } }, 0)
  } catch { }
}

export default function AdminSubscriptionsPage() {
  const navigate = useNavigate()
  const [auth, setAuth] = useState<string | null>(null)
  const [subscriptions, setSubscriptions] = useState<SubscriptionSummaryDto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cancellingKey, setCancellingKey] = useState<string | null>(null)
  const [confirmSub, setConfirmSub] = useState<SubscriptionSummaryDto | null>(null)

  useEffect(() => {
    try {
      const token = sessionStorage.getItem('adminAuth')
      const ts = Number(sessionStorage.getItem('adminAuthTS') || 0)
      if (token && ts && (Date.now() - ts) <= 3600000) {
        setAuth(token)
      } else {
        navigate('/login', { replace: true })
      }
    } catch {
      navigate('/login', { replace: true })
    }
  }, [navigate])

  async function reload(currentAuth: string) {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchActiveSubscriptions(currentAuth)
      setSubscriptions(data)
    } catch (e: any) {
      setError(e?.message || 'Eroare la încărcarea abonamentelor.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (auth) reload(auth)
  }, [auth])

  async function confirmCancel() {
    if (!auth || !confirmSub) return
    const sub = confirmSub
    setConfirmSub(null)
    setCancellingKey(sub.key)
    try {
      await cancelSubscription(sub.bookingIds, auth)
      broadcastUpdate()
      await reload(auth)
    } catch (e: any) {
      setError(e?.message || 'Eroare la anularea abonamentului.')
    } finally {
      setCancellingKey(null)
    }
  }

  return (
    <div className="min-h-screen font-sans pb-20" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {auth && (
        <>
          <AdminHeader active="subscriptions-manage" />
          <div className="max-w-4xl mx-auto px-4 pt-6 space-y-4">
            <div className="rounded-[24px] p-6 border flex items-center justify-between gap-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--card-shadow)' }}>
              <div>
                <span className="block text-[11px] font-black uppercase tracking-[0.12em] mb-1.5" style={{ color: '#fbbf24', fontFamily: "'Outfit', sans-serif" }}>Clienți de casă</span>
                <h2 className="text-2xl font-black tracking-tight mb-2" style={{ color: 'var(--text)', fontFamily: "'Outfit', sans-serif" }}>Abonamente active</h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>Toate abonamentele active, cu opțiune de anulare completă.</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => reload(auth)}
                  disabled={loading}
                  className="w-10 h-10 rounded-2xl border flex items-center justify-center transition-all disabled:opacity-50 active:scale-95"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface2)', color: 'var(--muted)' }}
                  aria-label="Reîncarcă"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <Link
                  to="/admin/subscriptions/add"
                  className="w-10 h-10 rounded-2xl border flex items-center justify-center transition-all active:scale-95 hover:opacity-80"
                  style={{ borderColor: 'var(--border)', background: 'var(--lime)', color: 'var(--lime-on)' }}
                  aria-label="Adaugă abonament nou"
                  title="Adaugă abonament nou"
                >
                  <Plus className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {error && <div className="p-4 rounded-xl text-sm font-medium" style={{ background: 'rgba(244,63,94,0.14)', color: '#fb7185' }}>{error}</div>}

            {/* Mobile card list */}
            <div className="md:hidden rounded-[24px] border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--surface)', boxShadow: 'var(--card-shadow)' }}>
              {subscriptions.map(s => (
                <div key={s.key} className="flex items-center gap-3 px-4 py-3.5 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex-1 min-w-0">
                    <span className="text-[15px] font-extrabold truncate block" style={{ color: 'var(--text)', fontFamily: "'Outfit', sans-serif" }}>{s.customerName}</span>
                    <div className="text-xs font-semibold mt-1" style={{ color: 'var(--faint)' }}>Teren {s.court.name} · {sportLabel(s.court?.sportType)}</div>
                    <div className="text-xs font-semibold mt-0.5" style={{ color: 'var(--faint)' }}>{formatTime(s.startTime)} – {formatTime(s.endTime)} · {(s.pricePerSession as unknown as number)?.toFixed?.(0)} RON/ședință</div>
                    <div className="text-xs font-semibold mt-0.5" style={{ color: 'var(--faint)' }}>{s.occurrences} ședințe rămase · următoarea {formatDateShortRo(s.nextDate)}</div>
                    {s.customerPhone && (
                      <a href={`tel:${s.customerPhone}`} className="flex items-center gap-1.5 mt-1 text-xs font-bold transition-colors hover:opacity-70" style={{ color: 'var(--lime-link)' }}>
                        <Phone className="w-3 h-3 shrink-0" /> {s.customerPhone}
                      </a>
                    )}
                  </div>
                  <button
                    className="rounded-[9px] text-[9px] font-black uppercase tracking-wide text-center transition-opacity disabled:opacity-50 shrink-0"
                    style={{ padding: '6px 11px', fontFamily: "'Outfit', sans-serif", background: '#f43f5e', color: '#fff' }}
                    onClick={() => setConfirmSub(s)}
                    disabled={cancellingKey === s.key}
                  >
                    Anulare
                  </button>
                </div>
              ))}
              {!loading && subscriptions.length === 0 && (
                <div className="text-center py-16">
                  <div className="font-black uppercase tracking-[0.2em] text-sm" style={{ color: 'var(--faint)' }}>Niciun abonament activ</div>
                </div>
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-hidden rounded-3xl border shadow-2xl" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <table className="min-w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--surface2)' }}>
                    <th className="text-left px-5 py-4 font-black uppercase tracking-widest text-[9px] border-b rounded-tl-2xl" style={{ borderColor: 'var(--border)', color: 'var(--faint)' }}>Client</th>
                    <th className="text-left px-5 py-4 font-black uppercase tracking-widest text-[9px] border-b" style={{ borderColor: 'var(--border)', color: 'var(--faint)' }}>Teren</th>
                    <th className="text-left px-5 py-4 font-black uppercase tracking-widest text-[9px] border-b" style={{ borderColor: 'var(--border)', color: 'var(--faint)' }}>Interval</th>
                    <th className="text-left px-5 py-4 font-black uppercase tracking-widest text-[9px] border-b" style={{ borderColor: 'var(--border)', color: 'var(--faint)' }}>Preț/ședință</th>
                    <th className="text-left px-5 py-4 font-black uppercase tracking-widest text-[9px] border-b" style={{ borderColor: 'var(--border)', color: 'var(--faint)' }}>Ședințe</th>
                    <th className="text-center px-5 py-4 font-black uppercase tracking-widest text-[9px] border-b rounded-tr-2xl" style={{ borderColor: 'var(--border)', color: 'var(--faint)' }}>Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map(s => (
                    <tr key={s.key}>
                      <td className="px-5 py-4 border-b pr-8" style={{ borderColor: 'var(--border)' }}>
                        <div className="font-black uppercase tracking-tight text-[13px]" style={{ color: 'var(--text)' }}>{s.customerName}</div>
                        <div className="text-[10px] font-bold tracking-wider lowercase" style={{ color: 'var(--faint)' }}>
                          {s.customerPhone ? (
                            <a href={`tel:${s.customerPhone}`} className="hover:underline" style={{ color: 'var(--lime-link)' }}>{s.customerPhone}</a>
                          ) : s.customerPhone}
                        </div>
                      </td>
                      <td className="px-5 py-4 border-b font-extrabold" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>{s.court.name} <span className="font-bold" style={{ color: 'var(--faint)' }}>· {sportLabel(s.court?.sportType)}</span></td>
                      <td className="px-5 py-4 border-b font-black tracking-tight" style={{ borderColor: 'var(--border)', color: 'var(--text)' }}>{formatTime(s.startTime)} - {formatTime(s.endTime)}</td>
                      <td className="px-5 py-4 border-b font-black italic" style={{ borderColor: 'var(--border)', color: 'var(--lime-link)' }}>{(s.pricePerSession as unknown as number)?.toFixed?.(0)} RON</td>
                      <td className="px-5 py-4 border-b font-bold" style={{ borderColor: 'var(--border)', color: 'var(--faint)' }}>{s.occurrences} rămase · următoarea {formatDateShortRo(s.nextDate)}</td>
                      <td className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                        <div className="flex justify-center">
                          <button
                            className="text-[9px] font-black uppercase tracking-wide rounded-[9px] transition-opacity disabled:opacity-50"
                            style={{ padding: '6px 11px', fontFamily: "'Outfit', sans-serif", background: '#f43f5e', color: '#fff' }}
                            onClick={() => setConfirmSub(s)}
                            disabled={cancellingKey === s.key}
                          >
                            Anulare
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && subscriptions.length === 0 && (
                <div className="text-center py-24">
                  <div className="font-black uppercase tracking-[0.4em] text-2xl" style={{ color: 'var(--border)' }}>Niciun abonament</div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {confirmSub && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-sm overflow-hidden rounded-[2rem] shadow-2xl border animate-in zoom-in-95 duration-200" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="p-8 flex flex-col items-center text-center" style={{ background: 'rgba(244,63,94,0.1)' }}>
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 rotate-3 shadow-xl bg-rose-500 text-white shadow-rose-500/30">
                <X className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black uppercase tracking-widest tracking-tighter" style={{ color: 'var(--text)' }}>Anulare abonament</h3>
              <p className="text-sm mt-3 leading-relaxed font-semibold" style={{ color: 'var(--text2)' }}>
                Ești sigur că vrei să anulezi abonamentul lui <strong>{confirmSub.customerName}</strong>? Toate cele {confirmSub.occurrences} ședințe rămase vor deveni disponibile publicului.
              </p>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4" style={{ background: 'var(--surface)' }}>
              <button
                className="w-full py-4 rounded-2xl border font-black active:scale-95 transition-all text-[11px] uppercase tracking-widest"
                style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
                onClick={() => setConfirmSub(null)}
              >
                Nu, înapoi
              </button>
              <button
                className="w-full py-4 rounded-2xl text-white font-black shadow-xl active:scale-95 transition-all text-[11px] uppercase tracking-widest bg-rose-500 hover:bg-rose-600 shadow-rose-500/30"
                onClick={confirmCancel}
              >
                Da, confirmă
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
