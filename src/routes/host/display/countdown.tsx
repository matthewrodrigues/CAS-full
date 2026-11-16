import { useTranslation } from 'react-i18next'
import type { PublicGameState } from '../../../../shared/game'

/** The kit's ring at room scale (.countdown--xl). The number always ticks; the ring only glides when motion is allowed (kit.css). */
export function BigCountdown({ state, msLeft }: { state: PublicGameState; msLeft: number }) {
  const { t } = useTranslation()
  if (state.opens_at === null || state.closes_at === null) return null
  const total = Math.max(1, state.closes_at - state.opens_at)
  const seconds = Math.ceil(msLeft / 1000)
  return (
    <div className={`countdown countdown--xl${seconds <= 5 ? ' is-urgent' : ''}`} role="timer" aria-label={t('question.timer')} style={{ '--left': Math.min(1, msLeft / total) } as React.CSSProperties}>
      <svg className="countdown__ring" viewBox="0 0 54 54" aria-hidden="true">
        <circle className="countdown__track" cx="27" cy="27" r="23" />
        <circle className="countdown__fill" cx="27" cy="27" r="23" pathLength="100" />
      </svg>
      <span className="countdown__num">{seconds}</span>
    </div>
  )
}
