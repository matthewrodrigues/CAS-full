// GameView.rounds: the round count everywhere, and the finished and next rounds' public details at a break.
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GameContext } from '../game/context'
import type { EventPlan } from '../game/plan'
import { roundsView } from '../game/round-info'
import { getState } from '../game/state'
import { advanceUntil, makeGame } from './game-setup'

const q = (id: string, position: number, points = 10) => ({ id, position, questionId: `${id}-question`, durationS: 20, points, done: false })
const plan: EventPlan = {
  rounds: [
    { id: 'r1', position: 1, format: 'standard', title: 'One', questions: [q('q1', 1), q('q2', 2)] },
    { id: 'r2', position: 2, format: 'picture', title: 'Empty', questions: [] },
    { id: 'r3', position: 3, format: 'sound', title: 'Three', questions: [q('q3', 1, 10), q('q4', 2, 20)] },
    { id: 'r4', position: 4, format: 'wager', title: 'Final', questions: [q('q5', 1)] },
  ],
}

describe('roundsView', () => {
  it('counts every round and shows no details outside a round break', () => {
    for (const phase of ['lobby', 'live', 'locked', 'revealed', 'final_wager', 'ended'] as const) {
      expect(roundsView(plan, phase, 'q1')).toEqual({ total: 4, finished: null, next: null })
    }
  })

  it('at a break gives the finished round and the next round with questions', () => {
    expect(roundsView(plan, 'round_break', 'q2')).toEqual({
      total: 4,
      finished: { position: 1, title: 'One', format: 'standard', question_count: 2, points: 10 },
      next: { position: 3, title: 'Three', format: 'sound', question_count: 2, points: null },
    })
  })

  it('has no next round after the last one', () => {
    expect(roundsView(plan, 'round_break', 'q5').next).toBeNull()
  })

  it('carries only titles, formats and counts', () => {
    const { next } = roundsView(plan, 'round_break', 'q2')
    expect(Object.keys(next!).sort()).toEqual(['format', 'points', 'position', 'question_count', 'title'])
  })
})

describe('GameView.rounds', () => {
  let ctx: GameContext
  let eventId: string
  let cleanup: () => void
  beforeEach(() => {
    ;({ ctx, eventId, cleanup } = makeGame())
  })
  afterEach(() => cleanup())
  const view = () => getState(ctx, { eventId, playerId: null, isHost: false })!

  it('has the round count in the lobby and no break details', () => {
    const { rounds } = view()
    expect(rounds.total).toBeGreaterThan(1)
    expect(rounds.finished).toBeNull()
    expect(rounds.next).toBeNull()
  })

  it('has the finished and next rounds at a break', () => {
    advanceUntil(ctx, eventId, 'round_break')
    const { rounds } = view()
    expect(rounds.finished?.position).toBe(1)
    expect(rounds.next?.position).toBe(2)
    expect(rounds.next?.question_count).toBeGreaterThan(0)
  })
})
