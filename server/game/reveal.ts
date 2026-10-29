// The reveal payload builder: one of the two places allowed to read question_answers
// (docs/SPEC.md section 6, rule 2). It runs only when the host reveals a question.
import { eq } from 'drizzle-orm'
import type { Db } from '../db/client'
import { eventQuestions, questionAnswers, questions } from '../db/schema'

export function buildRevealPayload(db: Db, eventQuestionId: string) {
  const row = db
    .select({
      type: questions.type,
      options: questions.options,
      funFact: questions.funFact,
      acceptedAnswers: questionAnswers.acceptedAnswers,
      correctOption: questionAnswers.correctOption,
      numericAnswer: questionAnswers.numericAnswer,
    })
    .from(eventQuestions)
    .innerJoin(questions, eq(questions.id, eventQuestions.questionId))
    .innerJoin(questionAnswers, eq(questionAnswers.questionId, questions.id))
    .where(eq(eventQuestions.id, eventQuestionId))
    .get()
  if (!row) throw new Error(`No event question ${eventQuestionId}`)

  const usesOption = row.type === 'mc' || row.type === 'true_false'
  const correctText =
    row.type === 'mc' && row.correctOption !== null
      ? (row.options?.[row.correctOption] ?? null)
      : row.type === 'typed'
        ? (row.acceptedAnswers[0] ?? null)
        : null
  return {
    event_question_id: eventQuestionId,
    type: row.type,
    correct_option: usesOption ? row.correctOption : null,
    correct_text: correctText,
    numeric_answer: row.type === 'closest_number' ? row.numericAnswer : null,
    fun_fact: row.funFact,
  }
}

export function skippedRevealPayload(eventQuestionId: string) {
  return { event_question_id: eventQuestionId, skipped: true }
}
