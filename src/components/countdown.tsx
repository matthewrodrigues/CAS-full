import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PublicGameState } from '../../shared/game'
import { ringLeft } from '@/game/answer-sheet'
import { remainingMs } from '@/game/clock'

/**
 * Time left on the server's clock (docs/SPEC.md section 5, Timing), frozen while paused, drawn as
 * the kit's ring with the seconds in the hand font (kit.md section 10). role="timer" is not
 * announced as it ticks; the live region announces only phase changes. The number always ticks;
 * only the ring's glide is motion, and the kit stops it under reduced motion.
 */
export function Countdown({ state, offset }: { state: PublicGameState; offset: number }) {
  const { t } = useTranslation()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(tick)
  }, [])

  const left = remainingMs(state, offset, now)
  if (left === null || state.opens_at === null || state.closes_at === null) return null
  const seconds = Math.ceil(left / 1000)
  const paused = state.phase === 'paused'

  return (
    <div
      className={seconds <= 5 ? 'countdown is-urgent' : 'countdown'}
      role="timer"
      aria-label={paused ? t('question.timerPaused') : t('question.timer')}
      style={{ '--left': ringLeft(left, state.closes_at - state.opens_at) } as React.CSSProperties}
    >
      <svg className="countdown__ring" viewBox="0 0 54 54" aria-hidden="true">
        <circle className="countdown__track" cx="27" cy="27" r="23" />
        <circle className="countdown__fill" cx="27" cy="27" r="23" pathLength="100" />
      </svg>
      <span className="countdown__num">{seconds}</span>
    </div>
  )
}
