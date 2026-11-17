// The demo quickstart (docs/superpowers/specs/2026-11-17-demo-quickstart-design.md): autopilot
// and restart for the DEMO1 event only. Real events can never be restarted.
import { eq } from 'drizzle-orm'
import type { PublicGameState } from '../../shared/game'
import type { Db } from '../db/client'
import { animals, eventQuestions, events, feedback, gameState, rounds, teams } from '../db/schema'
import { DEMO_JOIN_CODE } from '../db/seed-demo'
import { broadcastState, fail, ok, type GameContext, type GameResult } from './context'
import { publicGameState } from './state'

type DemoCheck = { ok: true } | { ok: false; error: 'not_found' | 'not_demo' }

function checkDemo(db: Db, eventId: string): DemoCheck {
  const event = db.select({ joinCode: events.joinCode }).from(events).where(eq(events.id, eventId)).get()
  if (!event) return { ok: false, error: 'not_found' }
  return event.joinCode === DEMO_JOIN_CODE ? { ok: true } : { ok: false, error: 'not_demo' }
}

export const isDemoEvent = (db: Db, eventId: string) => checkDemo(db, eventId).ok

/** host_demo_autopilot: switch the autopilot on or off; an already-settled phase starts counting now. */
export function setAutopilot(ctx: GameContext, eventId: string, on: boolean): GameResult<PublicGameState> {
  const check = checkDemo(ctx.db, eventId)
  if (!check.ok) return fail(check.error)
  const state = publicGameState(ctx.db, eventId)
  if (!state) return fail('not_found')
  ctx.autopilot.set(eventId, on)
  ctx.autopilot.onPhase(eventId, state.phase)
  return ok(state)
}

/**
 * host_demo_restart: DEMO1 back to a fresh lobby. Teams go (and with them members, answers, scores
 * and naming rights), as does the night's feedback; animals the night named lose the name; round
 * hosts re-roll. Players keep their guest accounts so they can rejoin straight away.
 */
export function restartDemo(ctx: GameContext, eventId: string): GameResult<PublicGameState> {
  const check = checkDemo(ctx.db, eventId)
  if (!check.ok) return fail(check.error)
  ctx.timers.disarm(eventId)
  ctx.autopilot.cancel(eventId)
  ctx.db.transaction((tx) => {
    tx.delete(teams).where(eq(teams.eventId, eventId)).run()
    tx.delete(feedback).where(eq(feedback.eventId, eventId)).run()
    tx.update(animals).set({ name: null, namedAt: null, namedByTeam: null, namedEventId: null }).where(eq(animals.namedEventId, eventId)).run()
    tx.update(rounds).set({ host: null }).where(eq(rounds.eventId, eventId)).run()
    tx.update(eventQuestions).set({ revealedAt: null, skippedAt: null }).where(eq(eventQuestions.eventId, eventId)).run()
    tx.update(events).set({ status: 'ready' }).where(eq(events.id, eventId)).run()
    tx.update(gameState)
      .set({ phase: 'lobby', currentEventQuestionId: null, opensAt: null, closesAt: null, pausedAt: null, pausedFromPhase: null, livePayload: null, revealPayload: null })
      .where(eq(gameState.eventId, eventId))
      .run()
  })
  broadcastState(ctx, eventId)
  return ok(publicGameState(ctx.db, eventId)!)
}
