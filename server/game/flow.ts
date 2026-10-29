// The host's controls and the server's auto-lock (docs/SPEC.md section 5, Phases and Timing).
// Only the host moves the game forward; the one exception is auto-lock when time runs out.
// Every operation re-reads the phase first, so a host click and a timer firing together
// settle on whichever ran first, and the second becomes a no-op or a wrong_phase.
import { eq, inArray, max } from 'drizzle-orm'
import type { PublicGameState } from '../../shared/game'
import type { GamePhase } from '../../shared/enums'
import { eventQuestions, events, gameState, players, teamMembers } from '../db/schema'
import { broadcastState, fail, ok, type GameContext, type GameResult } from './context'
import { buildLivePayload, buildWagerPayload } from './live-payload'
import { loadEventPlan, nextStep } from './plan'
import { buildRevealPayload, skippedRevealPayload } from './reveal'
import { awardPrizes } from './rewards'
import { gradeQuestion, pushReviewQueue, scoreQuestion } from './scoring'
import { publicGameState } from './state'

type StatePatch = Partial<typeof gameState.$inferInsert>

function load(ctx: GameContext, eventId: string) {
  const row = ctx.db
    .select({ state: gameState, status: events.status, settings: events.settings })
    .from(gameState)
    .innerJoin(events, eq(events.id, gameState.eventId))
    .where(eq(gameState.eventId, eventId))
    .get()
  return row && row.status !== 'draft' ? row : null
}

function write(ctx: GameContext, eventId: string, patch: StatePatch): GameResult<PublicGameState> {
  ctx.db.update(gameState).set(patch).where(eq(gameState.eventId, eventId)).run()
  broadcastState(ctx, eventId)
  return ok(publicGameState(ctx.db, eventId)!)
}

/** Auto-lock waits for the grace window plus the most extra time any player in the event has. */
function lockDeadline(ctx: GameContext, eventId: string): number | null {
  const row = load(ctx, eventId)
  if (!row?.state.closesAt) return null
  const extra = ctx.db
    .select({ s: max(players.extraTimeS) })
    .from(teamMembers)
    .innerJoin(players, eq(players.id, teamMembers.playerId))
    .where(eq(teamMembers.eventId, eventId))
    .get()?.s
  return row.state.closesAt + row.settings.grace_ms + (extra ?? 0) * 1000
}

function armAutoLock(ctx: GameContext, eventId: string) {
  const questionId = load(ctx, eventId)?.state.currentEventQuestionId
  const deadline = lockDeadline(ctx, eventId)
  if (questionId && deadline !== null) ctx.timers.arm(eventId, deadline, () => autoLock(ctx, eventId, questionId))
}

function open(ctx: GameContext, eventId: string, eventQuestionId: string, final: boolean): GameResult<PublicGameState> {
  const question = ctx.db.select({ durationS: eventQuestions.durationS }).from(eventQuestions).where(eq(eventQuestions.id, eventQuestionId)).get()
  if (!question) return fail('not_found')
  const now = Date.now()
  ctx.db.update(events).set({ status: 'live' }).where(eq(events.id, eventId)).run()
  const result = write(ctx, eventId, {
    phase: final ? 'final_live' : 'live',
    currentEventQuestionId: eventQuestionId,
    opensAt: now,
    closesAt: now + question.durationS * 1000,
    pausedAt: null,
    pausedFromPhase: null,
    livePayload: buildLivePayload(ctx.db, eventQuestionId),
    revealPayload: null,
  })
  armAutoLock(ctx, eventId)
  return result
}

/** host_open_question: valid only where the next step is opening a question. */
export function openQuestion(ctx: GameContext, eventId: string): GameResult<PublicGameState> {
  const row = load(ctx, eventId)
  if (!row) return fail('not_found')
  const step = nextStep(loadEventPlan(ctx.db, eventId), row.state)
  if (step?.kind !== 'open') return fail('wrong_phase')
  return open(ctx, eventId, step.eventQuestionId, row.state.phase === 'final_wager')
}

/** host_next: the one obvious next action, per the section 5 diagram. */
export function next(ctx: GameContext, eventId: string): GameResult<PublicGameState> {
  const row = load(ctx, eventId)
  if (!row) return fail('not_found')
  const step = nextStep(loadEventPlan(ctx.db, eventId), row.state)
  if (!step) return fail('wrong_phase')
  switch (step.kind) {
    case 'open':
      return open(ctx, eventId, step.eventQuestionId, row.state.phase === 'final_wager')
    case 'round_break':
      // current_event_question_id stays on the round's last question so the next round is known.
      return write(ctx, eventId, { phase: 'round_break', livePayload: null, revealPayload: null })
    case 'final_wager':
      return write(ctx, eventId, {
        phase: 'final_wager',
        currentEventQuestionId: step.eventQuestionId,
        opensAt: null,
        closesAt: null,
        livePayload: buildWagerPayload(ctx.db, step.eventQuestionId),
        revealPayload: null,
      })
    case 'ended':
      ctx.timers.disarm(eventId)
      ctx.db.update(events).set({ status: 'ended' }).where(eq(events.id, eventId)).run()
      awardPrizes(ctx.db, eventId)
      return write(ctx, eventId, { phase: 'ended', livePayload: null, revealPayload: null, opensAt: null, closesAt: null })
  }
}

