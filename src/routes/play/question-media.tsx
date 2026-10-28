import { useTranslation } from 'react-i18next'
import type { LiveQuestion } from '../../../shared/game'

/** A question's picture or sound clip. Sound questions always show their caption (SPEC section 7). */
export function QuestionMedia({ question, muted }: { question: LiveQuestion; muted: string }) {
  const { t } = useTranslation()
  if (question.media_kind === 'none' || !question.media_url) return null

  if (question.media_kind === 'image') {
    return (
      <figure className="flex flex-col gap-2">
        <img src={question.media_url} alt={t('question.image')} className="w-full rounded-lg" />
        {question.caption ? <figcaption className={muted}>{question.caption}</figcaption> : null}
      </figure>
    )
  }

  return (
    <figure className="flex flex-col gap-2" aria-label={t('question.audio')}>
      <audio src={question.media_url} controls preload="auto" className="w-full" />
      {question.caption ? (
        <figcaption className={muted}>
          <span className="font-medium">{t('question.caption')}</span> {question.caption}
        </figcaption>
      ) : null}
    </figure>
  )
}
