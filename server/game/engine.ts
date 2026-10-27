// The game as the rest of the server sees it: every operation bound to one context, so route
// handlers call game.next(eventId) and never touch the database, rooms or timers themselves.
import { createRateLimiter } from '../auth/rate-limit'
import type { Db } from '../db/client'
import type { Realtime } from '../realtime/rooms'
import type { GameContext } from './context'
import * as flow from './flow'
import * as scoring from './scoring'
import * as submissions from './submissions'
import * as teams from './teams'
import { createTimers } from './timers'

export function createGame({ db, realtime }: { db: Db; realtime: Realtime }) {
  const ctx: GameContext = { db, realtime, timers: createTimers(), writes: createRateLimiter({ max: 5, windowMs: 1000 }) }
  return {
    ctx,
    openQuestion: (eventId: string) => flow.openQuestion(ctx, eventId),
    next: (eventId: string) => flow.next(ctx, eventId),
    lock: (eventId: string) => flow.lock(ctx, eventId),
    reveal: (eventId: string) => flow.reveal(ctx, eventId),
    skip: (eventId: string) => flow.skip(ctx, eventId),
    pause: (eventId: string) => flow.pause(ctx, eventId),
    resume: (eventId: string) => flow.resume(ctx, eventId),
    createTeam: (input: Parameters<typeof teams.createTeam>[1]) => teams.createTeam(ctx, input),
    joinTeam: (input: Parameters<typeof teams.joinTeam>[1]) => teams.joinTeam(ctx, input),
    reviewTeamName: (input: Parameters<typeof teams.reviewTeamName>[1]) => teams.reviewTeamName(ctx, input),
    submitAnswer: (input: Parameters<typeof submissions.submitAnswer>[1]) => submissions.submitAnswer(ctx, input),
    submitWager: (input: Parameters<typeof submissions.submitWager>[1]) => submissions.submitWager(ctx, input),
    override: (input: Parameters<typeof scoring.override>[1]) => scoring.override(ctx, input),
    adjustScore: (input: Parameters<typeof scoring.adjustScore>[1]) => scoring.adjustScore(ctx, input),
    reviewQueue: (eventId: string) => scoring.reviewQueue(ctx, eventId),
    /** On startup: re-arm open questions' auto-lock, or lock those whose deadline passed. */
    resumeTimers: () => flow.resumeTimers(ctx),
    /** On shutdown (and after each test): cancel every pending auto-lock. */
    stop: () => ctx.timers.disarmAll(),
  }
}

export type Game = ReturnType<typeof createGame>
