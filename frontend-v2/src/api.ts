import { AvailabilityDto, BookingDto, CourtDto } from './types'

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




