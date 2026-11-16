import { describe, expect, it } from 'vitest'
import type { Phase } from '../../shared/enums'
import type { GameView, PublicSubmission } from '../../shared/game'
import { ROUND_BREAK_OUTGOING_EXPRESSION, hostExpression, initialOf } from './cast'

const QUESTION = 'eq-1'

function view(phase: Phase, submission: Partial<PublicSubmission> | null = null): GameView {
  return {
    event: { id: 'ev', join_code: 'DEMO1', status: 'live' },
    state: {
      phase,
      current_event_question_id: QUESTION,
      opens_at: null,
      closes_at: null,
      paused_at: null,
      paused_from_phase: phase === 'paused' ? 'live' : null,
      live_payload: null,
      reveal_payload: null,
    },
    submission:
      submission === null
        ? null
        : {
            id: 's1',
            event_question_id: QUESTION,
            answer: { option: 1 },
            is_draft: false,
            received_at: 0,
            wager: null,
            result: null,
            points: null,
            ...submission,
          },
    my_team: { id: 't1', name: 'Reef', name_status: 'approved', captain_id: 'p1', score: 0, members: [] },
    teams: [],
    settings: { max_team_size: 6, team_submissions: 'any_member' },
  } as GameView
}

describe('hostExpression', () => {
  it('lobby: greeting', () => {
    expect(hostExpression(view('lobby'))).toBe('greeting')
  })

  it.each(['live', 'final_live'] as const)('%s: asking before my team sends', (phase) => {
    expect(hostExpression(view(phase))).toBe('asking')
  })

  it.each(['live', 'final_live'] as const)('%s: a draft (circled, not sent) still asks', (phase) => {
    expect(hostExpression(view(phase, { is_draft: true }))).toBe('asking')
  })

  it.each(['live', 'final_live'] as const)('%s: waiting once my team has sent', (phase) => {
    expect(hostExpression(view(phase, {}))).toBe('waiting')
  })

  it('live: a sent answer for an older question does not count', () => {
    expect(hostExpression(view('live', { event_question_id: 'eq-0' }))).toBe('asking')
  })

  it.each(['locked', 'final_locked'] as const)('%s: waiting', (phase) => {
    expect(hostExpression(view(phase, {}))).toBe('waiting')
  })

  it.each(['revealed', 'final_revealed'] as const)('%s: cheering when correct', (phase) => {
    expect(hostExpression(view(phase, { result: 'correct' }))).toBe('cheering')
  })

  it.each(['revealed', 'final_revealed'] as const)('%s: consoling when incorrect', (phase) => {
    expect(hostExpression(view(phase, { result: 'incorrect' }))).toBe('consoling')
  })

  it.each(['revealed', 'final_revealed'] as const)('%s: waiting with no submission', (phase) => {
    expect(hostExpression(view(phase))).toBe('waiting')
  })

  it('revealed: waiting while a typed answer is still in host review', () => {
    expect(hostExpression(view('revealed', { result: 'review' }))).toBe('waiting')
  })

  it('round_break: the incoming (main) host greets; the outgoing host relaxes', () => {
    expect(hostExpression(view('round_break'))).toBe('greeting')
    expect(ROUND_BREAK_OUTGOING_EXPRESSION).toBe('relaxing')
  })

  it('paused: relaxing', () => {
    expect(hostExpression(view('paused'))).toBe('relaxing')
  })

  it('final_wager: asking', () => {
    expect(hostExpression(view('final_wager'))).toBe('asking')
  })

  it.each([1, 2, 3])('ended: cheering when my team placed %i', (place) => {
    expect(hostExpression(view('ended'), { place })).toBe('cheering')
  })

  it('ended: consoling when my team placed 4th or lower', () => {
    expect(hostExpression(view('ended'), { place: 4 })).toBe('consoling')
  })

  it('ended: consoling while the placing is unknown', () => {
    expect(hostExpression(view('ended'))).toBe('consoling')
  })
})

describe('initialOf', () => {
  it('takes the first letter, uppercased', () => {
    expect(initialOf('jess')).toBe('J')
    expect(initialOf('  the Blobfish')).toBe('T')
  })

  it('keeps a whole emoji or accented letter', () => {
    expect(initialOf('🐙 Crew')).toBe('🐙')
    expect(initialOf('élan')).toBe('É')
  })

  it('shows "?" for a hidden name', () => {
    expect(initialOf(null)).toBe('?')
  })
})
