import { useMutation } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { usePlay } from './context'
import { errorCode, errorMessage } from './errors'

/** Start a team or join one (SPEC section 5: one team per player per event). Placeholder layout. */
export function TeamScreen({ onCancel, onDone }: { onCancel?: () => void; onDone?: () => void }) {
  const { t } = useTranslation()
  const { eventId, live } = usePlay()
  const view = live.view!
  const [name, setName] = useState('')
  const inputId = useId()
  const done = () => {
    live.refresh()
    onDone?.()
  }
  const create = useMutation({ mutationFn: () => api.createTeam({ event_id: eventId, name: name.trim() }), onSuccess: done })
  const join = useMutation({ mutationFn: (teamId: string) => api.joinTeam({ team_id: teamId }), onSuccess: done })
  const error = create.error ?? join.error
  const started = view.state.phase !== 'lobby'
  const others = view.teams.filter((team) => team.id !== view.my_team?.id)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (name.trim()) create.mutate()
  }

  return (
    <section className="flex flex-col gap-6" aria-labelledby={`${inputId}-title`}>
      <div className="flex flex-col gap-2">
        <h1 id={`${inputId}-title`} className="font-heading text-3xl font-semibold text-ink">
          {t('play.team.title')}
        </h1>
        {started ? <p className="text-lg text-ink-muted">{t('play.team.started')}</p> : null}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg bg-surface p-4" noValidate>
        <h2 className="text-xl font-semibold text-ink">{t('play.team.createTitle')}</h2>
        <label htmlFor={inputId} className="text-base font-medium text-ink">
          {t('play.team.name')}
        </label>
        <Input id={inputId} value={name} onChange={(e) => setName(e.target.value)} maxLength={30} autoCapitalize="words" enterKeyHint="go" />
        <Button type="submit" size="lg" disabled={create.isPending || !name.trim()}>
          {t('play.team.create')}
        </Button>
      </form>

      {error ? (
        <p role="alert" className="text-base font-medium text-incorrect">
          {errorMessage(errorCode(error), t)}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-ink">{t('play.team.joinTitle')}</h2>
        {others.length === 0 ? (
          <p className="text-base text-ink-muted">{t('play.team.none')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {others.map((team) => {
              const label = team.name ?? t('play.team.unnamed')
              const full = team.member_count >= view.settings.max_team_size
              return (
                <li key={team.id} className="flex items-center justify-between gap-3 rounded-lg bg-surface p-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-lg font-medium text-ink">{label}</span>
                    <span className="inline-flex items-center gap-1 text-sm text-ink-muted">
                      <Users aria-hidden className="size-4" />
                      {t('play.members', { count: team.member_count })}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    disabled={full || join.isPending}
                    aria-label={full ? `${label}: ${t('play.team.full')}` : t('play.team.join', { name: label })}
                    onClick={() => join.mutate(team.id)}
                  >
                    {full ? t('play.team.full') : t('play.team.joinShort')}
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {onCancel ? (
        <Button variant="ghost" onClick={onCancel}>
          {t('play.team.back')}
        </Button>
      ) : null}
    </section>
  )
}
