import { useTranslation } from 'react-i18next'
import { PlaceholderScreen } from '@/components/placeholder-screen'

export function StaffPage() {
  const { t } = useTranslation()

  return (
    <PlaceholderScreen title={t('staff.title')}>
      <p className="text-lg">{t('staff.body')}</p>
    </PlaceholderScreen>
  )
}
