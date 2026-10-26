// The order of play: an event's rounds and questions, and the pure rule for what comes next
// (the section 5 state diagram). Questions are done once revealed or skipped.
import { asc, eq } from 'drizzle-orm'
import type { Phase, RoundFormat } from '../../shared/enums'
import type { Db } from '../db/client'
import { eventQuestions, rounds } from '../db/schema'

export type PlanQuestion = { id: string; position: number; questionId: string; durationS: number; points: number; done: boolean }
export type PlanRound = { id: string; position: number; format: RoundFormat; title: string; questions: PlanQuestion[] }
export type EventPlan = { rounds: PlanRound[] }

export type NextStep =
  | { kind: 'open'; eventQuestionId: string }
  | { kind: 'round_break' }
  | { kind: 'final_wager'; eventQuestionId: string }
  | { kind: 'ended' }

export function loadEventPlan(db: Db, eventId: string): EventPlan {
  const roundRows = db.select().from(rounds).where(eq(rounds.eventId, eventId)).orderBy(asc(rounds.position)).all()
  const questionRows = db
    .select()
    .from(eventQuestions)
    .where(eq(eventQuestions.eventId, eventId))
    .orderBy(asc(eventQuestions.position))
    .all()
  return {
    rounds: roundRows.map((round) => ({
      id: round.id,
      position: round.position,
      format: round.format,
      title: round.title,
      questions: questionRows
        .filter((q) => q.roundId === round.id)
        .map((q) => ({
          id: q.id,
          position: q.position,
          questionId: q.questionId,
          durationS: q.durationS,
          points: q.points,
          done: q.revealedAt !== null || q.skippedAt !== null,
        })),
    })),
  }
}

/** The first round at or after `from` that has questions: open it, enter the wager, or end. */
function startRoundFrom(plan: EventPlan, from: number): NextStep {
  const round = plan.rounds.slice(from).find((r) => r.questions.length > 0)
  if (!round) return { kind: 'ended' }
  const first = round.questions[0].id
  return round.format === 'wager' ? { kind: 'final_wager', eventQuestionId: first } : { kind: 'open', eventQuestionId: first }
}

function roundIndexOf(plan: EventPlan, eventQuestionId: string | null): number {
  return plan.rounds.findIndex((r) => r.questions.some((q) => q.id === eventQuestionId))
}

/** What host_next does from this phase, or null when the phase only moves by lock, reveal or resume. */
export function nextStep(
  plan: EventPlan,
  { phase, currentEventQuestionId }: { phase: Phase; currentEventQuestionId: string | null },
): NextStep | null {
  switch (phase) {
    case 'lobby':
      return startRoundFrom(plan, 0)
    case 'revealed': {
      const round = plan.rounds[roundIndexOf(plan, currentEventQuestionId)]
      const index = round?.questions.findIndex((q) => q.id === currentEventQuestionId) ?? -1
      const following = round?.questions[index + 1]
      return following ? { kind: 'open', eventQuestionId: following.id } : { kind: 'round_break' }
    }
    case 'round_break':
      return startRoundFrom(plan, roundIndexOf(plan, currentEventQuestionId) + 1)
    case 'final_wager':
      return currentEventQuestionId ? { kind: 'open', eventQuestionId: currentEventQuestionId } : null
    case 'final_revealed':
      return { kind: 'ended' }
    default:
      return null
  }
}
