import { z } from 'zod'
import type { PublicGameState, PublicSubmission, ReviewItem } from './game'

/**
 * Server → client WebSocket messages (docs/SPEC.md section 5). Clients must not rely on getting
 * every one: on connect, reconnect, focus and resume they call get_state and render from it.
 * `teams` and `scores` are hints to refetch.
 */
export type ServerMessage =
  | { type: 'state'; state: PublicGameState }
  | { type: 'team_submission'; submission: PublicSubmission }
  | { type: 'teams' }
  | { type: 'scores' }
  | { type: 'host_stats'; connected_teams: number; answered_teams: number }
  | { type: 'review_queue'; items: ReviewItem[] }
  | { type: 'pong' }

/** The only message a client may send. All game writes go over HTTP. */
export const ClientMessage = z.strictObject({ type: z.literal('ping') })
