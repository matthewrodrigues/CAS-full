import { describe, expect, it } from 'vitest'
import type { PublicGameState } from '../../shared/game'
import { medianOffset, offsetFromSample, remainingMs, syncClock } from './clock'

const live = (patch: Partial<PublicGameState> = {}): PublicGameState => ({
  phase: 'live',
  current_event_question_id: 'q1',
  opens_at: 1_000,
  closes_at: 21_000,
  paused_at: null,
  paused_from_phase: null,
  live_payload: null,
  reveal_payload: null,
  ...patch,
})

describe('clock sync', () => {
  it('measures the offset from the middle of the round trip', () => {
    expect(offsetFromSample({ sentAt: 1000, receivedAt: 1100, serverNow: 1250 })).toBe(200)
  })

  it('takes the median of three offsets', () => {
    const samples = [
      { sentAt: 0, receivedAt: 100, serverNow: 0 }, // −50
      { sentAt: 0, receivedAt: 100, serverNow: 80 }, // +30
      { sentAt: 0, receivedAt: 100, serverNow: 60 }, // +10
    ]
    expect(medianOffset(samples)).toBe(10)
  })

  it('asks the server three times, one after another', async () => {
    let clientNow = 0
    const asked: number[] = []
    const offset = await syncClock(
      async () => {
        asked.push(clientNow)
        clientNow += 40
        return { now: clientNow + 500 - 20 } // the server is 500 ms ahead; replies mid-trip
      },
      () => clientNow,
    )
    expect(asked).toEqual([0, 40, 80])
    expect(offset).toBe(500)
  })
})

describe('remainingMs', () => {
  it('counts down to closes_at on the server clock', () => {
    expect(remainingMs(live(), 200, 10_000)).toBe(10_800)
  })

  it('freezes while paused', () => {
    const paused = live({ phase: 'paused', paused_from_phase: 'live', paused_at: 15_000 })
    expect(remainingMs(paused, 0, 15_000)).toBe(6_000)
    expect(remainingMs(paused, 0, 99_000)).toBe(6_000)
  })

  it('never goes below zero', () => {
    expect(remainingMs(live(), 0, 50_000)).toBe(0)
  })

  it('is null with no closes_at', () => {
    expect(remainingMs(live({ phase: 'lobby', closes_at: null }), 0, 0)).toBeNull()
  })
})
