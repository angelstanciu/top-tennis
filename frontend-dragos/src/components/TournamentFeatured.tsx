import { useState, useEffect } from 'react'

const POSTER_SRC = '/poster-turneu-tenis.png'
const WHATSAPP_HREF =
  'https://wa.me/40742197487?text=' +
  encodeURIComponent('Salut! As vrea sa ma inscriu la turneul de tenis Gold Star Arena din 26-28 iunie.')

const SIGNUP_END = new Date('2026-06-28T23:59:59+03:00')
const TOURNAMENT_END = new Date('2026-06-28T23:59:59+03:00')

interface Countdown {
  days: number
  hours: number
  minutes: number
}

function useCountdown(target: Date): Countdown | null {
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30000)
    return () => clearInterval(id)
  }, [])
  const diff = target.getTime() - Date.now()
  if (diff <= 0) return null
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
  }
}

const WA_ICON = (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20.5 3.4A11.9 11.9 0 0 0 12 0 12 12 0 0 0 1.7 18.1L0 24l6.1-1.6A12 12 0 1 0 20.5 3.4ZM12 21.8a9.8 9.8 0 0 1-5-1.4l-.4-.2-3.6 1 1-3.5-.2-.4A9.9 9.9 0 1 1 21.9 12 9.8 9.8 0 0 1 12 21.8Zm5.4-7.4-2-1c-.3-.1-.5-.2-.7.2s-.8 1-1 1.2-.4.2-.7 0a8 8 0 0 1-2.4-1.5 9 9 0 0 1-1.6-2.1c-.2-.3 0-.5.2-.6l.5-.6.3-.5a.5.5 0 0 0 0-.5l-.7-1.7c-.2-.4-.4-.4-.6-.4h-.5a1 1 0 0 0-.8.4 3 3 0 0 0-1 2.3 5.4 5.4 0 0 0 1.1 2.9 12 12 0 0 0 4.7 4.1c.7.3 1.2.5 1.6.6a3.9 3.9 0 0 0 1.8.1 3 3 0 0 0 2-1.4 2.4 2.4 0 0 0 .2-1.4c-.1-.1-.3-.2-.6-.3Z" />
  </svg>
)

const ARROW_ICON = (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
)

