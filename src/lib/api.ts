// The game API (docs/SPEC.md section 5): one typed function per route, same origin, JSON in
// and out. Types come from shared/, which is what the server itself builds its responses from.
import type { z } from 'zod'
import type { CreateTeamInput, JoinEventInput, JoinTeamInput, SubmitAnswerInput, SubmitWagerInput } from '../../shared/api'
import type { Role } from '../../shared/enums'
import type { GameView, JoinResult, Leaderboard, MyTeam, PublicSubmission } from '../../shared/game'

/** A failed call. `code` is the server's error code, `network` when the request never got there. */
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string) {
    super(`API error ${status}: ${code}`)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

async function request<T>(path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin' }
  if (body !== undefined) {
    init.headers = { 'content-type': 'application/json' }
    init.body = JSON.stringify(body)
  }
  let response: Response
  try {
    response = await fetch(path, init)
  } catch {
    throw new ApiError(0, 'network')
  }
  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const code = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' ? data.error : 'unknown'
    throw new ApiError(response.status, code)
  }
  return data as T
}

const query = (path: string, eventId: string) => `${path}?event_id=${encodeURIComponent(eventId)}`

export const api = {
  me: () => request<{ role: Role | null; player: { id: string; nickname: string } | null }>('/api/me'),
  serverTime: () => request<{ now: number }>('/api/server_time'),
  joinEvent: (input: z.input<typeof JoinEventInput>) => request<JoinResult>('/api/join_event', input),
  getState: (eventId: string) => request<GameView>(query('/api/get_state', eventId)),
  getLeaderboard: (eventId: string) => request<Leaderboard>(query('/api/get_leaderboard', eventId)),
  createTeam: (input: z.input<typeof CreateTeamInput>) => request<MyTeam>('/api/create_team', input),
  joinTeam: (input: z.input<typeof JoinTeamInput>) => request<MyTeam>('/api/join_team', input),
  submitAnswer: (input: z.input<typeof SubmitAnswerInput>) => request<PublicSubmission>('/api/submit_answer', input),
  submitWager: (input: z.input<typeof SubmitWagerInput>) => request<PublicSubmission>('/api/submit_wager', input),
}
