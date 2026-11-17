import { usePlay } from './context'
import { ScreenTop } from './paper-parts'
import { LobbyScreen } from './lobby-screen'
import { LockedScreen } from './locked-screen'
import { PausedScreen } from './paused-screen'
import { EndedScreen } from './ended-screen'
import { QuestionScreen } from './question-screen'
import { RevealScreen } from './reveal-screen'
import { RoundBreakScreen } from './round-break-screen'
import { WagerScreen } from './wager-screen'
import { liveQuestion } from './question'
import { TeamScreen } from './team-screen'

/** The Play tab: the screen for the current phase (docs/SPEC.md section 5, Phases). */
export function PlayScreen() {
  const { live } = usePlay()
  const view = live.view!

  // A player with no team can join one at any point in the night.
  if (!view.my_team) return <TeamScreen />
  // Paused is a screen of its own: a question's frozen sheet while one is open, otherwise the host's breather.
  const paused = view.state.phase === 'paused'
  const phase = paused ? view.state.paused_from_phase : view.state.phase
  const openQuestion = (phase === 'live' || phase === 'final_live') && liveQuestion(view.state) !== null
  if (paused && !openQuestion) return <PausedScreen />
  return <PhaseScreen phase={phase} paused={paused} hasQuestion={liveQuestion(view.state) !== null} />
}

function PhaseScreen({ phase, paused, hasQuestion }: { phase: string | null; paused: boolean; hasQuestion: boolean }) {
  switch (phase) {
    case 'lobby':
      return <LobbyScreen />
    case 'live':
    case 'final_live':
      return hasQuestion ? <QuestionScreen paused={paused} /> : null
    case 'locked':
    case 'final_locked':
      return <LockedScreen />
    case 'revealed':
    case 'final_revealed':
      return <RevealScreen />
    case 'round_break':
      return <RoundBreakScreen />
    case 'final_wager':
      return <WagerScreen />
    case 'ended':
      return <EndedScreen />
    default:
      return <ScreenTop status="waiting" note="" />
  }
}
