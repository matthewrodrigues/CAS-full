import { randomUUID } from 'node:crypto'
import { and, asc, eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Answer } from '../../shared/api'
import type { Db } from '../db/client'
import * as t from '../db/schema'
import type { GameContext } from '../game/context'
import { lock, next, pause, resume } from '../game/flow'
import { submitAnswer, submitWager } from '../game/submissions'
import { joinTeam } from '../game/teams'
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

/** Event questions in play order: round 1 is mc, typed, true_false, closest_number, ... */
const questionIds = () =>
  db
    .select({ id: t.eventQuestions.id })
    .from(t.eventQuestions)
    .innerJoin(t.rounds, eq(t.rounds.id, t.eventQuestions.roundId))
    .where(eq(t.eventQuestions.eventId, eventId))
    .orderBy(asc(t.rounds.position), asc(t.eventQuestions.position))
    .all()
    .map((q) => q.id)
const current = () => state(db, eventId).currentEventQuestionId!
const rowFor = (teamId: string, eventQuestionId = current()) =>
  db
    .select()
    .from(t.submissions)
    .where(and(eq(t.submissions.teamId, teamId), eq(t.submissions.eventQuestionId, eventQuestionId)))
    .all()
const submit = (playerId: string, answer: Answer, isDraft = false, eventQuestionId = current()) =>
  submitAnswer(ctx, { eventQuestionId, playerId, answer, isDraft })
const setSettings = (patch: Record<string, unknown>) => {
  const event = db.select({ settings: t.events.settings }).from(t.events).where(eq(t.events.id, eventId)).get()!
  db.update(t.events)
    .set({ settings: { ...event.settings, ...patch } })
    .where(eq(t.events.id, eventId))
    .run()
}

describe('the deadline', () => {
  it('accepts up to closes_at + grace, and longer for a player with extra time', () => {
    const a = teamWithPlayer(ctx, eventId, 'On Time')
    const b = teamWithPlayer(ctx, eventId, 'One Late')
    const slow = teamWithPlayer(ctx, eventId, 'Extra Time', 5)
    next(ctx, eventId) // question 1, mc, closes at T0 + 20 s

    vi.advanceTimersByTime(20_000 + 1200)
    expect(submit(a.playerId, { option: 0 }).ok).toBe(true)
    vi.advanceTimersByTime(1)
    expect(submit(b.playerId, { option: 0 })).toEqual({ ok: false, error: 'too_late' })
    vi.advanceTimersByTime(5000 - 2) // 1 ms before the auto-lock, which waits for the 5 s player
    expect(submit(slow.playerId, { option: 0 }).ok).toBe(true)
    vi.advanceTimersByTime(1)
    expect(state(db, eventId).phase).toBe('locked')
    expect(submit(slow.playerId, { option: 1 })).toEqual({ ok: false, error: 'not_live' })
  })

  it('honors the rest of the grace window after a pause inside it', () => {
    const a = teamWithPlayer(ctx, eventId, 'Pausers')
    next(ctx, eventId)
    vi.advanceTimersByTime(20_500) // inside the grace window
    pause(ctx, eventId)
    expect(submit(a.playerId, { option: 0 })).toEqual({ ok: false, error: 'not_live' })
    vi.advanceTimersByTime(10_000)
    resume(ctx, eventId) // closes_at moves to T0 + 30 s

    vi.advanceTimersByTime(600) // T0 + 31.1 s, before the shifted deadline of T0 + 31.2 s
    expect(submit(a.playerId, { option: 2 }).ok).toBe(true)
    vi.advanceTimersByTime(100)
    expect(state(db, eventId).phase).toBe('locked')
  })
})

