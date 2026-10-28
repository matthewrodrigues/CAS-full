import { useTranslation } from 'react-i18next'
import { StatusBanner } from '@/components/status-banner'
import { usePlay } from './context'
import { LobbyScreen } from './lobby-screen'
import { LockedScreen } from './locked-screen'
import { PausedBanner } from './paused-banner'
import { QuestionScreen } from './question-screen'
import { liveQuestion } from './question'
import { TeamScreen } from './team-screen'

/** The Play tab: the screen for the current phase (docs/SPEC.md section 5, Phases). */
export function PlayScreen() {
  const { live } = usePlay()
  const view = live.view!

  // A player with no team can join one at any point in the night.
  if (!view.my_team) return <TeamScreen />
  // Paused shows the screen it paused on, frozen, under a banner.
  const paused = view.state.phase === 'paused'
  const phase = paused ? view.state.paused_from_phase : view.state.phase
  return (
    <>
      {paused ? <PausedBanner /> : null}
      <PhaseScreen phase={phase} paused={paused} hasQuestion={liveQuestion(view.state) !== null} />
    </>
  )
}

function PhaseScreen({ phase, paused, hasQuestion }: { phase: string | null; paused: boolean; hasQuestion: boolean }) {
  const { t } = useTranslation()
  switch (phase) {
    case 'lobby':
      return <LobbyScreen />
    case 'live':
    case 'final_live':
      return hasQuestion ? <QuestionScreen paused={paused} /> : null
    case 'locked':
    case 'final_locked':
      return <LockedScreen />
    default:
      return <StatusBanner status="waiting">{t('play.status.waiting')}</StatusBanner>
  }
}
