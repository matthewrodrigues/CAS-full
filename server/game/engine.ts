// The game as the rest of the server sees it: every operation bound to one context, so route
// handlers call game.next(eventId) and never touch the database, rooms or timers themselves.
import { createRateLimiter } from '../auth/rate-limit'
import type { Db } from '../db/client'
import type { Realtime } from '../realtime/rooms'
import { pushHostStats, type GameContext } from './context'
import * as demo from './demo'
import * as flow from './flow'
import * as hosts from './hosts'
import * as scoring from './scoring'
import * as season from './season'
import * as state from './state'
import * as submissions from './submissions'
import * as teams from './teams'
import { createTimers } from './timers'
import { createAutopilot } from './autopilot'

export function createGame({ db, realtime, autopilotDelayMs }: { db: Db; realtime: Realtime; autopilotDelayMs?: number }) {
  // A step that lost a race with a manual press fails with wrong_phase, which is fine to ignore.
  const autopilot = createAutopilot((eventId, op) => void (op === 'reveal' ? flow.reveal(ctx, eventId) : flow.next(ctx, eventId)), autopilotDelayMs)
  const ctx: GameContext = { db, realtime, timers: createTimers(), writes: createRateLimiter({ max: 5, windowMs: 1000 }), autopilot }
  // Hosts see connected-team counts change as sockets come and go.
  realtime.onPresence((eventId) => pushHostStats(ctx, eventId))
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
    getState: (input: Parameters<typeof state.getState>[1]) => state.getState(ctx, input),
    hostEvents: () => state.hostEvents(db),
    roundHosts: (eventId: string) => hosts.roundHosts(db, eventId),
    setRoundHost: (input: Parameters<typeof hosts.setRoundHost>[1]) => hosts.setRoundHost(ctx, input),
    leaderboard: (input: Parameters<typeof state.leaderboard>[1]) => state.leaderboard(db, input),
    seasonLeaderboard: (input: Parameters<typeof season.seasonBoard>[1]) => season.seasonBoard(db, input),
    /** On startup: re-arm open questions' auto-lock, or lock those whose deadline passed. */
    resumeTimers: () => flow.resumeTimers(ctx),
    /** On shutdown (and after each test): cancel every pending auto-lock. */
    setAutopilot: (eventId: string, on: boolean) => demo.setAutopilot(ctx, eventId, on),
    stop: () => {
      ctx.timers.disarmAll()
      ctx.autopilot.stop()
    },
  }
}

export type Game = ReturnType<typeof createGame>
