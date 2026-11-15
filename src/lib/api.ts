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
  NewsletterOptinInput,
  SubmitAnswerInput,
  SubmitFeedbackInput,
  SubmitWagerInput,
  FollowAnimalInput,
  ProposeAnimalNameInput,
  StaffCreateAnimalInput,
  StaffPostAnimalUpdateInput,
  StaffReviewAnimalNameInput,
  StaffSetNamingPrizeInput,
} from '../../shared/api'
import type { Role } from '../../shared/enums'
import type {
  AnimalCard,
  AnimalDetail,
  AnimalUpdate,
  GameView,
  HostEvent,
  JoinResult,
  Leaderboard,
  MyNamingRight,
  MyReward,
  MyTeam,
  NamingPrize,
  PublicGameState,
  PublicSubmission,
  StaffAnimal,
  StaffAward,
  StaffNamingRight,
  TeamSummary,
} from '../../shared/game'
import type { EventSettings } from '../../shared/settings'

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
  myRewards: () => request<{ rewards: MyReward[] }>('/api/my_rewards'),
  submitFeedback: (input: z.input<typeof SubmitFeedbackInput>) => request<{ ok: true }>('/api/submit_feedback', input),
  newsletterOptin: (input: z.input<typeof NewsletterOptinInput>) => request<{ ok: true }>('/api/newsletter_optin', input),
  deleteMyAccount: () => request<{ ok: true }>('/api/delete_my_account', {}),
  redeemCode: (code: string) => request<{ code: string; reward: string; status: 'redeemed'; nickname: string | null }>('/api/redeem_code', { code }),
  staffAwards: () => request<{ awards: StaffAward[] }>('/api/staff_awards'),
  eventPrizes: (eventId: string) => request<{ prizes: NamingPrize[] }>(query('/api/event_prizes', eventId)),
  myNamingRights: () => request<{ rights: MyNamingRight[] }>('/api/my_naming_rights'),
  proposeAnimalName: (input: z.input<typeof ProposeAnimalNameInput>) => request<MyNamingRight>('/api/propose_animal_name', input),
  animals: () => request<{ animals: AnimalCard[] }>('/api/animals'),
  animal: (animalId: string) => request<AnimalDetail>(`/api/animal?animal_id=${encodeURIComponent(animalId)}`),
  followAnimal: (input: z.input<typeof FollowAnimalInput>) => request<{ following: boolean }>('/api/follow_animal', input),
  staffAnimals: () => request<{ animals: StaffAnimal[]; rights: StaffNamingRight[] }>('/api/staff_animals'),
  staffCreateAnimal: (input: z.input<typeof StaffCreateAnimalInput>) => request<StaffAnimal>('/api/staff_create_animal', input),
  staffSetNamingPrize: (input: z.input<typeof StaffSetNamingPrizeInput>) => request<{ prizes: NamingPrize[] }>('/api/staff_set_naming_prize', input),
  staffReviewAnimalName: (input: z.input<typeof StaffReviewAnimalNameInput>) => request<{ id: string; status: 'approved' | 'rejected' }>('/api/staff_review_animal_name', input),
  staffPostAnimalUpdate: (input: z.input<typeof StaffPostAnimalUpdateInput>) => request<AnimalUpdate>('/api/staff_post_animal_update', input),
  staffEventSettings: (eventId: string) => request<{ settings: EventSettings }>(query('/api/staff_event_settings', eventId)),
  staffUpdateSettings: (eventId: string, settings: Partial<EventSettings>) => request<{ settings: EventSettings }>('/api/staff_update_settings', { event_id: eventId, settings }),
  appConfig: () => request<{ public_url: string | null }>('/api/app_config'),
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
