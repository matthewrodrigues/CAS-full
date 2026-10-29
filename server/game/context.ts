import { and, count, eq, isNotNull } from 'drizzle-orm'
import type { GameErrorCode } from '../../shared/game'
import type { createRateLimiter } from '../auth/rate-limit'
import type { Db } from '../db/client'
import { gameState, submissions } from '../db/schema'
import type { Realtime } from '../realtime/rooms'
import { publicGameState } from './state'
import type { Timers } from './timers'

/**
 * What every game operation works with. `writes` limits each player to 5 answer or wager
 * writes per second (docs/SPEC.md section 5, submit_answer).
 */
export type GameContext = { db: Db; realtime: Realtime; timers: Timers; writes: ReturnType<typeof createRateLimiter> }

export type GameResult<T> = { ok: true; value: T } | { ok: false; error: GameErrorCode }

export const ok = <T>(value: T): GameResult<T> => ({ ok: true, value })
export const fail = (error: GameErrorCode): { ok: false; error: GameErrorCode } => ({ ok: false, error })

/** Teams with a socket open, and teams with an answer (draft or submitted) to the current question. */
export function hostCounts(ctx: GameContext, eventId: string) {
  const current = ctx.db.select({ id: gameState.currentEventQuestionId }).from(gameState).where(eq(gameState.eventId, eventId)).get()
  const answered = current?.id
    ? (ctx.db
        .select({ n: count() })
        .from(submissions)
        .where(and(eq(submissions.eventQuestionId, current.id), isNotNull(submissions.answer)))
        .get()?.n ?? 0)
    : 0
  return { connected_teams: ctx.realtime.connectedTeams(eventId), answered_teams: answered }
}

/** The host counts, to the host room. */
export function pushHostStats(ctx: GameContext, eventId: string) {
  ctx.realtime.toHosts(eventId, { type: 'host_stats', ...hostCounts(ctx, eventId) })
}

/** The new game_state to everyone in the event, after every phase change. */
export function broadcastState(ctx: GameContext, eventId: string) {
  const state = publicGameState(ctx.db, eventId)
  if (state) ctx.realtime.toEvent(eventId, { type: 'state', state })
  pushHostStats(ctx, eventId)
}
