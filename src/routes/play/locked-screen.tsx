import { useTranslation } from 'react-i18next'
import { HostStage } from '@/components/host-stage'
import { hostExpression } from '@/game/cast'
import { usePlay } from './context'
import { NoteIcon, PaperHead, ScreenTop } from './paper-parts'
import { answerText, liveQuestion, promptId, roundNote } from './question'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']
const TF_LETTERS = ['T', 'F']

/** Between the lock and the reveal (design/screens/locked.html): the team's final answer on a torn sheet, waiting for the host. */
export function LockedScreen() {
  const { t } = useTranslation()
  const { live } = usePlay()
  const view = live.view!
  const question = liveQuestion(view.state)
  const answer = view.submission?.answer ?? null

  if (!question) return null
  const letters = question.type === 'true_false' ? TF_LETTERS : LETTERS
  const letter = answer && 'option' in answer ? letters[answer.option] : null
  const headingId = promptId(question.event_question_id)

  return (
    <>
      <ScreenTop status="locked" note={roundNote(t, question.round)} />
      <HostStage host={view.cast.host} expression={hostExpression(view)} line={t(answer ? 'host.lines.locked' : 'host.lines.lockedNone')} tone="butter" hero />

      <div className="paper-shadow">
        <article className="paper paper--torn" aria-labelledby={headingId}>
          <PaperHead question={question} wager={view.submission?.wager ?? null} />
          <div className="paper__body">
            <h1 className="question" id={headingId}>
              {question.prompt}
            </h1>
            {answer ? (
              <>
                <p className="hand">{t('locked.ourAnswer')}</p>
                <ul className="options" aria-label={t('question.teamOptions')}>
                  <li>
                    <button type="button" className="option" aria-pressed="true" disabled>
                      {letter ? (
                        <span className="option__letter" aria-hidden="true">
                          {letter}
                        </span>
                      ) : null}
                      <span className="option__label">{answerText(answer, question, t)}</span>
                      <span className="option__note">{t('question.sentTag')}</span>
                    </button>
                  </li>
                </ul>
              </>
            ) : null}
            <p className="note">
              <NoteIcon>
                <rect x="5" y="11" width="14" height="10" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </NoteIcon>
              <span>{t(answer ? 'locked.note' : 'locked.noAnswerNote')}</span>
            </p>
          </div>
        </article>
      </div>
    </>
  )
}
