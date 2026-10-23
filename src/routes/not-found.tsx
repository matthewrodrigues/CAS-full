import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { PlaceholderScreen } from '@/components/placeholder-screen'
import { Button } from '@/components/ui/button'

export function NotFound() {
  const { t } = useTranslation()

  return (
    <PlaceholderScreen title={t('notFound.title')}>
      <p className="text-lg">{t('notFound.body')}</p>
      <Button asChild variant="outline">
        <Link to="/">{t('notFound.home')}</Link>
      </Button>
    </PlaceholderScreen>
  )
}
