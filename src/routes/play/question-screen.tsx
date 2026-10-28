import { useMutation } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { Answer } from '../../../shared/api'
import type { PublicSubmission } from '../../../shared/game'
import { Countdown } from '@/components/countdown'
import { StatusBanner } from '@/components/status-banner'
import { useGameStore } from '@/game/store'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { AnswerChoice } from './answer-choice'
import { AnswerText } from './answer-text'
import { usePlay } from './context'
import { errorCode, errorMessage } from './errors'
import { answerText, choiceOptions, liveQuestion } from './question'
import { QuestionMedia } from './question-media'

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

/** An open question of any type (SPEC sections 5 and 7). Placeholder layout until the design lands. */
export function QuestionScreen({ paused }: { paused: boolean }) {
  const { t } = useTranslation()
  const { live, playerId } = usePlay()
  const view = live.view!
  const question = liveQuestion(view.state)!
  const submission = view.submission
  const team = view.my_team!
  const violet = view.settings.live_background === 'violet'
  const muted = violet ? 'text-info-soft' : 'text-ink-muted'
  const readOnly = view.settings.team_submissions === 'captain_only' && team.captain_id !== playerId
  const keep = useKeepSubmission()
  const eventQuestionId = question.event_question_id

  const submit = useMutation({
    mutationFn: (answer: Answer) => api.submitAnswer({ event_question_id: eventQuestionId, answer, is_draft: false }),
    onSuccess: keep,
  })
  // Drafts fail quietly: the next keystroke tries again, and the submit button reports problems.
  const draft = useMutation({
    mutationFn: (answer: Answer) => api.submitAnswer({ event_question_id: eventQuestionId, answer, is_draft: true }),
    onSuccess: keep,
  })
  const asAnswer = (value: string | number): Answer => (typeof value === 'number' ? { number: value } : { text: value })
  const { mutate: saveDraft } = draft
  const onDraft = useCallback((value: string | number) => saveDraft(asAnswer(value)), [saveDraft])

  const choice = question.type === 'mc' || question.type === 'true_false'
  const chosen = submission?.answer && 'option' in submission.answer ? submission.answer.option : null
  const shown = submission?.answer ? answerText(submission.answer, question, t) : null
  const initial = submission?.answer && !('option' in submission.answer) ? answerText(submission.answer, question, t) : ''

  return (
    <section className={cn('flex flex-col gap-5 rounded-xl', violet ? 'bg-brand-deep p-4 text-surface' : 'text-ink')}>
      {paused ? null : <StatusBanner status="live">{t('play.status.live')}</StatusBanner>}
      <p className={cn('text-base', muted)}>
        {t('question.meta', { round: question.round.title, number: question.number, of: question.of })} · {t('question.points', { count: question.points })}
      </p>
      <h1 className="font-heading text-2xl leading-snug font-semibold">{question.prompt}</h1>
      <QuestionMedia question={question} muted={cn('text-base', muted)} />
      <Countdown state={view.state} offset={live.offset} />

      {readOnly ? (
        <p className="rounded-lg bg-surface p-4 text-lg text-ink">{t('question.captainOnly')}</p>
      ) : choice ? (
        <AnswerChoice options={choiceOptions(question, t)} selected={chosen} disabled={paused} violet={violet} onPick={(option) => submit.mutate({ option })} />
      ) : (
        <AnswerText
          key={eventQuestionId}
          numeric={question.type === 'closest_number'}
          initial={initial}
          disabled={paused}
          violet={violet}
          onDraft={onDraft}
          onSubmit={(value) => submit.mutate(asAnswer(value))}
        />
      )}

      <div role="status" className="flex flex-col gap-1 text-lg">
        {submission?.wager != null ? <p className="font-semibold">{t('wager.current', { amount: submission.wager })}</p> : null}
        {shown && (choice && !readOnly) ? <p className="font-medium">{t('question.yourAnswer', { answer: shown })}</p> : null}
        {shown && !choice && !readOnly ? <p className="font-medium">{submission?.is_draft ? t('question.draftSaved') : t('question.submitted')}</p> : null}
        {shown && (readOnly || (!choice && !submission?.is_draft)) ? <p>{t('question.teamAnswer', { answer: shown })}</p> : null}
      </div>
      {submit.error ? (
        <p role="alert" className={cn('text-base font-medium', violet ? 'text-surface' : 'text-incorrect')}>
          {errorMessage(errorCode(submit.error), t)}
        </p>
      ) : null}
    </section>
  )
}
