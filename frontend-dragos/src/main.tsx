import React, { Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import 'react-day-picker/dist/style.css'
import { registerSW } from 'virtual:pwa-register'
import ScrollToTop from './components/ScrollToTop'
import { GoogleOAuthProvider } from '@react-oauth/google'
import CookieConsent from './components/CookieConsent'
import { ThemeProvider } from './ThemeContext'

// ─── Pagini încărcate IMEDIAT (critice pentru prima afișare) ───────────────
import HomePageD from './pages/HomePageD'
import App from './App'

// ─── Pagini încărcate LAZY (doar când userul navighează acolo) ────────────
// Reducere semnificativă a bundle-ului inițial: admin, profil, rezervare etc.
// nu sunt necesare pe homepage.
const PlayerAuthPage           = React.lazy(() => import('./pages/PlayerAuthPage'))
const ProfilePage              = React.lazy(() => import('./pages/ProfilePage'))
const SubscriptionsPage        = React.lazy(() => import('./pages/SubscriptionsPage'))
const SubscriptionRequestForm  = React.lazy(() => import('./pages/SubscriptionRequestFormPage'))
const BookingPage              = React.lazy(() => import('./pages/BookingPage'))
const CancelByTokenPage        = React.lazy(() => import('./pages/CancelByTokenPage'))
const SecurityPage             = React.lazy(() => import('./pages/SecurityPage'))
const TermsPage                = React.lazy(() => import('./pages/TermsPage'))
const PrivacyPage              = React.lazy(() => import('./pages/PrivacyPage'))
const CookiesPage              = React.lazy(() => import('./pages/CookiesPage'))
const InstallPage              = React.lazy(() => import('./pages/InstallPage'))
const OpenMatchesPage          = React.lazy(() => import('./pages/OpenMatchesPage'))

// Admin – cel mai mare chunk, complet separat
const LoginPage                      = React.lazy(() => import('./pages/LoginPage'))
const AdminLanding                   = React.lazy(() => import('./pages/AdminLanding'))
const AdminPage                      = React.lazy(() => import('./pages/AdminPage'))
const AdminAddBookingPage            = React.lazy(() => import('./pages/AdminAddBookingPage'))
const FreePositionsPage              = React.lazy(() => import('./pages/FreePositionsPage'))
const AdminBlockDayPage              = React.lazy(() => import('./pages/AdminBlockDayPage'))
const AdminWeeklyBookingPage         = React.lazy(() => import('./pages/AdminWeeklyBookingPage'))
const AdminSubscriptionRequestsPage  = React.lazy(() => import('./pages/AdminSubscriptionRequestsPage'))
const AdminSubscriptionsPage         = React.lazy(() => import('./pages/AdminSubscriptionsPage'))
const AdminCourtsPage                = React.lazy(() => import('./pages/AdminCourtsPage'))

// ─── Fallback vizibil cât se încarcă un chunk lazy ───────────────────────
function PageLoader() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#0f172a'
    }}>
      <div style={{
        width: 40, height: 40, border: '3px solid #334155',
        borderTopColor: '#38bdf8', borderRadius: '50%',
        animation: 'spin 0.7s linear infinite'
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ─── Wrapper care aplică ScrollToTop + Suspense pentru fiecare rută ───────
function Lazy({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </>
  )
}

// Fără polling explicit, un tab/PWA ținut deschis mult timp poate să nu observe
// niciodată un build nou (deci nici resetări precum cea a temei default) până
// nu e relansat manual — verificăm activ, ca onNeedRefresh să prindă update-ul
// și să reîncarce în timp util după fiecare deploy.
registerSW({
  onNeedRefresh() {
    window.location.reload()
  },
  onRegisteredSW(_url, registration) {
    if (!registration) return
    setInterval(() => { registration.update() }, 60 * 1000)
  }
})

const router = createBrowserRouter([
  // ─── Pagini critice (fără Suspense, se afișează instant) ────────────────
  { path: '/',       element: <><ScrollToTop /><HomePageD /></> },
  { path: '/rezerva', element: <><ScrollToTop /><App /></> },

  // ─── Pagini lazy ─────────────────────────────────────────────────────────
  { path: '/cont',                    element: <Lazy><PlayerAuthPage /></Lazy> },
  { path: '/profile',                 element: <Lazy><ProfilePage /></Lazy> },
  { path: '/abonamente',              element: <Lazy><SubscriptionsPage /></Lazy> },
  { path: '/abonamente/cere-oferta',  element: <Lazy><SubscriptionRequestForm /></Lazy> },
  { path: '/securitate',              element: <Lazy><SecurityPage /></Lazy> },
  { path: '/termeni',                 element: <Lazy><TermsPage /></Lazy> },
  { path: '/confidentialitate',       element: <Lazy><PrivacyPage /></Lazy> },
  { path: '/privacy',                 element: <Lazy><PrivacyPage /></Lazy> },
  { path: '/cookies',                 element: <Lazy><CookiesPage /></Lazy> },
  { path: '/instalare',               element: <Lazy><InstallPage /></Lazy> },
  { path: '/meciuri',                 element: <Lazy><OpenMatchesPage /></Lazy> },

  // ─── Rezervare & anulare ─────────────────────────────────────────────────
  { path: '/book/:courtId/:date/:startTime/:endTime', element: <Lazy><BookingPage /></Lazy> },
  { path: '/anulare/:token',          element: <Lazy><CancelByTokenPage /></Lazy> },

  // ─── Admin (chunk complet separat) ───────────────────────────────────────
  { path: '/login',                         element: <Lazy><LoginPage /></Lazy> },
  { path: '/admin',                         element: <Lazy><AdminLanding /></Lazy> },
  { path: '/admin/administrare-rezervari',  element: <Lazy><AdminPage /></Lazy> },
  { path: '/admin/administrare-rezervari/add', element: <Lazy><AdminAddBookingPage /></Lazy> },
  { path: '/admin/pozitii-libere',          element: <Lazy><FreePositionsPage /></Lazy> },
  { path: '/admin/block-day',               element: <Lazy><AdminBlockDayPage /></Lazy> },
  { path: '/admin/abonamente',              element: <Lazy><AdminSubscriptionRequestsPage /></Lazy> },
  { path: '/admin/subscriptions',           element: <Lazy><AdminSubscriptionsPage /></Lazy> },
  { path: '/admin/subscriptions/add',       element: <Lazy><AdminWeeklyBookingPage /></Lazy> },
  { path: '/admin/terenuri',                element: <Lazy><AdminCourtsPage /></Lazy> },
])

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
  || '337840626682-f4c0aj43u6pbiba781bfhqrlfc9q0tde.apps.googleusercontent.com'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <RouterProvider router={router} />
        <CookieConsent />
      </GoogleOAuthProvider>
    </ThemeProvider>
  </React.StrictMode>
)
