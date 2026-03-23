import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { XCircle, CheckCircle, Loader2, Home, AlertCircle } from 'lucide-react'
import { cancelBookingByToken } from '../api'

export default function CancelByTokenPage() {
  const { token } = useParams<{ token: string }>()
  const nav = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function performCancellation() {
      if (!token) {
        setStatus('error')
        setErrorMessage('Token de anulare lipsă.')
        return
      }

      try {
        await cancelBookingByToken(token)
        setStatus('success')
      } catch (err: any) {
        setStatus('error')
        setErrorMessage(err.message || 'Nu am putut anula rezervarea. Probabil a expirat limita de 24h sau este deja anulată.')
      }
    }

    performCancellation()
  }, [token])

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-rose-500/10 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative z-10 text-center"
      >
        <AnimatePresence mode="wait">
          {status === 'loading' && (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-10"
            >
              <Loader2 className="w-16 h-16 text-emerald-400 animate-spin mb-6" />
              <h2 className="text-2xl font-bold text-white mb-2">Se procesează...</h2>
              <p className="text-slate-400">Anulăm rezervarea ta, te rugăm să aștepți.</p>
            </motion.div>
          )}

          {status === 'success' && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-6"
            >
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Anulată cu succes!</h2>
              <p className="text-slate-300 text-lg leading-relaxed mb-10">
                Rezervarea a fost anulată. Sperăm să te vedem data viitoare în arenă!
              </p>
              <button 
                onClick={() => nav('/')}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 group"
              >
                <Home className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" />
                Înapoi la Acasă
              </button>
            </motion.div>
          )}

          {status === 'error' && (
            <motion.div 
              key="error"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-6"
            >
              <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mb-6 border border-rose-500/30">
                <AlertCircle className="w-10 h-10 text-rose-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Ups! Ceva n-a mers</h2>
              <p className="text-rose-200/80 text-lg leading-relaxed mb-10">
                {errorMessage}
              </p>
              <div className="flex flex-col gap-4 w-full">
                <button 
                  onClick={() => nav('/')}
                  className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-4 rounded-2xl transition-all border border-white/10 flex items-center justify-center gap-2"
                >
                  <Home className="w-5 h-5" />
                  Mergi la Acasă
                </button>
                <p className="text-slate-500 text-sm">
                  Dacă crezi că este o eroare, te rugăm să ne contactezi direct.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
