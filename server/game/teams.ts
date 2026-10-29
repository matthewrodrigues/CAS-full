// Teams (docs/SPEC.md section 5): a player is on at most one team per event, teams can't exceed
// max_team_size, and once the first question opens a player on a team can't leave or switch.
// Names get a profanity check here and stay `pending` until a host approves them.
import { englishDataset, englishRecommendedTransformers, RegExpMatcher } from 'obscenity'
import { and, count, eq, sql } from 'drizzle-orm'
import type { MyTeam, TeamSummary } from '../../shared/game'
import type { Db } from '../db/client'
import { teamScore } from '../db/queries'
import { events, players, teamMembers, teams } from '../db/schema'
import { fail, ok, type GameContext, type GameResult } from './context'

const matcher = new RegExpMatcher({ ...englishDataset.build(), ...englishRecommendedTransformers })

export const isProfane = (text: string) => matcher.hasMatch(text)

/** The player's team in this event, if any. */
export function teamOf(db: Db, eventId: string, playerId: string): string | null {
  const row = db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(and(eq(teamMembers.eventId, eventId), eq(teamMembers.playerId, playerId)))
    .get()
  return row?.teamId ?? null
}

export function myTeam(db: Db, teamId: string): MyTeam {
  const team = db.select().from(teams).where(eq(teams.id, teamId)).get()
  if (!team) throw new Error(`No team ${teamId}`)
  const members = db
    .select({ id: players.id, nickname: players.nickname })
    .from(teamMembers)
    .innerJoin(players, eq(players.id, teamMembers.playerId))
    .where(eq(teamMembers.teamId, teamId))
    .orderBy(sql`team_members.rowid`)
    .all()
  return {
    id: team.id,
    name: team.name,
    name_status: team.nameStatus,
    captain_id: team.captainId,
    score: teamScore(db, teamId),
    members,
  }
}

/** Not found for unknown or draft events; ended events take no new teams or members. */
function joinable(db: Db, eventId: string) {
  const event = db.select({ status: events.status, settings: events.settings }).from(events).where(eq(events.id, eventId)).get()
  if (!event || event.status === 'draft') return fail('not_found')
  if (event.status === 'ended') return fail('event_ended')
  return { ok: true as const, started: event.status === 'live', settings: event.settings }
}

/** Leaving before the start: an emptied team is deleted, otherwise captaincy passes on. */
function leave(db: Db, teamId: string, playerId: string) {
  db.delete(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.playerId, playerId)))
    .run()
  const next = db.select({ playerId: teamMembers.playerId }).from(teamMembers).where(eq(teamMembers.teamId, teamId)).orderBy(sql`rowid`).get()
  if (!next) db.delete(teams).where(eq(teams.id, teamId)).run()
  else db.update(teams).set({ captainId: next.playerId }).where(and(eq(teams.id, teamId), eq(teams.captainId, playerId))).run()
}

function moved(ctx: GameContext, eventId: string, playerId: string, teamId: string): GameResult<MyTeam> {
  ctx.realtime.setTeam(eventId, playerId, teamId)
  ctx.realtime.toEvent(eventId, { type: 'teams' })
  return ok(myTeam(ctx.db, teamId))
}

export function createTeam(
  ctx: GameContext,
  { eventId, playerId, name }: { eventId: string; playerId: string | null; name: string },
): GameResult<MyTeam> {
  const { db } = ctx
  if (!playerId) return fail('join_first')
  const event = joinable(db, eventId)
  if (!event.ok) return event
  const current = teamOf(db, eventId, playerId)
  if (current && event.started) return fail('already_started')
  if (isProfane(name)) return fail('name_not_allowed')
  const taken = db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.eventId, eventId), sql`lower(${teams.name}) = lower(${name})`))
    .get()
  if (taken) return fail('name_taken')

  const teamId = crypto.randomUUID()
  // better-sqlite3 is synchronous: statements on `db` inside the callback run in the transaction.
  db.transaction(() => {
    if (current) leave(db, current, playerId)
    db.insert(teams).values({ id: teamId, eventId, name, captainId: playerId }).run()
    db.insert(teamMembers).values({ teamId, eventId, playerId }).run()
  })
  return moved(ctx, eventId, playerId, teamId)
}

export function joinTeam(ctx: GameContext, { teamId, playerId }: { teamId: string; playerId: string | null }): GameResult<MyTeam> {
  const { db } = ctx
  if (!playerId) return fail('join_first')
  const team = db.select({ eventId: teams.eventId }).from(teams).where(eq(teams.id, teamId)).get()
  if (!team) return fail('not_found')
  const event = joinable(db, team.eventId)
  if (!event.ok) return event
  const current = teamOf(db, team.eventId, playerId)
  if (current === teamId) return ok(myTeam(db, teamId))
  if (current && event.started) return fail('already_started')
  const size = db.select({ n: count() }).from(teamMembers).where(eq(teamMembers.teamId, teamId)).get()?.n ?? 0
  if (size >= event.settings.max_team_size) return fail('team_full')

  db.transaction(() => {
    if (current) leave(db, current, playerId)
    db.insert(teamMembers).values({ teamId, eventId: team.eventId, playerId }).run()
  })
  return moved(ctx, team.eventId, playerId, teamId)
}

/** Host approval of a team name. Rejected teams keep playing; their name stays hidden. */
export function reviewTeamName(
  ctx: GameContext,
  { teamId, nameStatus }: { teamId: string; nameStatus: 'approved' | 'rejected' },
): GameResult<TeamSummary> {
  const { db } = ctx
  const team = db.select().from(teams).where(eq(teams.id, teamId)).get()
  if (!team) return fail('not_found')
  db.update(teams).set({ nameStatus }).where(eq(teams.id, teamId)).run()
  ctx.realtime.toEvent(team.eventId, { type: 'teams' })
  const members = db.select({ n: count() }).from(teamMembers).where(eq(teamMembers.teamId, teamId)).get()?.n ?? 0
  return ok({ id: team.id, name: nameStatus === 'approved' ? team.name : null, member_count: members })
}
