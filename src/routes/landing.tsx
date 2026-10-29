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
      <nav className="flex gap-4 text-base">
        <Link to="/host" className="text-ink underline underline-offset-4">
          {t('landing.host')}
        </Link>
        <Link to="/staff" className="text-ink underline underline-offset-4">
          {t('landing.staff')}
        </Link>
        <Link to="/privacy" className="text-ink underline underline-offset-4">
          {t('landing.privacy')}
        </Link>
      </nav>
    </PlaceholderScreen>
  )
}
