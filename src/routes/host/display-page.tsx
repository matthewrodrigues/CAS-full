import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { PlaceholderScreen } from '@/components/placeholder-screen'

export function DisplayPage() {
  const { t } = useTranslation()
  const { eventId = '' } = useParams()

  return (
    <PlaceholderScreen title={t('display.title')}>
      <p className="text-lg">{t('display.body', { eventId })}</p>
    </PlaceholderScreen>
  )
}
