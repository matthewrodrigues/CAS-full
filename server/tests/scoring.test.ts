import { and, asc, eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Answer } from '../../shared/api'
import type { Db } from '../db/client'
import { eventLeaderboard, teamScore } from '../db/queries'
import * as t from '../db/schema'
import type { GameContext } from '../game/context'
import { lock, next, reveal, skip } from '../game/flow'
import { adjustScore, override, reviewQueue } from '../game/scoring'
import { submitAnswer, submitWager } from '../game/submissions'
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

// DEMO1 round 1, in play order: 0 mc (option 0), 1 typed (octopus), 2 true_false (False = 1),
// 3 closest_number (1960), 4 mc, 5 typed (anglerfish), 6 true_false, 7 closest_number (71), ...
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

/** Opens question `index` of the night, playing (unanswered) through the ones before it. */
function openQuestion(index: number) {
  if (state(db, eventId).phase === 'lobby') next(ctx, eventId)
  while (current() !== questionIds()[index]) {
    advanceUntil(ctx, eventId, 'revealed')
    vi.advanceTimersByTime(1000)
    next(ctx, eventId)
  }
}
const submit = (playerId: string, answer: Answer, isDraft = false) => {
  const result = submitAnswer(ctx, { eventQuestionId: current(), playerId, answer, isDraft })
  if (!result.ok) throw new Error(result.error)
  return result.value
}
const row = (teamId: string, eventQuestionId = current()) =>
  db
    .select()
    .from(t.submissions)
    .where(and(eq(t.submissions.teamId, teamId), eq(t.submissions.eventQuestionId, eventQuestionId)))
    .get()!
const lockAndReveal = () => {
  expect(lock(ctx, eventId).ok).toBe(true)
  expect(reveal(ctx, eventId).ok).toBe(true)
}
const reasons = (teamId: string) =>
  db
    .select({ points: t.scoreEvents.points, reason: t.scoreEvents.reason })
    .from(t.scoreEvents)
    .where(eq(t.scoreEvents.teamId, teamId))
    .all()
const setSettings = (patch: Record<string, unknown>) => {
  const event = db.select({ settings: t.events.settings }).from(t.events).where(eq(t.events.id, eventId)).get()!
  db.update(t.events)
    .set({ settings: { ...event.settings, ...patch } })
    .where(eq(t.events.id, eventId))
    .run()
}