/**
 * host_lock, and the auto-lock timer: live → locked, final_live → final_locked. Grading happens
 * here so hosts can work the review queue before the reveal. A host who clicks Lock just after
 * the timer locked gets the locked state back, not an error, and nothing is graded twice.
 */
export function lock(ctx: GameContext, eventId: string): GameResult<PublicGameState> {
  const row = load(ctx, eventId)
  if (!row) return fail('not_found')
  if (row.state.phase === 'locked' || row.state.phase === 'final_locked') return ok(publicGameState(ctx.db, eventId)!)
  const to = row.state.phase === 'live' ? 'locked' : row.state.phase === 'final_live' ? 'final_locked' : null
  const questionId = row.state.currentEventQuestionId
  if (!to || !questionId) return fail('wrong_phase')
  ctx.timers.disarm(eventId)
  gradeQuestion(ctx, questionId)
  const result = write(ctx, eventId, { phase: to })
  pushReviewQueue(ctx, eventId)
  return result
}

/** host_reveal: locked → revealed, final_locked → final_revealed. Scores, then shows the answer and fun fact. */
export function reveal(ctx: GameContext, eventId: string): GameResult<PublicGameState> {
  const row = load(ctx, eventId)
  if (!row) return fail('not_found')
  const to = row.state.phase === 'locked' ? 'revealed' : row.state.phase === 'final_locked' ? 'final_revealed' : null
  const questionId = row.state.currentEventQuestionId
  if (!to || !questionId) return fail('wrong_phase')
  scoreQuestion(ctx, questionId)
  ctx.db.update(eventQuestions).set({ revealedAt: Date.now() }).where(eq(eventQuestions.id, questionId)).run()
  const result = write(ctx, eventId, { phase: to, revealPayload: buildRevealPayload(ctx.db, questionId) })
  ctx.realtime.toEvent(eventId, { type: 'scores' })
  return result
}

/** host_skip: abandon the open question without grading or scoring it. */
export function skip(ctx: GameContext, eventId: string): GameResult<PublicGameState> {
  const row = load(ctx, eventId)
  if (!row) return fail('not_found')
  const { phase, currentEventQuestionId: questionId } = row.state
  const to = phase === 'live' || phase === 'locked' ? 'revealed' : phase === 'final_live' || phase === 'final_locked' ? 'final_revealed' : null
  if (!to || !questionId) return fail('wrong_phase')
  ctx.timers.disarm(eventId)
  ctx.db.update(eventQuestions).set({ skippedAt: Date.now() }).where(eq(eventQuestions.id, questionId)).run()
  const result = write(ctx, eventId, { phase: to, revealPayload: skippedRevealPayload(questionId) })
  pushReviewQueue(ctx, eventId) // a skipped question's review answers leave the queue
  return result
}

/** host_pause: reachable from any phase but ended; answers are rejected while paused. */
export function pause(ctx: GameContext, eventId: string): GameResult<PublicGameState> {
  const row = load(ctx, eventId)
  if (!row) return fail('not_found')
  const { phase } = row.state
  if (phase === 'paused' || phase === 'ended') return fail('wrong_phase')
  ctx.timers.disarm(eventId)
  return write(ctx, eventId, { phase: 'paused', pausedFromPhase: phase as GamePhase, pausedAt: Date.now() })
}

/** host_resume: back to paused_from_phase; an open question's clock moves by the paused time. */
export function resume(ctx: GameContext, eventId: string): GameResult<PublicGameState> {
  const row = load(ctx, eventId)
  if (!row) return fail('not_found')
  const { phase, pausedFromPhase: from, pausedAt, opensAt, closesAt } = row.state
  if (phase !== 'paused' || !from || pausedAt === null) return fail('wrong_phase')
  const live = from === 'live' || from === 'final_live'
  const shift = Date.now() - pausedAt
  const result = write(ctx, eventId, {
    phase: from,
    pausedAt: null,
    pausedFromPhase: null,
    ...(live && opensAt !== null && closesAt !== null ? { opensAt: opensAt + shift, closesAt: closesAt + shift } : {}),
  })
  if (live) armAutoLock(ctx, eventId)
  return result
}

/** The timer's callback: locks only if this question is still the one open. */
export function autoLock(ctx: GameContext, eventId: string, eventQuestionId: string) {
  const row = load(ctx, eventId)
  if (!row) return
  const { phase, currentEventQuestionId } = row.state
  if ((phase === 'live' || phase === 'final_live') && currentEventQuestionId === eventQuestionId) lock(ctx, eventId)
}

/** On startup: re-arm every open question's timer, or lock it now if its deadline passed. */
export function resumeTimers(ctx: GameContext) {
  const open = ctx.db
    .select({ eventId: gameState.eventId })
    .from(gameState)
    .where(inArray(gameState.phase, ['live', 'final_live']))
    .all()
  for (const { eventId } of open) {
    const deadline = lockDeadline(ctx, eventId)
    if (deadline !== null && Date.now() >= deadline) lock(ctx, eventId)
    else armAutoLock(ctx, eventId)
  }
}