const STYLES = `
  .tf-card {
    position: relative;
    margin: 0 16px;
    border-radius: 32px;
    padding: 20px 18px 22px;
    background:
      radial-gradient(140% 80% at 50% 0%, rgba(163,230,53,0.18) 0%, transparent 60%),
      linear-gradient(180deg, #0b1220 0%, #060912 100%);
    border: 1px solid rgba(163,230,53,0.35);
    box-shadow:
      0 30px 60px -20px rgba(163,230,53,0.25),
      0 0 0 1px rgba(255,255,255,0.02) inset;
    overflow: hidden;
    container-type: inline-size;
    container-name: tf;
  }
  .tf-card::before {
    content: '';
    position: absolute; inset: 0;
    pointer-events: none;
    background:
      radial-gradient(60% 40% at 100% 0%, rgba(163,230,53,0.12), transparent 60%),
      radial-gradient(60% 40% at 0% 100%, rgba(163,230,53,0.08), transparent 60%);
    border-radius: inherit;
  }

  .tf-pill {
    display: inline-flex; align-items: center; gap: 9px;
    padding: 8px 14px 8px 12px;
    background: rgba(163,230,53,0.1);
    border: 1px solid rgba(163,230,53,0.35);
    border-radius: 999px;
    color: #d9f99d;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.005em;
    white-space: nowrap;
  }
  .tf-pill strong { color: #a3e635; font-weight: 800; }
  @media (max-width: 359px) {
    .tf-pill { font-size: 11px; padding: 7px 11px 7px 10px; }
  }

  .tf-dot {
    width: 7px; height: 7px;
    background: #a3e635;
    border-radius: 50%;
    flex-shrink: 0;
    animation: tf-pulse 1.8s ease-out infinite;
  }
  @keyframes tf-pulse {
    0%   { box-shadow: 0 0 0 0 rgba(163,230,53,0.7); }
    70%  { box-shadow: 0 0 0 8px rgba(163,230,53,0); }
    100% { box-shadow: 0 0 0 0 rgba(163,230,53,0); }
  }

  .tf-poster-frame {
    margin-top: 14px;
    position: relative;
    border-radius: 20px;
    overflow: hidden;
    background: #000;
    border: 1px solid rgba(255,255,255,0.06);
    box-shadow: 0 25px 50px -15px rgba(0,0,0,0.6);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .tf-poster-frame img {
    display: block;
    width: 100%;
    height: auto;
    object-fit: cover;
    object-position: top;
  }

  .tf-countdown {
    margin-top: 14px;
    color: #94a3b8;
    font-size: 12.5px;
    font-weight: 600;
    text-align: center;
    white-space: nowrap;
  }
  .tf-countdown .nums {
    color: #a3e635;
    font-variant-numeric: tabular-nums;
    font-weight: 900;
    letter-spacing: -0.01em;
    margin: 0 4px;
  }
  .tf-countdown .nums small {
    color: #64748b;
    font-weight: 700;
    font-size: 0.85em;
    margin-left: 1px;
  }

  .tf-actions { margin-top: 16px; }

  .tf-cta {
    width: 100%;
    display: flex; align-items: center; justify-content: center; gap: 12px;
    background: linear-gradient(180deg, #a3e635 0%, #84cc16 100%);
    color: #052e16;
    padding: 18px;
    border-radius: 18px;
    text-decoration: none;
    font-weight: 900;
    font-size: 17px;
    letter-spacing: -0.01em;
    box-shadow:
      0 22px 44px -14px rgba(163,230,53,0.55),
      inset 0 1px 0 rgba(255,255,255,0.45),
      inset 0 -1px 0 rgba(0,0,0,0.08);
    position: relative;
    overflow: hidden;
    transition: transform .12s ease, box-shadow .12s ease;
    -webkit-tap-highlight-color: transparent;
    isolation: isolate;
    border: none;
    cursor: pointer;
    font-family: inherit;
  }
  .tf-cta::after {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(120% 60% at 50% 120%, rgba(255,255,255,0.35), transparent 60%);
    pointer-events: none;
    z-index: -1;
  }
  .tf-cta:active {
    transform: scale(0.985);
    box-shadow: 0 12px 30px -10px rgba(163,230,53,0.45), inset 0 1px 0 rgba(255,255,255,0.45);
  }
  .tf-cta-wa {
    width: 30px; height: 30px;
    border-radius: 50%;
    background: #25d366;
    color: #fff;
    display: inline-flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 10px rgba(0,0,0,0.18);
    flex-shrink: 0;
  }
  .tf-cta-text { flex: 1; text-align: left; }
  .tf-cta-arrow { opacity: 0.75; flex-shrink: 0; }

  .tf-foot {
    margin-top: 14px;
    display: flex; align-items: center; justify-content: center; gap: 6px;
    color: #64748b;
    font-size: 11px;
  }

  /* Desktop: side-by-side via container query */
  @container tf (min-width: 720px) {
    .tf-card { padding: 0; border-radius: 48px; }
    .tf-grid { display: grid; grid-template-columns: 380px 1fr; }
    .tf-left {
      padding: 28px;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.25);
    }
    .tf-poster-frame { margin: 0; border-radius: 24px; }
    .tf-right {
      padding: 40px 48px;
      display: flex; flex-direction: column; justify-content: center;
    }
    .tf-actions { padding: 0; }
    .tf-cta { width: auto; padding: 18px 28px; }
    .tf-countdown { padding: 0; text-align: left; }
  }
  @media (min-width: 768px) {
    .tf-wrap { padding: 40px 24px 12px; }
    .tf-card { margin: 0 auto; max-width: 1200px; }
  }

  /* Lightbox */
  .tf-lb {
    position: fixed; inset: 0;
    background: rgba(2,6,23,0.92);
    backdrop-filter: blur(20px);
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
    z-index: 9999;
    animation: tf-fade .18s ease;
  }
  .tf-lb img {
    max-width: 100%; max-height: 90vh;
    border-radius: 18px;
    box-shadow: 0 40px 80px rgba(0,0,0,0.6);
  }
  .tf-lb-close {
    position: absolute; top: 18px; right: 18px;
    width: 40px; height: 40px;
    border-radius: 50%;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.15);
    color: #fff;
    font-size: 20px;
    cursor: pointer;
    display: grid; place-items: center;
    line-height: 1;
  }
  @keyframes tf-fade { from { opacity: 0; } to { opacity: 1; } }
`

