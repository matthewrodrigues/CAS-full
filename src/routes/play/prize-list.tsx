import { useQuery } from '@tanstack/react-query'
import { PawPrint } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api'

/** Tonight's naming prizes: which place names which animal. Renders nothing when the night has none. */
export function PrizeList({ eventId }: { eventId: string }) {
  const { t } = useTranslation()
  const prizes = useQuery({ queryKey: ['event-prizes', eventId], queryFn: () => api.eventPrizes(eventId) })
  const list = prizes.data?.prizes ?? []
  if (list.length === 0) return null
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-surface p-4">
      <h2 className="flex items-center gap-2 text-xl font-semibold text-ink">
        <PawPrint aria-hidden className="size-5 text-depth" />
        {t('naming.tonight')}
      </h2>
      <ol className="flex flex-col gap-2">
        {list.map((prize) => (
          <li key={prize.place} className="text-lg text-ink">
            {t('naming.prizeRow', { place: prize.place, species: prize.animal.species })}
          </li>
        ))}
      </ol>
    </div>
  )
}
