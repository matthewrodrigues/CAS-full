import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { PlaceholderScreen } from '@/components/placeholder-screen'

export function HostPage() {
  const { t } = useTranslation()
  const { eventId = '' } = useParams()

  return (
    <PlaceholderScreen title={t('host.title')}>
      <p className="text-lg">{t('host.body', { eventId })}</p>
    </PlaceholderScreen>
  )
}
