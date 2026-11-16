import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { LiveQuestion } from '../../../shared/game'
import { StatusPill, type PillStatus } from '@/components/status-pill'

/** Every play screen's top row (kit.md section 6): the one status pill, and a hand note on the right. */
export function ScreenTop({ status, note }: { status: PillStatus; note: string }) {
  return (
    <div className="screen__top">
      <StatusPill status={status} />
      <p className="hand hand--sm">{note}</p>
    </div>
  )
}

/** The ruled header of a paper card: question number and points on the left, `children` (the countdown) on the right. */
export function PaperHead({ question, wager = null, children }: { question: LiveQuestion; wager?: number | null; children?: ReactNode }) {
  const { t } = useTranslation()
  const round = question.round.title
  // The wager round's question is worth the team's wager, not a fixed number of points.
  const small =
    question.round.format !== 'wager' ? t('question.roundPoints', { round, count: question.points })
    : wager !== null ? t('question.roundWager', { round, amount: wager })
    : t('question.roundOnly', { round })
  return (
    <header className="paper__head">
      <div className="paper__meta">
        <p className="hand">{t('question.of', { number: question.number, of: question.of })}</p>
        <p className="small">{small}</p>
      </div>
      {children}
    </header>
  )
}

/** The pen-blue icon on a `.note` slip (kit.md section 7). */
export function NoteIcon({ children }: { children: ReactNode }) {
  return (
    <svg className="note__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

