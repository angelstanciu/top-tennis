import { AvailabilityDto, BookingDto, CourtDto, PlayerUser } from './types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export async function fetchAvailability(date: string, sportType?: string): Promise<AvailabilityDto[]> {
  const url = new URL(`${BASE_URL}/availability`, window.location.origin)
  url.searchParams.set('date', date)
  if (sportType) url.searchParams.set('sportType', sportType)
  const res = await fetch(url)
  if (!res.ok) throw new Error('Nu am putut incarca disponibilitatea')
  
  const data: AvailabilityDto[] = await res.json()
  data.forEach(item => {
    if (item.court && item.court.sportType === 'PADEL' && (item.court.name === '4' || item.court.name === '5')) {
      item.court.indoor = false
      if (item.court.notes && item.court.notes.includes('Locație diferită')) {
        item.court.notes = undefined
      }
    }
  })
  return data
}

export async function createBooking(payload: {
  courtId: number
  date: string
  startTime: string
  endTime: string
  customerName: string
  customerPhone: string
  customerEmail?: string
}): Promise<BookingDto> {
  const res = await fetch(`${BASE_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg)
  }
  return res.json()
}

export async function fetchActiveCourts(): Promise<CourtDto[]> {
  const res = await fetch(`${BASE_URL}/courts`)
  if (!res.ok) throw new Error('Nu am putut incarca terenurile')
  
  const courts: CourtDto[] = await res.json()
  courts.forEach(c => {
    if (c.sportType === 'PADEL' && (c.name === '4' || c.name === '5')) {
      c.indoor = false
      if (c.notes && c.notes.includes('Locație diferită')) {
        c.notes = undefined
      }
    }
  })
  return courts
}

export async function adminBlockSlot(payload: {
  courtId: number
  date: string
  startTime: string
  endTime: string
  note: string
}, auth: string): Promise<BookingDto> {
  const res = await fetch(`${BASE_URL}/admin/block-slot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg)
  }
  return res.json()
}

export async function adminCreateWeeklyBooking(payload: {
  courtId: number
  startDate: string
  startTime: string
  endTime: string
  customerName: string
  customerPhone: string
  customerEmail?: string
}, weeks: number): Promise<BookingDto[]> {
  const promises = []
  
  // payload.startDate e de tip YYYY-MM-DD
  const parts = payload.startDate.split('-')
  const baseDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))

  for (let i = 0; i < weeks; i++) {
    const d = new Date(baseDate)
    d.setDate(d.getDate() + i * 7)
    
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const day = String(d.getDate()).padStart(2, "0")
    const iterDateStr = `${y}-${m}-${day}`

    promises.push(createBooking({
      ...payload,
      date: iterDateStr
    }))
  }
  
  return Promise.all(promises)
}

export async function createWeeklyUserBooking(payload: {
  courtId: number
  date: string
  startTime: string
  endTime: string
  customerName: string
  customerPhone: string
  weeks: number
}): Promise<BookingDto> {
  const res = await fetch(`${BASE_URL}/bookings/weekly-user`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg)
  }
  return res.json()
}

// === Player Auth ===

export async function requestPlayerOtp(phone: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/player/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || 'Eroare la trimiterea codului.')
  }
}


// Moved to types.ts

export async function verifyPlayerOtp(phone: string, otp: string): Promise<{ token: string, user: PlayerUser }> {
  const res = await fetch(`${BASE_URL}/player/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp }),
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || 'Codul introdus este greșit.')
  }
  return res.json()
}

export async function loginPlayer(phone: string, password: string): Promise<{ token: string, user: PlayerUser }> {
  const res = await fetch(`${BASE_URL}/player/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || 'Eroare la autentificare.')
  }
  return res.json()
}

export async function registerPlayer(phone: string, password: string, fullName: string): Promise<{ token: string, user: PlayerUser }> {
  const res = await fetch(`${BASE_URL}/player/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password, fullName }),
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || 'Eroare la crearea contului.')
  }
  return res.json()
}

export async function loginWithGoogle(credential: string): Promise<{ token: string, user: PlayerUser }> {
  const res = await fetch(`${BASE_URL}/player/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || 'Eroare la autentificare cu Google.')
  }
  return res.json()
}

export async function fetchPlayerMe(token: string): Promise<PlayerUser> {
  const res = await fetch(`${BASE_URL}/player/me`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!res.ok) {
    throw new Error('Token expirat.')
  }
  return res.json()
}

export async function updatePlayerProfile(token: string, payload: { fullName?: string, email?: string, preferredSport?: string, age?: number, avatarUrl?: string }): Promise<PlayerUser> {
  const res = await fetch(`${BASE_URL}/player/auth/update-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || 'Eroare la salvarea profilului.')
  }
  return res.json()
}

export async function fetchPlayerHistory(token: string): Promise<BookingDto[]> {
  const res = await fetch(`${BASE_URL}/player/history`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!res.ok) {
    throw new Error('Nu am putut incarca istoricul.')
  }
  return res.json()
}
