import { and, eq, ne } from 'drizzle-orm'
import type { PublicGameState, PublicSubmission } from '../../shared/game'
import type { Db } from '../db/client'
import { events, gameState, submissions, teamMembers } from '../db/schema'

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

/** The caller's own team's submission for the current question. */
function teamSubmission(db: Db, eventId: string, playerId: string, eventQuestionId: string): PublicSubmission | null {
  const row = db
    .select({
      id: submissions.id,
      event_question_id: submissions.eventQuestionId,
      answer: submissions.answer,
      is_draft: submissions.isDraft,
      received_at: submissions.receivedAt,
      wager: submissions.wager,
    })
    .from(submissions)
    .innerJoin(teamMembers, eq(teamMembers.teamId, submissions.teamId))
    .where(
      and(
        eq(teamMembers.eventId, eventId),
        eq(teamMembers.playerId, playerId),
        eq(submissions.eventQuestionId, eventQuestionId),
      ),
    )
    .get()
  // Results are filled in once scoring exists (Milestone 2, Task 8).
  return row ? { ...row, result: null, points: null } : null
}

/** get_state(event_id): what a reconnecting client renders from. Null when there is no such event. */
export function getState(
  db: Db,
  { eventId, playerId }: { eventId: string; playerId: string | null },
): { state: PublicGameState; submission: PublicSubmission | null } | null {
  const visible = db
    .select({ id: events.id })
    .from(events)
    .where(and(eq(events.id, eventId), ne(events.status, 'draft')))
    .get()
  const state = visible ? publicGameState(db, eventId) : null
  if (!state) return null
  const questionId = state.current_event_question_id
  const submission = playerId && questionId ? teamSubmission(db, eventId, playerId, questionId) : null
  return { state, submission }
}