export default function TournamentFeatured() {
  const countdown = useCountdown(SIGNUP_END)
  const [lb, setLb] = useState(false)

  useEffect(() => {
    if (!lb) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLb(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lb])

  if (new Date() > TOURNAMENT_END) return null

  const signupOpen = countdown !== null

  return (
    <section className="tf-wrap" style={{ padding: '20px 0 8px', background: '#020617' }}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <div className="tf-card">
        <div className="tf-grid">
          {/* Poster */}
          <div className="tf-left">
            <div
              className="tf-poster-frame"
              onClick={() => setLb(true)}
              role="button"
              tabIndex={0}
              aria-label="Deschide posterul turneului"
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setLb(true) }}
            >
              <img src={POSTER_SRC} alt="Turneu Tenis Gold 26-28 Iunie" loading="lazy" />
            </div>
          </div>

          {/* Content */}
          <div className="tf-right">
            <span className="tf-pill">
              <span className="tf-dot" aria-hidden="true" />
              {signupOpen ? (
                <span>Înscrieri deschise &mdash; <strong>până pe 28 iunie</strong></span>
              ) : (
                <span>Înscrierile s-au închis &mdash; turneu pe 26-28 iunie</span>
              )}
            </span>

            {signupOpen && countdown && (
              <div className="tf-countdown" role="timer" aria-label="Timp rămas pentru înscriere">
                {countdown.days > 0 ? (
                  <>
                    Mai sunt{' '}
                    <span className="nums">
                      {countdown.days}<small>z</small>{' '}
                      {String(countdown.hours).padStart(2, '0')}<small>h</small>
                    </span>{' '}
                    pentru înscriere
                  </>
                ) : (
                  <>
                    Mai sunt{' '}
                    <span className="nums">
                      {countdown.hours}<small>h</small>{' '}
                      {String(countdown.minutes).padStart(2, '0')}<small>m</small>
                    </span>{' '}
                    &mdash; ULTIMA ZI
                  </>
                )}
              </div>
            )}

            <div className="tf-actions">
              <a
                href={WHATSAPP_HREF}
                target="_blank"
                rel="noreferrer noopener"
                className="tf-cta"
                aria-label="Începe înscrierea pe WhatsApp"
              >
                <span className="tf-cta-wa">{WA_ICON}</span>
                <span className="tf-cta-text">Începe înscrierea</span>
                <span className="tf-cta-arrow">{ARROW_ICON}</span>
              </a>
            </div>

            <p className="tf-foot">Turneu Tenis Gold &middot; Star Arena Bascov &middot; 26-28 Iunie 2026</p>
          </div>
        </div>
      </div>

      {lb && (
        <div className="tf-lb" onClick={() => setLb(false)}>
          <button className="tf-lb-close" aria-label="Închide" onClick={(e) => { e.stopPropagation(); setLb(false) }}>
            ✕
          </button>
          <img
            src={POSTER_SRC}
            alt="Poster Turneu Tenis Gold 26-28 Iunie"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  )
}
