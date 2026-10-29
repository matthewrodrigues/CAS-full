import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PublicGameState } from '../../shared/game'
import { remainingMs } from '@/game/clock'
import { cn } from '@/lib/utils'

/**
 * Time left on the server's clock (docs/SPEC.md section 5, Timing), frozen while paused.
 * role="timer" is not announced as it ticks; the live region announces only phase changes.
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
  const total = Math.max(1, state.closes_at - state.opens_at)
  const seconds = Math.ceil(left / 1000)
  const urgent = seconds <= 5

  return (
    <div className="flex items-center gap-3">
      <div className="h-4 flex-1 overflow-hidden rounded-full border-2 border-brand-deep bg-surface" aria-hidden>
        <div
          className={cn('h-full rounded-full transition-[width] duration-300 ease-linear motion-reduce:transition-none', urgent ? 'bg-urgent' : 'bg-brand')}
          style={{ width: `${Math.min(100, (left / total) * 100)}%` }}
        />
      </div>
      <div
        role="timer"
        aria-label={t('question.timer')}
        className={cn('min-w-16 rounded-full border-2 border-brand-deep px-2 py-1 text-center text-lg font-semibold text-ink tabular-nums shadow-pop-sm', urgent ? 'bg-urgent' : 'bg-surface')}
      >
        {t('question.seconds', { count: seconds })}
      </div>
    </div>
  )
}
