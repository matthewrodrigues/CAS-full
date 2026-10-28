import { useTranslation } from 'react-i18next'
import { StatusBanner } from '@/components/status-banner'
import { usePlay } from './context'
import { LobbyScreen } from './lobby-screen'
import { TeamScreen } from './team-screen'

/** The Play tab: the screen for the current phase (docs/SPEC.md section 5, Phases). */
export function PlayScreen() {
  const { t } = useTranslation()
  const { live } = usePlay()
  const view = live.view!

  // A player with no team can join one at any point in the night.
  if (!view.my_team) return <TeamScreen />
  switch (view.state.phase) {
    case 'lobby':
      return <LobbyScreen />
    default:
      return <StatusBanner status="waiting">{t('play.status.waiting')}</StatusBanner>
  }
}
