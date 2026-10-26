// Typed-answer checking (docs/SPEC.md section 5): normalize, then exact match, then trigram
// similarity computed the way Postgres pg_trgm does it.
import type { AutoResult } from '../../shared/enums'

/** Strips one simple English plural from a word longer than three letters. */
function singular(word: string): string {
  if (word.length <= 3) return word
  if (word.endsWith('ies')) return `${word.slice(0, -3)}y`
  if (/(?:s|x|z|ch|sh)es$/.test(word)) return word.slice(0, -2)
  if (word.endsWith('s') && !/(?:ss|us|is)$/.test(word)) return word.slice(0, -1)
  return word
}

/** Lowercase, no accents or punctuation, single spaces, no leading article, plurals stripped. */
export function normalizeAnswer(text: string): string {
  const cleaned = text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/^(?:a|an|the) /, '')
  return cleaned.split(' ').filter(Boolean).map(singular).join(' ')
}

/** pg_trgm trigrams: each word padded with two leading spaces and one trailing space. */
function trigrams(text: string): Set<string> {
  const set = new Set<string>()
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const padded = `  ${word} `
    for (let i = 0; i + 3 <= padded.length; i++) set.add(padded.slice(i, i + 3))
  }
  return set
}

/** Shared trigrams ÷ total distinct trigrams, from 0 to 1. */
export function trigramSimilarity(a: string, b: string): number {
  const left = trigrams(a)
  const right = trigrams(b)
  if (left.size === 0 || right.size === 0) return 0
  let shared = 0
  for (const t of left) if (right.has(t)) shared++
  return shared / (left.size + right.size - shared)
}

export function matchAnswer(
  text: string,
  accepted: string[],
  { autoAccept, review }: { autoAccept: number; review: number },
): { result: AutoResult; similarity: number } {
  const answer = normalizeAnswer(text)
  if (!answer) return { result: 'incorrect', similarity: 0 }
  let best = 0
  for (const option of accepted) {
    const target = normalizeAnswer(option)
    if (target === answer) return { result: 'correct', similarity: 1 }
    best = Math.max(best, trigramSimilarity(answer, target))
  }
  const result = best >= autoAccept ? 'correct' : best >= review ? 'review' : 'incorrect'
  return { result, similarity: best }
}