describe('drafts and submits', () => {
  it('keeps one row per team, holding the latest draft', () => {
    const a = teamWithPlayer(ctx, eventId, 'Drafters')
    advanceUntil(ctx, eventId, 'revealed')
    next(ctx, eventId) // question 2, typed
    submit(a.playerId, { text: 'octo' }, true)
    vi.advanceTimersByTime(500)
    const result = submit(a.playerId, { text: 'octopus' }, true)

    expect(result).toMatchObject({ ok: true, value: { answer: { text: 'octopus' }, is_draft: true, received_at: T0 + 500 } })
    expect(rowFor(a.teamId)).toHaveLength(1)
    expect(rowFor(a.teamId)[0]).toMatchObject({ answer: { text: 'octopus' }, isDraft: true, updatedBy: a.playerId })
  })

  it('never lets a draft overwrite a submitted answer, and the last submit wins', () => {
    const a = teamWithPlayer(ctx, eventId, 'Submitters')
    const teammate = randomUUID()
    db.insert(t.players).values({ id: teammate, nickname: 'Teammate' }).run()
    joinTeam(ctx, { teamId: a.teamId, playerId: teammate })
    advanceUntil(ctx, eventId, 'revealed')
    next(ctx, eventId)

    submit(a.playerId, { text: 'squid' })
    const draft = submit(teammate, { text: 'cuttlefish' }, true)
    expect(draft).toMatchObject({ ok: true, value: { answer: { text: 'squid' }, is_draft: false } })
    submit(teammate, { text: 'octopus' })
    expect(rowFor(a.teamId)).toEqual([expect.objectContaining({ answer: { text: 'octopus' }, isDraft: false, updatedBy: teammate })])
  })
})

describe('who may answer', () => {
  it('rejects a question that is not the open one, and any answer while paused', () => {
    const a = teamWithPlayer(ctx, eventId, 'Early Birds')
    expect(submit(a.playerId, { option: 0 }, false, questionIds()[0])).toEqual({ ok: false, error: 'not_live' })
    next(ctx, eventId)
    expect(submit(a.playerId, { text: 'x' }, false, questionIds()[1])).toEqual({ ok: false, error: 'not_live' })
    pause(ctx, eventId)
    expect(submit(a.playerId, { option: 0 })).toEqual({ ok: false, error: 'not_live' })
  })

  it('needs the caller on a team in the event', () => {
    next(ctx, eventId)
    const loner = randomUUID()
    db.insert(t.players).values({ id: loner, nickname: 'Loner' }).run()
    expect(submit(loner, { option: 0 })).toEqual({ ok: false, error: 'not_on_team' })
    expect(submitAnswer(ctx, { eventQuestionId: randomUUID(), playerId: loner, answer: { option: 0 }, isDraft: false })).toEqual({
      ok: false,
      error: 'not_found',
    })
  })

  it('lets only the captain answer when team_submissions is captain_only', () => {
    setSettings({ team_submissions: 'captain_only' })
    const a = teamWithPlayer(ctx, eventId, 'Captained')
    const member = randomUUID()
    db.insert(t.players).values({ id: member, nickname: 'Crew' }).run()
    joinTeam(ctx, { teamId: a.teamId, playerId: member })
    next(ctx, eventId)

    expect(submit(member, { option: 1 })).toEqual({ ok: false, error: 'captain_only' })
    expect(submit(a.playerId, { option: 1 }).ok).toBe(true)
  })

  it('rejects an answer of the wrong shape for the question type', () => {
    const a = teamWithPlayer(ctx, eventId, 'Shapes')
    next(ctx, eventId) // mc with 4 options
    expect(submit(a.playerId, { text: 'Challenger Deep' })).toEqual({ ok: false, error: 'wrong_answer_type' })
    expect(submit(a.playerId, { option: 4 })).toEqual({ ok: false, error: 'wrong_answer_type' })
    expect(submit(a.playerId, { option: 3 }).ok).toBe(true)

    // Each question below starts a second later, so the 5-per-second write limit never interferes.
    const nextQuestion = () => {
      advanceUntil(ctx, eventId, 'revealed')
      vi.advanceTimersByTime(1000)
      next(ctx, eventId)
    }
    nextQuestion() // typed
    nextQuestion() // true_false
    expect(submit(a.playerId, { option: 2 })).toEqual({ ok: false, error: 'wrong_answer_type' })
    expect(submit(a.playerId, { option: 1 }).ok).toBe(true)
    nextQuestion() // closest_number
    expect(submit(a.playerId, { option: 1 })).toEqual({ ok: false, error: 'wrong_answer_type' })
    expect(submit(a.playerId, { number: 1955 }).ok).toBe(true)
  })

  it('allows 5 writes per player per second, shared by answers and wagers', () => {
    const a = teamWithPlayer(ctx, eventId, 'Spammers')
    next(ctx, eventId)
    for (let i = 0; i < 5; i++) expect(submit(a.playerId, { option: i % 4 }, true).ok).toBe(true)
    expect(submit(a.playerId, { option: 0 })).toEqual({ ok: false, error: 'rate_limited' })
    expect(submitWager(ctx, { eventQuestionId: current(), playerId: a.playerId, amount: 0 })).toEqual({ ok: false, error: 'rate_limited' })
    vi.advanceTimersByTime(1000)
    expect(submit(a.playerId, { option: 0 }).ok).toBe(true)
  })
})

