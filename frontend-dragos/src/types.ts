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

export function calculateGranularPrice(sport: SportType, indoor: boolean, start: string, end: string, date: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let startMin = sh * 60 + sm
  let endMin = eh * 60 + em
  if (endMin <= startMin) endMin += 24 * 60

  const d = date ? new Date(date) : new Date()
  const isBeforeNovember = d.getMonth() < 10 // 0-indexed, 10 is November

  // Day window: 08:00–20:00. Night: 20:00–08:00 (includes early morning past midnight).
  function splitDayNight(dayRate: number, nightRate: number): number {
    const MORNING = 8 * 60   // 480
    const EVENING = 20 * 60  // 1200
    const DAY    = 24 * 60   // 1440
    const dayMins =
      Math.max(0, Math.min(endMin, EVENING)       - Math.max(startMin, MORNING)) +
      Math.max(0, Math.min(endMin, EVENING + DAY) - Math.max(startMin, MORNING + DAY))
    const nightMins = (endMin - startMin) - dayMins
    return (dayMins * dayRate + nightMins * nightRate) / 60
  }

  // Tennis outdoor: 35 lei/h ziua, 50 lei/h dupa 20:00 (nocturna) — doar inainte de noiembrie
  if (sport === 'TENNIS' && !indoor && isBeforeNovember) {
    return splitDayNight(35, 50)
  }

  // Padel indoor: tarif variabil dupa zi (L-V vs S-D) si data (inainte/dupa 1 mai 2026)
  // Pana la 1 mai 2026: L-V 100/h<14:00 + 150/h>=14:00; S-D 150/h tot
  // Dupa 1 mai 2026:    L-V 100/h<14:00 + 120/h>=14:00; S-D 120/h tot
  if (sport === 'PADEL' && indoor) {
    const bookingDate = date ? new Date(date + 'T00:00:00') : new Date()
    const dayOfWeek = bookingDate.getDay() // 0=Dum, 6=Sam
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const isAfterMay1 = bookingDate >= new Date('2026-05-01T00:00:00')
    const SPLIT = 14 * 60
    let morningRate: number
    let afternoonRate: number
    if (isWeekend) {
      morningRate = afternoonRate = isAfterMay1 ? 120 : 150
    } else {
      morningRate = 100
      afternoonRate = isAfterMay1 ? 120 : 150
    }
    let price = 0
    if (startMin < SPLIT) {
      const dayEnd = Math.min(endMin, SPLIT)
      price += ((dayEnd - startMin) * morningRate) / 60
    }
    if (endMin > SPLIT) {
      const nightStart = Math.max(startMin, SPLIT)
      price += ((endMin - nightStart) * afternoonRate) / 60
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
