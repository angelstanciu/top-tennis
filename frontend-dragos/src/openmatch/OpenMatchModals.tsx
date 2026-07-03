import React, { useState } from 'react'
import { LEVELS, levelLabel } from './types'
import { whatsappShareHref } from './api'

// Modalele fluxului de matchmaking.
// Cele din fluxul de rezervare (BookingPage) sunt pe temă deschisă, ca modalele
// existente de acolo. Cele de pe pagina /meciuri sunt pe temă închisă, ca pagina.

function LightShell({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4 bg-slate-900/60 backdrop-blur-md" onClick={onClose}>
      <div
        className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  )
}

function DarkShell({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4 bg-slate-950/80 backdrop-blur-md" onClick={onClose}>
      <div
        className="bg-slate-900 border border-white/10 w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  )
}

// ─── Pasul 1: Cu cine joci? ──────────────────────────────────────────────────

export function WhoWithModal({
  onFullTeam,
  onSearchPlayers,
  onClose,
}: {
  onFullTeam: () => void
  onSearchPlayers: () => void
  onClose: () => void
}) {
  return (
    <LightShell onClose={onClose}>
      <div className="p-7">
        <h3 className="text-2xl font-black text-slate-900 tracking-tighter text-center mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Cu cine joci?
        </h3>
        <p className="text-sm text-slate-500 font-medium text-center mb-6">
          La padel se joacă în 4. Ai deja echipa, sau cauți parteneri?
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onFullTeam}
            className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold text-[15px] hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            Am echipa completă
          </button>
          <button
            onClick={onSearchPlayers}
            className="w-full py-4 bg-slate-900 text-lime-400 rounded-xl font-bold text-[15px] hover:bg-slate-800 active:scale-95 transition-all shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            Caut jucători
          </button>
          <button onClick={onClose} className="w-full py-2 text-slate-400 text-sm font-bold hover:text-slate-600 transition-colors">
            Renunță
          </button>
        </div>
      </div>
    </LightShell>
  )
}

// ─── Pasul 2: Câți sunteți deja? ─────────────────────────────────────────────

