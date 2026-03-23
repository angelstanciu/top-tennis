import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, ShieldCheck, Cookie, Lock, Scale, Eye, FileText } from 'lucide-react';

export default function SecurityPage() {
  const nav = useNavigate();

  const sections = [
    {
      id: 'security',
      title: 'Securitatea Datelor',
      icon: <Lock className="w-6 h-6 text-emerald-400" />,
      content: 'Folosim cele mai moderne standarde de criptare (SSL/TLS) pentru a proteja comunicarea între dispozitivul tău și serverele noastre. Datele personale sunt stocate în baze de date securizate, cu acces restricționat doar personalului autorizat.',
      items: [
        'Autentificare securizată prin SMS/OTP',
        'Criptarea parolelor folosind algoritmi de hashing moderni',
        'Monitorizare proactivă împotriva tentativelor de intruziune'
      ]
    },
    {
      id: 'privacy',
      title: 'Confidențialitate',
      icon: <Eye className="w-6 h-6 text-blue-400" />,
      content: 'Respectăm GDPR și ne angajăm să nu vindem sau să partajăm datele tale cu terțe părți în scopuri publicitare. Colectăm doar informațiile necesare pentru procesarea rezervărilor și îmbunătățirea experienței tale.',
      link: '/confidentialitate'
    },
    {
      id: 'cookies',
      title: 'Politica de Cookies',
      icon: <Cookie className="w-6 h-6 text-amber-400" />,
      content: 'Utilizăm cookies esențiale pentru a-ți menține sesiunea activă și cookies de analiză (Google Analytics) pentru a înțelege cum este folosit site-ul. Poți alege să dezactivezi cookies-urile ne-esențiale din setările browserului.',
      link: '/cookies'
    },
    {
      id: 'terms',
      title: 'Termeni și Condiții',
      icon: <Scale className="w-6 h-6 text-purple-400" />,
      content: 'Prin utilizarea platformei Star Arena, ești de acord cu regulamentele de ordine interioară ale bazelor sportive și cu politicile noastre de anulare a rezervărilor.',
      link: '/termeni'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 relative overflow-hidden pb-12">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-500/5 blur-[150px] rounded-full opacity-50" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/5 blur-[130px] rounded-full opacity-50" />
      </div>

      {/* Header */}
      <nav className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-white/5 bg-slate-900/40 backdrop-blur-xl sticky top-0">
        <button
          onClick={() => nav(-1)}
          className="bg-white/5 hover:bg-white/10 text-white p-2.5 rounded-2xl transition-all border border-white/5"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
           <ShieldCheck className="w-6 h-6 text-emerald-400" />
           <span className="font-black text-xl tracking-tighter text-white">CENTRUL DE SECURITATE</span>
        </div>
        <div className="w-10 h-10" /> {/* Spacer */}
      </nav>

      <main className="relative z-10 max-w-3xl mx-auto p-6 space-y-8 mt-8">
        <div className="text-center space-y-4 mb-12">
           <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase italic">Siguranța ta e <span className="text-emerald-400">Prioritatea</span> Noastră</h1>
           <p className="text-slate-400 max-w-xl mx-auto font-medium">Am consolidat toate informațiile legale și de siguranță într-un singur loc, pentru transparență totală.</p>
        </div>

        <div className="grid gap-6">
          {sections.map((section, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              key={section.id}
              className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 hover:bg-white/5 transition-all group"
            >
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-14 h-14 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform shadow-xl">
                   {section.icon}
                </div>
                <div className="space-y-4 flex-1">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-white tracking-tight">{section.title}</h2>
                    {section.link && (
                      <button 
                         onClick={() => nav(section.link!)}
                         className="text-xs font-bold text-emerald-400 hover:text-white transition-colors flex items-center gap-1 uppercase tracking-widest"
                      >
                        Detalii <FileText className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-slate-400 font-medium leading-relaxed">
                    {section.content}
                  </p>
                  {section.items && (
                    <ul className="space-y-2 pt-2">
                       {section.items.map((item, i) => (
                         <li key={i} className="flex items-center gap-3 text-sm font-bold text-slate-300">
                           <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                           {item}
                         </li>
                       ))}
                    </ul>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="pt-12 text-center text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]">
           Ultima actualizare: {new Date().toLocaleDateString('ro-RO')} • Star Arena Hub
        </div>
      </main>
    </div>
  );
}
