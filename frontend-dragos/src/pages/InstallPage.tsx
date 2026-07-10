import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Footer from '../components/Footer'
import { useSeo } from '../seo'

// Evenimentul Chrome/Android care permite instalarea programatică.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// ─── Detecție de platformă ────────────────────────────────────────────────
// iOS permite „Adaugă pe ecranul principal" DOAR în Safari. Dacă linkul e
// deschis în Chrome iOS, Facebook/Instagram in-app etc., opțiunea nu există,
// așa că îndrumăm userul să redeschidă în Safari.
const UA = typeof navigator !== 'undefined' ? navigator.userAgent : ''

function isIOS() {
  return /iPad|iPhone|iPod/.test(UA) ||
    // iPad pe iPadOS 13+ se raportează ca Mac, dar are touch.
    (typeof navigator !== 'undefined' && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function isAndroid() {
  return /Android/.test(UA)
}

function isInAppBrowser() {
  return /FBAN|FBAV|Instagram|Line|MicroMessenger|Twitter|TikTok/.test(UA)
}

function isIOSSafari() {
  if (!isIOS()) return false
  // Excludem celelalte browsere iOS (toate folosesc WebKit, dar fără opțiunea de instalare).
  const otherBrowsers = /CriOS|FxiOS|EdgiOS|OPiOS|GSA|DuckDuckGo/.test(UA)
  return /Safari/.test(UA) && !otherBrowsers && !isInAppBrowser()
}

function isAppInstalled() {
  if (typeof window === 'undefined') return false
  const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches
  const iOSStandalone = (window.navigator as any).standalone === true
  return !!(standalone || iOSStandalone)
}

const INSTALL_URL = 'https://star-arena.ro/instalare'
const SHARE_TEXT =
  'Salut! Rezervă terenuri la Star Arena direct de pe telefon. ' +
  'Deschide acest link și urmează pașii ca să adaugi aplicația pe ecranul principal: ' +
  INSTALL_URL

// ─── Iconițe ───────────────────────────────────────────────────────────────
const ShareIOSIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 16V4" />
    <path d="m8 8 4-4 4 4" />
    <path d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
  </svg>
)

const PlusSquareIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="M12 8v8M8 12h8" />
  </svg>
)

const DotsMenuIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} width={20} height={20} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="12" cy="5" r="1.7" />
    <circle cx="12" cy="12" r="1.7" />
    <circle cx="12" cy="19" r="1.7" />
  </svg>
)

const DownloadIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

const CheckIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
)

// ─── Butonul „țintă" pe care utilizatorul trebuie să-l apese pe telefon ────
// Pe telefon, butonul apare în limba sistemului (RO sau EN), așa că afișăm
// ambele variante: numele românesc principal (bold) și cel englezesc dedesubt.
// E un bloc pe toată lățimea, cu break-words — nu poate ieși din ecran.
function KeyButton({ icon, ro, en }: { icon: React.ReactNode; ro: string; en: string }) {
  return (
    <span className="mt-2.5 flex w-full items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5">
      <span className="shrink-0 w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 flex items-center justify-center text-emerald-600">
        {icon}
      </span>
      <span className="flex flex-col min-w-0 leading-snug">
        <span className="font-extrabold text-slate-800 dark:text-slate-100 break-words" style={{ fontFamily: 'Outfit, sans-serif' }}>{ro}</span>
        <span className="text-[13px] font-semibold text-slate-400 break-words">{en}</span>
      </span>
    </span>
  )
}

// Pas vizual reutilizabil în listele de instrucțiuni.
function Step({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3.5">
      <span className="shrink-0 mt-0.5 w-7 h-7 rounded-full bg-emerald-500 text-white text-sm font-black flex items-center justify-center" style={{ fontFamily: 'Outfit, sans-serif' }}>
        {index}
      </span>
      <div className="flex-1 min-w-0 text-slate-600 leading-relaxed pt-0.5">{children}</div>
    </li>
  )
}

