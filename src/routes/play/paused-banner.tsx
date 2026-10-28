import { useTranslation } from 'react-i18next'
import { StatusBanner } from '@/components/status-banner'

/** Shown over whatever screen the game paused on; answers are rejected until it resumes. */
export function PausedBanner() {
  const { t } = useTranslation()
  return (
    <div className="mb-5 flex flex-col gap-2 rounded-lg bg-surface p-4">
      <StatusBanner status="paused">{t('question.pausedTitle')}</StatusBanner>
      <p className="text-base text-ink-muted">{t('question.pausedBody')}</p>
    </div>
  )
}
