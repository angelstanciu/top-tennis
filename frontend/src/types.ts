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
}

export interface AvailabilityTimeRange {
  start: string
  end: string
  status: string
  customerName?: string
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
}
