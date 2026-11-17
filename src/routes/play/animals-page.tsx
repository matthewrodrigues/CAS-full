import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import type { AnimalCard } from '../../../shared/game'
import { Character, animalCharacter } from '@/components/character'
import { PinIcon } from '@/components/pin-icon'
import { api } from '@/lib/api'
import { usePlay } from './context'
import { errorCode, errorMessage } from './errors'

const formatDate = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

const HEART = <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z" />

/** The Animals tab (design/screens/animals.html): animals you follow, tonight's prize animals, then every animal a winning team named. */
export function AnimalsPage() {
  const { t } = useTranslation()
  const { eventId } = usePlay()
  const id = useId()
  const animals = useQuery({ queryKey: ['animals'], queryFn: api.animals })
  const prizes = useQuery({ queryKey: ['event-prizes', eventId], queryFn: () => api.eventPrizes(eventId) })
  const rights = useQuery({ queryKey: ['naming-rights', 'animals'], queryFn: api.myNamingRights })
  const list = animals.data?.animals ?? []
  const mine = list.filter((a) => a.following)
  // Tonight's animals still waiting for a name: they're not in the named list yet.
  const tonight = (prizes.data?.prizes ?? []).map((p) => p.animal).filter((a) => a.name === null && !mine.some((m) => m.id === a.id))
  const others = list.filter((a) => !a.following && !tonight.some((n) => n.id === a.id))
  const ownIds = new Set((rights.data?.rights ?? []).filter((r) => r.animal.name !== null).map((r) => r.animal.id))

  return (
    <>
      <div className="screen__top">
        <p className="hand hand--sm">{t('animals.hand')}</p>
      </div>
      <div className="stack stack--tight">
        <h1 className="h1">{t('animals.title')}</h1>
        <p className="body muted">{t('animals.intro')}</p>
      </div>

      <section className="stack" aria-labelledby={`${id}-mine`}>
        <h2 className="h2" id={`${id}-mine`}>
          {t('animals.mine')}
        </h2>
        {mine.length === 0 ? <p className="note">{t('animals.empty')}</p> : <AnimalList animals={mine} ownIds={ownIds} />}
      </section>

      {tonight.length ? (
        <section className="stack" aria-labelledby={`${id}-tonight`}>
          <div className="stack stack--tight">
            <h2 className="h2" id={`${id}-tonight`}>
              {t('animals.tonight')}
            </h2>
            <p className="small muted">{t('animals.tonightBody')}</p>
          </div>
          <AnimalList animals={tonight} ownIds={ownIds} />
        </section>
      ) : null}

      {others.length ? (
        <section className="stack" aria-labelledby={`${id}-all`}>
          <h2 className="h2" id={`${id}-all`}>
            {t('animals.all')}
          </h2>
          <AnimalList animals={others} ownIds={ownIds} />
        </section>
      ) : null}
    </>
  )
}

type Row = Pick<AnimalCard, 'id' | 'species' | 'exhibit' | 'avatar' | 'name' | 'named_by_team'> & { latest_update?: AnimalCard['latest_update'] }

