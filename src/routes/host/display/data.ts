import { useQuery } from '@tanstack/react-query'
import type { TFunction } from 'i18next'
import { leaderboardKey } from '@/game/use-live-game'
import { api } from '@/lib/api'

export const useBoard = (eventId: string) =>
  useQuery({ queryKey: leaderboardKey(eventId), queryFn: () => api.getLeaderboard(eventId), select: (data) => data.teams })

/** Tonight's naming prizes, by place. */
export const usePrizes = (eventId: string) =>
  useQuery({ queryKey: ['event-prizes', eventId], queryFn: () => api.eventPrizes(eventId), select: (data) => data.prizes })

/** The event's theme name, from the host's event list (the game view doesn't carry it). */
export const useThemeName = (eventId: string) =>
  useQuery({ queryKey: ['host-events'], queryFn: api.hostEvents, select: (data) => data.events.find((e) => e.id === eventId)?.theme ?? null })

/** "Round 2 of 4". */
export function roundLabel(t: TFunction, position: number, rounds: number) {
  return t('display.roundOf', { round: position, rounds })
}
