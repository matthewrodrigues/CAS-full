// Grading at lock, scoring at reveal, and the host's corrections (docs/SPEC.md section 5,
// Answer checking). One of the two places allowed to read question_answers (section 6, rule 2):
// it grades against them and computes similarity for the review queue, and sends neither out.
import { and, asc, eq, sql } from 'drizzle-orm'
import type { Answer } from '../../shared/api'
import type { AutoResult, OverrideResult } from '../../shared/enums'
import type { ReviewItem } from '../../shared/game'
import { teamScore } from '../db/queries'
import { eventQuestions, events, gameState, questionAnswers, questions, rounds, scoreEvents, submissions, teams } from '../db/schema'
import { fail, ok, type GameContext, type GameResult } from './context'
import { matchAnswer } from './matching'

/** Everything grading needs about one event question, answers included. */
function questionFor(ctx: GameContext, eventQuestionId: string) {
  return ctx.db
    .select({
      eventId: eventQuestions.eventId,
      points: eventQuestions.points,
      revealedAt: eventQuestions.revealedAt,
      format: rounds.format,
      type: questions.type,
      acceptedAnswers: questionAnswers.acceptedAnswers,
      correctOption: questionAnswers.correctOption,
      numericAnswer: questionAnswers.numericAnswer,
      settings: events.settings,
    })
    .from(eventQuestions)
    .innerJoin(rounds, eq(rounds.id, eventQuestions.roundId))
    .innerJoin(questions, eq(questions.id, eventQuestions.questionId))
    .innerJoin(questionAnswers, eq(questionAnswers.questionId, questions.id))
    .innerJoin(events, eq(events.id, eventQuestions.eventId))
    .where(eq(eventQuestions.id, eventQuestionId))
    .get()
}
type Question = NonNullable<ReturnType<typeof questionFor>>

const thresholds = (q: Question) => ({ autoAccept: q.settings.auto_accept_threshold, review: q.settings.review_threshold })

/** The result one answer earns. A null or ill-typed answer is incorrect. */
function grade(q: Question, answer: Answer | null): { result: AutoResult; distance: number | null } {
  if (answer && 'option' in answer && (q.type === 'mc' || q.type === 'true_false')) {
    return { result: answer.option === q.correctOption ? 'correct' : 'incorrect', distance: null }
  }
  if (answer && 'text' in answer && q.type === 'typed') {
    return { result: matchAnswer(answer.text, q.acceptedAnswers, thresholds(q)).result, distance: null }
  }
  if (answer && 'number' in answer && q.type === 'closest_number' && q.numericAnswer !== null) {
    // Closeness decides who is correct once every team's distance is known (below).
    return { result: 'incorrect', distance: Math.abs(answer.number - q.numericAnswer) }
  }
  return { result: 'incorrect', distance: null }
}

/** At lock: sets auto_result on every row, from the submitted answer or else the latest draft. */
export function gradeQuestion(ctx: GameContext, eventQuestionId: string) {
  const q = questionFor(ctx, eventQuestionId)
  if (!q) return
  const rows = ctx.db.select().from(submissions).where(eq(submissions.eventQuestionId, eventQuestionId)).all()
  const graded = rows.map((row) => ({ id: row.id, ...grade(q, row.answer) }))
  const distances = graded.flatMap((g) => (g.distance === null ? [] : [g.distance]))
  const closest = distances.length ? Math.min(...distances) : null
  ctx.db.transaction(() => {
    for (const g of graded) {
      const result = g.distance !== null && g.distance === closest ? 'correct' : g.result
      ctx.db.update(submissions).set({ autoResult: result, distance: g.distance }).where(eq(submissions.id, g.id)).run()
    }
  })
}

const effective = (row: { autoResult: AutoResult | null; overrideResult: OverrideResult | null }) => row.overrideResult ?? row.autoResult

/** +30%, +20% or +10% of the points by the third of the timer the answer arrived in. */
function speedPoints(points: number, receivedAt: number, opensAt: number | null, closesAt: number | null): number {
  if (opensAt === null || closesAt === null || closesAt <= opensAt) return 0
  const elapsed = (receivedAt - opensAt) / (closesAt - opensAt)
  return Math.round(points * (elapsed < 1 / 3 ? 0.3 : elapsed < 2 / 3 ? 0.2 : 0.1))
}

/** What a result is worth on the wager question: ± the (already capped) wager; review is 0. */
const wagerValue = (result: AutoResult | null, wager: number) => (result === 'correct' ? wager : result === 'incorrect' ? -wager : 0)

