import { useMutation } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import type { Answer } from '../../../shared/api'
import type { PublicSubmission } from '../../../shared/game'
import { Countdown } from '@/components/countdown'
import { HostStage } from '@/components/host-stage'
import { circledFor, shouldNudge, sheetButton, sheetLine, tapOption, type Circle } from '@/game/answer-sheet'
import { hostExpression } from '@/game/cast'
import { debounce } from '@/game/debounce'
import { useGameStore } from '@/game/store'
import { useMsLeft } from '@/game/use-ms-left'
import { api } from '@/lib/api'
import { AnswerChoice } from './answer-choice'
import { AnswerText } from './answer-text'
import { usePlay } from './context'
import { errorCode, errorMessage } from './errors'
import { FieldError } from './field-error'
import { NoteIcon, PaperHead, ScreenTop } from './paper-parts'
import { answerText, choiceOptions, liveQuestion, promptId, roundNote } from './question'
import { QuestionMedia } from './question-media'

const DRAFT_MS = 500

/** Shows the server's confirmation at once, before the team_submission push arrives. */
function useKeepSubmission() {
  const setView = useGameStore((s) => s.setView)
  return useCallback(
    (submission: PublicSubmission) => {
      const view = useGameStore.getState().view
      if (view && view.state.current_event_question_id === submission.event_question_id) setView({ ...view, submission })
    },
    [setView],
  )
}

const asAnswer = (value: string | number): Answer => (typeof value === 'number' ? { number: value } : { text: value })

/** An open question of any type (design/screens/question-*.html, SPEC sections 5 and 7). A new question starts a fresh sheet. */
export function QuestionScreen({ paused }: { paused: boolean }) {
  const { live } = usePlay()
  const question = liveQuestion(live.view!.state)!
  return <QuestionSheet key={question.event_question_id} paused={paused} />
}