function AnimalList({ animals, ownIds }: { animals: Row[]; ownIds: Set<string> }) {
  const { t } = useTranslation()
  return (
    <ul className="list">
      {animals.map((animal) => {
        const yours = ownIds.has(animal.id)
        const sub = !animal.name
          ? t('animals.noNameYet', { exhibit: animal.exhibit })
          : yours
            ? t('animals.namedByYou', { species: animal.species })
            : animal.named_by_team
              ? t('animals.namedByTeam', { species: animal.species, team: animal.named_by_team })
              : t('animals.namedPlain', { species: animal.species })
        return (
          <li key={animal.id}>
            <Link to={animal.id} className={yours ? 'list-row is-you' : 'list-row'}>
              <Character name={animalCharacter(animal.avatar, yours)} size={48} />
              <span className="list-row__name">
                {animal.name ?? animal.species}
                {yours ? (
                  <>
                    {' '}
                    <span className="tag">{t('leaderboard.you')}</span>
                  </>
                ) : null}
                <span className="list-row__sub">{sub}</span>
                {animal.latest_update ? <span className="list-row__sub">{t('animals.latest', { date: formatDate(animal.latest_update.posted_at), body: animal.latest_update.body })}</span> : null}
              </span>
              <span className="list-row__score">
                <svg className="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

/** One animal (design/screens/my-animal.html): the avatar up front, who named it, where to see it, the follow toggle and its updates. */
export function AnimalDetailPage() {
  const { t } = useTranslation()
  const { animalId = '' } = useParams()
  const id = useId()
  const queryClient = useQueryClient()
  const animal = useQuery({ queryKey: ['animal', animalId], queryFn: () => api.animal(animalId) })
  const follow = useMutation({
    mutationFn: (value: boolean) => api.followAnimal({ animal_id: animalId, follow: value }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['animal', animalId] })
      void queryClient.invalidateQueries({ queryKey: ['animals'] })
    },
  })
  const data = animal.data
  const title = data ? (data.name ?? t('animals.unnamed', { species: data.species })) : ''

  return (
    <>
      <div className="screen__top">
        <Link to=".." relative="path" className="btn btn--quiet back-link">
          <svg className="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" />
          </svg>
          {t('animals.back')}
        </Link>
        <p className="hand hand--sm">{t('animals.handOne')}</p>
      </div>
      {animal.error ? (
        <p role="alert" className="field__error">
          {errorMessage(errorCode(animal.error), t)}
        </p>
      ) : null}
      {data ? (
        <>
          <section className="stage stage--hero" aria-labelledby={`${id}-name`}>
            <Character name={animalCharacter(data.avatar, data.name !== null)} size={160} idle label={data.name ? t('animals.happyLabel', { name: data.name, species: data.species }) : data.species} />
            <div className="stack stack--tight">
              <h1 className="h1" id={`${id}-name`}>
                {title}
              </h1>
              <p className="body">
                {data.species}
                {data.scientific_name ? (
                  <>
                    {' · '}
                    <i>{data.scientific_name}</i>
                  </>
                ) : null}
              </p>
              <p className="small muted">
                {data.name
                  ? data.named_by_team
                    ? t('animals.namedBy', { team: data.named_by_team, date: formatDate(data.named_at!) })
                    : t('animals.namedOn', { date: formatDate(data.named_at!) })
                  : t('animals.awaiting')}
              </p>
            </div>
          </section>

          <section className="card" aria-label={t('animals.about', { name: title })}>
            <p className="body row">
              <PinIcon />
              <span>{t('animals.exhibit', { exhibit: data.exhibit })}</span>
            </p>
            {data.about ? <p className="body">{data.about}</p> : null}
          </section>

          <button
            type="button"
            className={data.following ? 'btn btn--secondary btn--block' : 'btn btn--primary btn--block'}
            aria-pressed={data.following}
            disabled={follow.isPending}
            onClick={() => follow.mutate(!data.following)}
          >
            <svg className="btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {HEART}
            </svg>
            <span>{data.following ? t('animals.following') : t('animals.follow')}</span>
          </button>
          {follow.error ? (
            <div role="alert">
              <p className="field__error">{errorMessage(errorCode(follow.error), t)}</p>
            </div>
          ) : null}

          <section className="stack" aria-labelledby={`${id}-real`}>
            <h2 className="h2" id={`${id}-real`}>
              {t('animals.real')}
            </h2>
            <figure className="photo-slot">
              {data.image_url ? (
                <div className="photo-slot__frame overflow-hidden border-solid p-0">
                  <img src={data.image_url} alt={t('animals.photo', { name: title })} className="size-full object-cover" />
                </div>
              ) : (
                <div className="photo-slot__frame" role="img" aria-label={t('animals.photoSoon', { name: title })}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="6.5" width="18" height="13.5" rx="3" />
                    <circle cx="12" cy="13.2" r="3.6" />
                    <path d="M8.5 6.5 10 4h4l1.5 2.5" />
                  </svg>
                </div>
              )}
              <figcaption className="photo-slot__caption">{t('animals.realCaption', { name: title, exhibit: data.exhibit })}</figcaption>
            </figure>
          </section>

          <section className="stack" aria-labelledby={`${id}-updates`}>
            <h2 className="h2" id={`${id}-updates`}>
              {t('animals.updates')}
            </h2>
            {data.updates.length === 0 ? <p className="body muted">{t('animals.noUpdates')}</p> : null}
            <ol className="feed">
              {data.updates.map((u) => (
                <li key={u.id} className="feed__item">
                  <time className="feed__date" dateTime={new Date(u.posted_at).toISOString()}>
                    {formatDate(u.posted_at)}
                  </time>
                  <p className="body">{u.body}</p>
                  <p className="feed__who">{t('animals.keepers')}</p>
                </li>
              ))}
            </ol>
          </section>
        </>
      ) : null}
    </>
  )
}
