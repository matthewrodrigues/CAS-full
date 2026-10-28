import { Lightbulb } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ResultBadge } from '@/components/result-badge'
import { StatusBanner } from '@/components/status-banner'
import { usePlay } from './context'
import { liveQuestion, revealPayload, trueFalse } from './question'

/** After a reveal: the team's result, the right answer and the fun fact. Placeholder layout. */
export function RevealScreen() {
  const { t } = useTranslation()
  const { live } = usePlay()
  const view = live.view!
  const reveal = revealPayload(view.state)
  const question = liveQuestion(view.state)

  if (reveal && 'skipped' in reveal) {
    return (
      <section className="flex flex-col gap-4">
        <StatusBanner status="results">{t('play.status.results')}</StatusBanner>
        <h1 className="font-heading text-2xl font-semibold text-ink">{t('result.skipped')}</h1>
        <p className="text-lg text-ink-muted">{t('result.skippedBody')}</p>
      </section>
    )
  }

  const correct =
    !reveal ? null
    : reveal.type === 'mc' && reveal.correct_option !== null ? (question?.options?.[reveal.correct_option] ?? null)
    : reveal.type === 'true_false' && reveal.correct_option !== null ? trueFalse(t)[reveal.correct_option]
    : reveal.type === 'closest_number' ? String(reveal.numeric_answer)
    : reveal.correct_text
  const submission = view.submission?.answer || view.submission?.wager ? view.submission : null

  return (
    <section className="flex flex-col gap-4">
      <StatusBanner status="results">{t('play.status.results')}</StatusBanner>
      <ResultBadge result={submission?.answer ? submission.result : null} points={submission?.points ?? null} />
      {submission?.result === 'review' ? <p className="text-base text-ink-muted">{t('result.reviewBody')}</p> : null}
      {question ? <p className="text-lg text-ink">{question.prompt}</p> : null}
      {correct ? <p className="rounded-lg bg-surface p-4 text-xl font-semibold text-ink">{t('result.answer', { answer: correct })}</p> : null}
      {reveal?.fun_fact ? (
        <div className="flex gap-3 rounded-lg bg-surface p-4">
          <Lightbulb aria-hidden className="mt-1 size-6 shrink-0 text-depth" />
          <div>
            <h2 className="text-base font-semibold text-ink">{t('result.funFact')}</h2>
            <p className="text-lg text-ink">{reveal.fun_fact}</p>
          </div>
        </div>
      ) : null}
      <p className="text-base text-ink-muted">{t('result.next')}</p>
    </section>
  )
}