describe('grading at lock and scoring at reveal', () => {
  it('scores multiple choice and true/false, and nothing before the reveal', () => {
    const a = teamWithPlayer(ctx, eventId, 'Alpha')
    const b = teamWithPlayer(ctx, eventId, 'Bravo')
    const c = teamWithPlayer(ctx, eventId, 'Charlie')
    openQuestion(0)
    submit(a.playerId, { option: 0 })
    submit(b.playerId, { option: 1 })
    lock(ctx, eventId)
    expect([row(a.teamId).autoResult, row(b.teamId).autoResult]).toEqual(['correct', 'incorrect'])
    expect(teamScore(db, a.teamId)).toBe(0)
    reveal(ctx, eventId)
    expect([teamScore(db, a.teamId), teamScore(db, b.teamId), teamScore(db, c.teamId)]).toEqual([10, 0, 0])

    openQuestion(2) // true_false, False is correct
    submit(a.playerId, { option: 1 })
    submit(b.playerId, { option: 0 })
    lockAndReveal()
    expect([teamScore(db, a.teamId), teamScore(db, b.teamId)]).toEqual([20, 0])
    expect(reasons(a.teamId).every((e) => e.reason === 'correct')).toBe(true) // speed bonus is off
  })

  it('scores typed answers: exact, fuzzy, review (0 until overridden) and wrong', () => {
    const a = teamWithPlayer(ctx, eventId, 'Alpha')
    const b = teamWithPlayer(ctx, eventId, 'Bravo')
    const c = teamWithPlayer(ctx, eventId, 'Charlie')
    openQuestion(1) // octopus
    submit(a.playerId, { text: 'Octopus!' })
    submit(b.playerId, { text: 'octopuss' }) // similarity 0.7
    submit(c.playerId, { text: 'squid' })
    lockAndReveal()
    expect([row(a.teamId).autoResult, row(b.teamId).autoResult, row(c.teamId).autoResult]).toEqual(['correct', 'review', 'incorrect'])
    expect([teamScore(db, a.teamId), teamScore(db, b.teamId), teamScore(db, c.teamId)]).toEqual([10, 0, 0])

    openQuestion(5) // anglerfish; "deep sea anglerfis" scores 18/21 ≈ 0.857 against "deep sea anglerfish"
    submit(a.playerId, { text: 'deep sea anglerfis' })
    lockAndReveal()
    expect(teamScore(db, a.teamId)).toBe(20)
  })

  it('gives every team at the minimum distance the points on a closest-number question', () => {
    const a = teamWithPlayer(ctx, eventId, 'Alpha')
    const b = teamWithPlayer(ctx, eventId, 'Bravo')
    const c = teamWithPlayer(ctx, eventId, 'Charlie')
    openQuestion(3) // 1960
    submit(a.playerId, { number: 1955 })
    submit(b.playerId, { number: 1965 })
    submit(c.playerId, { number: 2000 })
    lockAndReveal()
    expect([row(a.teamId).distance, row(b.teamId).distance, row(c.teamId).distance]).toEqual([5, 5, 40])
    expect([teamScore(db, a.teamId), teamScore(db, b.teamId), teamScore(db, c.teamId)]).toEqual([10, 10, 0])
  })

  it('scores the latest draft when the team never submitted', () => {
    const a = teamWithPlayer(ctx, eventId, 'Drafters')
    const b = teamWithPlayer(ctx, eventId, 'Submitters')
    openQuestion(1)
    submit(a.playerId, { text: 'squid' }, true)
    submit(a.playerId, { text: 'octopus' }, true)
    submit(b.playerId, { text: 'octopus' })
    submit(b.playerId, { text: 'squid' }, true) // ignored: the team already submitted
    lockAndReveal()
    expect([teamScore(db, a.teamId), teamScore(db, b.teamId)]).toEqual([10, 10])
  })

  it('adds the tiered speed bonus when it is on: +3, +2, +1 on a 10-point question', () => {
    setSettings({ speed_bonus: 'tiered' })
    const a = teamWithPlayer(ctx, eventId, 'Fast')
    const b = teamWithPlayer(ctx, eventId, 'Medium')
    const c = teamWithPlayer(ctx, eventId, 'Slow')
    openQuestion(0) // 20 s: thirds end at 6.67 s and 13.33 s
    vi.advanceTimersByTime(1000)
    submit(a.playerId, { option: 0 })
    vi.advanceTimersByTime(9000)
    submit(b.playerId, { option: 0 })
    vi.advanceTimersByTime(9000)
    submit(c.playerId, { option: 0 })
    lockAndReveal()
    expect([teamScore(db, a.teamId), teamScore(db, b.teamId), teamScore(db, c.teamId)]).toEqual([13, 12, 11])
    expect(reasons(a.teamId)).toContainEqual({ points: 3, reason: 'speed' })
  })

  it('refuses a second reveal and scores nothing twice', () => {
    const a = teamWithPlayer(ctx, eventId, 'Double')
    openQuestion(0)
    submit(a.playerId, { option: 0 })
    lockAndReveal()
    expect(reveal(ctx, eventId)).toEqual({ ok: false, error: 'wrong_phase' })
    expect(lock(ctx, eventId)).toEqual({ ok: false, error: 'wrong_phase' })
    expect(teamScore(db, a.teamId)).toBe(10)
  })

  it('tells the event that scores changed after a reveal', () => {
    teamWithPlayer(ctx, eventId, 'Listeners')
    openQuestion(0)
    const messages = listen(ctx, { eventId })
    lockAndReveal()
    expect(messages).toContainEqual({ type: 'scores' })
  })
})

