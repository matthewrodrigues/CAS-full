// submit_answer and submit_wager (docs/SPEC.md section 5). One row per team per question.
// A submit always replaces the row; a draft replaces only a draft and is ignored once the team
// has submitted. The deadline is checked against server time, never the client's clock.
import { and, eq } from 'drizzle-orm'
import type { Answer } from '../../shared/api'
import type { PublicSubmission } from '../../shared/game'
import { teamScore } from '../db/queries'
import { eventQuestions, events, gameState, players, questions, submissions, teams } from '../db/schema'
import { fail, ok, pushHostStats, type GameContext, type GameResult } from './context'
import { teamOf } from './teams'

type SubmissionRow = typeof submissions.$inferSelect

export function toPublicSubmission(row: SubmissionRow): PublicSubmission {
  return {
    id: row.id,
    event_question_id: row.eventQuestionId,
    answer: row.answer,
    is_draft: row.isDraft,
    received_at: row.receivedAt,
    wager: row.wager,
    // Results are shown only after the reveal; get_state adds them then.
    result: null,
    points: null,
  }
}

/** The question, its event's state and settings, and the caller's team: shared by both writes. */
function load(ctx: GameContext, eventQuestionId: string, playerId: string | null) {
  const { db } = ctx
  const row = db
    .select({
      eventId: eventQuestions.eventId,
      type: questions.type,
      options: questions.options,
      state: gameState,
      settings: events.settings,
    })
    .from(eventQuestions)
    .innerJoin(questions, eq(questions.id, eventQuestions.questionId))
    .innerJoin(events, eq(events.id, eventQuestions.eventId))
    .innerJoin(gameState, eq(gameState.eventId, eventQuestions.eventId))
    .where(eq(eventQuestions.id, eventQuestionId))
    .get()
  if (!row) return fail('not_found')
  if (!playerId) return fail('join_first')
  if (!ctx.writes.attempt(playerId).ok) return fail('rate_limited')
  const teamId = teamOf(db, row.eventId, playerId)
  if (!teamId) return fail('not_on_team')
  if (row.settings.team_submissions === 'captain_only') {
    const captain = db.select({ id: teams.captainId }).from(teams).where(eq(teams.id, teamId)).get()?.id
    if (captain !== playerId) return fail('captain_only')
  }
  return { ok: true as const, ...row, teamId, playerId }
}

function fitsType(answer: Answer, type: string, options: string[] | null): boolean {
  switch (type) {
    case 'mc':
      return 'option' in answer && answer.option < (options?.length ?? 0)
    case 'true_false':
      return 'option' in answer && answer.option <= 1
    case 'typed':
      return 'text' in answer
    case 'closest_number':
      return 'number' in answer && Number.isFinite(answer.number)
    default:
      return false
  }
}

function existing(ctx: GameContext, eventQuestionId: string, teamId: string) {
  return ctx.db
    .select()
    .from(submissions)
    .where(and(eq(submissions.eventQuestionId, eventQuestionId), eq(submissions.teamId, teamId)))
    .get()
}

/** Writes the row and tells the team's room and the hosts. */
function save(ctx: GameContext, eventId: string, eventQuestionId: string, teamId: string, values: Partial<SubmissionRow>) {
  const before = existing(ctx, eventQuestionId, teamId)
  if (before) {
    ctx.db.update(submissions).set(values).where(eq(submissions.id, before.id)).run()
  } else {
    ctx.db
      .insert(submissions)
      .values({ eventQuestionId, teamId, receivedAt: Date.now(), ...values })
      .run()
  }
  const row = existing(ctx, eventQuestionId, teamId)!
  const submission = toPublicSubmission(row)
  ctx.realtime.toTeam(teamId, { type: 'team_submission', submission })
  pushHostStats(ctx, eventId)
  return ok(submission)
}

export function submitAnswer(
  ctx: GameContext,
  { eventQuestionId, playerId, answer, isDraft }: { eventQuestionId: string; playerId: string | null; answer: Answer; isDraft: boolean },
): GameResult<PublicSubmission> {
  const q = load(ctx, eventQuestionId, playerId)
  if (!q.ok) return q
  const { phase, currentEventQuestionId, closesAt } = q.state
  if ((phase !== 'live' && phase !== 'final_live') || currentEventQuestionId !== eventQuestionId || closesAt === null) {
    return fail('not_live')
  }
  const extraS = ctx.db.select({ s: players.extraTimeS }).from(players).where(eq(players.id, q.playerId)).get()?.s ?? 0
  const now = Date.now()
  if (now > closesAt + q.settings.grace_ms + extraS * 1000) return fail('too_late')
  if (!fitsType(answer, q.type, q.options)) return fail('wrong_answer_type')

  const before = existing(ctx, eventQuestionId, q.teamId)
  if (isDraft && before && !before.isDraft) return ok(toPublicSubmission(before))
  return save(ctx, q.eventId, eventQuestionId, q.teamId, { answer, isDraft, receivedAt: now, updatedBy: q.playerId })
}

/** Only in final_wager; 0 up to the team's current score. The last wager before final_live wins. */
export function submitWager(
  ctx: GameContext,
  { eventQuestionId, playerId, amount }: { eventQuestionId: string; playerId: string | null; amount: number },
): GameResult<PublicSubmission> {
  const q = load(ctx, eventQuestionId, playerId)
  if (!q.ok) return q
  if (q.state.phase !== 'final_wager' || q.state.currentEventQuestionId !== eventQuestionId) return fail('wrong_phase')
  if (amount > teamScore(ctx.db, q.teamId)) return fail('wager_too_high')
  return save(ctx, q.eventId, eventQuestionId, q.teamId, {
    wager: amount,
    isDraft: true,
    receivedAt: Date.now(),
    updatedBy: q.playerId,
  })
}
