import { useEffect } from 'react'

// SEO per rută pentru SPA.
// Toate rutele servesc același index.html, deci fără asta fiecare pagină ar avea
// titlul, descrierea și canonical-ul homepage-ului — iar Google le-ar „topi" pe
// toate într-una singură (exact ce arăta Search Console: doar homepage-ul
// performa). Google execută JavaScript la indexare, deci valorile setate aici
// sunt cele pe care le vede crawlerul pentru fiecare rută.

const ORIGIN = 'https://star-arena.ro'

const DEFAULTS = {
  title: 'Star Arena Pitești | Padel, Tenis, Baschet – Rezervări Online Bascov',
  description:
    'Complex sportiv modern lângă Pitești, în Bascov, Argeș. Rezervă online terenuri de Padel Indoor și Outdoor, Tenis de Câmp, Baschet, Fotbal-Tenis și Volei. Iluminat nocturn LED. Aproape de Mioveni și Curtea de Argeș.',
}

function setMeta(selector: string, attr: string, value: string) {
  const el = document.querySelector(selector)
  if (el) el.setAttribute(attr, value)
}

export function useSeo(opts: { title?: string; description?: string; path: string }) {
  useEffect(() => {
    const title = opts.title || DEFAULTS.title
    const description = opts.description || DEFAULTS.description
    document.title = title
    setMeta('meta[name="description"]', 'content', description)
    setMeta('link[rel="canonical"]', 'href', ORIGIN + opts.path)
    setMeta('meta[property="og:url"]', 'content', ORIGIN + opts.path)
    setMeta('meta[property="og:title"]', 'content', title)
    setMeta('meta[property="og:description"]', 'content', description)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.path, opts.title, opts.description])
}