function QuestionSheet({ paused }: { paused: boolean }) {
  const { t } = useTranslation()
  const { live, playerId } = usePlay()
  const view = live.view!
  const question = liveQuestion(view.state)!
  const submission = view.submission
  const team = view.my_team!
  const eventQuestionId = question.event_question_id
  const readOnly = view.settings.team_submissions === 'captain_only' && team.captain_id !== playerId
  const keep = useKeepSubmission()

  const submit = useMutation({
    mutationFn: (answer: Answer) => api.submitAnswer({ event_question_id: eventQuestionId, answer, is_draft: false }),
    onSuccess: keep,
  })
  // Drafts fail quietly: the next keystroke tries again, and the send button reports problems.
  const draft = useMutation({
    mutationFn: (answer: Answer) => api.submitAnswer({ event_question_id: eventQuestionId, answer, is_draft: true }),
    onSuccess: keep,
  })
  const { mutate: saveDraftNow } = draft
  // The latest saver, so the debounced save survives re-renders with a fresh callback.
  const saver = useRef((value: string | number) => saveDraftNow(asAnswer(value)))
  useEffect(() => {
    saver.current = (value) => saveDraftNow(asAnswer(value))
  }, [saveDraftNow])
  // The ref is read when the timer fires, not during render; the rule can't tell.
  // oxlint-disable-next-line react/refs
  const [saveDraft] = useState(() => debounce((value: string | number) => saver.current(value), DRAFT_MS))
  // A draft still pending when the question closes would only be refused.
  useEffect(() => () => saveDraft.cancel(), [saveDraft])

  const choice = question.type === 'mc' || question.type === 'true_false'
  const numeric = question.type === 'closest_number'
  const msLeft = useMsLeft(view.state, live.offset)

  // What the team has sent (not a draft), and what this player has circled or typed.
  const sentAnswer = submission && !submission.is_draft ? submission.answer : null
  const sentOption = sentAnswer && 'option' in sentAnswer ? sentAnswer.option : null
  const sentValue = sentAnswer && !('option' in sentAnswer) ? ('text' in sentAnswer ? sentAnswer.text : sentAnswer.number) : null
  const [circle, setCircle] = useState<Circle>(null)
  const [text, setText] = useState(() => (submission?.answer && !('option' in submission.answer) ? answerText(submission.answer, question, t) : ''))
  const [invalid, setInvalid] = useState(false)
  const parse = (value: string): string | number | null => {
    const trimmed = value.trim()
    if (trimmed === '') return null
    if (!numeric) return trimmed
    const number = Number(trimmed.replace(/,/g, ''))
    return Number.isFinite(number) ? number : null
  }
  const circledOption = choice ? circledFor(circle, eventQuestionId) : null
  const picked: number | string | null = choice ? circledOption : parse(text)
  const sent = choice ? sentOption : sentValue
  const empty = choice ? circledOption === null : text.trim() === ''
  const { isSent, label } = sheetButton({ picked, sent, hasInput: !empty })
  const nudging = !readOnly && shouldNudge({ circled: picked, sent, msLeft, locked: paused })

  const send = () => {
    if (readOnly || paused || isSent) return
    if (picked === null) {
      setInvalid(!choice && numeric && !empty)
      return
    }
    saveDraft.cancel()
    submit.mutate(choice ? { option: picked as number } : asAnswer(picked))
  }
  const change = (value: string) => {
    setText(value)
    setInvalid(false)
    const parsed = parse(value)
    if (parsed !== null) saveDraft(parsed)
  }

  const shown = submission?.answer ? answerText(submission.answer, question, t) : null
  const captain = team.members.find((m) => m.id === team.captain_id)?.nickname ?? ''
  const teamSent = readOnly && sentAnswer !== null
  const line = sheetLine({ type: question.type, mediaKind: question.media_kind, paused, readOnly, sent: isSent || teamSent, nudging })
  const draftSaved = !choice && submission?.is_draft === true && submission.answer !== null && !isSent
  const headingId = promptId(eventQuestionId)

  return (
    <>
      <ScreenTop status={paused ? 'paused' : 'live'} note={roundNote(t, question.round, view.rounds.total)} />
      <HostStage host={view.cast.host} expression={hostExpression(view)} line={t(`host.lines.${line}`)} tone={paused ? 'butter' : 'peach'} />

      <article className="paper" aria-labelledby={headingId}>
        <PaperHead question={question} wager={submission?.wager ?? null}>
          <Countdown state={view.state} offset={live.offset} />
        </PaperHead>
        <div className="paper__body">
          <h1 className="question" id={headingId}>
            {question.prompt}
          </h1>
          <QuestionMedia question={question} disabled={paused} />
          {choice ? (
            <AnswerChoice
              options={choiceOptions(question, t)}
              circled={readOnly ? sentOption : circledOption}
              sent={sentOption}
              disabled={paused || readOnly}
              trueFalse={question.type === 'true_false'}
              text={{ group: readOnly ? t('question.teamOptions') : t('question.options'), sentTag: t('question.sentTag') }}
              onCircle={(option) => setCircle(tapOption(eventQuestionId, option))}
            />
          ) : (
            <AnswerText
              numeric={numeric}
              value={readOnly && shown ? shown : text}
              foot={draftSaved ? t('question.draftSaved') : numeric ? t('question.fieldFootNumber') : t('question.fieldFootText')}
              disabled={paused || readOnly}
              submitted={isSent || teamSent}
              invalid={invalid}
              onChange={change}
              onEnter={send}
            />
          )}
        </div>
      </article>

      <div className="screen__actions">
        {readOnly ? (
          <p className="note">
            <NoteIcon>
              <circle cx="12" cy="8" r="3.5" />
              <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />
              <path d="M8.5 3.5 12 2l3.5 1.5" />
            </NoteIcon>
            <span>
              <Trans i18nKey={teamSent ? 'question.noteCaptainSent' : 'question.noteCaptainNone'} values={{ captain, answer: shown }} components={{ b: <strong /> }} />
            </span>
          </p>
        ) : paused ? (
          <p className="note">
            <NoteIcon>
              <rect x="6.5" y="5" width="3.5" height="14" rx="1.2" />
              <rect x="14" y="5" width="3.5" height="14" rx="1.2" />
            </NoteIcon>
            <span>{t('question.pausedNote')}</span>
          </p>
        ) : (
          <>
            {/* The nudge has one home: here, for every question type. */}
            <div role="status" aria-live="polite">
              {nudging ? (
                <p className="note">
                  <NoteIcon>
                    <path d="M12 4v14" />
                    <path d="M6 13l6 6 6-6" />
                  </NoteIcon>
                  <span>{choice ? t('question.noteNudge') : t('question.noteNudgeText')}</span>
                </p>
              ) : null}
            </div>
            {submit.error ? (
              <div role="alert">
                <FieldError>{errorMessage(errorCode(submit.error), t)}</FieldError>
              </div>
            ) : null}
            {label ? (
              <button type="button" className="btn btn--primary btn--block" disabled={empty} onClick={send}>
                {label === 'send' ? t('question.send') : t('question.sendInstead')}
              </button>
            ) : null}
            {!isSent && !nudging ? <p className="small muted center">{empty ? t(choice ? 'question.hintTap' : numeric ? 'question.hintTypeNumber' : 'question.hintTypeText') : t('question.hintChange')}</p> : null}
            {/* The one "Sent!" confirmation: the option's own tag marks which answer, this says what to do next. */}
            <div role="status" aria-live="polite">
              {isSent ? (
                <p className="note">
                  <NoteIcon>
                    <path d="M21 3 10 14" />
                    <path d="M21 3l-7 18-4-7-7-4z" />
                  </NoteIcon>
                  <span>{choice ? t('question.noteSent') : t('question.noteSentText')}</span>
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </>
  )
}

