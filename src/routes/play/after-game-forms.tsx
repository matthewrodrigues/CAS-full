import { useMutation } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { errorCode, errorMessage } from './errors'

/** Post-game 1–5 feedback (docs/SPEC.md section 8, Milestone 6). */
export function FeedbackForm({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const id = useId()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const send = useMutation({ mutationFn: () => api.submitFeedback({ event_id: eventId, rating, comment: comment.trim() || undefined }) })

  if (send.isSuccess) return <p className="rounded-lg bg-surface p-4 text-lg text-ink">{t('feedback.thanks')}</p>
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (rating) send.mutate()
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg bg-surface p-4" noValidate>
      <h2 className="text-xl font-semibold text-ink">{t('feedback.title')}</h2>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-base text-ink-muted">{t('feedback.legend')}</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <label key={value} className="relative flex size-11 cursor-pointer items-center justify-center rounded-lg has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring">
              <input type="radio" name={`${id}-rating`} value={value} checked={rating === value} onChange={() => setRating(value)} className="sr-only" />
              <span className="sr-only">{t('feedback.star', { count: value })}</span>
              <Star aria-hidden className={cn('size-8', value <= rating ? 'fill-win text-ink' : 'text-ink-muted')} />
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor={`${id}-comment`} className="text-base font-medium text-ink">
        {t('feedback.comment')}
      </label>
      <textarea
        id={`${id}-comment`}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={1000}
        rows={3}
        className="w-full rounded-lg border border-border bg-surface p-3 text-lg text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />
      {send.error ? (
        <p role="alert" className="text-base font-medium text-incorrect">
          {errorMessage(errorCode(send.error), t)}
        </p>
      ) : null}
      <Button type="submit" variant="outline" disabled={!rating || send.isPending}>
        {t('feedback.submit')}
      </Button>
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

  if (send.isSuccess) return <p className="rounded-lg bg-surface p-4 text-lg text-ink">{t('newsletter.thanks')}</p>
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!consent) return setNeedConsent(true)
    if (email.trim()) send.mutate()
  }
  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg bg-surface p-4" noValidate>
      <h2 className="text-xl font-semibold text-ink">{t('newsletter.title')}</h2>
      <label htmlFor={`${id}-email`} className="text-base font-medium text-ink">
        {t('newsletter.email')}
      </label>
      <Input id={`${id}-email`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      <label className="flex min-h-11 items-start gap-3 text-base text-ink">
        <input type="checkbox" checked={consent} onChange={(e) => {
            setConsent(e.target.checked)
            setNeedConsent(false)
          }} className="mt-1 size-5 accent-brand-deep" />
        <span>{t('newsletter.consent')}</span>
      </label>
      {needConsent || send.error ? (
        <p role="alert" className="text-base font-medium text-incorrect">
          {needConsent ? t('newsletter.needConsent') : errorMessage(errorCode(send.error), t)}
        </p>
      ) : null}
      <Button type="submit" variant="outline" disabled={send.isPending}>
        {t('newsletter.submit')}
      </Button>
      <Link to="/privacy" className="text-base text-ink underline underline-offset-4">
        {t('newsletter.privacy')}
      </Link>
    </form>
  )
}
