import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App'
import BookingPage from './pages/BookingPage'
import AdminPage from './pages/AdminPage'
import FreePositionsPage from './pages/FreePositionsPage'
import AdminLanding from './pages/AdminLanding'
import LoginPage from './pages/LoginPage'
import { registerSW } from 'virtual:pwa-register'

registerSW()

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/book/:courtId/:date/:startTime/:endTime', element: <BookingPage /> },
  { path: '/admin', element: <AdminLanding /> },
  { path: '/admin/administrare-rezervari', element: <AdminPage /> },
  { path: '/admin/pozitii-libere', element: <FreePositionsPage /> },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
