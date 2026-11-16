import { useEffect, useState } from 'react'
import type { PublicGameState } from '../../shared/game'
import { remainingMs } from './clock'

/** Milliseconds left on the server's clock, refreshed four times a second; 0 once there is no deadline. */
export function useMsLeft(state: PublicGameState, offset: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(tick)
  }, [])
  return remainingMs(state, offset, now) ?? 0
}
