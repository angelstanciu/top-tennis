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
  nightPrice: number
  nightRateStartTime: string
  morningPrice: number
}

export interface AvailabilityTimeRange {
  start: string
  end: string
  status: string
  customerName?: string
  playerMatchesCount?: number
  // Meci deschis (matchmaking): prezente doar când rezervarea caută jucători
  openMatchId?: number
  openMatchSpotsLeft?: number
  openMatchTakeover?: boolean
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

export function sportLabel(s: string) {
  switch (s) {
    case 'TENNIS': return 'Tenis'
    case 'PADEL': return 'Padel 🎾'
    case 'BEACH_VOLLEY': return 'Volei'
    case 'BASKETBALL': return 'Baschet'
    case 'FOOTVOLLEY': return 'Tenis de picior'
    case 'TABLE_TENNIS': return 'Tenis de masă'
    default: return s
  }
}

const PADEL_OUTDOOR_MORNING_END = 14 * 60 // 14:00, fixed boundary (not admin-editable)

export function calculateGranularPrice(court: CourtDto, start: string, end: string, date: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let startMin = sh * 60 + sm
  let endMin = eh * 60 + em
  if (endMin <= startMin) endMin += 24 * 60

  const d = date ? new Date(date) : new Date()
  const isBeforeNovember = d.getMonth() < 10 // 0-indexed, 10 is November
  const bookingDate = date ? new Date(date + 'T00:00:00') : new Date()
  const dayOfWeek = bookingDate.getDay() // 0=Dum, 6=Sam
  const isWeekday = dayOfWeek !== 0 && dayOfWeek !== 6

  const timeToMin = (t: string) => {
    const [h, m] = (t || '00:00').slice(0, 5).split(':').map(Number)
    return h * 60 + m
  }

  function splitDayNight(dayRate: number, nightRate: number, splitAt: number): number {
    const DAY = 24 * 60
    const dayMins =
      Math.max(0, Math.min(endMin, splitAt)       - Math.max(startMin, 0)) +
      Math.max(0, Math.min(endMin, splitAt + DAY) - Math.max(startMin, DAY))
    const nightMins = (endMin - startMin) - dayMins
    return (dayMins * dayRate + nightMins * nightRate) / 60
  }

  function splitThreeTier(rate1: number, rate2: number, rate3: number, b1: number, b2: number): number {
    const DAY = 24 * 60
    const seg1 =
      Math.max(0, Math.min(endMin, b1)       - Math.max(startMin, 0)) +
      Math.max(0, Math.min(endMin, b1 + DAY) - Math.max(startMin, DAY))
    const seg2 =
      Math.max(0, Math.min(endMin, b2)       - Math.max(startMin, b1)) +
      Math.max(0, Math.min(endMin, b2 + DAY) - Math.max(startMin, b1 + DAY))
    const seg3 =
      Math.max(0, Math.min(endMin, DAY)       - Math.max(startMin, b2)) +
      Math.max(0, Math.min(endMin, DAY + DAY) - Math.max(startMin, b2 + DAY))
    return (seg1 * rate1 + seg2 * rate2 + seg3 * rate3) / 60
  }

  // Padel outdoor: weekday morning discount (fixed 14:00) + regular + nocturnă,
  // all three prices admin-editable (pricePerHour / morningPrice / nightPrice).
  if (court.sportType === 'PADEL' && !court.indoor) {
    const nightStart = timeToMin(court.nightRateStartTime)
    if (!court.lighting) {
      if (isWeekday) return splitDayNight(court.morningPrice, court.pricePerHour, PADEL_OUTDOOR_MORNING_END)
      return ((endMin - startMin) * court.pricePerHour) / 60
    }
    if (!isWeekday) return splitDayNight(court.pricePerHour, court.nightPrice, nightStart)
    if (PADEL_OUTDOOR_MORNING_END >= nightStart) return splitDayNight(court.morningPrice, court.nightPrice, nightStart)
    return splitThreeTier(court.morningPrice, court.pricePerHour, court.nightPrice, PADEL_OUTDOOR_MORNING_END, nightStart)
  }

  // Generic outdoor + nocturnă split — covers Tennis outdoor (before November), Footvolley,
  // Beach Volley, and any other outdoor court with Nocturnă checked (not a fixed sport list).
  const tennisSeasonal = court.sportType !== 'TENNIS' || isBeforeNovember
  if (!court.indoor && court.lighting && tennisSeasonal) {
    return splitDayNight(court.pricePerHour, court.nightPrice, timeToMin(court.nightRateStartTime))
  }

  // Default: flat rate from the actual court (indoor courts incl. Padel indoor, Basketball,
  // Table Tennis, non-lit outdoor courts, Tennis outdoor without lighting or in/after November).
  return ((endMin - startMin) * court.pricePerHour) / 60
}
