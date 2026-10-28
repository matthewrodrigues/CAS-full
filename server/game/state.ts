// What clients read: game_state, get_state and tonight's leaderboard (docs/SPEC.md section 5).
// Team names (SPEC §4: "Everyone in the event (approved names only on display)"): players see
// every name but rejected ones, host sessions (which run the big screen) see approved names
// only, and a team always sees its own. Results and points appear only after the reveal.
import { and, count, desc, eq, ne, sql } from 'drizzle-orm'
import type { GameView, HostEvent, HostView, Leaderboard, PublicGameState, PublicSettings, PublicSubmission } from '../../shared/game'
import type { Db } from '../db/client'
import { eventLeaderboard, teamScore } from '../db/queries'
import { eventQuestions, events, gameState, scoreEvents, submissions, teamMembers, teams, themes } from '../db/schema'
import { hostCounts, type GameContext } from './context'
import { reviewQueue } from './scoring'
import { toPublicSubmission } from './submissions'
import { myTeam, teamOf } from './teams'

/** game_state as everyone in the event may see it. live_payload never carries answers. */
export function publicGameState(db: Db, eventId: string): PublicGameState | null {
  const row = db.select().from(gameState).where(eq(gameState.eventId, eventId)).get()
  if (!row) return null
  return {
    phase: row.phase,
    current_event_question_id: row.currentEventQuestionId,
    opens_at: row.opensAt,
    closes_at: row.closesAt,
    paused_at: row.pausedAt,
    paused_from_phase: row.pausedFromPhase,
    live_payload: row.livePayload,
    reveal_payload: row.revealPayload,
  }
}

const visibleEvent = (db: Db, eventId: string) =>
  db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, eventId), ne(events.status, 'draft')))
    .get() !== undefined

/** The team's row for one question, with its result and points once the question is revealed. */
function teamSubmission(db: Db, teamId: string, eventQuestionId: string): PublicSubmission | null {
  const row = db
    .select()
    .from(submissions)
    .where(and(eq(submissions.teamId, teamId), eq(submissions.eventQuestionId, eventQuestionId)))
    .get()
  if (!row) return null
  const revealed = db.select({ at: eventQuestions.revealedAt }).from(eventQuestions).where(eq(eventQuestions.id, eventQuestionId)).get()?.at
  if (revealed === null || revealed === undefined) return toPublicSubmission(row)
  const points =
    db
      .select({ total: sql<number>`coalesce(sum(${scoreEvents.points}), 0)`.mapWith(Number) })
      .from(scoreEvents)
      .where(and(eq(scoreEvents.teamId, teamId), eq(scoreEvents.eventQuestionId, eventQuestionId)))
      .get()?.total ?? 0
  return { ...toPublicSubmission(row), result: row.overrideResult ?? row.autoResult, points }
}

function teamRows(db: Db, eventId: string) {
  return db
    .select({ id: teams.id, name: teams.name, nameStatus: teams.nameStatus, members: count(teamMembers.playerId) })
    .from(teams)
    .leftJoin(teamMembers, eq(teamMembers.teamId, teams.id))
    .where(eq(teams.eventId, eventId))
    .groupBy(teams.id)
    .orderBy(sql`teams.rowid`)
    .all()
}

type Viewer = { ownTeamId: string | null; isHost: boolean }

function shownName(team: { id: string; name: string; nameStatus: string }, { ownTeamId, isHost }: Viewer): string | null {
  if (team.id === ownTeamId) return team.name
  if (team.nameStatus === 'rejected') return null
  return isHost && team.nameStatus !== 'approved' ? null : team.name
}

function publicSettings(db: Db, eventId: string): PublicSettings {
  const { settings } = db.select({ settings: events.settings }).from(events).where(eq(events.id, eventId)).get()!
  return { max_team_size: settings.max_team_size, team_submissions: settings.team_submissions, live_background: settings.live_background }
}

function hostView(ctx: GameContext, eventId: string): HostView {
  return {
    ...hostCounts(ctx, eventId),
    review_queue: reviewQueue(ctx, eventId),
    teams: teamRows(ctx.db, eventId).map((team) => ({
      id: team.id,
      name: team.name,
      name_status: team.nameStatus,
      member_count: team.members,
      score: teamScore(ctx.db, team.id),
    })),
  }
}

/** get_state(event_id): what a reconnecting client renders from. Null when there is no such event. */
export function getState(
  ctx: GameContext,
  { eventId, playerId, isHost }: { eventId: string; playerId: string | null; isHost: boolean },
): GameView | null {
  const { db } = ctx
  const state = visibleEvent(db, eventId) ? publicGameState(db, eventId) : null
  if (!state) return null
  const teamId = playerId ? teamOf(db, eventId, playerId) : null
  const questionId = state.current_event_question_id
  const event = db.select({ id: events.id, join_code: events.joinCode, status: events.status }).from(events).where(eq(events.id, eventId)).get()!
  const view: GameView = {
    event,
    state,
    submission: teamId && questionId ? teamSubmission(db, teamId, questionId) : null,
    my_team: teamId ? myTeam(db, teamId) : null,
    teams: teamRows(db, eventId).map((team) => ({ id: team.id, name: shownName(team, { ownTeamId: teamId, isHost }), member_count: team.members })),
    settings: publicSettings(db, eventId),
  }
  return isHost ? { ...view, host: hostView(ctx, eventId) } : view
}

/** get_leaderboard(event_id): tonight's board, with names shown per the rule at the top of this file. */
export function leaderboard(
  db: Db,
  { eventId, playerId, isHost }: { eventId: string; playerId: string | null; isHost: boolean },
): Leaderboard | null {
  if (!visibleEvent(db, eventId)) return null
  const ownTeamId = playerId ? teamOf(db, eventId, playerId) : null
  return {
    teams: eventLeaderboard(db, eventId).map((row) => ({
      team_id: row.teamId,
      name: shownName({ id: row.teamId, name: row.name, nameStatus: row.nameStatus }, { ownTeamId, isHost }),
      points: row.points,
      rank: row.rank,
    })),
  }
}

/** host_events: every event a host could run, newest first (drafts included: a host may preview them). */
export function hostEvents(db: Db): HostEvent[] {
  return db
    .select({ id: events.id, join_code: events.joinCode, status: events.status, starts_at: events.startsAt, theme: themes.name, phase: gameState.phase })
    .from(events)
    .innerJoin(themes, eq(themes.id, events.themeId))
    .innerJoin(gameState, eq(gameState.eventId, events.id))
    .orderBy(desc(events.startsAt))
    .all()
}
