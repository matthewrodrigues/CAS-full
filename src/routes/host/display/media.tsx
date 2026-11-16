import { useTranslation } from 'react-i18next'
import type { LiveQuestion } from '../../../../shared/game'

/** A question's picture or sound clip, with its caption line, on the paper. */
export function BigMedia({ question }: { question: LiveQuestion }) {
  const { t } = useTranslation()
  if (question.media_kind === 'none' || !question.media_url) return null
  const caption = question.caption ? (
    <p className="caption-line">
      <svg className="caption-line__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9h4l5-4v14l-5-4H4z" />
        <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
      </svg>
      <span>
        <span className="sr-only">{t('question.caption')} </span>
        {question.caption}
      </span>
    </p>
  ) : null
  return question.media_kind === 'image' ? (
    <figure className="stack">
      <img src={question.media_url} alt={t('question.image')} className="max-h-72 w-auto self-start rounded-lg" />
      {caption}
    </figure>
  ) : (
    <figure className="stack" aria-label={t('question.audio')}>
      <audio src={question.media_url} controls preload="auto" className="w-full" />
      {caption}
    </figure>
  )
}
