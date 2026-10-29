import { Gift } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** The Rewards tab. Prizes and their codes arrive with Milestone 6; until then, a friendly empty state. */
export function RewardsPage() {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-heading text-3xl font-semibold text-ink">{t('rewards.title')}</h1>
      <div className="flex items-start gap-3 rounded-lg bg-surface p-4">
        <Gift aria-hidden className="mt-1 size-6 shrink-0 text-brand-deep" />
        <p className="text-lg text-ink-muted">{t('rewards.empty')}</p>
      </div>
    </section>
  )
}