export function GroupSizeModal({
  myLevelRank,
  submitting,
  onConfirm,
  onBack,
}: {
  myLevelRank: number
  submitting: boolean
  onConfirm: (groupSize: 2 | 3, targetLevelRank: number) => void
  onBack: () => void
}) {
  const [groupSize, setGroupSize] = useState<2 | 3>(3)
  const [targetLevel, setTargetLevel] = useState<number>(myLevelRank)

  return (
    <LightShell onClose={submitting ? undefined : onBack}>
      <div className="p-7">
        <h3 className="text-2xl font-black text-slate-900 tracking-tighter text-center mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Câți sunteți deja?
        </h3>
        <p className="text-sm text-slate-500 font-medium text-center mb-5">
          Împreună cu tine, câți jucători aveți confirmați?
        </p>

        <div className="grid grid-cols-2 gap-3 mb-5">
          {[2, 3].map(n => {
            const selected = groupSize === n
            const seeking = 4 - n
            return (
              <button
                key={n}
                type="button"
                onClick={() => setGroupSize(n as 2 | 3)}
                aria-pressed={selected}
                className={`rounded-2xl border-2 p-4 text-center transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                  selected ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <span className={`block text-3xl font-black ${selected ? 'text-emerald-600' : 'text-slate-700'}`} style={{ fontFamily: 'Outfit, sans-serif' }}>{n}</span>
                <span className={`block text-[11px] font-bold mt-1 ${selected ? 'text-emerald-700' : 'text-slate-400'}`}>
                  Mai căutăm {seeking} {seeking === 1 ? 'jucător' : 'jucători'}
                </span>
              </button>
            )
          })}
        </div>

        <label className="block text-xs font-bold text-slate-600 mb-1.5 ml-1">Nivel căutat</label>
        <select
          value={targetLevel}
          onChange={e => setTargetLevel(Number(e.target.value))}
          className="w-full h-11 border-2 border-slate-200 rounded-xl px-3 text-[15px] font-semibold text-slate-800 outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 transition-all bg-white mb-4"
        >
          {LEVELS.map(l => (
            <option key={l.rank} value={l.rank}>
              {l.sub ? `${l.short} (${l.sub})` : l.short}
            </option>
          ))}
        </select>

        <p className="text-[11px] text-slate-400 font-medium leading-relaxed mb-5 flex gap-2 items-start">
          <svg className="shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
          Numărul tău de telefon va fi vizibil celorlalți jucători din meci ca să vă puteți coordona.
        </p>

        <button
          onClick={() => onConfirm(groupSize, targetLevel)}
          disabled={submitting}
          className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold text-[15px] hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 disabled:bg-slate-300 disabled:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          {submitting ? 'SE PROCESEAZĂ...' : 'Caută jucători'}
        </button>
        <button onClick={onBack} disabled={submitting} className="w-full py-2 mt-2 text-slate-400 text-sm font-bold hover:text-slate-600 transition-colors">
          Înapoi
        </button>
      </div>
    </LightShell>
  )
}

// ─── Nivel nesetat ───────────────────────────────────────────────────────────

export function LevelRequiredModal({
  dark = false,
  onGoProfile,
  onClose,
}: {
  dark?: boolean
  onGoProfile: () => void
  onClose: () => void
}) {
  const Shell = dark ? DarkShell : LightShell
  return (
    <Shell onClose={onClose}>
      <div className="p-7 text-center">
        <div className={`w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4 ${dark ? 'bg-lime-500/10 text-lime-400' : 'bg-amber-100 text-amber-600'}`}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
        </div>
        <h3 className={`text-xl font-black tracking-tight mb-2 ${dark ? 'text-white' : 'text-slate-900'}`} style={{ fontFamily: 'Outfit, sans-serif' }}>
          Nu ai selectat nivelul de joc
        </h3>
        <p className={`text-sm font-medium mb-6 ${dark ? 'text-slate-400' : 'text-slate-500'}`}>
          Ca să cauți sau să te alături unui meci, setează-ți mai întâi nivelul din profil. Durează 5 secunde.
        </p>
        <button
          onClick={onGoProfile}
          className={`w-full py-3.5 rounded-xl font-bold active:scale-95 transition-all focus:outline-none focus-visible:ring-2 ${
            dark
              ? 'bg-lime-400 text-slate-950 hover:bg-lime-300 focus-visible:ring-lime-400'
              : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 focus-visible:ring-emerald-400'
          }`}
        >
          Mergi la profil
        </button>
        <button onClick={onClose} className={`w-full py-2 mt-2 text-sm font-bold transition-colors ${dark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>
          Mai târziu
        </button>
      </div>
    </Shell>
  )
}

// ─── Avertisment nivel diferit (la alăturare) ────────────────────────────────

export function LevelMismatchModal({
  myLevelRank,
  targetLevelLabel,
  onConfirm,
  onFindAnother,
}: {
  myLevelRank: number
  targetLevelLabel: string
  onConfirm: () => void
  onFindAnother: () => void
}) {
  return (
    <DarkShell onClose={onFindAnother}>
      <div className="p-7 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4M12 17h.01" /></svg>
        </div>
        <h3 className="text-xl font-black text-white tracking-tight mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Nivel diferit de al tău
        </h3>
        <p className="text-sm text-slate-400 font-medium mb-6 leading-relaxed">
          Meciul este pentru nivelul <strong className="text-white">{targetLevelLabel}</strong> — mai avansat decât nivelul tău
          (<strong className="text-white">{levelLabel(myLevelRank)}</strong>). Ești sigur că vrei să te alături?
        </p>
        <button
          onClick={onConfirm}
          className="w-full py-3.5 bg-lime-400 text-slate-950 rounded-xl font-bold hover:bg-lime-300 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
        >
          Da, mă alătur
        </button>
        <button
          onClick={onFindAnother}
          className="w-full py-3.5 mt-2 bg-white/5 border border-white/10 text-slate-300 rounded-xl font-bold hover:bg-white/10 hover:text-white active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
        >
          Caut alt meci potrivit nivelului meu
        </button>
      </div>
    </DarkShell>
  )
}

// ─── Succes: partida a fost deschisă ─────────────────────────────────────────

export function OpenMatchSuccessModal({
  whatsappText,
  whatsappGroupUrl,
  pendingApproval,
  onViewMatches,
  onClose,
}: {
  whatsappText: string
  whatsappGroupUrl?: string
  pendingApproval: boolean
  onViewMatches: () => void
  onClose: () => void
}) {
  return (
    <LightShell>
      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-lime-400 via-emerald-400 to-teal-400" />
      <div className="bg-emerald-50/50 px-6 py-7 flex flex-col items-center gap-3 text-center">
        <div className="w-16 h-16 rounded-[1.7rem] bg-lime-400 flex items-center justify-center shadow-lg shadow-lime-500/25 rotate-3">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#052e16" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
        </div>
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tighter" style={{ fontFamily: 'Outfit, sans-serif' }}>MECI DESCHIS</h3>
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mt-1">Terenul e rezervat · căutăm jucători</p>
        </div>
      </div>
      <div className="p-6">
        <p className="text-slate-600 text-sm font-medium leading-relaxed text-center mb-3">
          {pendingApproval
            ? 'Rezervarea ta necesită aprobarea recepției. Imediat ce e aprobată, meciul apare în lista de meciuri disponibile.'
            : 'Meciul tău apare acum în lista de meciuri disponibile. Primești SMS când cineva se alătură.'}
        </p>
        <p className="text-[11px] text-slate-400 font-medium text-center mb-5">
          Dacă echipa nu e completă cu 6 ore înainte de meci, rezervarea se anulează automat și nu primești nicio penalizare.
        </p>
        <div className="flex flex-col gap-3">
          <a
            href={whatsappShareHref(whatsappText)}
            target="_blank"
            rel="noreferrer noopener"
            className="w-full py-3.5 bg-[#25d366] text-white rounded-xl font-bold hover:brightness-95 active:scale-95 transition-all flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 3.4A11.9 11.9 0 0 0 12 0 12 12 0 0 0 1.7 18.1L0 24l6.1-1.6A12 12 0 1 0 20.5 3.4ZM12 21.8a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.6 1 1-3.5-.2-.4A9.9 9.9 0 1 1 21.9 12 9.8 9.8 0 0 1 12 21.8Zm5.4-7.4-2-1c-.3-.1-.5-.2-.7.2s-.8 1-1 1.2-.4.2-.7 0a8 8 0 0 1-2.4-1.5 9 9 0 0 1-1.6-2.1c-.2-.3 0-.5.2-.6l.5-.6.3-.5a.5.5 0 0 0 0-.5l-.7-1.7c-.2-.4-.4-.4-.6-.4h-.5a1 1 0 0 0-.8.4 3 3 0 0 0-1 2.3 5.4 5.4 0 0 0 1.1 2.9 12 12 0 0 0 4.7 4.1c.7.3 1.2.5 1.6.6a3.9 3.9 0 0 0 1.8.1 3 3 0 0 0 2-1.4 2.4 2.4 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.3Z" /></svg>
            Distribuie pe WhatsApp
          </a>
          {whatsappGroupUrl && (
            <a
              href={whatsappGroupUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="w-full py-2 text-center text-[12px] font-bold text-emerald-700 hover:text-emerald-800 underline decoration-emerald-500/30 hover:decoration-emerald-500 transition-all"
            >
              Nu ești în grupul de padel?
            </a>
          )}
          <button
            onClick={onViewMatches}
            className="w-full py-3.5 bg-slate-900 text-lime-400 rounded-xl font-bold hover:bg-slate-800 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
          >
            Vezi meciurile deschise
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 active:scale-95 transition-all"
          >
            Înapoi la calendar
          </button>
        </div>
      </div>
    </LightShell>
  )
}

// ─── Cont necesar ────────────────────────────────────────────────────────────

export function AuthRequiredModal({
  onGoLogin,
  onClose,
}: {
  onGoLogin: () => void
  onClose: () => void
}) {
  return (
    <LightShell onClose={onClose}>
      <div className="p-7 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
        </div>
        <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
          Ai nevoie de cont
        </h3>
        <p className="text-sm text-slate-500 font-medium mb-6">
          Ca să cauți jucători, autentifică-te — așa ceilalți știu cine organizează meciul și te pot contacta.
        </p>
        <button
          onClick={onGoLogin}
          className="w-full py-3.5 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 active:scale-95 transition-all shadow-lg shadow-emerald-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          Autentifică-te
        </button>
        <button onClick={onClose} className="w-full py-2 mt-2 text-slate-400 text-sm font-bold hover:text-slate-600 transition-colors">
          Mai târziu
        </button>
      </div>
    </LightShell>
  )
}
