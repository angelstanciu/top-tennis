import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import App from './App'
import BookingPage from './pages/BookingPage'
import AdminPage from './pages/AdminPage'
import { registerSW } from 'virtual:pwa-register'

registerSW()

const router = createBrowserRouter([
  { path: '/', element: <App /> },
  { path: '/book/:courtId/:date/:startTime/:endTime', element: <BookingPage /> },
  { path: '/admin', element: <AdminPage /> },
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