/** At reveal: writes score events. A review answer with no override scores 0 until a host decides. */
export function scoreQuestion(ctx: GameContext, eventQuestionId: string) {
  const q = questionFor(ctx, eventQuestionId)
  if (!q) return
  const clock = ctx.db.select({ opensAt: gameState.opensAt, closesAt: gameState.closesAt }).from(gameState).where(eq(gameState.eventId, q.eventId)).get()
  const rows = ctx.db.select().from(submissions).where(eq(submissions.eventQuestionId, eventQuestionId)).all()
  ctx.db.transaction(() => {
    for (const row of rows) {
      const result = effective(row)
      if (q.format === 'wager') {
        // Capped at the team's score now, and stored back so later overrides swing the same amount.
        const wager = Math.max(0, Math.min(row.wager ?? 0, teamScore(ctx.db, row.teamId)))
        if (wager !== row.wager) ctx.db.update(submissions).set({ wager }).where(eq(submissions.id, row.id)).run()
        const points = wagerValue(result, wager)
        if (points !== 0) ctx.db.insert(scoreEvents).values({ teamId: row.teamId, eventQuestionId, points, reason: 'wager' }).run()
        continue
      }
      if (result !== 'correct' || q.points === 0) continue
      ctx.db.insert(scoreEvents).values({ teamId: row.teamId, eventQuestionId, points: q.points, reason: 'correct' }).run()
      const speed = q.settings.speed_bonus === 'tiered' ? speedPoints(q.points, row.receivedAt, clock?.opensAt ?? null, clock?.closesAt ?? null) : 0
      if (speed > 0) ctx.db.insert(scoreEvents).values({ teamId: row.teamId, eventQuestionId, points: speed, reason: 'speed' }).run()
    }
  })
}

/** The current question's review answers that no host has decided yet. */
export function reviewQueue(ctx: GameContext, eventId: string): ReviewItem[] {
  const current = ctx.db.select({ id: gameState.currentEventQuestionId }).from(gameState).where(eq(gameState.eventId, eventId)).get()?.id
  if (!current) return []
  const q = questionFor(ctx, current)
  if (!q || q.type !== 'typed') return []
  const rows = ctx.db
    .select({ id: submissions.id, teamId: submissions.teamId, teamName: teams.name, answer: submissions.answer })
    .from(submissions)
    .innerJoin(teams, eq(teams.id, submissions.teamId))
    .where(and(eq(submissions.eventQuestionId, current), eq(submissions.autoResult, 'review'), sql`${submissions.overrideResult} is null`))
    .orderBy(asc(submissions.receivedAt))
    .all()
  return rows.map((row) => {
    const text = row.answer && 'text' in row.answer ? row.answer.text : ''
    return {
      submission_id: row.id,
      team_id: row.teamId,
      team_name: row.teamName,
      event_question_id: current,
      answer: text,
      similarity: matchAnswer(text, q.acceptedAnswers, thresholds(q)).similarity,
    }
  })
}

export function pushReviewQueue(ctx: GameContext, eventId: string) {
  ctx.realtime.toHosts(eventId, { type: 'review_queue', items: reviewQueue(ctx, eventId) })
}

/** What the team has been awarded for one question so far: reveal points plus any override adjustments. */
function awardedFor(ctx: GameContext, teamId: string, eventQuestionId: string): number {
  return (
    ctx.db
      .select({ total: sql<number>`coalesce(sum(${scoreEvents.points}), 0)`.mapWith(Number) })
      .from(scoreEvents)
      .where(and(eq(scoreEvents.teamId, teamId), eq(scoreEvents.eventQuestionId, eventQuestionId)))
      .get()?.total ?? 0
  )
}

/**
 * host_override. Before the reveal it only sets the result, and the reveal scores it. After the
 * reveal it writes an `adjust` event for the difference between what the question now earns
 * (no speed bonus) and what it has earned so far, so overriding back and forth stays consistent.
 */
export function override(
  ctx: GameContext,
  { submissionId, result, note }: { submissionId: string; result: OverrideResult; note: string },
): GameResult<{ submission_id: string; override_result: OverrideResult; adjustment: number }> {
  const row = ctx.db.select().from(submissions).where(eq(submissions.id, submissionId)).get()
  const q = row && questionFor(ctx, row.eventQuestionId)
  if (!row || !q) return fail('not_found')
  let adjustment = 0
  ctx.db.transaction(() => {
    ctx.db.update(submissions).set({ overrideResult: result }).where(eq(submissions.id, row.id)).run()
    if (q.revealedAt === null) return
    const earns = q.format === 'wager' ? wagerValue(result, row.wager ?? 0) : result === 'correct' ? q.points : 0
    adjustment = earns - awardedFor(ctx, row.teamId, row.eventQuestionId)
    if (adjustment !== 0) {
      ctx.db
        .insert(scoreEvents)
        .values({ teamId: row.teamId, eventQuestionId: row.eventQuestionId, points: adjustment, reason: 'adjust', note: `Override to ${result}: ${note}` })
        .run()
    }
  })
  pushReviewQueue(ctx, q.eventId)
  if (adjustment !== 0) ctx.realtime.toEvent(q.eventId, { type: 'scores' })
  return ok({ submission_id: row.id, override_result: result, adjustment })
}

/** host_adjust_score: a manual correction, always with a note. */
export function adjustScore(
  ctx: GameContext,
  { teamId, points, note }: { teamId: string; points: number; note: string },
): GameResult<{ team_id: string; score: number }> {
  const team = ctx.db.select({ eventId: teams.eventId }).from(teams).where(eq(teams.id, teamId)).get()
  if (!team) return fail('not_found')
  ctx.db.insert(scoreEvents).values({ teamId, points, reason: 'adjust', note }).run()
  ctx.realtime.toEvent(team.eventId, { type: 'scores' })
  return ok({ team_id: teamId, score: teamScore(ctx.db, teamId) })
}
