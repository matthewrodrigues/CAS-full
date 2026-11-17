import { useQuery } from '@tanstack/react-query'
import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { Character, animalCharacter } from '@/components/character'
import { api } from '@/lib/api'

/** Tonight's prizes before anyone has scored: which place names which animal. Renders nothing when the night has none. */
export function PrizeList({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const id = useId()
  const prizes = useQuery({ queryKey: ['event-prizes', eventId], queryFn: () => api.eventPrizes(eventId) })
  const list = prizes.data?.prizes ?? []
  if (list.length === 0) return null
  return (
    <section className="card" aria-labelledby={`${id}-prizes`}>
      <h2 className="h2" id={`${id}-prizes`}>
        {t('naming.tonight')}
      </h2>
      <p className="body">{t('naming.prizesBody')}</p>
      <ol className="list">
        {list.map((prize) => (
          <li key={prize.place} className="list-row is-top">
            <span className="list-row__rank">
              <span className="sr-only">{t('naming.placeSr')} </span>
              {prize.place}
            </span>
            <Character name={animalCharacter(prize.animal.avatar)} size={48} />
            <span className="list-row__name">
              {prize.animal.species}
              <span className="list-row__sub">{prize.animal.exhibit}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
