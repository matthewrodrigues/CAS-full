// Game data as the API and WebSocket send it. Shared so the client (Milestone 3) renders the
// same shapes the server builds. None of these types carry answer data before a reveal.
import type { Answer } from './api'
import type { AutoResult, GamePhase, NameStatus, Phase } from './enums'

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

/** A team as other players see it: the name only once approved. */
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
