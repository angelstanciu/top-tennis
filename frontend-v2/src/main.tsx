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
import { registerSW } from 'virtual:pwa-register'

registerSW()

const router = createBrowserRouter([
  { path: '/', element: <HomePageD /> },
  { path: '/rezerva', element: <App /> },
  { path: '/cont', element: <PlayerAuthPage /> },
  { path: '/profile', element: <ProfilePage /> },
  { path: '/abonamente', element: <SubscriptionsPage /> },
  { path: '/abonamente/cere-oferta', element: <SubscriptionRequestFormPage /> },
  { path: '/securitate', element: <SecurityPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/termeni', element: <TermsPage /> },
  { path: '/confidentialitate', element: <PrivacyPage /> },
  { path: '/cookies', element: <CookiesPage /> },
  { path: '/book/:courtId/:date/:startTime/:endTime', element: <BookingPage /> },
  { path: '/admin', element: <AdminLanding /> },
  { path: '/admin/administrare-rezervari', element: <AdminPage /> },
  { path: '/admin/pozitii-libere', element: <FreePositionsPage /> },
  { path: '/admin/block-day', element: <AdminBlockDayPage /> },
  { path: '/admin/weekly', element: <AdminWeeklyBookingPage /> },
  { path: '/admin/abonamente', element: <AdminSubscriptionRequestsPage /> },
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
