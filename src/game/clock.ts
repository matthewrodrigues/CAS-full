// Clock sync and the countdown (docs/SPEC.md section 5, Timing). Phones' clocks drift, so the
// countdown runs on the server's clock: offset = server time − local time, measured three times.
import type { PublicGameState } from '../../shared/game'

export type ClockSample = { sentAt: number; receivedAt: number; serverNow: number }

/** The server's clock minus ours, assuming the reply was stamped halfway through the round trip. */
export function offsetFromSample({ sentAt, receivedAt, serverNow }: ClockSample): number {
  return serverNow - (sentAt + receivedAt) / 2
}

/** The median sample's offset, so one slow round trip can't skew the countdown. */
export function medianOffset(samples: ClockSample[]): number {
  const offsets = samples.map(offsetFromSample).sort((a, b) => a - b)
  const mid = Math.floor(offsets.length / 2)
  return offsets.length % 2 ? offsets[mid] : (offsets[mid - 1] + offsets[mid]) / 2
}

/** Calls server_time three times, one after another, and returns the median offset. */
export async function syncClock(serverTime: () => Promise<{ now: number }>, now: () => number = Date.now): Promise<number> {
  const samples: ClockSample[] = []
  for (let i = 0; i < 3; i++) {
    const sentAt = now()
    const { now: serverNow } = await serverTime()
    samples.push({ sentAt, receivedAt: now(), serverNow })
  }
  return medianOffset(samples)
}

/** Milliseconds left on the open question, frozen while paused; null when nothing is timed. */
export function remainingMs(state: PublicGameState, offset: number, now: number): number | null {
  if (state.closes_at === null) return null
  const serverNow = state.phase === 'paused' && state.paused_at !== null ? state.paused_at : now + offset
  return Math.max(0, state.closes_at - serverNow)
}
