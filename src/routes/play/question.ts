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
