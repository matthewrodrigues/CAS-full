import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import type { MyNamingRight } from '../../../shared/game'
import { Character, animalCharacter, hostCharacter } from '@/components/character'
import { PinIcon } from '@/components/pin-icon'
import { hostLabel } from '@/game/cast'
import { api } from '@/lib/api'
import { usePlay } from './context'
import { FieldError } from './after-game-forms'
import { errorCode, errorMessage } from './errors'
import { PrizeList } from './prize-list'

const NAME_MAX = 30

const CHIP_ICON: Record<'star' | 'clock' | 'pen' | 'check', ReactNode> = {
  star: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  pen: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
}

/**
 * The Rewards tab (design/screens/rewards.html). The only prize is naming an Academy animal, so this is
 * the naming card for each animal the team won the right to name. There are no prize codes on a player screen.
 */
export function RewardsPage() {
  const { t } = useTranslation()
  const { eventId, live } = usePlay()
  const ended = live.view?.state.phase === 'ended'
  // Naming rights are granted when the night ends, so refetch once the game ends.
  const rights = useQuery({ queryKey: ['naming-rights', ended], queryFn: api.myNamingRights, staleTime: 0 })
  const namings = rights.data?.rights ?? []

  return (
    <>
      <div className="screen__top">
        <p className="hand hand--sm">{t('rewards.hand')}</p>
      </div>
      <div className="row">
        <Character name={hostCharacter('rocco', 'cheering')} size={64} label={hostLabel(t, 'rocco', 'cheering')} />
        <h1 className="h1">{t('rewards.title')}</h1>
      </div>
      {namings.length === 0 && rights.isSuccess ? (
        <>
          <p className="note">{t('rewards.empty')}</p>
          {ended ? null : <PrizeList eventId={eventId} />}
        </>
      ) : null}
      {namings.map((right) => (
        <NamingCard key={right.id} right={right} />
      ))}
    </>
  )
}

/** A won naming right: propose a name, see staff's decision, then meet the animal. */
function NamingCard({ right }: { right: MyNamingRight }) {
  const { t } = useTranslation()
  const id = useId()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const propose = useMutation({
    mutationFn: () => api.proposeAnimalName({ right_id: right.id, name }),
    onSuccess: () => {
      setName('')
      void queryClient.invalidateQueries({ queryKey: ['naming-rights'] })
    },
  })
  const { animal } = right
  const decided = animal.name !== null
  const won = right.status === 'approved'
  const chip = decided && !won ? 'other' : right.status
  const icon = { open: 'star', pending: 'clock', rejected: 'pen', approved: 'check' }[right.status] as keyof typeof CHIP_ICON
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (name.trim()) propose.mutate()
  }

  return (
    <section className="card" aria-labelledby={`${id}-title`}>
      <div className="card__head">
        <Character name={animalCharacter(animal.avatar, decided)} size={96} />
        <div className="stack stack--tight">
          <p className="small muted">{t('naming.won', { place: right.place, team: right.team_name })}</p>
          <h2 className="h2" id={`${id}-title`}>
            {decided ? t('naming.named', { name: animal.name, species: animal.species }) : t('naming.title', { species: animal.species })}
          </h2>
        </div>
      </div>
      <p className="small muted row">
        <PinIcon />
        <span>{t('animals.exhibit', { exhibit: animal.exhibit })}</span>
      </p>
      {animal.about ? <p className="body">{animal.about}</p> : null}
      <div role="status" aria-live="polite">
        <p className={won || right.status === 'open' ? 'chip chip--win' : 'chip'}>
          <svg className="chip__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {CHIP_ICON[icon]}
          </svg>
          <span>{t(`naming.status.${chip}`, { name: right.proposed_name })}</span>
        </p>
      </div>
      {decided ? null : (
        <form onSubmit={submit} className="stack" noValidate>
          <div className="field">
            <label className="field__label" htmlFor={`${id}-name`}>
              {right.status === 'open' ? t('naming.label') : t('naming.relabel')}
            </label>
            <input
              className="field__input"
              id={`${id}-name`}
              value={name}
              maxLength={NAME_MAX}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              aria-describedby={`${id}-hint`}
            />
            <div className="field__foot" id={`${id}-hint`}>
              <span>{t('naming.hint')}</span>
              <span className="field__count">
                {name.length} / {NAME_MAX}
              </span>
            </div>
          </div>
          <button type="submit" className="btn btn--primary btn--block" disabled={propose.isPending || !name.trim()}>
            {t('naming.submit')}
          </button>
          {propose.error ? (
            <div role="alert">
              <FieldError>{errorCode(propose.error) === 'name_not_allowed' ? t('naming.notAllowed') : errorMessage(errorCode(propose.error), t)}</FieldError>
            </div>
          ) : null}
        </form>
      )}
      {won ? (
        <Link className="btn btn--primary btn--block" to={`../animals/${animal.id}`}>
          {t('naming.show')}
        </Link>
      ) : (
        <Link className="btn btn--quiet" to={`../animals/${animal.id}`}>
          {t('naming.track')}
        </Link>
      )}
    </section>
  )
}
