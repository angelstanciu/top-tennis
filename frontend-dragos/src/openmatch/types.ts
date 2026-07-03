// Tipuri și constante pentru partidele deschise (matchmaking) — Faza 1: Padel.

export interface LevelDef {
  rank: number
  code: string
  /** Eticheta scurtă (butoane): M4, M3 ... */
  short: string
  /** Descrierea din paranteză, dacă există: Incepator +, Mediu ... */
  sub?: string
}

/** Nivelurile de joc, de la cel mai slab la cel mai bun. */
export const LEVELS: LevelDef[] = [
  { rank: 0, code: 'HOBBY', short: 'Hobby' },
  { rank: 1, code: 'INCEPATOR', short: 'Începător' },
  { rank: 2, code: 'M4', short: 'M4', sub: 'Începător +' },
  { rank: 3, code: 'M3', short: 'M3', sub: 'Mediu' },
  { rank: 4, code: 'M2', short: 'M2', sub: 'Avansat' },
  { rank: 5, code: 'M1', short: 'M1', sub: 'Expert' },
]

/** "M4 (Începător +)" / "Hobby" */
export function levelLabel(rank: number | null | undefined): string {
  if (rank == null) return '—'
  const def = LEVELS.find(l => l.rank === rank)
  if (!def) return '—'
  return def.sub ? `${def.short} (${def.sub})` : def.short
}

export interface MyLevel {
  sportType: string
  levelRank: number | null
  label: string | null
}

export interface OpenMatchParticipant {
  name: string
  phone: string | null
  avatarUrl: string | null
}

export interface OpenMatchDto {
  id: number
  sportType: string
  courtName: string
  courtIndoor: boolean
  date: string        // yyyy-MM-dd
  startTime: string   // HH:mm
  endTime: string     // HH:mm
  targetLevelRank: number
  targetLevelLabel: string
  status: 'OPEN' | 'FULL' | 'CANCELLED'
  totalSlots: number
  groupSize: number
  spotsLeft: number
  organizerName: string
  organizerPhone: string | null
  organizerAvatar: string | null
  participants: OpenMatchParticipant[]
  bookingStatus: string
  mine: boolean
  joined: boolean
}

export interface CreateOpenMatchResult {
  matchId: number
  bookingId: number
  bookingStatus: string
  whatsappText: string
  whatsappGroupUrl?: string
}
