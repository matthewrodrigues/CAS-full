import { useTranslation } from 'react-i18next'
import { StatusBanner } from '@/components/status-banner'
import { usePlay } from './context'
import { answerText, liveQuestion } from './question'

/** Between the lock and the reveal: the team's final answer, waiting for the host. */
export function LockedScreen() {
  const { t } = useTranslation()
  const { live } = usePlay()
  const view = live.view!
  const question = liveQuestion(view.state)
  const answer = view.submission?.answer

  return (
    <section className="flex flex-col gap-5">
      <StatusBanner status="locked">{t('play.status.locked')}</StatusBanner>
      <h1 className="font-heading text-3xl font-semibold text-ink">{t('locked.title')}</h1>
      {question ? <p className="text-xl text-ink">{question.prompt}</p> : null}
      <p className="rounded-lg bg-surface p-4 text-lg font-medium text-ink">
        {answer && question ? t('question.yourAnswer', { answer: answerText(answer, question, t) }) : t('question.noAnswer')}
      </p>
      <p className="text-base text-ink-muted">{t('locked.waiting')}</p>
    </section>
  )
}
