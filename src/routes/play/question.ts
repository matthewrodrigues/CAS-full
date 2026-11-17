import type { TFunction } from 'i18next'
import type { Answer } from '../../../shared/api'
import type { LiveQuestion, PublicGameState, RevealPayload } from '../../../shared/game'

/** The open question, or null outside a question (live_payload is typed loosely on the wire). */
export function liveQuestion(state: PublicGameState): LiveQuestion | null {
  const payload = state.live_payload
  return payload && 'prompt' in payload ? (payload as unknown as LiveQuestion) : null
}

export function revealPayload(state: PublicGameState): RevealPayload | null {
  return (state.reveal_payload as RevealPayload | null) ?? null
}

/** True/false buttons in order: option 0 is True, option 1 is False. */
export const trueFalse = (t: TFunction) => [t('question.true'), t('question.false')]

/** The options a player taps, for multiple choice and true/false. */
export const choiceOptions = (question: LiveQuestion, t: TFunction): string[] =>
  question.type === 'true_false' ? trueFalse(t) : (question.options ?? [])

/** An answer in words, as the player chose it. */
export function answerText(answer: Answer, question: LiveQuestion, t: TFunction): string {
  if ('option' in answer) return choiceOptions(question, t)[answer.option] ?? String(answer.option)
  if ('text' in answer) return answer.text
  // As typed: a year like 1955 must not become "1,955".
  return String(answer.number)
}

export type RevealRow = { label: string; kind: 'correct' | 'incorrect' | 'neutral'; mine: boolean }

/**
 * The answer rows on a reveal (kit.md section 9): the right answer, and our pick when it was wrong
 * (or a typed answer the host is still checking). Choices keep the options' order; typed and number
 * answers put our pick first. A correct pick is one row, marked as ours.
 */
export function revealRows({
  question,
  reveal,
  answer,
  result,
  t,
}: {
  question: LiveQuestion
  reveal: RevealPayload
  answer: Answer | null
  result: 'correct' | 'incorrect' | 'review' | null
  t: TFunction
}): RevealRow[] {
  if ('skipped' in reveal) return []

  if (question.type === 'mc' || question.type === 'true_false') {
    const labels = choiceOptions(question, t)
    const correct = reveal.correct_option
    const mine = answer && 'option' in answer ? answer.option : null
    const indexes = [...new Set([correct, mine].filter((i): i is number => i !== null))].sort((a, b) => a - b)
    return indexes.map((i) => ({ label: labels[i] ?? String(i), kind: i === correct ? 'correct' : 'incorrect', mine: i === mine }))
  }

  const right = question.type === 'closest_number' ? (reveal.numeric_answer === null ? null : String(reveal.numeric_answer)) : reveal.correct_text
  const pick = answer ? answerText(answer, question, t) : null
  const rows: RevealRow[] = []
  if (pick !== null && result !== 'correct') rows.push({ label: pick, kind: result === 'review' ? 'neutral' : 'incorrect', mine: true })
  if (right !== null) rows.push({ label: right, kind: 'correct', mine: pick !== null && result === 'correct' })
  return rows
}

/** The hand note in a play screen's top row: "Round 2 of 4", or "Final round" for the wager round. */
export const roundNote = (t: TFunction, round: LiveQuestion['round'], total: number): string =>
  round.format === 'wager' ? t('wager.finalRound') : t('display.roundOf', { round: round.position, rounds: total })

/** The id of a question's heading, so its paper is labelled by it. */
export const promptId = (eventQuestionId: string): string => `${eventQuestionId}-prompt`
