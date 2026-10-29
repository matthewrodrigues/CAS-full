import { useMutation } from '@tanstack/react-query'
import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { StatusBanner } from '@/components/status-banner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useGameStore } from '@/game/store'
import { api } from '@/lib/api'
import { usePlay } from './context'
import { errorCode, errorMessage } from './errors'

/** final_wager: bet 0 up to the team's score; the last wager before the question opens wins. */
export function WagerScreen() {
  const { t } = useTranslation()
  const { live, playerId } = usePlay()
  const view = live.view!
  const team = view.my_team!
  const id = useId()
  const [amount, setAmount] = useState(view.submission?.wager != null ? String(view.submission.wager) : '')
  const setView = useGameStore((s) => s.setView)
  const readOnly = view.settings.team_submissions === 'captain_only' && team.captain_id !== playerId
  const place = useMutation({
    mutationFn: (value: number) => api.submitWager({ event_question_id: view.state.current_event_question_id!, amount: value }),
    onSuccess: (submission) => {
      const current = useGameStore.getState().view
      if (current) setView({ ...current, submission })
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = Number(amount)
    if (amount.trim() !== '' && Number.isInteger(value) && value >= 0) place.mutate(value)
  }

  return (
    <section className="flex flex-col gap-4">
      <StatusBanner status="waiting">{t('wager.title')}</StatusBanner>
      <h1 className="font-heading text-3xl font-semibold text-ink">{t('wager.title')}</h1>
      <p className="text-lg text-ink-muted">{t('wager.intro')}</p>
      <p className="text-xl font-medium text-ink">{team.score > 0 ? t('wager.score', { count: team.score }) : t('wager.none')}</p>
      {readOnly ? (
        <p className="rounded-lg bg-surface p-4 text-lg text-ink">{t('wager.captainOnly')}</p>
      ) : team.score > 0 ? (
        <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
          <label htmlFor={id} className="text-base font-medium text-ink">
            {t('wager.label')}
          </label>
          <Input id={id} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" autoComplete="off" />
          <Button type="submit" size="lg" disabled={place.isPending}>
            {t('wager.submit')}
          </Button>
        </form>
      ) : null}
      {place.error ? (
        <p role="alert" className="text-base font-medium text-incorrect">
          {errorMessage(errorCode(place.error), t)}
        </p>
      ) : null}
      <div role="status">
        {view.submission?.wager != null ? <p className="text-lg font-semibold text-ink">{t('wager.current', { amount: view.submission.wager })}</p> : null}
      </div>
    </section>
  )
}
