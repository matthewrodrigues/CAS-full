// The game API (docs/SPEC.md section 5): one typed function per route, same origin, JSON in
// and out. Types come from shared/, which is what the server itself builds its responses from.
import type { z } from 'zod'
import type {
  CreateTeamInput,
  HostAdjustScoreInput,
  HostOverrideInput,
  HostReviewTeamNameInput,
  JoinEventInput,
  JoinTeamInput,
  SubmitAnswerInput,
  SubmitWagerInput,
} from '../../shared/api'
import type { Role } from '../../shared/enums'
import type { GameView, HostEvent, JoinResult, Leaderboard, MyTeam, PublicGameState, PublicSubmission, TeamSummary } from '../../shared/game'

export type HostOperation = 'host_next' | 'host_lock' | 'host_reveal' | 'host_open_question' | 'host_pause' | 'host_resume' | 'host_skip'

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

/** A request on venue Wi-Fi that hasn't answered by now isn't going to; say so instead of spinning. */
const TIMEOUT_MS = 8000

async function request<T>(path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', signal: AbortSignal.timeout(TIMEOUT_MS) }
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
  login: (passcode: string) => request<{ role: Role }>('/api/login', { passcode }),
  hostEvents: () => request<{ events: HostEvent[] }>('/api/host_events'),
  /** host_next, host_lock, host_reveal, host_open_question, host_pause, host_resume, host_skip. */
  hostAction: (operation: HostOperation, eventId: string) => request<PublicGameState>(`/api/${operation}`, { event_id: eventId }),
  override: (input: z.input<typeof HostOverrideInput>) => request<{ submission_id: string; adjustment: number }>('/api/host_override', input),
  adjustScore: (input: z.input<typeof HostAdjustScoreInput>) => request<{ team_id: string; score: number }>('/api/host_adjust_score', input),
  reviewTeamName: (input: z.input<typeof HostReviewTeamNameInput>) => request<TeamSummary>('/api/host_review_team_name', input),
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
