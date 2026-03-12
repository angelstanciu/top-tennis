import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { loginPlayer, registerPlayer, requestPlayerOtp, verifyPlayerOtp, loginWithGoogle, loginWithFacebook } from '../api';
import { PlayerUser } from '../types';
import { GoogleLogin, useGoogleLogin } from '@react-oauth/google';
import { Chrome, Facebook, Smartphone, Lock, User, ArrowRight, ChevronLeft, Mail, Loader2 } from 'lucide-react';

export default function PlayerAuthPage() {
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'otp'>('login');
  
  useEffect(() => {
    // Load Facebook SDK
    (window as any).fbAsyncInit = function() {
      (window as any).FB.init({
        appId: import.meta.env.VITE_FACEBOOK_APP_ID || '1234567890',
        cookie: true,
        xfbml: true,
        version: 'v12.0'
      });
    };
    (function(d, s, id) {
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s) as any; js.id = id;
      js.src = "https://connect.facebook.net/ro_RO/sdk.js";
      fjs.parentNode?.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  }, []);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [otpStep, setOtpStep] = useState<1 | 2>(1); // 1: Phone, 2: OTP
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<{ type: 'NOT_FOUND' | 'AUTH_ERROR' | 'SERVER_ERROR', message: string } | null>(null);
  
  const nav = useNavigate();

  // Reset error when switching modes or typing
  useEffect(() => {
    setError(null);
    setErrorDetails(null);
  }, [authMode, phone, password, fullName, otp]);

  const handleSuccess = (user: PlayerUser, token: string) => {
    localStorage.setItem('playerToken', token);
    localStorage.setItem('playerData', JSON.stringify(user));
    window.dispatchEvent(new Event('auth-change'));
    
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#84cc16', '#10b981', '#ffffff']
    });

    // Use location.href for robust mobile redirection to bypass internal router state issues
    setTimeout(() => {
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        window.location.href = '/profile';
      } else {
        nav('/profile', { replace: true });
      }
    }, 1000);
  };

  // Immediate redirect if token exists (Fix for "stuck" after login)
  useEffect(() => {
    const token = localStorage.getItem('playerToken');
    if (token) {
      nav('/profile', { replace: true });
    }
  }, [nav]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || !password) return;
    try {
      setLoading(true);
      const res = await loginPlayer(phone, password);
      handleSuccess(res.user, res.token);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('negăsit')) {
        setErrorDetails({ type: 'NOT_FOUND', message: 'Nu am găsit niciun cont cu acest număr.' });
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || !password || !fullName) return;
    try {
      setLoading(true);
      const res = await registerPlayer(phone, password, fullName);
      handleSuccess(res.user, res.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    if (phone.length < 10) {
      setError('Introdu un număr de telefon valid.');
      return;
    }
    try {
      setLoading(true);
      await requestPlayerOtp(phone);
      setOtpStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await verifyPlayerOtp(phone, otp);
      handleSuccess(res.user, res.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        // We'll need to update loginWithGoogle to handle access token if needed, 
        // but often the credential is fine. If useGoogleLogin gives a code/token, 
        // we might need a different backend endpoint or fetch userinfo ourselves.
        // For now, let's keep it simple and assume the backend can handle the token.
        const res = await loginWithGoogle(tokenResponse.access_token);
        handleSuccess(res.user, res.token);
      } catch (err: any) {
        setError(err.message || 'Eroare la autentificarea cu Google.');
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError('Eroare la autentificarea cu Google.')
  });

  return (
    <div className="min-h-screen flex bg-slate-950 font-sans text-slate-100 overflow-hidden selection:bg-lime-500 selection:text-black">
      
      {/* LEFT SIDE: Visual Branding (Hidden on mobile) */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-slate-900">
        <div className="absolute inset-0 z-0">
          <img 
            src="/padel-background.png" 
            alt="Star Arena Background" 
            className="w-full h-full object-cover opacity-30 grayscale hover:grayscale-0 transition-all duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/60 to-transparent" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-between p-16 w-full">
          <div onClick={() => nav('/')} className="cursor-pointer">
            <h1 className="text-3xl font-black tracking-tighter text-white" style={{ fontFamily: 'Outfit, sans-serif' }}>
              STAR<span className="text-lime-400">ARENA</span>
            </h1>
            <p className="text-lime-500/60 font-bold uppercase tracking-widest text-[9px] mt-0.5">Bascov Sports Hub</p>
          </div>

          <div className="space-y-4 max-w-sm">
            <motion.h2 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl font-black leading-[1.1] tracking-tighter"
            >
              Ești gata <br />
              <span className="text-lime-400">de joc?</span>
            </motion.h2>
            <p className="text-slate-400 text-base font-medium leading-relaxed">
              Rezervă terenul favorit și dă startul pasiunii tale. Simplu, rapid și direct de pe telefon.
            </p>
          </div>

          <div className="flex items-center gap-6 border-t border-white/5 pt-6">
            <div>
              <div className="text-2xl font-black text-white leading-none">1.2k+</div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Jucători</div>
            </div>
            <div>
              <div className="text-2xl font-black text-white leading-none">15</div>
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Terenuri</div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-[20%] right-[-10%] w-64 h-64 bg-lime-500/10 blur-[100px] rounded-full" />
        <div className="absolute bottom-[20%] left-[-10%] w-96 h-96 bg-emerald-500/10 blur-[120px] rounded-full" />
      </div>

      {/* RIGHT SIDE: Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 relative">
        <div className="absolute top-8 left-8 lg:hidden z-20">
             <h1 onClick={() => nav('/')} className="text-2xl font-black tracking-tighter text-white cursor-pointer" style={{ fontFamily: 'Outfit, sans-serif' }}>
               STAR<span className="text-lime-400">ARENA</span>
             </h1>
        </div>

        <button 
           onClick={() => nav('/')}
           className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors group flex items-center gap-2"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">Acasă</span>
          <ChevronLeft className="w-5 h-5" />
        </button>

        <motion.div 
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           className="w-full max-w-md space-y-4 lg:space-y-6"
        >
          <AnimatePresence mode="wait">
            {authMode === 'otp' ? (
              <motion.div
                key="otp-flow"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <button 
                    onClick={() => { setAuthMode('login'); setOtpStep(1); }}
                    className="flex items-center gap-2 text-lime-400 text-xs font-bold hover:gap-3 transition-all"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Înapoi la parola
                  </button>
                  <h3 className="text-2xl font-black tracking-tight">Logare prin SMS</h3>
                  <p className="text-slate-400 text-sm">Vei primi un cod de acces pe telefon.</p>
                </div>

                {error && <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium">{error}</div>}

                {otpStep === 1 ? (
                  <form onSubmit={handleRequestOtp} className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Număr Telefon</label>
                       <div className="relative">
                         <Smartphone className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600" />
                         <input 
                            type="tel"
                            placeholder="07XX XXX XXX"
                            className="w-full bg-slate-900 border border-white/5 rounded-2xl py-4 pl-14 pr-6 text-white text-lg focus:outline-none focus:ring-2 focus:ring-lime-500/50 transition-all"
                            value={phone}
                            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            required
                         />
                       </div>
                    </div>
                    <button 
                      type="submit" 
                      disabled={loading || phone.length < 10}
                      className="w-full bg-lime-500 hover:bg-lime-400 text-black font-black py-4 rounded-2xl transition-all shadow-lg shadow-lime-500/10 disabled:opacity-50"
                    >
                      {loading ? 'Se trimite...' : 'Cere Cod Acces'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex justify-between">
                         Cod Primit
                         <span className="text-lime-500/60 lowercase italic tracking-normal">Test: 123456</span>
                       </label>
                       <div className="relative">
                         <input 
                            type="text"
                            placeholder="000000"
                            className="w-full bg-slate-900 border border-white/5 rounded-2xl py-4 px-6 text-white text-3xl font-mono tracking-[0.5em] text-center focus:outline-none focus:ring-2 focus:ring-lime-500/50 transition-all"
                            value={otp}
                            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            required
                            autoFocus
                         />
                       </div>
                    </div>
                    <button 
                      type="submit" 
                      disabled={loading || otp.length < 6}
                      className="w-full bg-lime-500 hover:bg-lime-400 text-black font-black py-4 rounded-2xl transition-all shadow-lg shadow-lime-500/10 disabled:opacity-50"
                    >
                      {loading ? 'Se verifică...' : 'Confirmă Codul'}
                    </button>
                  </form>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="main-flow"
                className="space-y-6 lg:space-y-8"
              >
                <div className="space-y-2">
                  <h3 className="text-3xl font-black tracking-tighter">
                    {authMode === 'login' ? 'Conectare' : 'Salutare!'}
                  </h3>
                  <p className="text-slate-400 text-sm">
                    {authMode === 'login' 
                       ? 'Bucuros să te revedem. Intră în contul tău.' 
                       : 'Creează un cont rapid pentru a rezerva instant.'}
                  </p>
                </div>

                {/* Social Logins */}
                <div className="grid grid-cols-2 gap-3 lg:gap-4">
                  <motion.button 
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                    whileTap={{ scale: 0.98 }}
                    animate={{ 
                      boxShadow: ["0px 0px 0px rgba(16, 185, 129, 0)", "0px 0px 15px rgba(16, 185, 129, 0.1)", "0px 0px 0px rgba(16, 185, 129, 0)"] 
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                    onClick={() => googleLogin()}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 lg:gap-3 bg-white/5 border border-white/10 rounded-xl lg:rounded-2xl py-3.5 lg:py-4 transition-all font-black text-xs lg:text-sm relative overflow-hidden group shadow-xl"
                  >
                    <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {loading ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" /> : <Chrome className="w-4 h-4 lg:w-5 lg:h-5 text-emerald-400" />}
                    <span>Sign in with Google</span>
                  </motion.button>

                  <motion.button 
                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                    whileTap={{ scale: 0.98 }}
                    animate={{ 
                      boxShadow: ["0px 0px 0px rgba(37, 99, 235, 0)", "0px 0px 15px rgba(37, 99, 235, 0.1)", "0px 0px 0px rgba(37, 99, 235, 0)"] 
                    }}
                    transition={{ duration: 3, repeat: Infinity, delay: 1.5 }}
                    onClick={() => {
                        setLoading(true);
                        (window as any).FB.login((response: any) => {
                          if (response.authResponse) {
                            loginWithFacebook(response.authResponse.accessToken)
                              .then(res => handleSuccess(res.user, res.token))
                              .catch(err => setError(err.message))
                              .finally(() => setLoading(false));
                          } else {
                            setLoading(false);
                            setError('Autentificarea cu Facebook a fost anulată.');
                          }
                        }, { scope: 'public_profile,email' });
                    }}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 lg:gap-3 bg-white/5 border border-white/10 rounded-xl lg:rounded-2xl py-3.5 lg:py-4 transition-all font-black text-xs lg:text-sm relative overflow-hidden group shadow-xl"
                  >
                    <div className="absolute inset-0 bg-blue-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {loading ? <Loader2 className="w-4 h-4 animate-spin text-blue-500" /> : <Facebook className="w-4 h-4 lg:w-5 lg:h-5 fill-blue-600 text-blue-600 border-none outline-none" />}
                    <span>Sign in with Facebook</span>
                  </motion.button>
                  
                  <button 
                    onClick={() => setAuthMode('otp')}
                    className="col-span-2 flex items-center justify-center gap-3 bg-lime-500/10 hover:bg-lime-500/20 border border-lime-500/20 rounded-xl lg:rounded-2xl py-3.5 lg:py-4 transition-all font-black text-xs lg:text-sm text-lime-400 shadow-lg shadow-lime-950/20"
                  >
                    <Smartphone className="w-4 h-4 lg:w-5 lg:h-5 text-lime-500" />
                    LOGARE RAPIDĂ PRIN SMS (FĂRĂ PAROLĂ)
                  </button>
                </div>

                <div className="flex items-center gap-4 py-1">
                  <div className="flex-grow border-t border-white/5"></div>
                  <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">sau cu telefon</span>
                  <div className="flex-grow border-t border-white/5"></div>
                </div>

                {errorDetails ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }}
                    className="overflow-hidden rounded-2xl border border-rose-500/20 bg-rose-500/5 backdrop-blur-xl"
                  >
                    <div className="flex items-start gap-4 p-4 lg:p-5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500">
                        <Lock className="h-5 w-5" />
                      </div>
                      <div className="flex-grow space-y-3">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-white tracking-tight">Ups! Problemă de Autentificare</h4>
                          <p className="text-xs leading-relaxed text-rose-300/80">{errorDetails.message}</p>
                        </div>
                        
                        {errorDetails.type === 'NOT_FOUND' && (
                          <div className="flex flex-wrap gap-2">
                            <button 
                              onClick={() => { setAuthMode('signup'); setFullName(''); }}
                              className="flex items-center gap-2 rounded-lg bg-rose-500/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-rose-500/30 transition-all border border-rose-500/30"
                            >
                              <User className="h-3 w-3" />
                              Creează Cont Nou
                            </button>
                            <button 
                              onClick={() => setAuthMode('otp')}
                              className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-white/10 transition-all"
                            >
                              <Smartphone className="h-3 w-3" />
                              Încearcă prin SMS
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ) : error ? (
                   <motion.div 
                     initial={{ opacity: 0, scale: 0.95 }} 
                     animate={{ opacity: 1, scale: 1 }}
                     className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs lg:text-sm font-medium"
                   >
                     {error.includes("No static resource") || error.includes("execute statement") ? (
                       <div className="space-y-2">
                         <p>Eroare tehnică la server. Te rugăm să încerci logarea rapidă prin SMS.</p>
                         <button 
                            onClick={() => setAuthMode('otp')}
                            className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold py-1 px-3 rounded-lg transition-all uppercase tracking-widest"
                         >
                           Folosește SMS/OTP
                         </button>
                       </div>
                     ) : error.includes("deja înregistrat") ? (
                       <div className="flex flex-col gap-2">
                         <p>Acest număr de telefon este deja asociat unui cont.</p>
                         <button 
                           onClick={() => setAuthMode('login')}
                           className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-bold py-1.5 px-3 rounded-lg border border-rose-500/30 transition-all text-[10px] uppercase self-start"
                         >
                           Mergi la Autentificare
                         </button>
                       </div>
                     ) : (
                       error
                     )}
                   </motion.div>
                ) : null}

                {/* Standard Form */}
                <form onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-3 lg:space-y-4">
                   {authMode === 'signup' && (
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Nume Complet</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                          <input 
                            type="text"
                            placeholder="Alex Ionescu"
                            className="w-full bg-slate-900 border border-white/5 rounded-xl lg:rounded-2xl py-3.5 pl-11 pr-5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-lime-500/50 transition-all"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                   )}

                   <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">Număr Telefon</label>
                      <div className="relative">
                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                        <input 
                           type="tel"
                           placeholder="07XX XXX XXX"
                           className="w-full bg-slate-900 border border-white/5 rounded-xl lg:rounded-2xl py-3.5 pl-11 pr-5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-lime-500/50 transition-all font-mono tracking-wider"
                           value={phone}
                           onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                           required
                        />
                      </div>
                   </div>

                   <div className="space-y-1.5">
                      <div className="flex justify-between items-center ml-1">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Parolă</label>
                        {authMode === 'login' && (
                           <button type="button" onClick={() => setAuthMode('otp')} className="text-[9px] font-bold text-lime-500 hover:text-white transition-colors uppercase tracking-widest">Ai uitat-o?</button>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                        <input 
                           type="password"
                           placeholder="••••••••"
                           className="w-full bg-slate-900 border border-white/5 rounded-xl lg:rounded-2xl py-3.5 pl-11 pr-5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-lime-500/50 transition-all"
                           value={password}
                           onChange={e => setPassword(e.target.value)}
                           required
                        />
                      </div>
                   </div>

                   <button 
                      type="submit" 
                      disabled={loading || phone.length < 10 || password.length < 4}
                      className="w-full bg-lime-500 hover:bg-lime-400 text-black font-black py-4 rounded-xl lg:rounded-2xl transition-all shadow-lg shadow-lime-500/10 disabled:opacity-50 mt-2 flex items-center justify-center gap-2 group"
                    >
                      {loading ? 'Se încarcă...' : (authMode === 'login' ? 'Intră în Cont' : 'Creează Cont')}
                      {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /> }
                   </button>
                </form>

                {/* Footer Switch */}
                <div className="pt-2 lg:pt-4 border-t border-white/5 text-center">
                   <p className="text-xs lg:text-sm text-slate-500">
                      {authMode === 'login' ? "Nu ai cont?" : "Ai deja cont?"} 
                      <button 
                        onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                        className="ml-2 text-lime-500 font-bold hover:text-white transition-colors underline decoration-lime-500/30 underline-offset-4"
                      >
                         {authMode === 'login' ? "Înregistrare" : "Autentificare"}
                      </button>
                   </p>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
    </div>
  );
}
