import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

export type PillStatus = 'waiting' | 'live' | 'locked' | 'results' | 'paused' | 'wager'

const svg = (children: ReactNode) => (
  <svg className="pill__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

const dot = <span className="pill__dot" aria-hidden="true" />

/** Each status's icon (kit.md §10): hourglass, breathing dot, lock, star, pause bars, breathing dot. */
const ICON: Record<PillStatus, ReactNode> = {
  waiting: svg(
    <>
      <path d="M6 3h12" />
      <path d="M6 21h12" />
      <path d="M7 3c0 5 10 5 10 9s-10 4-10 9" />
      <path d="M17 3c0 5-10 5-10 9s10 4 10 9" />
    </>,
  ),
  live: dot,
  locked: svg(
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>,
  ),
  results: svg(<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />),
  paused: svg(
    <>
      <rect x="6.5" y="5" width="3.5" height="14" rx="1.2" />
      <rect x="14" y="5" width="3.5" height="14" rx="1.2" />
    </>,
  ),
  wager: dot,
}

/**
 * The game's status: one per play screen, in `.screen__top` (kit.md §10). Icon plus the fixed
 * status words, inside a polite live region so a change is announced.
 */
export function StatusPill({ status }: { status: PillStatus }) {
  const { t } = useTranslation()
  return (
    <div role="status" aria-live="polite">
      <span className={`pill pill--${status}`}>
        {ICON[status]}
        {t(`play.status.${status}`)}
      </span>
    </div>
  )
}
