import { useTranslation } from 'react-i18next'
import type { GameView } from '../../../../shared/game'
import { HostStage } from '@/components/host-stage'
import { bigExpression } from '@/game/big-screen'
import { useMsLeft } from '@/game/use-ms-left'
import { choiceOptions, liveQuestion } from '../../play/question'
import { BigCountdown } from './countdown'
import { roundLabel, useRounds } from './data'
import { BigFrame } from './frame'
import { BigMedia } from './media'

export type PhaseProps = { view: GameView; paused: boolean }

/** The open question (big-question) and, once the host locks, the same paper with the clock stopped (big-locked). */
export function QuestionView({ view, paused, offset, locked }: PhaseProps & { offset: number; locked: boolean }) {
  const { t } = useTranslation()
  const question = liveQuestion(view.state)
  const msLeft = useMsLeft(view.state, offset)
  const rounds = useRounds(view.event.id).data
  if (!question) return null
  const round = roundLabel(t, question.round.position, rounds?.length)
  const code = view.event.join_code
  const answered = view.host
    ? t(locked ? 'display.answeredLocked' : 'display.answeredLive', { answered: view.host.answered_teams, total: view.teams.length })
    : null
  const nudge = !locked && !paused && view.state.closes_at !== null && msLeft > 0 && msLeft <= 5000
  const line = paused ? t('host.lines.bigPaused') : locked ? t('host.lines.bigLocked') : nudge ? t('host.lines.bigNudge') : t('host.lines.bigAsking')
  const expression = paused ? bigExpression('paused') : bigExpression(locked ? 'locked' : 'live')
  const options = question.type === 'mc' || question.type === 'true_false' ? choiceOptions(question, t) : []

  const stage = (
    <HostStage host={view.cast.host} expression={expression} line={line} tone={locked ? 'butter' : 'peach'} hero size={400} idle={false}>
      {answered ? <p className="body">{answered}</p> : null}
    </HostStage>
  )

  return (
    <BigFrame pill={paused ? 'paused' : locked ? 'locked' : 'live'} note={locked ? round : t('display.late', { round, code })} stage={stage}>
      <div className={locked ? 'paper-shadow' : undefined}>
        <article className={locked ? 'paper paper--torn' : 'paper'} aria-labelledby="prompt">
          <header className="paper__head">
            <div className="paper__meta">
              <p className="hand">{t('question.of', { number: question.number, of: question.of })}</p>
              <p className="small">{t('display.roundPoints', { round: question.round.title, points: t('question.points', { count: question.points }) })}</p>
            </div>
            {locked ? <p className="hand">{t('display.timesUp')}</p> : <BigCountdown state={view.state} msLeft={msLeft} />}
          </header>
          <div className="paper__body">
            <h1 className="question" id="prompt" data-role="question">
              {question.prompt}
            </h1>
            <BigMedia question={question} />
            {options.length ? (
              <ul className="options" aria-label={t('display.answers')}>
                {options.map((option, i) => (
                  <li key={option}>
                    <div className="option option--static" aria-disabled={locked ? 'true' : undefined}>
                      <span className="option__letter" aria-hidden="true">
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span className="option__label">{option}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </article>
      </div>
    </BigFrame>
  )
}
