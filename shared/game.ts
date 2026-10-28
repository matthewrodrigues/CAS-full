// Game data as the API and WebSocket send it. Shared so the client (Milestone 3) renders the
// same shapes the server builds. None of these types carry answer data before a reveal.
import type { Answer } from './api'
import type { AutoResult, EventStatus, GamePhase, NameStatus, Phase } from './enums'

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
  live_background: 'cream' | 'violet'
}

/** get_state(event_id): everything a (re)connecting client renders from. */
export type GameView = {
  state: PublicGameState
  submission: PublicSubmission | null
  my_team: MyTeam | null
  /** Every team in the event. A name is null when the viewer may not see it (rejected, or unapproved for host sessions). */
  teams: TeamSummary[]
  settings: PublicSettings
  host?: HostView
}

export type LeaderboardRow = { team_id: string; name: string | null; points: number; rank: number }
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
] as const
export type GameErrorCode = (typeof GAME_ERROR_CODES)[number]
