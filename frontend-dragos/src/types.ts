export type SportType = 'TENNIS' | 'PADEL' | 'BEACH_VOLLEY' | 'BASKETBALL' | 'FOOTVOLLEY' | 'TABLE_TENNIS'

export const LOCATION_TAGS = {
  COSMIN: 'Baza Cosmin Top Tenis',
  STAR_ARENA: '📍 Star Arena (Locație Nouă)'
}

export interface CourtDto {
  id: number
  name: string
  sportType: SportType
  indoor: boolean
  heated: boolean
  lighting: boolean
  surface?: string
  notes?: string
  pricePerHour: number
  openTime: string
  closeTime: string
  active: boolean
}

export interface AvailabilityTimeRange {
  start: string
  end: string
  status: string
  customerName?: string
  playerMatchesCount?: number
}

export interface AvailabilityDto {
  court: CourtDto
  booked: AvailabilityTimeRange[]
  free: AvailabilityTimeRange[]
}

export interface BookingDto {
  id: number
  court: CourtDto
  bookingDate: string
  startTime: string
  endTime: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  status: 'CONFIRMED' | 'CANCELLED' | 'BLOCKED' | 'PENDING_APPROVAL' | 'NO_SHOW'
  createdAt: string
  updatedAt: string
  price: number
  playerMatchesCount?: number
  playerCancellationsCount?: number
  playerNoShowCount?: number
}

export interface PlayerUser {
  id: number
  phoneNumber: string
  fullName: string
  email?: string
  preferredSport?: string
  age?: number
  avatarUrl?: string
  matchesPlayed?: number
  phoneVerified?: boolean
}

export function getPricePerHour(sport: SportType, indoor: boolean, date?: string): number {
  const isOutdoor = !indoor
  if (sport === 'TENNIS' && indoor) return 60
  if (sport === 'TENNIS' && isOutdoor) return 35
  if (sport === 'FOOTVOLLEY') return 75
  if (sport === 'PADEL' && isOutdoor) return 80
  if (sport === 'PADEL' && indoor) return 150
  if (sport === 'BASKETBALL') return 80
  if (sport === 'TABLE_TENNIS') return 35
  if (sport === 'BEACH_VOLLEY') return 100
  return 0
}

// FOOTVOLLEY: 75 lei/h ziua, 100 lei/h dupa 20:00 (nocturna)
const FOOTVOLLEY_NIGHT_HOUR = 20
const FOOTVOLLEY_DAY_PRICE = 75
const FOOTVOLLEY_NIGHT_PRICE = 100

export function calculateGranularPrice(sport: SportType, indoor: boolean, start: string, end: string, date: string): number {
  const isTennisOutdoor = sport === 'TENNIS' && !indoor
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let startMin = sh * 60 + sm
  let endMin = eh * 60 + em
  if (endMin <= startMin) endMin += 24 * 60

  const splitMin = 20 * 60
  const d = date ? new Date(date) : new Date()
  const isBeforeNovember = d.getMonth() < 10 // 0-indexed, 10 is November

  // Tennis outdoor: 35 lei/h ziua, 50 lei/h dupa 20:00 (nocturna)
  if (isTennisOutdoor && isBeforeNovember) {
    let price = 0
    if (startMin < splitMin) {
      const dayEnd = Math.min(endMin, splitMin)
      price += ((dayEnd - startMin) * 35) / 60
    }
    if (endMin > splitMin) {
      const nightStart = Math.max(startMin, splitMin)
      price += ((endMin - nightStart) * 50) / 60
    }
    return price
  }

  // Footvolley: 75 lei/h ziua, 100 lei/h dupa 20:00 (nocturna)
  if (sport === 'FOOTVOLLEY') {
    const nightStartMin = FOOTVOLLEY_NIGHT_HOUR * 60
    const dayMinutes = Math.max(0, Math.min(endMin, nightStartMin) - startMin)
    const nightMinutes = Math.max(0, endMin - Math.max(startMin, nightStartMin))
    return (dayMinutes * FOOTVOLLEY_DAY_PRICE + nightMinutes * FOOTVOLLEY_NIGHT_PRICE) / 60
  }

  const pricePerHour = getPricePerHour(sport, indoor, date)
  const diff = endMin - startMin
  return (diff * pricePerHour) / 60
}
