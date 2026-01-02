import { AvailabilityDto, BookingDto, CourtDto } from './types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'

export async function fetchAvailability(date: string, sportType?: string): Promise<AvailabilityDto[]> {
  const url = new URL(`${BASE_URL}/availability`)
  url.searchParams.set('date', date)
  if (sportType) url.searchParams.set('sportType', sportType)
  const res = await fetch(url)
  if (!res.ok) throw new Error('Nu am putut incarca disponibilitatea')
  return res.json()
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
  return res.json()
}




