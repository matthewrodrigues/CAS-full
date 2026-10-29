// Leaderboard and stats queries (docs/SPEC.md section 4). Plain queries are fast enough at
// this scale, so nothing here is cached. Score events exist only after a reveal (or a host
// adjustment), so these totals never include an unrevealed answer.
import { and, asc, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm'
import type { Db } from './client'
import { eventQuestions, events, players, questions, rounds, scoreEvents, submissions, teamMembers, teams } from './schema'

const totalPoints = () => sql<number>`coalesce(sum(${scoreEvents.points}), 0)`.mapWith(Number)

/** Competition ranking: tied rows share a rank and the next rank skips (1, 2, 2, 4). */
function ranked<T>(rows: T[], tied: (a: T, b: T) => boolean): (T & { rank: number })[] {
  let rank = 0
  return rows.map((row, i) => {
    if (i === 0 || !tied(row, rows[i - 1])) rank = i + 1
    return { ...row, rank }
  })
}

/**
 * Total points per team for one night. Teams tied on points are ordered by the closest-number
 * tiebreaker: the smaller distance on the most recently revealed closest-number question, then
 * the one before, and so on; no answer counts as farthest. Teams tied on all of it share a rank.
 */
export function eventLeaderboard(db: Db, eventId: string) {
  const points = totalPoints()
  const rows = db
    .select({ teamId: teams.id, name: teams.name, nameStatus: teams.nameStatus, points })
    .from(teams)
    .leftJoin(scoreEvents, eq(scoreEvents.teamId, teams.id))
    .where(eq(teams.eventId, eventId))
    .groupBy(teams.id)
    .all()

  // Most recent first: play order backwards, since questions are revealed in play order.
  const tiebreakers = db
    .select({ id: eventQuestions.id })
    .from(eventQuestions)
    .innerJoin(rounds, eq(rounds.id, eventQuestions.roundId))
    .innerJoin(questions, eq(questions.id, eventQuestions.questionId))
    .where(and(eq(eventQuestions.eventId, eventId), eq(questions.type, 'closest_number'), isNotNull(eventQuestions.revealedAt)))
    .orderBy(desc(rounds.position), desc(eventQuestions.position))
    .all()
    .map((q) => q.id)
  const distance = new Map<string, number>()
  if (tiebreakers.length > 0) {
    const answered = db
      .select({ teamId: submissions.teamId, eventQuestionId: submissions.eventQuestionId, distance: submissions.distance })
      .from(submissions)
      .where(and(inArray(submissions.eventQuestionId, tiebreakers), isNotNull(submissions.distance)))
      .all()
    for (const s of answered) distance.set(`${s.teamId}:${s.eventQuestionId}`, s.distance!)
  }
  const distances = (teamId: string) => tiebreakers.map((q) => distance.get(`${teamId}:${q}`) ?? Infinity)
  const keyed = rows.map((row) => ({ row, key: distances(row.teamId) }))
  const compareKeys = (a: number[], b: number[]) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]
    return 0
  }
  const byName = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0) // SQLite's default (binary) order
  keyed.sort((a, b) => b.row.points - a.row.points || compareKeys(a.key, b.key) || byName(a.row.name, b.row.name))

  const tied = (a: (typeof keyed)[number], b: (typeof keyed)[number]) => a.row.points === b.row.points && compareKeys(a.key, b.key) === 0
  return ranked(keyed, tied).map(({ row, rank }) => ({ ...row, rank }))
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
  return ranked(rows, (a, b) => a.points === b.points)
}
