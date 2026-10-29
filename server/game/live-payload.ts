// What players see while a question is open. Built only from questions, rounds and
// event_questions: never from question_answers, and never with the fun fact (section 6, rule 3).
import { count, eq } from 'drizzle-orm'
import type { LiveQuestion, WagerPayload } from '../../shared/game'
import type { Db } from '../db/client'
import { eventQuestions, questions, rounds } from '../db/schema'

function questionRow(db: Db, eventQuestionId: string) {
  const row = db
    .select({
      roundId: eventQuestions.roundId,
      position: eventQuestions.position,
      durationS: eventQuestions.durationS,
      points: eventQuestions.points,
      round: { position: rounds.position, title: rounds.title, format: rounds.format },
      type: questions.type,
      prompt: questions.prompt,
      options: questions.options,
      mediaKind: questions.mediaKind,
      mediaUrl: questions.mediaUrl,
      caption: questions.caption,
    })
    .from(eventQuestions)
    .innerJoin(questions, eq(questions.id, eventQuestions.questionId))
    .innerJoin(rounds, eq(rounds.id, eventQuestions.roundId))
    .where(eq(eventQuestions.id, eventQuestionId))
    .get()
  if (!row) throw new Error(`No event question ${eventQuestionId}`)
  return row
}

export function buildLivePayload(db: Db, eventQuestionId: string): LiveQuestion {
  const row = questionRow(db, eventQuestionId)
  const inRound = db.select({ n: count() }).from(eventQuestions).where(eq(eventQuestions.roundId, row.roundId)).get()
  return {
    event_question_id: eventQuestionId,
    round: row.round,
    number: row.position,
    of: inRound?.n ?? row.position,
    type: row.type,
    prompt: row.prompt,
    // True/false buttons are labelled by the client; only multiple choice sends options.
    options: row.type === 'mc' ? row.options : null,
    media_kind: row.mediaKind,
    media_url: row.mediaUrl,
    caption: row.caption,
    duration_s: row.durationS,
    points: row.points,
  }
}

/** During final_wager teams see that the wager is on, but not the question. */
export function buildWagerPayload(db: Db, eventQuestionId: string): WagerPayload {
  return { event_question_id: eventQuestionId, round: questionRow(db, eventQuestionId).round, wager: true }
}

export type LivePayload = ReturnType<typeof buildLivePayload>
