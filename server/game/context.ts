import { and, count, eq, isNotNull } from 'drizzle-orm'
import type { GameErrorCode } from '../../shared/game'
import type { Db } from '../db/client'
import { gameState, submissions } from '../db/schema'
import type { Realtime } from '../realtime/rooms'
import { publicGameState } from './state'
import type { Timers } from './timers'

/** What every game operation works with. */
export type GameContext = { db: Db; realtime: Realtime; timers: Timers }

export type GameResult<T> = { ok: true; value: T } | { ok: false; error: GameErrorCode }

export const ok = <T>(value: T): GameResult<T> => ({ ok: true, value })
export const fail = (error: GameErrorCode): { ok: false; error: GameErrorCode } => ({ ok: false, error })

/** Connected and answered team counts for the current question, to the host room. */
export function pushHostStats(ctx: GameContext, eventId: string) {
  const current = ctx.db.select({ id: gameState.currentEventQuestionId }).from(gameState).where(eq(gameState.eventId, eventId)).get()
  const answered = current?.id
    ? (ctx.db
        .select({ n: count() })
        .from(submissions)
        .where(and(eq(submissions.eventQuestionId, current.id), isNotNull(submissions.answer)))
        .get()?.n ?? 0)
    : 0
  ctx.realtime.toHosts(eventId, { type: 'host_stats', connected_teams: ctx.realtime.connectedTeams(eventId), answered_teams: answered })
}

/** The new game_state to everyone in the event, after every phase change. */
export function broadcastState(ctx: GameContext, eventId: string) {
  const state = publicGameState(ctx.db, eventId)
  if (state) ctx.realtime.toEvent(eventId, { type: 'state', state })
  pushHostStats(ctx, eventId)
}