describe('wagers', () => {
  const giveScore = (teamId: string, points: number) =>
    db.insert(t.scoreEvents).values({ teamId, points, reason: 'adjust', note: 'test setup' }).run()

  it('are taken only in final_wager, up to the team score, and the last one wins', () => {
    const a = teamWithPlayer(ctx, eventId, 'Bettors')
    giveScore(a.teamId, 60)
    next(ctx, eventId)
    expect(submitWager(ctx, { eventQuestionId: current(), playerId: a.playerId, amount: 10 })).toEqual({ ok: false, error: 'wrong_phase' })

    advanceUntil(ctx, eventId, 'final_wager')
    const wagerQuestion = current()
    const wager = (amount: number) => submitWager(ctx, { eventQuestionId: wagerQuestion, playerId: a.playerId, amount })
    expect(wager(61)).toEqual({ ok: false, error: 'wager_too_high' })
    vi.advanceTimersByTime(1000)
    expect(wager(60).ok).toBe(true)
    expect(wager(40)).toMatchObject({ ok: true, value: { wager: 40, answer: null, is_draft: true } })
    expect(rowFor(a.teamId, wagerQuestion)).toEqual([expect.objectContaining({ wager: 40, answer: null, isDraft: true })])

    next(ctx, eventId) // final_live
    expect(wager(10)).toEqual({ ok: false, error: 'wrong_phase' })
    expect(submit(a.playerId, { text: 'bathypelagic' }).ok).toBe(true)
    expect(rowFor(a.teamId, wagerQuestion)).toEqual([expect.objectContaining({ wager: 40, answer: { text: 'bathypelagic' }, isDraft: false })])
    lock(ctx, eventId)
  })

  it('let a team with a negative score wager 0, and nothing more', () => {
    const a = teamWithPlayer(ctx, eventId, 'In The Red')
    giveScore(a.teamId, -5)
    advanceUntil(ctx, eventId, 'final_wager')
    expect(submitWager(ctx, { eventQuestionId: current(), playerId: a.playerId, amount: 0 }).ok).toBe(true)
    expect(submitWager(ctx, { eventQuestionId: current(), playerId: a.playerId, amount: 1 })).toEqual({ ok: false, error: 'wager_too_high' })
  })

  it('are refused for a question that is not the wager question', () => {
    const a = teamWithPlayer(ctx, eventId, 'Wrong Question')
    advanceUntil(ctx, eventId, 'final_wager')
    expect(submitWager(ctx, { eventQuestionId: questionIds()[0], playerId: a.playerId, amount: 0 })).toEqual({ ok: false, error: 'wrong_phase' })
  })
})

describe('broadcasts', () => {
  it('sends team_submission only to the submitting team, and host stats to hosts', () => {
    const a = teamWithPlayer(ctx, eventId, 'Team A')
    const b = teamWithPlayer(ctx, eventId, 'Team B')
    const toA = listen(ctx, { eventId, playerId: a.playerId, teamId: a.teamId })
    const toB = listen(ctx, { eventId, playerId: b.playerId, teamId: b.teamId })
    const hosts = listen(ctx, { eventId, isHost: true })
    next(ctx, eventId)

    submit(a.playerId, { option: 2 })
    expect(toA.filter((m) => m.type === 'team_submission')).toEqual([
      { type: 'team_submission', submission: expect.objectContaining({ answer: { option: 2 }, is_draft: false }) },
    ])
    expect(toB.some((m) => m.type === 'team_submission')).toBe(false)
    expect(hosts.at(-1)).toEqual({ type: 'host_stats', connected_teams: 2, answered_teams: 1 })
  })
})