describe('the final wager', () => {
  it('adds or subtracts the wager, counts no wager as 0, and caps it at the score at reveal', () => {
    const teams = ['Alpha', 'Bravo', 'Charlie', 'Delta'].map((name) => teamWithPlayer(ctx, eventId, name))
    const [a, b, c, d] = teams
    advanceUntil(ctx, eventId, 'final_wager')
    for (const [team, points] of [
      [a, 100],
      [b, 100],
      [c, 100],
      [d, 80],
    ] as const) {
      expect(adjustScore(ctx, { teamId: team.teamId, points, note: 'Earlier rounds' }).ok).toBe(true)
    }
    const wager = (team: { playerId: string }, amount: number) =>
      expect(submitWager(ctx, { eventQuestionId: current(), playerId: team.playerId, amount }).ok).toBe(true)
    wager(a, 50)
    wager(b, 50)
    wager(d, 80)

    next(ctx, eventId) // final_live
    submit(a.playerId, { text: 'bathypelagic' })
    submit(b.playerId, { text: 'abyssal' })
    submit(c.playerId, { text: 'bathypelagic' })
    submit(d.playerId, { text: 'abyssal' })
    adjustScore(ctx, { teamId: d.teamId, points: -20, note: 'Phone use' }) // Delta is now at 60, below its wager
    lockAndReveal()

    // Alpha 100 + 50, Bravo 100 − 50, Charlie 100 + 0, Delta 60 − min(80, 60).
    expect(teams.map((team) => teamScore(db, team.teamId))).toEqual([150, 50, 100, 0])
    expect(row(d.teamId).wager).toBe(60)
    expect(reasons(a.teamId)).toContainEqual({ points: 50, reason: 'wager' })
    expect(state(db, eventId).phase).toBe('final_revealed')
  })
})

describe('host corrections', () => {
  it('lists unresolved review answers with their similarity, never the accepted answers', () => {
    const a = teamWithPlayer(ctx, eventId, 'Alpha')
    const b = teamWithPlayer(ctx, eventId, 'Bravo')
    openQuestion(1)
    submit(a.playerId, { text: 'octopus' })
    submit(b.playerId, { text: 'octopuss' })
    const hosts = listen(ctx, { eventId, isHost: true })
    lock(ctx, eventId)

    const queue = reviewQueue(ctx, eventId)
    expect(queue).toEqual([
      {
        submission_id: row(b.teamId).id,
        team_id: b.teamId,
        team_name: 'Bravo',
        event_question_id: current(),
        answer: 'octopuss',
        similarity: 0.7,
      },
    ])
    expect(hosts).toContainEqual({ type: 'review_queue', items: queue })
  })

  it('keeps unresolved review answers from earlier questions until a host decides', () => {
    const b = teamWithPlayer(ctx, eventId, 'Bravo')
    openQuestion(1)
    submit(b.playerId, { text: 'octopuss' })
    const reviewed = current()
    lockAndReveal()
    openQuestion(2)
    expect(reviewQueue(ctx, eventId).map((item) => item.event_question_id)).toEqual([reviewed])

    expect(override(ctx, { submissionId: row(b.teamId, reviewed).id, result: 'correct', note: 'Typo' })).toMatchObject({ ok: true, value: { adjustment: 10 } })
    expect(reviewQueue(ctx, eventId)).toEqual([])
  })

  it('leaves review answers on a skipped question out of the queue', () => {
    const b = teamWithPlayer(ctx, eventId, 'Bravo')
    openQuestion(1)
    submit(b.playerId, { text: 'octopuss' })
    lock(ctx, eventId)
    expect(reviewQueue(ctx, eventId)).toHaveLength(1)
    const hosts = listen(ctx, { eventId, isHost: true })
    expect(skip(ctx, eventId).ok).toBe(true)
    expect(reviewQueue(ctx, eventId)).toEqual([])
    expect(hosts).toContainEqual({ type: 'review_queue', items: [] })
  })

  it('applies an override made before the reveal when the reveal scores', () => {
    const b = teamWithPlayer(ctx, eventId, 'Bravo')
    openQuestion(1)
    submit(b.playerId, { text: 'octopuss' })
    lock(ctx, eventId)
    expect(override(ctx, { submissionId: row(b.teamId).id, result: 'correct', note: 'Typo' }).ok).toBe(true)
    expect(reviewQueue(ctx, eventId)).toEqual([])
    reveal(ctx, eventId)
    expect(reasons(b.teamId)).toEqual([{ points: 10, reason: 'correct' }])
  })

  it('writes an adjust event for an override after the reveal, and undoes it when reversed', () => {
    const b = teamWithPlayer(ctx, eventId, 'Bravo')
    openQuestion(1)
    submit(b.playerId, { text: 'octopuss' })
    lockAndReveal()
    expect(teamScore(db, b.teamId)).toBe(0)

    const id = row(b.teamId).id
    expect(override(ctx, { submissionId: id, result: 'correct', note: 'Typo' })).toMatchObject({ ok: true, value: { adjustment: 10 } })
    expect(teamScore(db, b.teamId)).toBe(10)
    expect(reasons(b.teamId)).toEqual([{ points: 10, reason: 'adjust' }])
    expect(override(ctx, { submissionId: id, result: 'incorrect', note: 'Second look' })).toMatchObject({ ok: true, value: { adjustment: -10 } })
    expect(teamScore(db, b.teamId)).toBe(0)
  })

  it('swings the wager both ways for an override after the final reveal', () => {
    const b = teamWithPlayer(ctx, eventId, 'Bravo')
    advanceUntil(ctx, eventId, 'final_wager')
    adjustScore(ctx, { teamId: b.teamId, points: 100, note: 'Earlier rounds' })
    submitWager(ctx, { eventQuestionId: current(), playerId: b.playerId, amount: 50 })
    next(ctx, eventId)
    submit(b.playerId, { text: 'abyssal' })
    lockAndReveal()
    expect(teamScore(db, b.teamId)).toBe(50)

    expect(override(ctx, { submissionId: row(b.teamId).id, result: 'correct', note: 'Accepted' })).toMatchObject({
      ok: true,
      value: { adjustment: 100 },
    })
    expect(teamScore(db, b.teamId)).toBe(150)
  })

  it('adjusts a score by hand with a note', () => {
    const a = teamWithPlayer(ctx, eventId, 'Alpha')
    const messages = listen(ctx, { eventId })
    expect(adjustScore(ctx, { teamId: a.teamId, points: -5, note: 'Phone use' })).toEqual({ ok: true, value: { team_id: a.teamId, score: -5 } })
    expect(db.select().from(t.scoreEvents).where(eq(t.scoreEvents.teamId, a.teamId)).all()).toEqual([
      expect.objectContaining({ points: -5, reason: 'adjust', note: 'Phone use', eventQuestionId: null }),
    ])
    expect(messages).toContainEqual({ type: 'scores' })
  })

  it('answers unknown submissions and teams with not_found', () => {
    expect(override(ctx, { submissionId: crypto.randomUUID(), result: 'correct', note: 'x' })).toEqual({ ok: false, error: 'not_found' })
    expect(adjustScore(ctx, { teamId: crypto.randomUUID(), points: 5, note: 'x' })).toEqual({ ok: false, error: 'not_found' })
  })
})

