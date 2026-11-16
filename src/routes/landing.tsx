import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { HostStage } from '@/components/host-stage'

/** The site root (design/screens/landing.html). Most players skip it: the big screen's QR opens the join screen. */
export function Landing() {
  const { t } = useTranslation()

  return (
    <main className="screen">
      <div className="screen__top">
        <p className="hand hand--sm">{t('landing.kicker')}</p>
      </div>

      <HostStage host="rocco" expression="greeting" line={t('host.lines.landing')} tone="peach" hero size={240}>
        <div className="stack stack--tight">
          <h1 className="display">{t('app.name')}</h1>
          <p className="muted">{t('landing.tagline')}</p>
        </div>
      </HostStage>

      <div className="stack stack--tight center">
        <p className="body">{t('landing.body')}</p>
      </div>

      <div className="screen__actions">
        <Link className="btn btn--primary btn--block" to="/play/DEMO1">
          {t('landing.tryDemo')}
        </Link>
        <nav className="link-row" aria-label={t('landing.more')}>
          <Link to="/host">{t('landing.host')}</Link>
          <Link to="/staff">{t('landing.staff')}</Link>
          <Link to="/privacy">{t('landing.privacy')}</Link>
        </nav>
      </div>
    </main>
  )
}
