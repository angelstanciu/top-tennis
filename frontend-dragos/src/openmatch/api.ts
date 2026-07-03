import { CreateOpenMatchResult, MyLevel, OpenMatchDto } from './types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

function authHeaders(json = false): Record<string, string> {
  const headers: Record<string, string> = {}
  if (json) headers['Content-Type'] = 'application/json'
  const token = localStorage.getItem('playerToken')
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json()
    return data.message || 'Eroare necunoscută.'
  } catch {
    try { return await res.text() } catch { return 'Eroare de comunicare cu serverul.' }
  }
}

export async function getMyLevel(sport = 'PADEL'): Promise<MyLevel> {
  const res = await fetch(`${BASE_URL}/player/level?sport=${encodeURIComponent(sport)}`, {
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function setMyLevel(sport: string, levelRank: number): Promise<MyLevel> {
  const res = await fetch(`${BASE_URL}/player/level`, {
    method: 'PUT',
    headers: authHeaders(true),
    body: JSON.stringify({ sportType: sport, levelRank }),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function listOpenMatches(): Promise<OpenMatchDto[]> {
  const res = await fetch(`${BASE_URL}/open-matches`, { headers: authHeaders() })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function createOpenMatch(payload: {
  courtId: number
  date: string
  startTime: string
  endTime: string
  customerName: string
  customerPhone: string
  customerEmail?: string
  groupSize: 2 | 3
  targetLevelRank: number
}): Promise<CreateOpenMatchResult> {
  const res = await fetch(`${BASE_URL}/open-matches`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export async function joinOpenMatch(matchId: number): Promise<{ matchId: number; status: string }> {
  const res = await fetch(`${BASE_URL}/open-matches/${matchId}/join`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

/** O echipă completă preia intervalul unui meci deschis (doar în ultimele 6 ore). */
export async function takeoverOpenMatch(matchId: number, payload: {
  customerName: string
  customerPhone: string
  customerEmail?: string
}): Promise<{ bookingId: number; bookingStatus: string }> {
  const res = await fetch(`${BASE_URL}/open-matches/${matchId}/takeover`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

export function whatsappShareHref(text: string): string {
  return 'https://wa.me/?text=' + encodeURIComponent(text)
}
