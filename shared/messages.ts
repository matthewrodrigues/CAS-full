import { z } from 'zod'
import type { Cast, PublicGameState, PublicSubmission, ReviewItem, RoundsView } from './game'

/**
 * Server → client WebSocket messages (docs/SPEC.md section 5). Clients must not rely on getting
 * every one: on connect, reconnect, focus and resume they call get_state and render from it.
 * `teams` and `scores` are hints to refetch. `state` carries the cast and rounds with the game
 * state (both public and the same for every viewer), so a round change never shows a stale host.
 */
export type ServerMessage =
  | { type: 'state'; state: PublicGameState; cast: Cast; rounds: RoundsView }
  | { type: 'team_submission'; submission: PublicSubmission }
  | { type: 'teams' }
  | { type: 'scores' }
  | { type: 'host_stats'; connected_teams: number; answered_teams: number }
  | { type: 'review_queue'; items: ReviewItem[] }
  | { type: 'pong' }

/** The only message a client may send. All game writes go over HTTP. */
export const ClientMessage = z.strictObject({ type: z.literal('ping') })
