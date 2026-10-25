// Rules for question and round content, shared by the seed and the CSV import (Milestone 5).
// Each returns a list of problems; an empty list means the content is valid.
import type { MediaKind, QuestionType, RoundFormat } from '../../shared/enums'

type QuestionContent = {
  type: QuestionType
  options: string[] | null
  mediaKind: MediaKind
  mediaUrl: string | null
  caption: string | null
}

type AnswerContent = {
  acceptedAnswers: string[]
  correctOption: number | null
  numericAnswer: number | null
}

/** What each question type needs in question_answers, and nothing it doesn't use. */
export function validateQuestion(q: QuestionContent, a: AnswerContent): string[] {
  const problems: string[] = []
  const usesOptions = q.type === 'mc'
  const usesOption = q.type === 'mc' || q.type === 'true_false'

  if (usesOptions) {
    if (!q.options || q.options.length < 2 || q.options.length > 6) problems.push('mc needs 2 to 6 options')
    else if (q.options.some((o) => o.trim() === '')) problems.push('mc options must not be blank')
  } else if (q.options !== null) {
    problems.push(`${q.type} questions have no options`)
  }

  const optionCount = q.type === 'true_false' ? 2 : (q.options?.length ?? 0)
  if (usesOption) {
    const ok = Number.isInteger(a.correctOption) && a.correctOption! >= 0 && a.correctOption! < optionCount
    if (!ok) problems.push(`correct_option must be an index from 0 to ${optionCount - 1}`)
  } else if (a.correctOption !== null) {
    problems.push(`${q.type} questions have no correct_option`)
  }

  if (q.type === 'typed') {
    if (a.acceptedAnswers.length === 0 || a.acceptedAnswers.some((s) => s.trim() === '')) {
      problems.push('typed questions need at least one non-blank accepted answer')
    }
  } else if (a.acceptedAnswers.length > 0) {
    problems.push(`${q.type} questions have no accepted_answers`)
  }

  if (q.type === 'closest_number') {
    if (a.numericAnswer === null || !Number.isFinite(a.numericAnswer)) problems.push('closest_number needs a numeric_answer')
  } else if (a.numericAnswer !== null) {
    problems.push(`${q.type} questions have no numeric_answer`)
  }

  if ((q.mediaKind === 'none') !== (q.mediaUrl === null)) problems.push('media_url is required exactly when media_kind is set')
  // Captions are shown by default for sound questions (docs/SPEC.md section 7).
  if (q.mediaKind === 'audio' && !q.caption?.trim()) problems.push('audio questions need a caption')

  return problems
}

/** At most one wager round per event, and it must be the last round. */
export function validateRounds(rounds: { position: number; format: RoundFormat }[]): string[] {
  const wagers = rounds.filter((r) => r.format === 'wager')
  if (wagers.length > 1) return ['an event can have only one wager round']
  const last = Math.max(...rounds.map((r) => r.position))
  if (wagers.length === 1 && wagers[0].position !== last) return ['the wager round must be the last round']
  return []
}
