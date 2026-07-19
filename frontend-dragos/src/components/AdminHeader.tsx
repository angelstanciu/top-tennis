import React from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import Navbar from './Navbar'

type AdminHeaderProps = {
  active?: 'landing' | 'bookings' | 'bookings-add' | 'free' | 'block-day' | 'subscriptions' | 'subscriptions-manage' | 'subscriptions-add' | 'courts'
  backTo?: string
}

export default function AdminHeader({ active, backTo = '/admin' }: AdminHeaderProps) {
  const navigate = useNavigate()
  const isRoot = active === 'landing'

  if (isRoot) {
    return (
      <Navbar
        variant="static"
        showReserveButton={false}
        showAccountButton={false}
        badge="Admin"
        rightExtra={
          <button
            onClick={() => {
              sessionStorage.removeItem('adminAuth')
              navigate('/admin')
            }}
            aria-label="Deconectare"
            className="flex items-center justify-center rounded-full border transition-colors hover:opacity-70"
            style={{ width: 36, height: 36, borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--muted)' }}
          >
            <LogOut className="w-4 h-4" />
          </button>
        }
      />
    )
  }

  return (
    <Navbar
      variant="static"
      showReserveButton={false}
      showAccountButton={false}
      backTo={backTo}
      badge="Admin"
    />
  )
}
