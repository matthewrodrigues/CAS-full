import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PublicGameState } from '../../shared/game'
import { ringLeft, ringSeconds } from '@/game/answer-sheet'
import { remainingMs } from '@/game/clock'

/**
 * The kit's countdown ring with the seconds in the hand font (kit.md section 10), for a time left
 * the caller already has. `xl` is the room-scale ring on the big screen (.countdown--xl).
 * role="timer" is not announced as it ticks; the live region announces only phase changes. The
 * number always ticks; only the ring's glide is motion, and the kit stops it under reduced motion.
 */
export function CountdownRing({ state, msLeft, xl = false }: { state: PublicGameState; msLeft: number; xl?: boolean }) {
  const { t } = useTranslation()
  if (state.opens_at === null || state.closes_at === null) return null
  const seconds = ringSeconds(msLeft, state.closes_at - state.opens_at)
  const className = ['countdown', xl ? 'countdown--xl' : null, seconds <= 5 ? 'is-urgent' : null].filter(Boolean).join(' ')
  return (
    <div
      className={className}
      role="timer"
      aria-label={state.phase === 'paused' ? t('question.timerPaused') : t('question.timer')}
      style={{ '--left': ringLeft(msLeft, state.closes_at - state.opens_at) } as React.CSSProperties}
    >
      <svg className="countdown__ring" viewBox="0 0 54 54" aria-hidden="true">
        <circle className="countdown__track" cx="27" cy="27" r="23" />
        <circle className="countdown__fill" cx="27" cy="27" r="23" pathLength="100" />
      </svg>
      <span className="countdown__num">{seconds}</span>
    </div>
  )
}

/** Time left on the server's clock (docs/SPEC.md section 5, Timing), frozen while paused, ticking four times a second. */
export function Countdown({ state, offset }: { state: PublicGameState; offset: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(tick)
  }, [])
  const left = remainingMs(state, offset, now)
  return left === null ? null : <CountdownRing state={state} msLeft={left} />
}