describe('the tiebreaker', () => {
  // Round 1's closest-number questions, in play order: question 3 (earlier) and question 7 (later).
  function setUp(distances: { early: [number | null, number | null]; late: [number | null, number | null] }) {
    const a = teamWithPlayer(ctx, eventId, 'Alpha')
    const b = teamWithPlayer(ctx, eventId, 'Bravo')
    const ids = questionIds()
    for (const [index, pair] of [
      [3, distances.early],
      [7, distances.late],
    ] as const) {
      db.update(t.eventQuestions).set({ revealedAt: T0 }).where(eq(t.eventQuestions.id, ids[index])).run()
      pair.forEach((distance, i) => {
        if (distance === null) return
        const teamId = [a, b][i].teamId
        db.insert(t.submissions).values({ eventQuestionId: ids[index], teamId, answer: { number: 0 }, receivedAt: T0, distance }).run()
      })
    }
    for (const team of [a, b]) db.insert(t.scoreEvents).values({ teamId: team.teamId, points: 30, reason: 'correct' }).run()
    return eventLeaderboard(db, eventId).map((r) => [r.name, r.points, r.rank])
  }

  it('ranks the team closer on the most recent closest-number question first', () => {
    expect(setUp({ early: [1, 1], late: [9, 4] })).toEqual([
      ['Bravo', 30, 1],
      ['Alpha', 30, 2],
    ])
  })

  it('falls back to the question before when the last one is tied', () => {
    expect(setUp({ early: [10, 2], late: [4, 4] })).toEqual([
      ['Bravo', 30, 1],
      ['Alpha', 30, 2],
    ])
  })

  it('counts no answer as farthest', () => {
    expect(setUp({ early: [null, 50], late: [4, 4] })).toEqual([
      ['Bravo', 30, 1],
      ['Alpha', 30, 2],
    ])
  })

  it('shares the rank when the teams are tied on every distance', () => {
    expect(setUp({ early: [3, 3], late: [4, 4] })).toEqual([
      ['Alpha', 30, 1],
      ['Bravo', 30, 1],
    ])
  })
})
