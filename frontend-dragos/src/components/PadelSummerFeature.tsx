import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const POSTER_SRC = '/padel-vara.jpg'
const BOOK_HREF = '/rezerva?sport=PADEL'

const ARROW_ICON = (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
)

const STYLES = `
  .pf-wrap {
    position: relative;
    overflow: hidden;
    background: #020617;
    padding: 28px 0 18px;
  }
  /* Fundal ambiental: o copie blurată a posterului umple banda pe desktop,
     ca să nu rămână margini goale lângă posterul vertical. */
  .pf-ambient {
    position: absolute; inset: 0;
    background-image: var(--pf-poster);
    background-size: cover;
    background-position: center;
    filter: blur(70px) saturate(1.25);
    transform: scale(1.25);
    opacity: 0.28;
    pointer-events: none;
  }
  .pf-glow {
    position: absolute; inset: 0;
    pointer-events: none;
    background:
      radial-gradient(50% 40% at 50% 0%, rgba(56,189,248,0.18), transparent 70%),
      radial-gradient(60% 50% at 50% 100%, rgba(163,230,53,0.10), transparent 70%),
      linear-gradient(180deg, rgba(2,6,23,0.55) 0%, rgba(2,6,23,0.78) 100%);
  }

  .pf-inner {
    position: relative;
    z-index: 1;
    max-width: 560px;
    margin: 0 auto;
    padding: 0 16px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .pf-pill {
    display: inline-flex; align-items: center; gap: 9px;
    padding: 8px 16px;
    background: rgba(56,189,248,0.10);
    border: 1px solid rgba(56,189,248,0.35);
    border-radius: 999px;
    color: #bae6fd;
    font-size: 12.5px;
    font-weight: 700;
    letter-spacing: 0.01em;
    margin-bottom: 18px;
  }
  .pf-pill strong { color: #a3e635; font-weight: 800; }
  .pf-dot {
    width: 7px; height: 7px;
    background: #a3e635;
    border-radius: 50%;
    flex-shrink: 0;
    animation: pf-pulse 1.8s ease-out infinite;
  }
  @keyframes pf-pulse {
    0%   { box-shadow: 0 0 0 0 rgba(163,230,53,0.7); }
    70%  { box-shadow: 0 0 0 8px rgba(163,230,53,0); }
    100% { box-shadow: 0 0 0 0 rgba(163,230,53,0); }
  }

  .pf-frame {
    width: 100%;
    max-width: 420px;
    border-radius: 22px;
    overflow: hidden;
    background: #000;
    border: 1px solid rgba(255,255,255,0.10);
    box-shadow:
      0 40px 80px -24px rgba(0,0,0,0.7),
      0 0 0 1px rgba(56,189,248,0.10) inset;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: transform .25s ease, box-shadow .25s ease;
  }
  .pf-frame:hover {
    transform: translateY(-4px);
    box-shadow:
      0 50px 90px -22px rgba(0,0,0,0.75),
      0 0 0 1px rgba(56,189,248,0.25) inset;
  }
  .pf-frame img {
    display: block;
    width: 100%;
    height: auto;
  }

  .pf-zoom-hint {
    margin-top: 11px;
    display: inline-flex; align-items: center; gap: 6px;
    color: #64748b;
    font-size: 11.5px;
    font-weight: 600;
  }

  .pf-cta {
    margin-top: 18px;
    width: 100%;
    max-width: 420px;
    display: flex; align-items: center; justify-content: center; gap: 12px;
    background: linear-gradient(180deg, #a3e635 0%, #84cc16 100%);
    color: #052e16;
    padding: 17px 24px;
    border-radius: 16px;
    text-decoration: none;
    font-weight: 900;
    font-size: 16.5px;
    letter-spacing: -0.01em;
    box-shadow:
      0 22px 44px -14px rgba(163,230,53,0.50),
      inset 0 1px 0 rgba(255,255,255,0.45);
    transition: transform .12s ease, box-shadow .12s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .pf-cta:active { transform: scale(0.985); }
  .pf-cta-arrow { opacity: 0.7; flex-shrink: 0; }

  @media (min-width: 768px) {
    .pf-wrap { padding: 48px 24px 24px; }
    .pf-frame, .pf-cta { max-width: 440px; }
  }

  /* Lightbox */
  .pf-lb {
    position: fixed; inset: 0;
    background: rgba(2,6,23,0.94);
    backdrop-filter: blur(20px);
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
    z-index: 9999;
    animation: pf-fade .18s ease;
  }
  .pf-lb img {
    max-width: 100%; max-height: 92vh;
    border-radius: 16px;
    box-shadow: 0 40px 80px rgba(0,0,0,0.6);
  }
  .pf-lb-close {
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
  @keyframes pf-fade { from { opacity: 0; } to { opacity: 1; } }
`

export default function PadelSummerFeature() {
  const [lb, setLb] = useState(false)

  useEffect(() => {
    if (!lb) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLb(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lb])

  return (
    <section className="pf-wrap">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="pf-ambient" style={{ ['--pf-poster' as any]: `url(${POSTER_SRC})` }} />
      <div className="pf-glow" />

      <div className="pf-inner">
        <span className="pf-pill">
          <span className="pf-dot" aria-hidden="true" />
          <span>Padel Indoor &middot; <strong>Climatizat 24&deg;C</strong></span>
        </span>

        <div
          className="pf-frame"
          onClick={() => setLb(true)}
          role="button"
          tabIndex={0}
          aria-label="Vezi posterul mărit"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setLb(true) }}
        >
          <img src={POSTER_SRC} alt="Padel Indoor climatizat la Star Arena Bascov — 120 lei/oră" loading="lazy" />
        </div>

        <span className="pf-zoom-hint">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
          </svg>
          Apasă pentru a mări
        </span>

        <Link to={BOOK_HREF} className="pf-cta" aria-label="Rezervă un teren de padel indoor">
          <span>Rezervă Padel Indoor</span>
          <span className="pf-cta-arrow">{ARROW_ICON}</span>
        </Link>
      </div>

      {lb && (
        <div className="pf-lb" onClick={() => setLb(false)}>
          <button className="pf-lb-close" aria-label="Închide" onClick={(e) => { e.stopPropagation(); setLb(false) }}>
            ✕
          </button>
          <img
            src={POSTER_SRC}
            alt="Padel Indoor climatizat la Star Arena Bascov"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  )
}
