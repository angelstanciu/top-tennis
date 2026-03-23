import { AvailabilityDto, BookingDto, CourtDto, PlayerUser } from './types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

function normalizePhone(phone: string): string {
  if (!phone) return ''
  let stripped = phone.replace(/[^0-9+]/g, '')
  if (stripped.startsWith('+40')) stripped = stripped.substring(3)
  else if (stripped.startsWith('+4')) stripped = stripped.substring(2)
  else if (stripped.startsWith('40') && stripped.length >= 11) stripped = stripped.substring(2)
  else if (stripped.startsWith('0040')) stripped = stripped.substring(4)
  
  if (stripped.startsWith('7') && stripped.length === 9) {
    stripped = '0' + stripped
  }
  return stripped
}

async function parseError(res: Response): Promise<string> {
  if (res.status === 401) {
    localStorage.removeItem('playerToken')
    localStorage.removeItem('playerUser')
    window.location.href = '/player-auth'
  }
  try {
    const data = await res.json();
    return data.message || 'Eroare necunoscută.';
  } catch {
    try {
      return await res.text();
    } catch {
      return 'Eroare de comunicare cu serverul.';
    }
  }
}

export async function fetchAvailability(date: string, sportType?: string): Promise<AvailabilityDto[]> {
  const url = new URL(`${BASE_URL}/availability`, window.location.origin)
  url.searchParams.set('date', date)
  if (sportType) url.searchParams.set('sportType', sportType)
  
  const token = localStorage.getItem('playerToken')
  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(await parseError(res))
  
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
  bypassDoubleBooking?: boolean
}): Promise<BookingDto> {
  const token = localStorage.getItem('playerToken')
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const normalizedPayload = {
    ...payload,
    customerPhone: normalizePhone(payload.customerPhone)
  }

  const res = await fetch(`${BASE_URL}/bookings`, {
    method: 'POST',
    headers,
    body: JSON.stringify(normalizedPayload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function fetchActiveCourts(): Promise<CourtDto[]> {
  const res = await fetch(`${BASE_URL}/courts`)
  if (!res.ok) throw new Error(await parseError(res))
  
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
  if (!res.ok) throw new Error(await parseError(res))
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
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

// === Player Auth ===

export async function requestPlayerOtp(phone: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/player/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: normalizePhone(phone) }),
  })
  if (!res.ok) {
    const msg = await parseError(res)
    if (msg.includes('recently sent')) throw new Error('Un cod a fost trimis recent. Te rugăm să aștepți 1 minut.')
    throw new Error(msg || 'Eroare la trimiterea codului SMS. Verifică numărul.')
  }
}

export async function verifyPlayerOtp(phone: string, otp: string): Promise<{ token: string, user: PlayerUser }> {
  const res = await fetch(`${BASE_URL}/player/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: normalizePhone(phone), otp }),
  })
  if (!res.ok) throw new Error(await parseError(res) || 'Codul introdus este greșit.')
  return res.json()
}

export async function loginPlayer(identifier: string, password: string): Promise<{ token: string, user: PlayerUser }> {
  const res = await fetch(`${BASE_URL}/player/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  })
  if (!res.ok) throw new Error(await parseError(res) || 'Eroare la autentificare.')
  return res.json()
}

export async function registerPlayer(phone: string, password: string, fullName: string, email?: string): Promise<{ token: string, user: PlayerUser }> {
  const res = await fetch(`${BASE_URL}/player/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: normalizePhone(phone), password, fullName, email }),
  })
  if (!res.ok) throw new Error(await parseError(res) || 'Eroare la creare cont.')
  return res.json()
}

export async function forgotPassword(identifier: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/player/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier }),
  })
  if (!res.ok) throw new Error(await parseError(res) || 'Eroare la trimitere cod de reset.')
}

export async function resetPassword(identifier: string, otp: string, newPassword: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/player/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, otp, newPassword }),
  })
  if (!res.ok) throw new Error(await parseError(res) || 'Eroare la schimbarea parolei.')
}

export async function loginWithGoogle(credential: string): Promise<{ token: string, user: PlayerUser }> {
  const res = await fetch(`${BASE_URL}/player/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential }),
  })
  if (!res.ok) throw new Error(await parseError(res) || 'Eroare la autentificare cu Google.')
  return res.json()
}

export async function fetchPlayerMe(token: string): Promise<PlayerUser> {
  const res = await fetch(`${BASE_URL}/player/me`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!res.ok) throw new Error(await parseError(res) || 'Sesiune expirată.')
  return res.json()
}

export async function updatePlayerProfile(token: string, payload: { fullName?: string, email?: string, phoneNumber?: string, preferredSport?: string, age?: number, gender?: string, avatarUrl?: string }): Promise<PlayerUser> {
  const res = await fetch(`${BASE_URL}/player/auth/update-profile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function linkPlayerPhone(token: string, phone: string, otp: string): Promise<PlayerUser> {
  const res = await fetch(`${BASE_URL}/player/auth/link-phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ phone: normalizePhone(phone), otp }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function verifyUserPhone(token: string, otp: string): Promise<PlayerUser> {
  const res = await fetch(`${BASE_URL}/player/auth/verify-phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    // no phone needed because verify-phone just uses token directly on backend
    body: JSON.stringify({ otp }), 
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function fetchPlayerHistory(token: string): Promise<BookingDto[]> {
  const res = await fetch(`${BASE_URL}/player/history`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!res.ok) throw new Error(await parseError(res) || 'Nu am putut incarca istoricul.')
  return res.json()
}
export async function cancelBooking(id: number): Promise<void> {
  const token = localStorage.getItem('playerToken')
  if (!token) throw new Error('Trebuie să fii autentificat pentru a anula o rezervare.')
  
  const res = await fetch(`${BASE_URL}/bookings/${id}/cancel`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function cancelBookingByToken(token: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/bookings/cancel-public/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function approveBooking(id: number, auth: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/admin/bookings/${id}/approve`, {
    method: 'PATCH',
    headers: { Authorization: `Basic ${auth}` }
  })
  if (!res.ok) throw new Error(await parseError(res))
}

export async function rejectBooking(id: number, auth: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/admin/bookings/${id}/reject`, {
    method: 'PATCH',
    headers: { Authorization: `Basic ${auth}` }
  })
  if (!res.ok) throw new Error(await parseError(res))
}
