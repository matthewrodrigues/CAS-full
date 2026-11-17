// Pure rules for the after-game screens: who gets which prize animal, how a team finished, and which
// status word a leaderboard shows for the game's phase. Kept apart from the components so they test without a DOM.
import type { Phase } from '../../shared/enums'
import type { AnimalInfo, LeaderboardRow, NamingPrize } from '../../shared/game'
import type { PillStatus } from '@/components/status-pill'

/** The prize places: the top three. */
export const PRIZE_PLACES = 3

/**
 * The one prize rule on every screen, the same as the server's (server/game/animals.ts,
 * awardNamingRights): a team wins a place only in the top three and with points above zero.
 */
export function holdsPrizePlace(row: Pick<LeaderboardRow, 'rank' | 'points'>): boolean {
  return row.rank >= 1 && row.rank <= PRIZE_PLACES && row.points > 0
}

/** The animal this team names, or null: only a team that holds a prize place names one. */
export function prizeAnimal(row: Pick<LeaderboardRow, 'rank' | 'points'>, prizes: NamingPrize[]): AnimalInfo | null {
  return holdsPrizePlace(row) ? (prizes.find((p) => p.place === row.rank)?.animal ?? null) : null
}

export type PrizeRow = { team: LeaderboardRow; animal: AnimalInfo }

/** The prize rows of the end screen: each team that holds a prize place, in rank order. A tie shows both teams. */
export function prizeRows(teams: LeaderboardRow[], prizes: NamingPrize[]): PrizeRow[] {
  return teams.flatMap((team) => {
    const animal = prizeAnimal(team, prizes)
    return animal ? [{ team, animal }] : []
  })
}

export type Finish = { rank: number; points: number; tied: boolean; tiedWith: string | null }

/** How my team finished: its rank and points, and, if another team shares the rank, that team's name (null when it has none to show). */
export function finishOf(teams: LeaderboardRow[], ownTeamId: string | null | undefined): Finish | null {
  const own = teams.find((t) => t.team_id === ownTeamId)
  if (!own) return null
  const other = teams.find((t) => t.team_id !== own.team_id && t.rank === own.rank)
  return { rank: own.rank, points: own.points, tied: other !== undefined, tiedWith: other?.name ?? null }
}

/** The one status word for a phase, for screens (the leaderboard tab) that can be open at any time. */
export function pillForPhase(phase: Phase): PillStatus {
  switch (phase) {
    case 'lobby':
      return 'waiting'
    case 'live':
    case 'final_live':
      return 'live'
    case 'locked':
    case 'final_locked':
      return 'locked'
    case 'paused':
      return 'paused'
    case 'final_wager':
      return 'wager'
    case 'revealed':
    case 'final_revealed':
    case 'round_break':
    case 'ended':
      return 'results'
  }
}

/** Past this rank your row is below the first screenful of a long board, so the leaderboard adds a "jump to your team" row. */
export const JUMP_AFTER_RANK = 8

export function showJumpRow(rank: number | null | undefined): boolean {
  return rank != null && rank > JUMP_AFTER_RANK
}

/** From this many teams Rocco remarks on the crowd and the subtitle gives the count. */
export const BIG_BOARD_TEAMS = 12

export function isBigBoard(teamCount: number): boolean {
  return teamCount >= BIG_BOARD_TEAMS
}
