// Allowed values for every enum column (docs/SPEC.md sections 4 and 5).
// The schema turns each list into a CHECK constraint; zod schemas reuse the same lists.

export const EVENT_STATUSES = ['draft', 'ready', 'live', 'ended'] as const
export const ROUND_FORMATS = ['standard', 'picture', 'sound', 'wager'] as const
export const QUESTION_TYPES = ['mc', 'typed', 'true_false', 'closest_number'] as const
export const MEDIA_KINDS = ['none', 'image', 'audio'] as const

/** Game phases from the section 5 state diagram. `paused` returns to `paused_from_phase`. */
export const GAME_PHASES = [
  'lobby',
  'live',
  'locked',
  'revealed',
  'round_break',
  'final_wager',
  'final_live',
  'final_locked',
  'final_revealed',
  'ended',
] as const
export const PHASES = [...GAME_PHASES, 'paused'] as const

export const DISPLAY_MODES = ['nickname', 'first_name', 'initials'] as const
export const NAME_STATUSES = ['pending', 'approved', 'rejected'] as const
export const AUTO_RESULTS = ['correct', 'incorrect', 'review'] as const
export const OVERRIDE_RESULTS = ['correct', 'incorrect'] as const
export const SCORE_REASONS = ['correct', 'speed', 'wager', 'adjust'] as const
export const AWARD_STATUSES = ['issued', 'redeemed', 'expired'] as const
export const ROLES = ['player', 'host', 'staff'] as const

export type EventStatus = (typeof EVENT_STATUSES)[number]
export type RoundFormat = (typeof ROUND_FORMATS)[number]
export type QuestionType = (typeof QUESTION_TYPES)[number]
export type MediaKind = (typeof MEDIA_KINDS)[number]
export type GamePhase = (typeof GAME_PHASES)[number]
export type Phase = (typeof PHASES)[number]
export type DisplayMode = (typeof DISPLAY_MODES)[number]
export type NameStatus = (typeof NAME_STATUSES)[number]
export type AutoResult = (typeof AUTO_RESULTS)[number]
export type OverrideResult = (typeof OVERRIDE_RESULTS)[number]
export type ScoreReason = (typeof SCORE_REASONS)[number]
export type AwardStatus = (typeof AWARD_STATUSES)[number]
export type Role = (typeof ROLES)[number]
