import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import 'react-day-picker/dist/style.css'
import App from './App'
import BookingPage from './pages/BookingPage'
import AdminPage from './pages/AdminPage'
import FreePositionsPage from './pages/FreePositionsPage'
import AdminLanding from './pages/AdminLanding'
import LoginPage from './pages/LoginPage'
import HomePageD from './pages/HomePageD'
import TermsPage from './pages/TermsPage'
import PrivacyPage from './pages/PrivacyPage'
import CookiesPage from './pages/CookiesPage'
import AdminBlockDayPage from './pages/AdminBlockDayPage'
import AdminWeeklyBookingPage from './pages/AdminWeeklyBookingPage'
import PlayerAuthPage from './pages/PlayerAuthPage'
import ProfilePage from './pages/ProfilePage'
import SecurityPage from './pages/SecurityPage'
import SubscriptionsPage from './pages/SubscriptionsPage'
import SubscriptionRequestFormPage from './pages/SubscriptionRequestFormPage'
import AdminSubscriptionRequestsPage from './pages/AdminSubscriptionRequestsPage'
import CancelByTokenPage from './pages/CancelByTokenPage'
import { registerSW } from 'virtual:pwa-register'
import ScrollToTop from './components/ScrollToTop'

registerSW()

const router = createBrowserRouter([
  { path: '/', element: <><ScrollToTop /><HomePageD /></> },
  { path: '/rezerva', element: <><ScrollToTop /><App /></> },
  { path: '/cont', element: <><ScrollToTop /><PlayerAuthPage /></> },
  { path: '/profile', element: <><ScrollToTop /><ProfilePage /></> },
  { path: '/abonamente', element: <><ScrollToTop /><SubscriptionsPage /></> },
  { path: '/abonamente/cere-oferta', element: <><ScrollToTop /><SubscriptionRequestFormPage /></> },
  { path: '/securitate', element: <><ScrollToTop /><SecurityPage /></> },
  { path: '/login', element: <><ScrollToTop /><LoginPage /></> },
  { path: '/termeni', element: <><ScrollToTop /><TermsPage /></> },
  { path: '/confidentialitate', element: <><ScrollToTop /><PrivacyPage /></> },
  { path: '/privacy', element: <><ScrollToTop /><PrivacyPage /></> },
  { path: '/cookies', element: <><ScrollToTop /><CookiesPage /></> },
  { path: '/book/:courtId/:date/:startTime/:endTime', element: <><ScrollToTop /><BookingPage /></> },
  { path: '/admin', element: <><ScrollToTop /><AdminLanding /></> },
  { path: '/admin/administrare-rezervari', element: <><ScrollToTop /><AdminPage /></> },
  { path: '/admin/pozitii-libere', element: <><ScrollToTop /><FreePositionsPage /></> },
  { path: '/admin/block-day', element: <><ScrollToTop /><AdminBlockDayPage /></> },
  { path: '/admin/weekly', element: <><ScrollToTop /><AdminWeeklyBookingPage /></> },
  { path: '/admin/abonamente', element: <><ScrollToTop /><AdminSubscriptionRequestsPage /></> },
  { path: '/anulare/:token', element: <><ScrollToTop /><CancelByTokenPage /></> },
])

import { GoogleOAuthProvider } from '@react-oauth/google'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "617835105268-m8h07g94gkvsn669r170n09vrt6688ee.apps.googleusercontent.com"

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <RouterProvider router={router} />
    </GoogleOAuthProvider>
  </React.StrictMode>
)
