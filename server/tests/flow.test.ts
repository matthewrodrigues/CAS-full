import { randomUUID } from 'node:crypto'
import { asc, eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Db } from '../db/client'
import * as t from '../db/schema'
import type { GameContext } from '../game/context'
import { createGame } from '../game/engine'
import { autoLock, lock, next, openQuestion, pause, resume, reveal, skip } from '../game/flow'
import { createRealtime } from '../realtime/rooms'
import { advanceUntil, listen, makeGame, state, teamWithPlayer } from './game-setup'

let db: Db
let ctx: GameContext
let eventId: string
let cleanup: () => void
const T0 = Date.UTC(2026, 9, 29, 2, 0)

beforeEach(() => {
  vi.useFakeTimers({ now: T0 })
  ;({ db, ctx, eventId, cleanup } = makeGame())
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const questionIds = () =>
  db
    .select({ id: t.eventQuestions.id, round: t.rounds.position })
    .from(t.eventQuestions)
    .innerJoin(t.rounds, eq(t.rounds.id, t.eventQuestions.roundId))
    .where(eq(t.eventQuestions.eventId, eventId))
    .orderBy(asc(t.rounds.position), asc(t.eventQuestions.position))
    .all()
const eventStatus = () => db.select({ status: t.events.status }).from(t.events).where(eq(t.events.id, eventId)).get()!.status

describe('opening questions', () => {
  it('opens the first question from the lobby', () => {
    const messages = listen(ctx, { eventId })
    const result = next(ctx, eventId)

    expect(result.ok).toBe(true)
    const s = state(db, eventId)
    expect(s).toMatchObject({
      phase: 'live',
      currentEventQuestionId: questionIds()[0].id,
      opensAt: T0,
      closesAt: T0 + 20_000,
      revealPayload: null,
    })
    expect(s.livePayload).toMatchObject({ type: 'mc', number: 1 })
    expect(eventStatus()).toBe('live')
    expect(messages.filter((m) => m.type === 'state')).toHaveLength(1)
  })

  it('accepts host_open_question only where opening a question is the next step', () => {
    expect(openQuestion(ctx, eventId).ok).toBe(true)
    expect(openQuestion(ctx, eventId)).toEqual({ ok: false, error: 'wrong_phase' })
    lock(ctx, eventId)
    reveal(ctx, eventId)
    expect(openQuestion(ctx, eventId).ok).toBe(true)
    expect(state(db, eventId).currentEventQuestionId).toBe(questionIds()[1].id)

    for (let i = 0; i < 8; i++) {
      advanceUntil(ctx, eventId, 'revealed')
      next(ctx, eventId)
    }
    advanceUntil(ctx, eventId, 'revealed')
    expect(state(db, eventId).currentEventQuestionId).toBe(questionIds()[9].id)
    expect(openQuestion(ctx, eventId)).toEqual({ ok: false, error: 'wrong_phase' })
    expect(next(ctx, eventId).ok).toBe(true)
    expect(state(db, eventId).phase).toBe('round_break')
  })

  it('answers an unknown event with not_found', () => {
    expect(next(ctx, randomUUID())).toEqual({ ok: false, error: 'not_found' })
  })
})

describe('auto-lock', () => {
  it('fires at closes_at + grace + the largest extra time among the players', () => {
    teamWithPlayer(ctx, eventId, 'Slow Readers', 5)
    teamWithPlayer(ctx, eventId, 'Speedy', 0)
    next(ctx, eventId)

    vi.advanceTimersByTime(20_000 + 1200 + 5000 - 1)
    expect(state(db, eventId).phase).toBe('live')
    vi.advanceTimersByTime(1)
    expect(state(db, eventId).phase).toBe('locked')
  })

  it('is disarmed by a manual lock, and a late callback does nothing', () => {
    next(ctx, eventId)
    const questionId = state(db, eventId).currentEventQuestionId!
    expect(lock(ctx, eventId).ok).toBe(true)
    const messages = listen(ctx, { eventId })

    autoLock(ctx, eventId, questionId)
    vi.advanceTimersByTime(60_000)

    expect(state(db, eventId).phase).toBe('locked')
    expect(messages).toEqual([])
  })

  it('re-arms after a restart, or locks at once if the deadline has passed', () => {
    next(ctx, eventId)
    ctx.timers.disarmAll() // the old process is gone
    const restarted = createGame({ db, realtime: createRealtime() })
    restarted.resumeTimers()
    vi.advanceTimersByTime(20_000 + 1200 - 1)
    expect(state(db, eventId).phase).toBe('live')
    vi.advanceTimersByTime(1)
    expect(state(db, eventId).phase).toBe('locked')
    restarted.stop()

    advanceUntil(ctx, eventId, 'revealed')
    next(ctx, eventId) // question 2 is typed: 30 s plus 1.2 s grace
    ctx.timers.disarmAll()
    vi.advanceTimersByTime(60_000) // down for longer than the question and its grace
    expect(state(db, eventId).phase).toBe('live')
    const late = createGame({ db, realtime: createRealtime() })
    late.resumeTimers()
    expect(state(db, eventId).phase).toBe('locked')
    late.stop()
  })
})

describe('a host lock racing the auto-lock', () => {
  it('is quietly accepted when the timer locked first: no error, no second grading pass, no broadcast', () => {
    next(ctx, eventId)
    vi.advanceTimersByTime(20_000 + 1200)
    expect(state(db, eventId).phase).toBe('locked')
    const messages = listen(ctx, { eventId })

    expect(lock(ctx, eventId)).toMatchObject({ ok: true, value: { phase: 'locked' } })
    expect(messages).toEqual([])
  })
})

describe('pause and resume', () => {
  it('never auto-locks while paused', () => {
    next(ctx, eventId)
    pause(ctx, eventId)
    vi.advanceTimersByTime(120_000)
    expect(state(db, eventId).phase).toBe('paused')
  })

  it('returns to the paused phase and shifts the question clock', () => {
    next(ctx, eventId)
    vi.advanceTimersByTime(5000)
    expect(pause(ctx, eventId).ok).toBe(true)
    expect(state(db, eventId)).toMatchObject({ phase: 'paused', pausedFromPhase: 'live', pausedAt: T0 + 5000 })

    vi.advanceTimersByTime(7000)
    resume(ctx, eventId)
    const s = state(db, eventId)
    expect(s).toMatchObject({ phase: 'live', pausedAt: null, pausedFromPhase: null, opensAt: T0 + 7000, closesAt: T0 + 27_000 })

    vi.advanceTimersByTime(27_000 + 1200 - 12_000 - 1)
    expect(state(db, eventId).phase).toBe('live')
    vi.advanceTimersByTime(1)
    expect(state(db, eventId).phase).toBe('locked')
  })

  it('returns to a round break', () => {
    advanceUntil(ctx, eventId, 'round_break')
    pause(ctx, eventId)
    resume(ctx, eventId)
    expect(state(db, eventId).phase).toBe('round_break')
  })

  it('rejects resume when not paused and pause when ended', () => {
    expect(resume(ctx, eventId)).toEqual({ ok: false, error: 'wrong_phase' })
    advanceUntil(ctx, eventId, 'ended')
    expect(pause(ctx, eventId)).toEqual({ ok: false, error: 'wrong_phase' })
  })
})

describe('skip', () => {
  it('reveals nothing, marks the question skipped, and moves on', () => {
    next(ctx, eventId)
    const skipped = state(db, eventId).currentEventQuestionId!
    expect(skip(ctx, eventId).ok).toBe(true)
    expect(state(db, eventId)).toMatchObject({ phase: 'revealed', revealPayload: { event_question_id: skipped, skipped: true } })
    expect(db.select().from(t.eventQuestions).where(eq(t.eventQuestions.id, skipped)).get()!.skippedAt).toBe(T0)

    next(ctx, eventId)
    expect(state(db, eventId).currentEventQuestionId).toBe(questionIds()[1].id)
    vi.advanceTimersByTime(30_000 + 1200) // question 2 is typed: 30 s plus grace
    expect(state(db, eventId).phase).toBe('locked')
  })
})

describe('the final wager', () => {
  it('runs round_break → final_wager → final_live → final_locked → final_revealed → ended', () => {
    advanceUntil(ctx, eventId, 'final_wager')
    const wagerQuestion = questionIds().find((q) => q.round === 4)!.id
    expect(state(db, eventId)).toMatchObject({
      currentEventQuestionId: wagerQuestion,
      opensAt: null,
      closesAt: null,
      livePayload: { wager: true },
    })

    expect(next(ctx, eventId).ok).toBe(true)
    expect(state(db, eventId)).toMatchObject({ phase: 'final_live', closesAt: Date.now() + 45_000 })
    expect(state(db, eventId).livePayload).toHaveProperty('prompt')
    expect(lock(ctx, eventId).ok).toBe(true)
    expect(state(db, eventId).phase).toBe('final_locked')
    expect(reveal(ctx, eventId).ok).toBe(true)
    expect(state(db, eventId)).toMatchObject({ phase: 'final_revealed', revealPayload: { event_question_id: wagerQuestion } })
    expect(next(ctx, eventId).ok).toBe(true)
    expect(state(db, eventId).phase).toBe('ended')
    expect(eventStatus()).toBe('ended')
    expect(next(ctx, eventId)).toEqual({ ok: false, error: 'wrong_phase' })
  })
})

describe('broadcasts', () => {
  it('sends one state message to the event per transition, and host stats to hosts', () => {
    const event = listen(ctx, { eventId })
    const hosts = listen(ctx, { eventId, isHost: true })
    next(ctx, eventId)
    lock(ctx, eventId)
    reveal(ctx, eventId)

    expect(event.filter((m) => m.type === 'state').map((m) => m.type === 'state' && m.state.phase)).toEqual(['live', 'locked', 'revealed'])
    expect(hosts).toContainEqual({ type: 'host_stats', connected_teams: 0, answered_teams: 0 })
    expect(event.some((m) => m.type === 'host_stats')).toBe(false)
  })
})