export default function InstallPage() {
  useSeo({
    path: '/instalare',
    title: 'Instalează Aplicația Star Arena | Rezervări Padel & Tenis Pitești',
    description: 'Adaugă aplicația Star Arena pe ecranul telefonului (iPhone sau Android) și rezervă terenuri de padel și tenis lângă Pitești în câteva secunde.',
  })
  const navigate = useNavigate()
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(isAppInstalled())
  const [copied, setCopied] = useState(false)

  // Captăm promptul de instalare pe Android/Chrome desktop.
  useEffect(() => {
    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    function onAppInstalled() {
      setInstalled(true)
      setInstallPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  async function handleInstall() {
    if (!installPrompt) return
    try {
      await installPrompt.prompt()
      await installPrompt.userChoice
    } catch {}
    setInstallPrompt(null)
  }

  async function handleShare() {
    // Web Share API (mobil) — deschide direct meniul nativ de share.
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: 'Star Arena', text: SHARE_TEXT, url: INSTALL_URL })
        return
      } catch {
        // userul a anulat — nu facem nimic
        return
      }
    }
    // Fallback desktop: copiem mesajul în clipboard.
    handleCopy()
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(SHARE_TEXT)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {}
  }

  const whatsappShareHref = 'https://wa.me/?text=' + encodeURIComponent(SHARE_TEXT)

  // ─── Decidem ce bloc de instrucțiuni afișăm ──────────────────────────────
  const platform: 'installed' | 'ios-safari' | 'ios-other' | 'android' | 'desktop' =
    installed ? 'installed'
      : isIOS() ? (isIOSSafari() ? 'ios-safari' : 'ios-other')
      : isAndroid() ? 'android'
      : 'desktop'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans flex flex-col">
      {/* Navbar consistent cu restul paginilor secundare */}
      <div className="w-full bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 px-4 py-4 flex justify-between items-center shadow-sm">
        <button
          onClick={() => navigate('/')}
          className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          Înapoi
        </button>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100" style={{ fontFamily: 'Outfit, sans-serif' }}>Star Arena</h1>
        <div className="w-20" />
      </div>

      <div className="max-w-xl mx-auto w-full px-5 py-9 flex-1">
        {/* Hero: iconița aplicației + titlu */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 rounded-[1.3rem] shadow-xl shadow-emerald-500/20 ring-1 ring-slate-200 overflow-hidden bg-white">
            <img src="/favicon.png" alt="Star Arena" className="w-full h-full object-cover" />
          </div>
          <h2 className="mt-5 text-[1.75rem] leading-tight font-black text-slate-800 dark:text-slate-100" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Instalează aplicația
          </h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400 max-w-sm">
            Adaugă <strong className="text-slate-700 dark:text-slate-300">Star Arena</strong> pe ecranul principal și rezervi terenuri într-o secundă, ca dintr-o aplicație normală.
          </p>
        </div>

        {/* Card cu instrucțiuni în funcție de platformă */}
        <div className="bg-white dark:bg-slate-900 rounded-[1.75rem] p-6 md:p-8 shadow-xl shadow-slate-200/60 border border-slate-100 dark:border-slate-800">

          {platform === 'installed' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <CheckIcon className="w-7 h-7" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-100" style={{ fontFamily: 'Outfit, sans-serif' }}>Aplicația e deja instalată</h3>
              <p className="mt-2 text-slate-500 dark:text-slate-400">O găsești pe ecranul principal al telefonului. Poți rezerva direct de acolo.</p>
              <button
                onClick={() => navigate('/rezerva')}
                className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl transition-colors active:scale-[0.99]"
              >
                Rezervă acum
              </button>
            </div>
          )}

          {platform === 'android' && (
            <div>
              <div className="flex items-center gap-2 mb-5">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">Android</span>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100" style={{ fontFamily: 'Outfit, sans-serif' }}>Instalare în 1 pas</h3>
              </div>
              {installPrompt ? (
                <>
                  <p className="text-slate-500 dark:text-slate-400 mb-5">Apasă butonul de mai jos, apoi confirmă în fereastra care apare.</p>
                  <button
                    onClick={handleInstall}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg py-4 rounded-2xl shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.99] flex items-center justify-center gap-3"
                  >
                    <DownloadIcon />
                    Instalează aplicația
                  </button>
                  <p className="mt-4 text-sm text-slate-400 text-center">
                    Apare o fereastră Chrome — confirmă cu „Instalează" / „Install".
                  </p>
                </>
              ) : (
                <>
                  <p className="text-slate-500 dark:text-slate-400 mb-5">Dacă nu apare butonul automat de instalare, adaug-o manual din meniul browserului — durează 10 secunde:</p>
                  <ol className="space-y-5">
                    <Step index={1}>
                      Apasă meniul cu trei puncte{' '}
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 align-middle mx-0.5"><DotsMenuIcon className="w-4 h-4" /></span>{' '}
                      din colțul din dreapta sus al browserului (Chrome).
                    </Step>
                    <Step index={2}>
                      Din meniu apasă una dintre opțiuni — apare diferit în funcție de telefon:
                      <KeyButton icon={<DownloadIcon className="w-5 h-5" />} ro="Instalează aplicația" en="Install app" />
                      <KeyButton icon={<PlusSquareIcon className="w-5 h-5" />} ro="Adaugă pe ecranul principal" en="Add to Home Screen" />
                    </Step>
                    <Step index={3}>
                      Confirmă în fereastra care apare. Pictograma Star Arena apare pe ecranul principal.
                    </Step>
                  </ol>
                </>
              )}
            </div>
          )}

          {platform === 'ios-safari' && (
            <div>
              <div className="flex items-center gap-2 mb-5">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">iPhone / iPad</span>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100" style={{ fontFamily: 'Outfit, sans-serif' }}>3 pași simpli</h3>
              </div>
              <ol className="space-y-5">
                <Step index={1}>
                  În <strong className="text-slate-700 dark:text-slate-300">Safari</strong>, apasă butonul de partajare din bara de jos — e pătratul cu o săgeată în sus (pe iPad e sus, în dreapta):
                  <KeyButton icon={<ShareIOSIcon className="w-5 h-5" />} ro="Partajează" en="Share" />
                </Step>
                <Step index={2}>
                  În meniul care se deschide, derulează puțin în jos și apasă:
                  <KeyButton icon={<PlusSquareIcon className="w-5 h-5" />} ro="Adaugă pe ecranul principal" en="Add to Home Screen" />
                </Step>
                <Step index={3}>
                  Sus în dreapta, confirmă. Gata — pictograma Star Arena apare pe ecranul principal.
                  <KeyButton icon={<CheckIcon className="w-5 h-5" />} ro="Adaugă" en="Add" />
                </Step>
              </ol>
              <div className="mt-6 flex items-start gap-2 text-xs text-slate-400 bg-slate-50 dark:bg-slate-950 rounded-xl p-3">
                <svg className="shrink-0 mt-0.5" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                Pe iPhone, instalarea se face manual din Safari — Apple nu permite instalarea cu un singur buton, ca pe Android.
              </div>
            </div>
          )}

          {platform === 'ios-other' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-full">iPhone</span>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100" style={{ fontFamily: 'Outfit, sans-serif' }}>Deschide în Safari</h3>
              </div>
              <p className="text-slate-500 dark:text-slate-400 mb-5">
                Pe iPhone, aplicația se poate instala <strong className="text-slate-700 dark:text-slate-300">doar din Safari</strong> (browserul Apple). Acum pagina e deschisă în alt browser. Copiază linkul, deschide Safari și lipește-l acolo:
              </p>
              <button
                onClick={handleCopy}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3.5 rounded-2xl transition-colors active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {copied ? 'Link copiat ✓' : 'Copiază linkul pentru Safari'}
              </button>
              <ol className="space-y-5 mt-7">
                <Step index={1}>Deschide aplicația <strong className="text-slate-700 dark:text-slate-300">Safari</strong>, lipește linkul în bara de adrese și apasă Enter.</Step>
                <Step index={2}>
                  Apasă butonul de partajare, apoi:
                  <KeyButton icon={<PlusSquareIcon className="w-5 h-5" />} ro="Adaugă pe ecranul principal" en="Add to Home Screen" />
                </Step>
                <Step index={3}>
                  Confirmă sus în dreapta.
                  <KeyButton icon={<CheckIcon className="w-5 h-5" />} ro="Adaugă" en="Add" />
                </Step>
              </ol>
            </div>
          )}

          {platform === 'desktop' && (
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-3" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Instalează pe telefon
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-5">
                Aplicația e gândită pentru telefon. Deschide <strong className="text-slate-700 dark:text-slate-300">star-arena.ro/instalare</strong> pe mobil, sau trimite-ți linkul mai jos pe WhatsApp și instaleaz-o de pe telefon.
              </p>
              {installPrompt && (
                <button
                  onClick={handleInstall}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-2xl transition-colors active:scale-[0.99] flex items-center justify-center gap-2 mb-2"
                >
                  <DownloadIcon className="w-5 h-5" />
                  Instalează pe acest computer
                </button>
              )}
            </div>
          )}
        </div>

        {/* Helper de share — pentru a trimite linkul mai departe */}
        {platform !== 'installed' && (
          <div className="mt-6 bg-white dark:bg-slate-900 rounded-[1.75rem] p-5 md:p-6 shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Trimite mai departe
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Trimite cuiva linkul de instalare cu mesajul gata scris.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href={whatsappShareHref}
                target="_blank"
                rel="noreferrer noopener"
                className="flex-1 bg-[#25d366] hover:brightness-95 text-white font-bold py-3 rounded-2xl transition-all active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 3.4A11.9 11.9 0 0 0 12 0 12 12 0 0 0 1.7 18.1L0 24l6.1-1.6A12 12 0 1 0 20.5 3.4ZM12 21.8a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.6 1 1-3.5-.2-.4A9.9 9.9 0 1 1 21.9 12 9.8 9.8 0 0 1 12 21.8Zm5.4-7.4-2-1c-.3-.1-.5-.2-.7.2s-.8 1-1 1.2-.4.2-.7 0a8 8 0 0 1-2.4-1.5 9 9 0 0 1-1.6-2.1c-.2-.3 0-.5.2-.6l.5-.6.3-.5a.5.5 0 0 0 0-.5l-.7-1.7c-.2-.4-.4-.4-.6-.4h-.5a1 1 0 0 0-.8.4 3 3 0 0 0-1 2.3 5.4 5.4 0 0 0 1.1 2.9 12 12 0 0 0 4.7 4.1c.7.3 1.2.5 1.6.6a3.9 3.9 0 0 0 1.8.1 3 3 0 0 0 2-1.4 2.4 2.4 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.3Z" /></svg>
                WhatsApp
              </a>
              <button
                onClick={handleShare}
                className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 rounded-2xl transition-colors active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {copied ? 'Copiat ✓' : 'Trimite / Copiază'}
              </button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}
