import { useTranslation } from 'react-i18next'
import { useParams } from 'react-router'
import { PlaceholderScreen } from '@/components/placeholder-screen'

export function PlayPage() {
  const { t } = useTranslation()
  const { joinCode = '' } = useParams()

  return (
    <PlaceholderScreen title={t('play.title', { joinCode })}>
      <p className="text-lg">{t('play.body')}</p>
    </PlaceholderScreen>
  )
}
