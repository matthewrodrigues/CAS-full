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
  event: { id: 'e1', join_code: 'DEMO1', status: 'live' },
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
  settings: { max_team_size: 6, team_submissions: 'any_member' },
  cast: { host: 'rocco', incoming_host: null },
  rounds: { total: 4, finished: null, next: null },
}

describe('applyMessage', () => {
  const stateOf = (state: GameView['state'], patch: Partial<Pick<GameView, 'cast' | 'rounds'>> = {}) =>
    ({ type: 'state', state, cast: patch.cast ?? view.cast, rounds: patch.rounds ?? view.rounds }) as const

  it('replaces the state and asks for a refetch', () => {
    const next = applyMessage(view, stateOf({ ...view.state, phase: 'locked' }))
    expect(next.view.state.phase).toBe('locked')
    expect(next.refetch).toBe(true)
  })

  it('takes the cast and rounds from a state message, so a round change never shows the old host', () => {
    const cast = { host: 'rocco', incoming_host: 'june' } as const
    const rounds = { total: 4, finished: { position: 1, title: 'Warm-up', format: 'standard', question_count: 5, points: 1 }, next: null } as const
    const next = applyMessage(view, stateOf({ ...view.state, phase: 'round_break' }, { cast, rounds }))
    expect(next.view.cast).toEqual(cast)
    expect(next.view.rounds).toEqual(rounds)
  })

  it('drops the old submission when a new question opens', () => {
    const answered = { ...view, submission: submission() }
    const next = applyMessage(answered, stateOf({ ...view.state, current_event_question_id: 'q2' }))
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

  it('leaves a player view alone for host-only and pong messages', () => {
    expect(applyMessage(view, { type: 'pong' })).toEqual({ view, refetch: false })
    expect(applyMessage(view, { type: 'host_stats', connected_teams: 1, answered_teams: 0 })).toEqual({ view, refetch: false })
  })

  it('patches the host view with counts and the review queue', () => {
    const hostView = { ...view, host: { autopilot: false, connected_teams: 0, answered_teams: 0, review_queue: [], teams: [] } }
    const counted = applyMessage(hostView, { type: 'host_stats', connected_teams: 4, answered_teams: 2 })
    expect(counted).toEqual({ view: { ...hostView, host: { ...hostView.host, connected_teams: 4, answered_teams: 2 } }, refetch: false })
    const item = { submission_id: 's', team_id: 't', team_name: 'T', event_question_id: 'q1', answer: 'octopuss', similarity: 0.7 }
    expect(applyMessage(hostView, { type: 'review_queue', items: [item] }).view.host?.review_queue).toEqual([item])
  })
})
