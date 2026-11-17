import { useTranslation } from 'react-i18next'
import { HostStage } from '@/components/host-stage'
import { hostExpression } from '@/game/cast'
import { usePlay } from './context'
import { PaperHead, ScreenTop } from './paper-parts'
import { liveQuestion, promptId, revealPayload, revealRows, roundNote, type RevealRow } from './question'

const CHECK = <path d="M5 12.5l4.5 4.5L19 7" />
const CROSS = <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />

const icon = (paths: React.ReactNode, className: string, width: number) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {paths}
  </svg>
)

/**
 * After a reveal (design/screens/reveal-correct.html, reveal-incorrect.html): the host reacts on a sky
 * stage with the result badge, then the paper shows the right answer (and our pick) and the fun fact.
 */
export function RevealScreen() {
  const { t } = useTranslation()
  const { live } = usePlay()
  const view = live.view!
  const reveal = revealPayload(view.state)
  const question = liveQuestion(view.state)
  if (!question) return null

  const skipped = reveal !== null && 'skipped' in reveal
  const submission = view.submission?.answer || view.submission?.wager != null ? view.submission : null
  const result = submission?.answer ? submission.result : null
  const points = submission?.points ?? null
  const host = view.cast.host
  const expression = hostExpression(view)
  const headingId = 'result-heading'

  const stageLine = skipped ? 'skipped' : result === 'correct' ? 'correct' : result === 'incorrect' ? 'incorrect' : result === 'review' ? 'review' : 'noAnswer'
  const badge = skipped ? null : result === 'correct' ? 'correct' : result === 'incorrect' ? 'incorrect' : result === 'review' ? 'review' : 'none'
  const pointsLine =
    result === 'review' ? t('result.reviewBody')
    : points && points > 0 ? t('result.gained', { count: points })
    : points && points < 0 ? t('result.lost', { count: Math.abs(points) })
    : result === 'correct' || result === 'incorrect' ? t('result.noPoints')
    : null

  const rows = reveal && !skipped ? revealRows({ question, reveal, answer: submission?.answer ?? null, result, t }) : []
  const funFact = reveal && 'fun_fact' in reveal ? reveal.fun_fact : null
  const trueFalse = question.type === 'true_false'

  return (
    <>
      <ScreenTop status="results" note={roundNote(t, question.round)} />
      <HostStage host={host} expression={expression} line={t(`host.lines.${stageLine}`)} tone={result === 'correct' ? 'sky' : 'peach'} hero labelledBy={headingId}>
        {badge === null ? (
          <div className="stack stack--tight">
            <h1 className="h1" id={headingId}>
              {t('result.skipped')}
            </h1>
            <p className="body">{t('result.skippedBody')}</p>
          </div>
        ) : (
          <>
            <h1 className={badge === 'correct' ? 'result result--correct' : badge === 'incorrect' ? 'result result--incorrect' : 'result bg-surface text-ink'} id={headingId}>
              {badge === 'correct' ? icon(CHECK, 'result__icon', 3) : badge === 'incorrect' ? icon(CROSS, 'result__icon', 3) : icon(badge === 'review' ? <><circle cx="11" cy="11" r="6" /><path d="M16 16l4 4" /></> : <path d="M6 12h12" />, 'result__icon', 3)}
              {t(`result.${badge}`)}
            </h1>
            {pointsLine ? <p className="hand hand--ink">{pointsLine}</p> : null}
          </>
        )}
      </HostStage>

      <article className="paper" aria-labelledby={promptId(question.event_question_id)}>
        <PaperHead question={question} wager={view.submission?.wager ?? null} />
        <div className="paper__body">
          <h2 className="question" id={promptId(question.event_question_id)}>
            {question.prompt}
          </h2>
          {rows.length > 0 ? (
            <ul className={trueFalse ? 'options options--tf' : 'options'} aria-label={t('result.answers')}>
              {rows.map((row) => (
                <li key={`${row.kind}-${row.label}`}>
                  <RevealOption row={row} trueFalse={trueFalse} />
                </li>
              ))}
            </ul>
          ) : null}
          {funFact ? (
            <div className="fact">
              {icon(
                <>
                  <path d="M9 18h6M10 21h4" />
                  <path d="M12 3a6 6 0 0 0-3.6 10.8c.8.6 1.1 1.4 1.1 2.2h5c0-.8.3-1.6 1.1-2.2A6 6 0 0 0 12 3z" />
                </>,
                'fact__icon',
                2.2,
              )}
              <div>
                <p className="fact__label">{t('result.funFact')}</p>
                <p>{funFact}</p>
              </div>
            </div>
          ) : null}
        </div>
      </article>

      <div className="screen__actions">
        <p className="small muted center">{t('result.next')}</p>
      </div>
    </>
  )
}

function RevealOption({ row, trueFalse }: { row: RevealRow; trueFalse: boolean }) {
  const { t } = useTranslation()
  const classes = ['option', 'option--static', trueFalse ? 'option--tf' : null, row.kind === 'correct' ? 'is-correct' : row.kind === 'incorrect' ? 'is-incorrect' : null].filter(Boolean).join(' ')
  return (
    <div className={classes}>
      {row.kind === 'neutral' ? null : <span className={`option__mark option__mark--${row.kind}`}>{icon(row.kind === 'correct' ? <path d="M5 12.5l4.5 4.5L19 7" /> : CROSS, '', 3)}</span>}
      {row.kind === 'neutral' ? null : <span className="sr-only">{row.kind === 'correct' ? t('result.rightAnswer') : t('result.notThisOne')}</span>}
      <span className="option__label">{row.label}</span>
      {row.mine ? <span className="option__note option__note--muted">{t('result.ourPick')}</span> : null}
    </div>
  )
}
