import { useMutation } from '@tanstack/react-query'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { HostStage } from '@/components/host-stage'
import { StatusPill } from '@/components/status-pill'
import { api } from '@/lib/api'
import { usePlay } from './context'
import { errorCode, errorMessage } from './errors'

const icon = (children: ReactNode, className = 'btn__icon') => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)

const STAR = <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />

/** A form error (kit.md §9): icon plus words, never color alone. Put it inside a `role="alert"` region. */
export function FieldError({ children }: { children: ReactNode }) {
  return (
    <p className="field__error row">
      {icon(
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5v5" />
          <path d="M12 16.2h.01" />
        </>,
      )}
      <span>{children}</span>
    </p>
  )
}

/**
 * The feedback screen (design/screens/feedback.html), a screen of its own so the end screen stays one idea:
 * Rocco, 1-5 stars with a comment, then the newsletter opt-in. Play stays the current tab.
 */
export function FeedbackScreen() {
  const { t } = useTranslation()
  const { eventId, joinCode } = usePlay()
  const [sent, setSent] = useState(false)
  return (
    <>
      <div className="screen__top">
        <StatusPill status="results" />
        <p className="hand hand--sm">{t('play.gameCode', { code: joinCode })}</p>
      </div>
      <HostStage host="rocco" expression={sent ? 'cheering' : 'relaxing'} line={sent ? t('host.lines.feedbackThanks') : t('host.lines.feedbackRelax')} tone="peach" />
      <FeedbackForm eventId={eventId} onSent={() => setSent(true)} />
      <NewsletterForm />
    </>
  )
}

/** Post-game 1-5 feedback (docs/SPEC.md section 8). The send button waits for a rating. */
export function FeedbackForm({ eventId, onSent }: { eventId: string; onSent?: () => void }) {
  const { t } = useTranslation()
  const id = useId()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const send = useMutation({
    mutationFn: () => api.submitFeedback({ event_id: eventId, rating, comment: comment.trim() || undefined }),
    onSuccess: () => onSent?.(),
  })

  if (send.isSuccess)
    return (
      <div role="status" aria-live="polite">
        <p className="note">
          {icon(<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" />, 'note__icon')}
          <span>{t('feedback.thanks')}</span>
        </p>
      </div>
    )
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (rating) send.mutate()
  }
  return (
    <form onSubmit={submit} className="card" aria-labelledby={`${id}-title`} noValidate>
      <h1 className="h1" id={`${id}-title`}>
        {t('feedback.title')}
      </h1>
      <fieldset className="rating">
        <legend className="rating__legend">{t('feedback.legend')}</legend>
        <div className="rating__stars">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className={value <= rating ? 'rating__star is-on' : 'rating__star'}>
              <input type="radio" name={`${id}-rating`} value={value} checked={rating === value} onChange={() => setRating(value)} />
              <svg viewBox="0 0 24 24" strokeWidth={1.8} strokeLinejoin="round" aria-hidden="true">
                {STAR}
              </svg>
              <span className="sr-only">{t('feedback.star', { count: value })}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label className="field__label" htmlFor={`${id}-comment`}>
          {t('feedback.comment')}
        </label>
        <textarea
          className="field__input field__input--area"
          id={`${id}-comment`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={3}
          aria-describedby={`${id}-comment-foot`}
        />
        <div className="field__foot" id={`${id}-comment-foot`}>
          <span>{t('feedback.commentHint')}</span>
          <span className="field__count">{comment.length} / 1000</span>
        </div>
      </div>
      {send.error ? (
        <div role="alert">
          <FieldError>{errorMessage(errorCode(send.error), t)}</FieldError>
        </div>
      ) : null}
      <button type="submit" className="btn btn--primary btn--block" disabled={!rating || send.isPending}>
        {t('feedback.submit')}
      </button>
    </form>
  )
}

/** Newsletter opt-in: an unticked checkbox, and consent is stored with the address. */
export function NewsletterForm() {
  const { t } = useTranslation()
  const id = useId()
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [needConsent, setNeedConsent] = useState(false)
  const send = useMutation({ mutationFn: () => api.newsletterOptin({ email: email.trim(), consent: true }) })

  if (send.isSuccess)
    return (
      <div role="status" aria-live="polite">
        <p className="note">
          {icon(
            <>
              <rect x="3" y="5" width="18" height="14" rx="3" />
              <path d="m4 7 8 6 8-6" />
            </>,
            'note__icon',
          )}
          <span>{t('newsletter.thanks')}</span>
        </p>
      </div>
    )
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!consent) return setNeedConsent(true)
    if (email.trim()) send.mutate()
  }
  return (
    <form onSubmit={submit} className="card" aria-labelledby={`${id}-title`} noValidate>
      <h2 className="h2" id={`${id}-title`}>
        {t('newsletter.title')}
      </h2>
      <div className="field">
        <label className="field__label" htmlFor={`${id}-email`}>
          {t('newsletter.email')}
        </label>
        <input
          className="field__input"
          id={`${id}-email`}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder={t('newsletter.placeholder')}
        />
      </div>
      <label className="check">
        <span className="check__control">
          <input
            type="checkbox"
            checked={consent}
            aria-describedby={`${id}-consent-error`}
            onChange={(e) => {
              setConsent(e.target.checked)
              setNeedConsent(false)
            }}
          />
          <span className="check__box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12.5l4.5 4.5L19 7" />
            </svg>
          </span>
        </span>
        <span className="check__text">{t('newsletter.consent')}</span>
      </label>
      <div role="alert" id={`${id}-consent-error`}>
        {needConsent || send.error ? <FieldError>{needConsent ? t('newsletter.needConsent') : errorMessage(errorCode(send.error), t)}</FieldError> : null}
      </div>
      <button type="submit" className="btn btn--secondary btn--block" disabled={send.isPending}>
        {t('newsletter.submit')}
      </button>
      <Link to="/privacy" className="btn btn--quiet">
        {t('newsletter.privacy')}
      </Link>
    </form>
  )
}
