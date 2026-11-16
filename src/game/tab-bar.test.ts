import { describe, expect, it } from 'vitest'
import { PHASES } from '../../shared/enums'
import { showTabBar } from './tab-bar'

describe('showTabBar', () => {
  it.each(['lobby', 'round_break', 'ended'] as const)('shows on the Play tab in %s', (phase) => {
    expect(showTabBar({ onPlayTab: true, phase, hasTeam: true })).toBe(true)
  })

  it.each(PHASES.filter((p) => !['lobby', 'round_break', 'ended'].includes(p)))('hides on the Play tab in %s', (phase) => {
    expect(showTabBar({ onPlayTab: true, phase, hasTeam: true })).toBe(false)
  })

  it('hides on the team step (no team yet), still part of joining', () => {
    expect(showTabBar({ onPlayTab: true, phase: 'lobby', hasTeam: false })).toBe(false)
  })

  it('hides while switching team from the lobby (the team step again)', () => {
    expect(showTabBar({ onPlayTab: true, phase: 'lobby', hasTeam: true, switchingTeam: true })).toBe(false)
  })

  it('ignores a leftover switch flag once the game has moved on', () => {
    expect(showTabBar({ onPlayTab: true, phase: 'round_break', hasTeam: true, switchingTeam: true })).toBe(true)
  })

  it('always shows on the other tabs, so a player can get back to Play', () => {
    expect(showTabBar({ onPlayTab: false, phase: 'live', hasTeam: true })).toBe(true)
    expect(showTabBar({ onPlayTab: false, phase: 'lobby', hasTeam: false })).toBe(true)
  })
})
