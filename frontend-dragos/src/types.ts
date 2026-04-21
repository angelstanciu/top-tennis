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
  if (sport === 'TENNIS' && indoor) return 50
  if (sport === 'TENNIS' && isOutdoor) return 35
  if (sport === 'FOOTVOLLEY') return 75
  if (sport === 'PADEL' && isOutdoor) return 80
  if (sport === 'PADEL' && indoor) return 150
  if (sport === 'BASKETBALL') return 80
  if (sport === 'TABLE_TENNIS') return 35
  if (sport === 'BEACH_VOLLEY') return 90
  return 0
}

const NIGHT_SPLIT_MIN = 20 * 60

export function calculateGranularPrice(sport: SportType, indoor: boolean, start: string, end: string, date: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let startMin = sh * 60 + sm
  let endMin = eh * 60 + em
  if (endMin <= startMin) endMin += 24 * 60

  const d = date ? new Date(date) : new Date()
  const isBeforeNovember = d.getMonth() < 10 // 0-indexed, 10 is November

  function splitDayNight(dayRate: number, nightRate: number): number {
    let price = 0
    if (startMin < NIGHT_SPLIT_MIN) {
      const dayEnd = Math.min(endMin, NIGHT_SPLIT_MIN)
      price += ((dayEnd - startMin) * dayRate) / 60
    }
    if (endMin > NIGHT_SPLIT_MIN) {
      const nightStart = Math.max(startMin, NIGHT_SPLIT_MIN)
      price += ((endMin - nightStart) * nightRate) / 60
    }
    return price
  }

  // Tennis outdoor: 35 lei/h ziua, 50 lei/h dupa 20:00 (nocturna) — doar inainte de noiembrie
  if (sport === 'TENNIS' && !indoor && isBeforeNovember) {
    return splitDayNight(35, 50)
  }

  // Padel indoor: 100 lei/h intre 08:00-14:00, 150 lei/h dupa 14:00
  if (sport === 'PADEL' && indoor) {
    const PADEL_INDOOR_SPLIT = 14 * 60
    let price = 0
    if (startMin < PADEL_INDOOR_SPLIT) {
      const dayEnd = Math.min(endMin, PADEL_INDOOR_SPLIT)
      price += ((dayEnd - startMin) * 100) / 60
    }
    if (endMin > PADEL_INDOOR_SPLIT) {
      const nightStart = Math.max(startMin, PADEL_INDOOR_SPLIT)
      price += ((endMin - nightStart) * 150) / 60
    }
    return price
  }

  // Padel outdoor: 80 lei/h ziua, 100 lei/h dupa 20:00 (nocturna)
  if (sport === 'PADEL' && !indoor) {
    return splitDayNight(80, 100)
  }

  // Footvolley: 75 lei/h ziua, 100 lei/h dupa 20:00 (nocturna)
  if (sport === 'FOOTVOLLEY') {
    return splitDayNight(75, 100)
  }

  const pricePerHour = getPricePerHour(sport, indoor, date)
  const diff = endMin - startMin
  return (diff * pricePerHour) / 60
}
