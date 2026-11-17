import { useTranslation } from 'react-i18next'
import { HostStage } from '@/components/host-stage'
import { bigExpression } from '@/game/big-screen'
import { liveQuestion, revealPayload, trueFalse } from '../../play/question'
import { roundLabel } from './data'
import { BigFrame } from './frame'
import type { PhaseProps } from './question'

/** After a reveal (big-reveal): the right answer and the fun fact on the paper. A skipped question says so. */
export function Reveal({ view, paused }: PhaseProps) {
  const { t } = useTranslation()
  const reveal = revealPayload(view.state)
  const question = liveQuestion(view.state)
  if (!reveal) return null
  const skipped = 'skipped' in reveal
  const answer = skipped
    ? null
    : reveal.type === 'mc' && reveal.correct_option !== null ? question?.options?.[reveal.correct_option]
    : reveal.type === 'true_false' && reveal.correct_option !== null ? trueFalse(t)[reveal.correct_option]
    : reveal.type === 'closest_number' ? String(reveal.numeric_answer)
    : reveal.correct_text
  const note = question ? roundLabel(t, question.round.position, view.rounds.total) : t('display.roundBreak')

  const stage = (
    <HostStage
      host={view.cast.host}
      expression={paused ? bigExpression('paused') : bigExpression('revealed')}
      line={paused ? t('host.lines.bigPaused') : skipped ? t('host.lines.bigSkipped') : t('host.lines.bigRevealed')}
      tone="sky"
      hero
      size={400}
    />
  )

  return (
    <BigFrame pill={paused ? 'paused' : 'results'} note={note} stage={stage}>
      <article className="paper" aria-labelledby="prompt">
        <header className="paper__head">
          <div className="paper__meta">
            {question ? <p className="hand">{t('question.of', { number: question.number, of: question.of })}</p> : null}
            {question ? <p className="small">{t('display.roundPoints', { round: question.round.title, points: t('question.points', { count: question.points }) })}</p> : null}
          </div>
          <p className="hand">{skipped ? t('display.skipped') : t('display.theAnswer')}</p>
        </header>
        <div className="paper__body">
          {skipped ? (
            <>
              <h1 className="question" id="prompt">
                {t('display.skipped')}
              </h1>
              <p className="h2 muted">{t('display.skippedBody')}</p>
            </>
          ) : (
            <>
              <h1 className="question" id="prompt" data-role="question">
                {question?.prompt}
              </h1>
              {answer ? (
                <div className="option option--static option--answer is-correct">
                  <span className="option__mark option__mark--correct">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12.5l4.5 4.5L19 7" />
                    </svg>
                  </span>
                  <span className="option__label">
                    <span className="sr-only">{t('display.correctAnswer')}</span>
                    {answer}
                  </span>
                </div>
              ) : null}
              {reveal.fun_fact ? (
                <div className="fact">
                  <svg className="fact__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 18h6M10 21h4" />
                    <path d="M12 3a6 6 0 0 0-3.6 10.8c.8.6 1.1 1.4 1.1 2.2h5c0-.8.3-1.6 1.1-2.2A6 6 0 0 0 12 3z" />
                  </svg>
                  <div>
                    <p className="fact__label">{t('display.funFact')}</p>
                    <p>{reveal.fun_fact}</p>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </article>
    </BigFrame>
  )
}
