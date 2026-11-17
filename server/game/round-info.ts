// GameView.rounds: how many rounds the night has and, at a round break, the finished and next
// rounds' public details. Titles, formats and counts only: never a question's content or answer.
import type { GameView, RoundInfo, RoundsView } from '../../shared/game'
import type { Phase } from '../../shared/enums'
import type { Db } from '../db/client'
import { loadEventPlan, type EventPlan, type PlanRound } from './plan'

type StateLike = Pick<GameView['state'], 'phase' | 'current_event_question_id' | 'paused_from_phase'>

/** One round's public summary. `points` is the per-question value when every question is worth the same, else null. */
export function roundInfo(round: PlanRound): RoundInfo {
  const values = new Set(round.questions.map((q) => q.points))
  return {
    position: round.position,
    title: round.title,
    format: round.format,
    question_count: round.questions.length,
    points: values.size === 1 ? [...values][0]! : null,
  }
}

/** Pure: the rounds view for a plan and the phase being shown. */
export function roundsView(plan: EventPlan, shown: Phase, currentEventQuestionId: string | null): RoundsView {
  const total = plan.rounds.length
  if (shown !== 'round_break') return { total, finished: null, next: null }
  const index = plan.rounds.findIndex((r) => r.questions.some((q) => q.id === currentEventQuestionId))
  if (index < 0) return { total, finished: null, next: null }
  const next = plan.rounds.slice(index + 1).find((r) => r.questions.length > 0)
  return { total, finished: roundInfo(plan.rounds[index]!), next: next ? roundInfo(next) : null }
}

/** GameView.rounds for an event's current state. A paused game shows the phase it paused from. */
export function roundsOf(db: Db, eventId: string, state: StateLike): RoundsView {
  const shown = state.phase === 'paused' ? (state.paused_from_phase ?? 'lobby') : state.phase
  return roundsView(loadEventPlan(db, eventId), shown, state.current_event_question_id)
}
