import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { PlaceholderScreen } from '@/components/placeholder-screen'
import { Button } from '@/components/ui/button'

export function Landing() {
  const { t } = useTranslation()

  return (
    <PlaceholderScreen title={t('app.name')}>
      <p className="text-lg">{t('landing.body')}</p>
      <Button asChild size="lg">
        <Link to="/play/DEMO1">{t('landing.tryDemo')}</Link>
      </Button>
    </PlaceholderScreen>
  )
}
