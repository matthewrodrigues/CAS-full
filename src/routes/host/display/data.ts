import { useQuery } from '@tanstack/react-query'
import type { TFunction } from 'i18next'
import { leaderboardKey } from '@/game/use-live-game'
import { api } from '@/lib/api'

/** The night's rounds (titles, order, which have started), for "Round 2 of 4" and the round intro. */
export const useRounds = (eventId: string) =>
  useQuery({ queryKey: ['round-hosts', eventId], queryFn: () => api.roundHosts(eventId), select: (data) => data.rounds })

export const useBoard = (eventId: string) =>
  useQuery({ queryKey: leaderboardKey(eventId), queryFn: () => api.getLeaderboard(eventId), select: (data) => data.teams })

/** Tonight's naming prizes, by place. */
export const usePrizes = (eventId: string) =>
  useQuery({ queryKey: ['event-prizes', eventId], queryFn: () => api.eventPrizes(eventId), select: (data) => data.prizes })

/** The event's theme name, from the host's event list (the game view doesn't carry it). */
export const useThemeName = (eventId: string) =>
  useQuery({ queryKey: ['host-events'], queryFn: api.hostEvents, select: (data) => data.events.find((e) => e.id === eventId)?.theme ?? null })

/** "Round 2 of 4", or "Round 2" until the round list arrives. */
export function roundLabel(t: TFunction, position: number, rounds: number | undefined) {
  return rounds ? t('display.roundOf', { round: position, rounds }) : t('display.round', { round: position })
}
