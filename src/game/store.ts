// The live game on this phone (docs/SPEC.md section 2: a small Zustand store). The server is
// the authority: pushes are applied at once for a snappy screen, and anything that could carry
// results or scores also triggers a get_state refetch, so a missed message never sticks.
import { create } from 'zustand'
import type { GameView } from '../../shared/game'
import type { ServerMessage } from '../../shared/messages'

export function applyMessage(view: GameView, message: ServerMessage): { view: GameView; refetch: boolean } {
  switch (message.type) {
    case 'state': {
      const sameQuestion = message.state.current_event_question_id === view.state.current_event_question_id
      return { view: { ...view, state: message.state, submission: sameQuestion ? view.submission : null }, refetch: true }
    }
    case 'team_submission':
      return message.submission.event_question_id === view.state.current_event_question_id
        ? { view: { ...view, submission: message.submission }, refetch: false }
        : { view, refetch: false }
    case 'teams':
    case 'scores':
      return { view, refetch: true }
    case 'host_stats':
      return view.host
        ? { view: { ...view, host: { ...view.host, connected_teams: message.connected_teams, answered_teams: message.answered_teams } }, refetch: false }
        : { view, refetch: false }
    case 'review_queue':
      return view.host ? { view: { ...view, host: { ...view.host, review_queue: message.items } }, refetch: false } : { view, refetch: false }
    default:
      return { view, refetch: false }
  }
}

type GameStore = {
  view: GameView | null
  /** Server clock minus this phone's clock, in ms. */
  offset: number
  connected: boolean
  /** Whether the socket has ever opened, so "Reconnecting…" isn't shown while the first one opens. */
  everConnected: boolean
  setView(view: GameView | null): void
  setOffset(offset: number): void
  setConnected(connected: boolean): void
}

export const useGameStore = create<GameStore>((set) => ({
  view: null,
  offset: 0,
  connected: false,
  everConnected: false,
  setView: (view) => set({ view }),
  setOffset: (offset) => set({ offset }),
  setConnected: (connected) => set((s) => ({ connected, everConnected: s.everConnected || connected })),
}))
