import { useOutletContext } from 'react-router'
import type { useLiveGame } from '@/game/use-live-game'

/** What every Play-section screen gets from the layout: one live game (one socket) per page. */
export type PlayContext = {
  eventId: string
  joinCode: string
  playerId: string
  nickname: string
  /** Tonight's theme, e.g. "Deep Sea Night": the hand note in each screen's top row. */
  themeName: string
  live: ReturnType<typeof useLiveGame>
}

export const usePlay = () => useOutletContext<PlayContext>()
