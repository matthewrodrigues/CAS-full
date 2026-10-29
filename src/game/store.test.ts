import { describe, expect, it } from 'vitest'
import type { GameView, PublicSubmission } from '../../shared/game'
import { applyMessage } from './store'

const submission = (patch: Partial<PublicSubmission> = {}): PublicSubmission => ({
  id: 's1',
  event_question_id: 'q1',
  answer: { option: 1 },
  is_draft: false,
  received_at: 5,
  wager: null,
  result: null,
  points: null,
  ...patch,
})

const view: GameView = {
  state: {
    phase: 'live',
    current_event_question_id: 'q1',
    opens_at: 0,
    closes_at: 20_000,
    paused_at: null,
    paused_from_phase: null,
    live_payload: { type: 'mc' },
    reveal_payload: null,
  },
  submission: null,
  my_team: null,
  teams: [],
  settings: { max_team_size: 6, team_submissions: 'any_member', live_background: 'cream' },
}

describe('applyMessage', () => {
  it('replaces the state and asks for a refetch', () => {
    const next = applyMessage(view, { type: 'state', state: { ...view.state, phase: 'locked' } })
    expect(next.view.state.phase).toBe('locked')
    expect(next.refetch).toBe(true)
  })

  it('drops the old submission when a new question opens', () => {
    const answered = { ...view, submission: submission() }
    const next = applyMessage(answered, { type: 'state', state: { ...view.state, current_event_question_id: 'q2' } })
    expect(next.view.submission).toBeNull()
  })

  it('takes a team_submission for the current question without a refetch', () => {
    const next = applyMessage(view, { type: 'team_submission', submission: submission() })
    expect(next).toEqual({ view: { ...view, submission: submission() }, refetch: false })
  })

  it('ignores a team_submission for another question', () => {
    const next = applyMessage(view, { type: 'team_submission', submission: submission({ event_question_id: 'q0' }) })
    expect(next).toEqual({ view, refetch: false })
  })

  it('refetches on teams and scores hints', () => {
    expect(applyMessage(view, { type: 'teams' })).toEqual({ view, refetch: true })
    expect(applyMessage(view, { type: 'scores' })).toEqual({ view, refetch: true })
  })

  it('leaves the view alone for host-only and pong messages', () => {
    expect(applyMessage(view, { type: 'pong' })).toEqual({ view, refetch: false })
    expect(applyMessage(view, { type: 'host_stats', connected_teams: 1, answered_teams: 0 })).toEqual({ view, refetch: false })
  })
})
