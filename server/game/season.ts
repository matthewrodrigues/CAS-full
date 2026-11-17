// The season leaderboard: points per player across the event's season (docs/SPEC.md section 5).
// Players choose how their name shows (display_mode); only that name, points, rank and nights played leave the server.
import { and, eq, ne } from 'drizzle-orm'
import type { DisplayMode } from '../../shared/enums'
import type { SeasonLeaderboard } from '../../shared/game'
import type { Db } from '../db/client'
import { seasonLeaderboard } from '../db/queries'
import { events, seasons } from '../db/schema'

/** A player's name as their display mode allows: the nickname, its first word, or the initials of its words. */
export function displayName(nickname: string, mode: DisplayMode): string {
  const words = nickname.trim().split(/\s+/).filter(Boolean)
  if (mode === 'first_name') return words[0] ?? nickname
  if (mode === 'initials') return words.map((w) => Array.from(w)[0]!.toUpperCase()).join('') || nickname
  return nickname
}

/** season_leaderboard(event_id): the board of the season the (non-draft) event belongs to, or null for an unknown event. */
export function seasonBoard(db: Db, { eventId, playerId }: { eventId: string; playerId: string | null }): SeasonLeaderboard | null {
  const season = db
    .select({ id: seasons.id, name: seasons.name, starts_on: seasons.startsOn, ends_on: seasons.endsOn })
    .from(events)
    .innerJoin(seasons, eq(seasons.id, events.seasonId))
    .where(and(eq(events.id, eventId), ne(events.status, 'draft')))
    .get()
  if (!season) return null
  return {
    season: { name: season.name, starts_on: season.starts_on, ends_on: season.ends_on },
    players: seasonLeaderboard(db, season.id).map((row) => ({
      rank: row.rank,
      name: displayName(row.nickname, row.displayMode),
      points: row.points,
      nights: row.nights,
      is_you: row.playerId === playerId,
    })),
  }
}
