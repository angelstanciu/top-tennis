export type SportType = 'TENNIS' | 'PADEL' | 'BEACH_VOLLEY' | 'BASKETBALL' | 'FOOTVOLLEY' | 'TABLE_TENNIS'

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
  status: 'CONFIRMED' | 'CANCELLED' | 'BLOCKED'
  createdAt: string
  updatedAt: string
  price: number
  playerMatchesCount?: number
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
}

export function calculateGranularPrice(sport: SportType, indoor: boolean, start: string, end: string, date: string): number {
  const isOutdoor = !indoor
  let pricePerHour = 0

  if (sport === 'TENNIS' && indoor) {
    pricePerHour = 60
  } else if (sport === 'TENNIS' && isOutdoor) {
    pricePerHour = 40
  } else if (sport === 'FOOTVOLLEY') {
    pricePerHour = 75
  } else if (sport === 'PADEL' && isOutdoor) {
    pricePerHour = 80
  } else if (sport === 'PADEL' && indoor) {
    pricePerHour = 150
  } else if (sport === 'BASKETBALL') {
    pricePerHour = 80
  } else if (sport === 'TABLE_TENNIS') {
    pricePerHour = 35
  } else if (sport === 'BEACH_VOLLEY') {
    pricePerHour = 100
  }

  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let startMin = sh * 60 + sm
  let endMin = eh * 60 + em
  if (endMin <= startMin) endMin += 24 * 60
  
  const diff = endMin - startMin
  return (diff * pricePerHour) / 60
}
