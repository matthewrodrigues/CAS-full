import { useEffect } from 'react'
import { useParams } from 'react-router'
import { RoleGate } from '@/components/role-gate'
import { useLiveGame } from '@/game/use-live-game'
import { Lobby } from './display/lobby'
import { QuestionView } from './display/question'
import { Reveal } from './display/reveal'
import { Standings } from './display/standings'
import { Wager } from './display/wager'

/** /host/:eventId/display: the room display, 1920x1080, read-only, in a host session (design/screens/big-*.html). */
export function DisplayPage() {
  return (
    <RoleGate role="host">
      <Display />
    </RoleGate>
  )
}

function Display() {
  const { eventId = '' } = useParams()
  const live = useLiveGame(eventId)
  // The kit scales every component for the room from .big on the body.
  useEffect(() => {
    document.body.classList.add('big')
    return () => document.body.classList.remove('big')
  }, [])
  const view = live.view
  if (!view) return null
  const paused = view.state.phase === 'paused'
  const phase = paused ? (view.state.paused_from_phase ?? 'lobby') : view.state.phase
  const props = { view, paused }

  switch (phase) {
    case 'lobby':
      return <Lobby view={view} />
    case 'live':
    case 'final_live':
      return <QuestionView {...props} offset={live.offset} locked={false} />
    case 'locked':
    case 'final_locked':
      return <QuestionView {...props} offset={live.offset} locked />
    case 'revealed':
    case 'final_revealed':
      return <Reveal {...props} />
    case 'final_wager':
      return <Wager {...props} />
    case 'round_break':
    case 'ended':
      return <Standings {...props} />
  }
}
