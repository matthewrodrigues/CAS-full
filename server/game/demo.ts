// The demo quickstart (docs/superpowers/specs/2026-11-17-demo-quickstart-design.md): autopilot
// and restart for the DEMO1 event.
import type { PublicGameState } from '../../shared/game'
import { fail, ok, type GameContext, type GameResult } from './context'
import { publicGameState } from './state'

/** host_demo_autopilot: switch the autopilot on or off; an already-settled phase starts counting now. */
export function setAutopilot(ctx: GameContext, eventId: string, on: boolean): GameResult<PublicGameState> {
  const state = publicGameState(ctx.db, eventId)
  if (!state) return fail('not_found')
  ctx.autopilot.set(eventId, on)
  ctx.autopilot.onPhase(eventId, state.phase)
  return ok(state)
}
