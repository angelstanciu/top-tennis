import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Phone, Check, X, MessageSquare, Clock, Filter, Trash2 } from 'lucide-react'
import AdminHeader from '../components/AdminHeader'

export default function AdminSubscriptionRequestsPage() {
  const navigate = useNavigate()
  const [auth, setAuth] = useState<string | null>(null)
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('PENDING')

  useEffect(() => {
    const token = localStorage.getItem('adminAuth')
    const ts = Number(localStorage.getItem('adminAuthTS') || 0)
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

  const handleDelete = async (id: number) => {
    if (!window.confirm("Ești sigur că vrei să ștergi această cerere?")) return;
    try {
      const res = await fetch(`/api/admin/subscriptions/requests/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${auth}`
        }
      })
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== id))
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleStatusUpdate = async (id: number, status: string) => {
    if (status === 'APPROVED') {
       alert("Nu uita să creezi abonamentul din secțiunea 'Adaugă Rezervare/Abonament'!");
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
      }
    } catch (err) {
      console.error(err)
    }
  }

  const filteredRequests = requests.filter(r => filter === 'ALL' || r.status === filter)

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <AdminHeader active="landing" />
      
      <main className="max-w-6xl mx-auto px-4 mt-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight">Cereri Abonamente</h1>
            <p className="text-slate-500">Gestionează solicitările primite de la clienți pentru abonamente Padel/Tenis.</p>
          </div>

          <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
             {['PENDING', 'CONTACTED', 'APPROVED', 'ALL'].map(f => (
               <button 
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
               >
                 {f === 'PENDING' ? 'Noi' : f === 'CONTACTED' ? 'Contactați' : f === 'APPROVED' ? 'Aprobate' : 'Toate'}
               </button>
             ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin"></div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-20 text-center border border-dashed border-slate-300">
             <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-slate-300" />
             </div>
             <p className="text-slate-400 font-medium">Nicio cerere găsită pentru acest filtru.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map(req => (
              <Card key={req.id} className={`rounded-[2rem] overflow-hidden border-slate-200 hover:shadow-xl hover:shadow-slate-200/50 transition-all group relative ${req.status === 'APPROVED' ? 'bg-slate-50/50 opacity-90' : ''}`}>
                <CardHeader className="bg-slate-50/50 pb-4">
                   <div className="flex justify-between items-start mb-2">
                      <Badge className={
                        req.status === 'PENDING' ? 'bg-rose-500' : 
                        req.status === 'CONTACTED' ? 'bg-amber-500' : 'bg-slate-300 text-slate-600'
                      }>
                        {req.status === 'PENDING' ? 'NOI' : req.status === 'CONTACTED' ? 'CONTACTAȚI' : 'FINALIZAT'}
                      </Badge>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        <Clock className="w-3 h-3" />
                        {new Date(req.createdAt).toLocaleDateString()}
                      </div>
                   </div>
                   <CardTitle className="text-xl font-black text-slate-800">{req.player.fullName}</CardTitle>
                   <CardDescription className="font-bold text-amber-600 flex items-center gap-1">
                      {req.sportType} • {req.subscriptionType}
                   </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 relative">
                   {req.status === 'APPROVED' && (
                      <button 
                         onClick={() => handleDelete(req.id)}
                         className="absolute top-0 right-0 -mt-[4.5rem] mr-4 p-2 bg-white rounded-xl shadow-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 border border-slate-100 transition-all z-10"
                         title="Șterge definitiv"
                      >
                         <Trash2 className="w-4 h-4" />
                      </button>
                   )}
                   <div className={`flex items-center gap-3 mb-6 p-3 rounded-2xl border ${req.status === 'APPROVED' ? 'bg-slate-100/50 border-slate-100/50 grayscale-[0.5]' : 'bg-slate-50 border-slate-100'}`}>
                      <a href={`tel:${req.player.phoneNumber}`} className="flex-1 flex items-center gap-2 text-sm font-black text-slate-800 hover:text-amber-600 truncate">
                        <Phone className="w-4 h-4 shrink-0" /> {req.player.phoneNumber}
                      </a>
                   </div>

                   <div className={`mb-6 ${req.status === 'APPROVED' ? 'opacity-60' : ''}`}>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-1">Program dorit:</p>
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100/50 text-slate-700 text-sm italic leading-relaxed">
                        "{req.preferredSchedule}"
                      </div>
                   </div>

                   {req.status === 'PENDING' && (
                     <div className="flex gap-2">
                        <button 
                          onClick={() => handleDelete(req.id)}
                          className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 font-bold text-xs uppercase transition-all shadow-sm"
                          title="Șterge Cererea"
                        >
                          <X className="w-4 h-4 mx-auto" />
                        </button>
                        <button 
                          onClick={() => handleStatusUpdate(req.id, 'CONTACTED')}
                          className="flex-[3] py-3 rounded-xl bg-emerald-500 text-white font-black text-[11px] uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
                        >
                          <Phone className="w-4 h-4" /> Marchează Contactat
                        </button>
                     </div>
                   )}

                   {req.status === 'CONTACTED' && (
                     <div className="flex gap-2">
                        <button 
                          onClick={() => handleDelete(req.id)}
                          className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200 font-bold text-xs uppercase transition-all shadow-sm"
                          title="Șterge Cererea"
                        >
                          <X className="w-4 h-4 mx-auto" />
                        </button>
                        <button 
                          onClick={() => handleStatusUpdate(req.id, 'APPROVED')}
                          className="flex-[3] py-3 rounded-xl bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
                        >
                          <Check className="w-4 h-4" /> Programează & Aprobă
                        </button>
                     </div>
                   )}

                   {req.status === 'APPROVED' && (
                     <div className="flex justify-center p-3 bg-slate-100/80 rounded-xl border border-slate-200/50">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Check className="w-4 h-4" /> Finalizat
                        </span>
                     </div>
                   )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
