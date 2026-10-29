// What clients read: game_state, get_state and tonight's leaderboard (docs/SPEC.md section 5).
// A team name is shown to other players only once a host approves it; the team itself always
// sees its own name. Results and points appear only after the reveal.
import { and, count, eq, ne, sql } from 'drizzle-orm'
import type { HostView, MyTeam, PublicGameState, PublicSubmission, TeamSummary } from '../../shared/game'
import type { Db } from '../db/client'
import { eventLeaderboard, teamScore } from '../db/queries'
import { eventQuestions, events, gameState, scoreEvents, submissions, teamMembers, teams } from '../db/schema'
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

const shownName = (team: { id: string; name: string; nameStatus: string }, ownTeamId: string | null) =>
  team.nameStatus === 'approved' || team.id === ownTeamId ? team.name : null

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

export type GameView = {
  state: PublicGameState
  submission: PublicSubmission | null
  my_team: MyTeam | null
  teams: TeamSummary[]
  host?: HostView
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
  const view: GameView = {
    state,
    submission: teamId && questionId ? teamSubmission(db, teamId, questionId) : null,
    my_team: teamId ? myTeam(db, teamId) : null,
    teams: teamRows(db, eventId).map((team) => ({ id: team.id, name: shownName(team, teamId), member_count: team.members })),
  }
  return isHost ? { ...view, host: hostView(ctx, eventId) } : view
}

/** get_leaderboard(event_id): tonight's board, with names hidden until approved (except your own). */
export function leaderboard(db: Db, { eventId, playerId }: { eventId: string; playerId: string | null }) {
  if (!visibleEvent(db, eventId)) return null
  const ownTeamId = playerId ? teamOf(db, eventId, playerId) : null
  return {
    teams: eventLeaderboard(db, eventId).map((row) => ({
      team_id: row.teamId,
      name: shownName({ id: row.teamId, name: row.name, nameStatus: row.nameStatus }, ownTeamId),
      points: row.points,
      rank: row.rank,
    })),
  }
}
