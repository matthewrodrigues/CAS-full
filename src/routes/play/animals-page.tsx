import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, MapPin, PawPrint } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router'
import type { AnimalCard } from '../../../shared/game'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { errorCode, errorMessage } from './errors'

const formatDate = (ms: number) => new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

/** The Animals tab (My Animal feed): animals the player follows, then every animal named by a winning team. */
export function AnimalsPage() {
  const { t } = useTranslation()
  const animals = useQuery({ queryKey: ['animals'], queryFn: api.animals })
  const list = animals.data?.animals ?? []
  const mine = list.filter((a) => a.following)
  const others = list.filter((a) => !a.following)

  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-heading text-3xl font-semibold text-ink">{t('animals.title')}</h1>
      <p className="text-lg text-ink-muted">{t('animals.intro')}</p>
      <h2 className="text-xl font-semibold text-ink">{t('animals.mine')}</h2>
      {mine.length === 0 ? (
        <div className="flex items-start gap-3 rounded-lg bg-surface p-4">
          <PawPrint aria-hidden className="mt-1 size-6 shrink-0 text-depth" />
          <p className="text-lg text-ink-muted">{t('animals.empty')}</p>
        </div>
      ) : (
        <AnimalList animals={mine} />
      )}
      {others.length ? (
        <>
          <h2 className="text-xl font-semibold text-ink">{t('animals.all')}</h2>
          <AnimalList animals={others} />
        </>
      ) : null}
    </section>
  )
}

function AnimalList({ animals }: { animals: AnimalCard[] }) {
  const { t } = useTranslation()
  return (
    <ul className="flex flex-col gap-3">
      {animals.map((animal) => (
        <li key={animal.id}>
          <Link to={animal.id} className="flex flex-col gap-1 rounded-xl bg-surface p-4 shadow-pop-sm">
            <span className="text-xl font-semibold text-ink">{animal.name ?? t('animals.unnamed', { species: animal.species })}</span>
            {animal.name ? <span className="text-base text-ink-muted">{animal.species}</span> : null}
            <span className="flex items-center gap-1 text-sm text-ink-muted">
              <MapPin aria-hidden className="size-4" />
              {animal.exhibit}
            </span>
            {animal.latest_update ? <span className="mt-1 text-base text-ink">{t('animals.latest', { date: formatDate(animal.latest_update.posted_at), body: animal.latest_update.body })}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** One animal: who named it, where to see it, the follow toggle and its updates, newest first. */
export function AnimalDetailPage() {
  const { t } = useTranslation()
  const { animalId = '' } = useParams()
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

  return (
    <section className="flex flex-col gap-4">
      <Link to=".." relative="path" className="inline-flex min-h-11 items-center gap-1 self-start text-base font-medium text-info">
        <ArrowLeft aria-hidden className="size-4" />
        {t('animals.back')}
      </Link>
      {animal.error ? <p role="alert" className="text-lg text-incorrect">{errorMessage(errorCode(animal.error), t)}</p> : null}
      {data ? (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-3xl font-semibold break-words text-ink">{data.name ?? t('animals.unnamed', { species: data.species })}</h1>
            <p className="text-lg text-ink-muted">
              {data.species}
              {data.scientific_name ? <i> · {data.scientific_name}</i> : null}
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-lg bg-surface p-4">
            <p className="flex items-center gap-2 text-base text-ink">
              <MapPin aria-hidden className="size-5 shrink-0 text-depth" />
              {t('animals.exhibit', { exhibit: data.exhibit })}
            </p>
            {data.name ? (
              <p className="text-base text-ink">{data.named_by_team ? t('animals.namedBy', { team: data.named_by_team, date: formatDate(data.named_at!) }) : t('animals.namedOn', { date: formatDate(data.named_at!) })}</p>
            ) : (
              <p className="text-base text-ink">{t('animals.awaiting')}</p>
            )}
            {data.about ? <p className="text-base text-ink">{data.about}</p> : null}
          </div>
          <Button size="lg" variant={data.following ? 'outline' : 'default'} aria-pressed={data.following} disabled={follow.isPending} onClick={() => follow.mutate(!data.following)}>
            {data.following ? t('animals.following') : t('animals.follow')}
          </Button>
          {follow.error ? <p role="alert" className="text-base font-medium text-incorrect">{errorMessage(errorCode(follow.error), t)}</p> : null}
          <h2 className="text-xl font-semibold text-ink">{t('animals.updates')}</h2>
          {data.updates.length === 0 ? <p className="text-lg text-ink-muted">{t('animals.noUpdates')}</p> : null}
          <ol className="flex flex-col gap-3">
            {data.updates.map((u) => (
              <li key={u.id} className="flex flex-col gap-1 border-l-4 border-depth bg-surface p-3">
                <time dateTime={new Date(u.posted_at).toISOString()} className="text-sm text-ink-muted">
                  {formatDate(u.posted_at)}
                </time>
                <p className="text-base text-ink">{u.body}</p>
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </section>
  )
}
