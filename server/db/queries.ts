// Leaderboard and stats queries (docs/SPEC.md section 4). Plain queries are fast enough at
// this scale, so nothing here is cached. Score events exist only after a reveal (or a host
// adjustment), so these totals never include an unrevealed answer.
import { asc, desc, eq, sql } from 'drizzle-orm'
import type { Db } from './client'
import { events, players, scoreEvents, teamMembers, teams } from './schema'

const totalPoints = () => sql<number>`coalesce(sum(${scoreEvents.points}), 0)`.mapWith(Number)

/** Competition ranking: tied scores share a rank and the next rank skips (1, 2, 2, 4). */
function ranked<T extends { points: number }>(rows: T[]): (T & { rank: number })[] {
  let rank = 0
  return rows.map((row, i) => {
    if (i === 0 || row.points !== rows[i - 1].points) rank = i + 1
    return { ...row, rank }
  })
}

/** Total points per team for one night. The closest-number tiebreaker arrives with Milestone 2. */
export function eventLeaderboard(db: Db, eventId: string) {
  const points = totalPoints()
  const rows = db
    .select({ teamId: teams.id, name: teams.name, nameStatus: teams.nameStatus, points })
    .from(teams)
    .leftJoin(scoreEvents, eq(scoreEvents.teamId, teams.id))
    .where(eq(teams.eventId, eventId))
    .groupBy(teams.id)
    .orderBy(desc(points), asc(teams.name))
    .all()
  return ranked(rows)
}

/** One team's running total. */
export function teamScore(db: Db, teamId: string): number {
  return db.select({ points: totalPoints() }).from(scoreEvents).where(eq(scoreEvents.teamId, teamId)).get()?.points ?? 0
}

/** Points per player across a season: each team member receives the team's full points. */
export function seasonLeaderboard(db: Db, seasonId: string) {
  const points = totalPoints()
  const rows = db
    .select({ playerId: players.id, nickname: players.nickname, points })
    .from(teamMembers)
    .innerJoin(events, eq(events.id, teamMembers.eventId))
    .innerJoin(players, eq(players.id, teamMembers.playerId))
    .leftJoin(scoreEvents, eq(scoreEvents.teamId, teamMembers.teamId))
    .where(eq(events.seasonId, seasonId))
    .groupBy(players.id)
    .orderBy(desc(points), asc(players.nickname))
    .all()
  return ranked(rows)
}
