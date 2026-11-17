import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { autopilotStep, createAutopilot } from '../game/autopilot'
import { getState } from '../game/state'
import { advanceUntil, makeGame, state, teamWithPlayer } from './game-setup'

describe('autopilotStep', () => {
  it('reveals a locked question after 3 s', () => {
    expect(autopilotStep('locked')).toEqual({ op: 'reveal', delayMs: 3000 })
    expect(autopilotStep('final_locked')).toEqual({ op: 'reveal', delayMs: 3000 })
  })
  it('moves on after the phase has had its time', () => {
    expect(autopilotStep('revealed')).toEqual({ op: 'next', delayMs: 8000 })
    expect(autopilotStep('round_break')).toEqual({ op: 'next', delayMs: 12000 })
    expect(autopilotStep('final_wager')).toEqual({ op: 'next', delayMs: 30000 })
    expect(autopilotStep('final_revealed')).toEqual({ op: 'next', delayMs: 10000 })
  })
  it('never starts the game, never cuts a question short, and stops when paused or ended', () => {
    for (const phase of ['lobby', 'live', 'final_live', 'paused', 'ended'] as const) expect(autopilotStep(phase)).toBeNull()
  })
})

describe('createAutopilot', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('does nothing while off', () => {
    const act = vi.fn()
    createAutopilot(act).onPhase('e', 'locked')
    vi.advanceTimersByTime(60_000)
    expect(act).not.toHaveBeenCalled()
  })

  it("acts after the phase's delay", () => {
    const act = vi.fn()
    const pilot = createAutopilot(act)
    pilot.set('e', true)
    pilot.onPhase('e', 'locked')
    vi.advanceTimersByTime(2999)
    expect(act).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(act).toHaveBeenCalledExactlyOnceWith('e', 'reveal')
  })

  it('a manual move replaces the pending step', () => {
    const act = vi.fn()
    const pilot = createAutopilot(act)
    pilot.set('e', true)
    pilot.onPhase('e', 'revealed')
    vi.advanceTimersByTime(5000)
    pilot.onPhase('e', 'locked')
    vi.advanceTimersByTime(8000)
    expect(act).toHaveBeenCalledExactlyOnceWith('e', 'reveal')
  })

  it('waits while paused', () => {
    const act = vi.fn()
    const pilot = createAutopilot(act)
    pilot.set('e', true)
    pilot.onPhase('e', 'locked')
    pilot.onPhase('e', 'paused')
    vi.advanceTimersByTime(60_000)
    expect(act).not.toHaveBeenCalled()
  })

  it('turning it off, or cancelling, drops the pending step', () => {
    const act = vi.fn()
    const pilot = createAutopilot(act)
    pilot.set('e', true)
    pilot.onPhase('e', 'locked')
    pilot.set('e', false)
    expect(pilot.isOn('e')).toBe(false)
    vi.advanceTimersByTime(10_000)
    pilot.set('f', true)
    pilot.onPhase('f', 'locked')
    pilot.cancel('f')
    vi.advanceTimersByTime(10_000)
    expect(act).not.toHaveBeenCalled()
  })

  it('the override delay applies to every step', () => {
    const act = vi.fn()
    const pilot = createAutopilot(act, 50)
    pilot.set('e', true)
    pilot.onPhase('e', 'final_wager')
    vi.advanceTimersByTime(50)
    expect(act).toHaveBeenCalledExactlyOnceWith('e', 'next')
  })
})

describe('autopilot in the game', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('reveals a locked question on its own, and the host sees it is on', () => {
    const { ctx, game, eventId, cleanup } = makeGame()
    try {
      teamWithPlayer(ctx, eventId, 'Pilots')
      advanceUntil(ctx, eventId, 'locked')
      expect(game.setAutopilot(eventId, true).ok).toBe(true)
      vi.advanceTimersByTime(3000)
      expect(state(ctx.db, eventId).phase).toBe('revealed')
      vi.advanceTimersByTime(8000)
      expect(state(ctx.db, eventId).phase).toBe('live')
      const view = getState(ctx, { eventId, playerId: null, isHost: true })
      expect(view?.host?.autopilot).toBe(true)
    } finally {
      cleanup()
    }
  })
})
