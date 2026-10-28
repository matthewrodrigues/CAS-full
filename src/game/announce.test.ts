import { describe, expect, it } from 'vitest'
import type { PublicGameState } from '../../shared/game'
import i18n from '../i18n'
import { announcement } from './announce'

const state = (patch: Partial<PublicGameState>): PublicGameState => ({
  phase: 'lobby',
  current_event_question_id: null,
  opens_at: null,
  closes_at: null,
  paused_at: null,
  paused_from_phase: null,
  live_payload: null,
  reveal_payload: null,
  ...patch,
})
const live = state({ phase: 'live', current_event_question_id: 'q4', live_payload: { number: 4, duration_s: 20, round: { position: 1 } } })
const t = i18n.t.bind(i18n)

describe('announcement', () => {
  it('announces a newly open question with its seconds', () => {
    expect(announcement(state({}), live, t)).toBe('Question 4 is live, 20 seconds')
  })

  it('says nothing when the phase and question are unchanged', () => {
    expect(announcement(live, { ...live, closes_at: 99 }, t)).toBeNull()
  })

  it('announces the next question even though the phase stays live', () => {
    const next = { ...live, current_event_question_id: 'q5', live_payload: { number: 5, duration_s: 30 } }
    expect(announcement(live, next, t)).toBe('Question 5 is live, 30 seconds')
  })

  it.each([
    ['locked', 'Answers are locked'],
    ['revealed', 'Results are in'],
    ['final_wager', 'Final wager: choose your bet'],
    ['final_locked', 'Answers are locked'],
    ['final_revealed', 'Results are in'],
    ['paused', 'The game is paused'],
    ['ended', 'The game is over'],
  ] as const)('announces %s', (phase, text) => {
    expect(announcement(live, { ...live, phase }, t)).toBe(text)
  })

  it('names the round that just ended', () => {
    expect(announcement(live, { ...live, phase: 'round_break' }, t)).toBe('Round 1 complete')
  })

  it('announces nothing on the first state it sees', () => {
    expect(announcement(null, live, t)).toBeNull()
  })
})
