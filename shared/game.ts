// Game data as the API and WebSocket send it. Shared so the client (Milestone 3) renders the
// same shapes the server builds. None of these types carry answer data before a reveal.
import type { Answer } from './api'
import type { AnimalAvatar } from './characters'
import type { AutoResult, EventStatus, GamePhase, MediaKind, NameStatus, NamingStatus, Phase, QuestionType, RoundFormat } from './enums'

export type PublicGameState = {
  phase: Phase
  current_event_question_id: string | null
  opens_at: number | null
  closes_at: number | null
  paused_at: number | null
  paused_from_phase: GamePhase | null
  live_payload: Record<string, unknown> | null
  reveal_payload: Record<string, unknown> | null
}

/** live_payload while a question is open: what players see. Never any answer data or the fun fact. */
export type LiveQuestion = {
  event_question_id: string
  round: { position: number; title: string; format: RoundFormat }
  number: number
  of: number
  type: QuestionType
  prompt: string
  /** Multiple choice only; true/false buttons are labelled by the client. */
  options: string[] | null
  media_kind: MediaKind
  media_url: string | null
  caption: string | null
  duration_s: number
  points: number
}

/** live_payload during final_wager: the wager is on, the question isn't shown yet. */
export type WagerPayload = { event_question_id: string; round: LiveQuestion['round']; wager: true }

/** reveal_payload after a reveal (or a skip). */
export type RevealPayload =
  | {
      event_question_id: string
      type: QuestionType
      correct_option: number | null
      correct_text: string | null
      numeric_answer: number | null
      fun_fact: string | null
    }
  | { event_question_id: string; skipped: true }

/** The caller's team's row for one question. `result` and `points` appear only after the reveal. */
export type PublicSubmission = {
  id: string
  event_question_id: string
  answer: Answer | null
  is_draft: boolean
  received_at: number
  wager: number | null
  result: AutoResult | null
  points: number | null
}

/** A borderline typed answer waiting for the host. Never includes the accepted answers. */
export type ReviewItem = {
  submission_id: string
  team_id: string
  team_name: string
  event_question_id: string
  answer: string
  similarity: number
}

/** A team as other players see it; the name is null when hidden (see GameView.teams). */
export type TeamSummary = { id: string; name: string | null; member_count: number }

export type MyTeam = {
  id: string
  name: string
  name_status: NameStatus
  captain_id: string | null
  score: number
  members: { id: string; nickname: string }[]
}

export type HostTeam = { id: string; name: string; name_status: NameStatus; member_count: number; score: number }

export type HostView = {
  connected_teams: number
  answered_teams: number
  review_queue: ReviewItem[]
  teams: HostTeam[]
}

/** The event settings a client needs to render the game (the rest stay on the server). */
export type PublicSettings = {
  max_team_size: number
  team_submissions: 'any_member' | 'captain_only'
}

/** get_state(event_id): everything a (re)connecting client renders from. */
export type GameView = {
  event: { id: string; join_code: string; status: EventStatus }
  state: PublicGameState
  submission: PublicSubmission | null
  my_team: MyTeam | null
  /** Every team in the event. A name is null when the viewer may not see it (rejected, or unapproved for host sessions). */
  teams: TeamSummary[]
  settings: PublicSettings
  host?: HostView
}

/** host_events: what a host picks from to run a night. */
export type HostEvent = { id: string; join_code: string; status: EventStatus; starts_at: number; theme: string; phase: Phase }

/** A prize a player won, with the code staff scan to redeem it. */
export type MyReward = { id: string; name: string; description: string | null; tier: number; code: string; status: 'issued' | 'redeemed' | 'expired'; issued_at: number; expires_at: number }

/** One row of the staff redemption list. */
export type StaffAward = { id: string; reward: string; code: string; status: 'issued' | 'redeemed' | 'expired'; nickname: string | null; issued_at: number; redeemed_at: number | null }

/** An Academy animal's public details. `name` is null until a winning team's name is approved. */
export type AnimalInfo = {
  id: string
  species: string
  scientific_name: string | null
  exhibit: string
  about: string | null
  image_url: string | null
  avatar: AnimalAvatar
  name: string | null
  named_at: number | null
  named_by_team: string | null
}

export type AnimalUpdate = { id: string; body: string; posted_at: number }

/** One row of the Animals tab. */
export type AnimalCard = AnimalInfo & { following: boolean; update_count: number; latest_update: AnimalUpdate | null }
export type AnimalDetail = AnimalCard & { updates: AnimalUpdate[] }

/** Tonight's prize list: the team finishing in `place` names this animal. */
export type NamingPrize = { place: number; animal: AnimalInfo }

/** A naming right the player's team won. */
export type MyNamingRight = {
  id: string
  place: number
  status: NamingStatus
  proposed_name: string | null
  team_id: string
  team_name: string
  animal: AnimalInfo
}

export type StaffAnimal = AnimalInfo & { update_count: number; follower_count: number; prize: { event_id: string; join_code: string; place: number } | null }

/** A proposed name waiting for staff (or one they turned down). */
export type StaffNamingRight = {
  id: string
  status: NamingStatus
  proposed_name: string | null
  proposed_at: number | null
  team_name: string
  join_code: string
  place: number
  animal: { id: string; species: string }
}

export type LeaderboardRow ={ team_id: string; name: string | null; points: number; rank: number }
export type Leaderboard = { teams: LeaderboardRow[] }

export type JoinResult = {
  event: {
    id: string
    join_code: string
    starts_at: number
    status: EventStatus
    theme: { name: string; slug: string; accent_token: string }
  }
  state: PublicGameState
  player: { id: string; nickname: string }
}

export const GAME_ERROR_CODES = [
  'not_found',
  'event_ended',
  'wrong_phase',
  'not_live',
  'too_late',
  'not_on_team',
  'captain_only',
  'join_first',
  'already_started',
  'team_full',
  'name_taken',
  'name_not_allowed',
  'nickname_not_allowed',
  'wrong_answer_type',
  'wager_too_high',
  'rate_limited',
  'already_redeemed',
  'code_expired',
  'already_named',
  'animal_taken',
  'not_pending',
] as const
export type GameErrorCode = (typeof GAME_ERROR_CODES)[number]
