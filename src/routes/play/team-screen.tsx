import { useMutation } from '@tanstack/react-query'
import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Character, hostCharacter } from '@/components/character'
import { hostLabel, initialOf } from '@/game/cast'
import { api } from '@/lib/api'
import { usePlay } from './context'
import { errorCode, errorMessage } from './errors'
import { FieldError } from './field-error'

const MAX_TEAM_NAME = 30

/**
 * Step 2 of 2: start a team or join one (design/screens/join-team.html). Tap, then send, like the
 * game: type a new name OR tap a team, then one button. Also the "Switch team" screen from the
 * lobby (`onCancel`), and the late joiner's screen once the game has started.
 */
export function TeamScreen({ onCancel, onDone }: { onCancel?: () => void; onDone?: () => void }) {
  const { t } = useTranslation()
  const { eventId, nickname, themeName, live } = usePlay()
  const view = live.view!
  const [name, setName] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const id = useId()
  const formId = `${id}-form`
  const done = () => {
    live.refresh()
    onDone?.()
  }
  const create = useMutation({ mutationFn: () => api.createTeam({ event_id: eventId, name: name.trim() }), onSuccess: done })
  const join = useMutation({ mutationFn: (teamId: string) => api.joinTeam({ team_id: teamId }), onSuccess: done })
  const started = view.state.phase !== 'lobby'
  const others = view.teams.filter((team) => team.id !== view.my_team?.id)
  const openTeams = others.filter((team) => team.member_count < view.settings.max_team_size)
  const typed = name.trim()
  const pickedTeam = typed ? undefined : openTeams.find((team) => team.id === picked)
  const pending = create.isPending || join.isPending

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (typed) create.mutate()
    else if (pickedTeam) join.mutate(pickedTeam.id)
  }

  const pick = (teamId: string) => {
    setPicked(teamId)
    setName('')
    create.reset()
    join.reset()
  }

  const hint = typed
    ? t('play.team.hintCaptain')
    : pickedTeam
      ? t('play.team.hintJoining', { name: pickedTeam.name ?? t('play.team.unnamed') })
      : openTeams.length
        ? t('play.team.hintChoose')
        : t('play.team.hintEmpty')

  return (
    <>
      <div className="screen__top">
        {onCancel ? (
          <button type="button" className="btn btn--quiet back-link" onClick={onCancel}>
            <svg className="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" />
            </svg>
            {t('play.team.back')}
          </button>
        ) : (
          <p className="hand hand--sm">{themeName}</p>
        )}
        <p className="hand hand--sm">{onCancel ? themeName : t('play.join.step', { step: 2 })}</p>
      </div>

      <header className="row">
        <Character name={hostCharacter('rocco', 'greeting')} size={64} label={hostLabel(t, 'rocco', 'greeting')} />
        <div className="stack stack--tight">
          <h1 className="h1">{t('play.team.title')}</h1>
          <p className="muted">{t('play.team.hello', { nickname })}</p>
        </div>
      </header>

      <div role="status" aria-live="polite">
        {started ? (
          <p className="note">
            <svg className="note__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
            <span>{t('play.team.started')}</span>
          </p>
        ) : null}
      </div>

      <form className="stack stack--loose" id={formId} onSubmit={submit} noValidate>
        <section className="field" aria-labelledby={`${id}-create`}>
          <h2 className="h2" id={`${id}-create`}>
            {t('play.team.createTitle')}
          </h2>
          <label className="field__label" htmlFor={`${id}-name`}>
            {t('play.team.name')}
          </label>
          <input
            className="field__input"
            id={`${id}-name`}
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setPicked(null)
              create.reset()
            }}
            maxLength={MAX_TEAM_NAME}
            autoCapitalize="words"
            enterKeyHint="go"
            placeholder={t('play.team.namePlaceholder')}
            aria-describedby={`${id}-foot ${id}-error`}
            aria-invalid={create.error ? true : undefined}
          />
          <div className="field__foot" id={`${id}-foot`}>
            <span>{t('play.team.nameHint')}</span>
            <span className="field__count">{t('play.count', { count: name.length, max: MAX_TEAM_NAME })}</span>
          </div>
          <div role="alert" id={`${id}-error`}>
            {create.error ? <FieldError>{errorMessage(errorCode(create.error), t)}</FieldError> : null}
          </div>
        </section>

        <section className="stack" aria-labelledby={`${id}-join`}>
          <h2 className="h2" id={`${id}-join`}>
            {t('play.team.joinTitle')}
          </h2>
          {others.length === 0 ? (
            <p className="small muted">{t('play.team.none')}</p>
          ) : (
            <ul className="options" aria-label={t('play.team.listLabel')}>
              {others.map((team) => {
                const label = team.name ?? t('play.team.unnamed')
                const full = team.member_count >= view.settings.max_team_size
                return (
                  <li key={team.id}>
                    <button
                      type="button"
                      className="option"
                      disabled={full || pending}
                      aria-pressed={full ? undefined : pickedTeam?.id === team.id}
                      onClick={() => pick(team.id)}
                    >
                      <span className="initial initial--sm" aria-hidden="true">
                        {initialOf(team.name)}
                      </span>
                      <span className="option__label">
                        {label}{' '}
                        <span className="option__sub">
                          {full
                            ? t('play.team.fullSub', { count: team.member_count, max: view.settings.max_team_size })
                            : t('play.members', { count: team.member_count })}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <div role="alert">{join.error ? <FieldError>{errorMessage(errorCode(join.error), t)}</FieldError> : null}</div>
        </section>
      </form>

      <div className="screen__actions">
        <button type="submit" form={formId} className="btn btn--primary btn--block" disabled={pending || (!typed && !pickedTeam)}>
          {pending ? t('play.team.sending') : typed ? t('play.team.create') : t('play.team.join')}
        </button>
        <p className="small muted center">{hint}</p>
      </div>
    </>
  )
}
