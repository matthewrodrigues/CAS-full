import { describe, expect, it } from 'vitest'
import { HOST_CHOICES, HOST_CHOICES_SHOWN } from '../../shared/characters'
import type { RoundHost } from '../../shared/game'
import { changedChoices, nextRoundToHost } from './round-hosts'

const round = (position: number, patch: Partial<RoundHost> = {}): RoundHost => ({
  round_id: `r${position}`,
  position,
  title: `Round ${position}`,
  host_choice: 'random',
  host: null,
  started: false,
  ...patch,
})

describe('nextRoundToHost', () => {
  it('is the first round that has not started', () => {
    expect(nextRoundToHost([round(1, { started: true }), round(2), round(3)])?.round_id).toBe('r2')
  })
  it('is round 1 in the lobby', () => {
    expect(nextRoundToHost([round(1), round(2)])?.round_id).toBe('r1')
  })
  it('is nothing once every round has started', () => {
    expect(nextRoundToHost([round(1, { started: true })])).toBeNull()
  })
})

describe('changedChoices', () => {
  it('lists only unstarted rounds whose draft differs from the saved choice', () => {
    const rounds = [round(1, { started: true }), round(2), round(3, { host_choice: 'june' })]
    const draft = { r1: 'pebble', r2: 'pebble', r3: 'june' } as const
    expect(changedChoices(rounds, draft)).toEqual([{ round_id: 'r2', host_choice: 'pebble' }])
  })
  it('is empty with no draft', () => {
    expect(changedChoices([round(1)], {})).toEqual([])
  })
})

describe('HOST_CHOICES_SHOWN', () => {
  it('lists the hosts first and Random last, with the same choices as the schema', () => {
    expect(HOST_CHOICES_SHOWN).toEqual(['rocco', 'pebble', 'june', 'random'])
    expect([...HOST_CHOICES_SHOWN].sort()).toEqual([...HOST_CHOICES].sort())
  })
})
