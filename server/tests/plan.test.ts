import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import * as t from '../db/schema'
import { seedDemo } from '../db/seed-demo'
import { loadEventPlan, nextStep, type EventPlan } from '../game/plan'
import { makeTestDb } from './helpers'

const q = (id: string, position: number) => ({ id, position, questionId: `${id}-question`, durationS: 20, points: 10, done: false })

// Round 1: two questions; round 2: none; round 3: one; round 4: the wager.
const plan: EventPlan = {
  rounds: [
    { id: 'r1', position: 1, format: 'standard', title: 'One', questions: [q('q1', 1), q('q2', 2)] },
    { id: 'r2', position: 2, format: 'picture', title: 'Empty', questions: [] },
    { id: 'r3', position: 3, format: 'sound', title: 'Three', questions: [q('q3', 1)] },
    { id: 'r4', position: 4, format: 'wager', title: 'Final', questions: [q('q4', 1)] },
  ],
}
const noWager: EventPlan = { rounds: plan.rounds.slice(0, 3) }

describe('nextStep', () => {
  it.each([
    ['lobby', null, { kind: 'open', eventQuestionId: 'q1' }],
    ['revealed', 'q1', { kind: 'open', eventQuestionId: 'q2' }],
    ['revealed', 'q2', { kind: 'round_break' }],
    ['round_break', 'q2', { kind: 'open', eventQuestionId: 'q3' }],
    ['round_break', 'q3', { kind: 'final_wager', eventQuestionId: 'q4' }],
    ['final_wager', 'q4', { kind: 'open', eventQuestionId: 'q4' }],
    ['final_revealed', 'q4', { kind: 'ended' }],
  ] as const)('from %s at %s', (phase, currentEventQuestionId, expected) => {
    expect(nextStep(plan, { phase, currentEventQuestionId })).toEqual(expected)
  })

  it('ends after the last round break when there is no wager round', () => {
    expect(nextStep(noWager, { phase: 'round_break', currentEventQuestionId: 'q3' })).toEqual({ kind: 'ended' })
  })

  it('ends straight from the lobby when the event has no questions', () => {
    expect(nextStep({ rounds: [] }, { phase: 'lobby', currentEventQuestionId: null })).toEqual({ kind: 'ended' })
  })

  it('goes from the lobby to the wager when that is the only round', () => {
    const onlyWager: EventPlan = { rounds: [plan.rounds[3]] }
    expect(nextStep(onlyWager, { phase: 'lobby', currentEventQuestionId: null })).toEqual({ kind: 'final_wager', eventQuestionId: 'q4' })
  })

  it.each(['live', 'locked', 'final_live', 'final_locked', 'paused', 'ended'] as const)('does not advance from %s', (phase) => {
    expect(nextStep(plan, { phase, currentEventQuestionId: 'q1' })).toBeNull()
  })
})

describe('loadEventPlan', () => {
  it('loads DEMO1 rounds and questions in order, marking done questions', () => {
    const db = makeTestDb()
    const mediaDir = mkdtempSync(join(tmpdir(), 'nightlife-plan-'))
    try {
      const { eventId } = seedDemo(db, { mediaDir })
      const before = loadEventPlan(db, eventId)
      expect(before.rounds.map((r) => [r.position, r.format, r.questions.length])).toEqual([
        [1, 'standard', 10],
        [2, 'picture', 9],
        [3, 'sound', 9],
        [4, 'wager', 1],
      ])
      expect(before.rounds[0].questions.map((x) => x.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      expect(before.rounds.flatMap((r) => r.questions).every((x) => !x.done)).toBe(true)

      const first = before.rounds[0].questions[0]
      const second = before.rounds[0].questions[1]
      db.update(t.eventQuestions).set({ revealedAt: 1 }).where(eq(t.eventQuestions.id, first.id)).run()
      db.update(t.eventQuestions).set({ skippedAt: 1 }).where(eq(t.eventQuestions.id, second.id)).run()
      const after = loadEventPlan(db, eventId).rounds[0].questions
      expect(after.slice(0, 3).map((x) => x.done)).toEqual([true, true, false])
    } finally {
      rmSync(mediaDir, { recursive: true, force: true })
    }
  })
})
